package service

import (
	"context"
	"sort"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// BranchOverviewService aggregates each branch's live operational state from the
// existing modules by branch_slug — Branch is the join key, nothing is copied.
type BranchOverviewService interface {
	Overview(ctx context.Context, branches []models.Branch) ([]models.BranchOverviewRow, error)
	Dashboard(ctx context.Context, b *models.Branch) (*models.BranchDashboard, error)
}

type branchOverviewService struct {
	children  repository.ChildRepository
	rooms     repository.RoomRepository
	att       repository.AttendanceRepository
	staff     repository.StaffRepository
	staffAtt  repository.StaffAttendanceRepository
	daily     repository.DailyRecordRepository
	enquiries repository.EnquiryRepository
}

func NewBranchOverviewService(children repository.ChildRepository, rooms repository.RoomRepository, att repository.AttendanceRepository, staff repository.StaffRepository, staffAtt repository.StaffAttendanceRepository, daily repository.DailyRecordRepository, enquiries repository.EnquiryRepository) BranchOverviewService {
	return &branchOverviewService{children: children, rooms: rooms, att: att, staff: staff, staffAtt: staffAtt, daily: daily, enquiries: enquiries}
}

// branchRollup gathers the shared per-branch numbers used by both the list row
// and the dashboard, so the aggregation logic lives in one place.
type branchRollup struct {
	activeChildren   int
	capacity         int
	occupancy        int
	rooms            int
	staffTotal       int
	staffPresent     int
	staffOnLeave     int
	present          int
	attendanceRate   int
	enquiries        int
	newEnquiries     int
	safeguardingOpen int
	medicationDue    int
	incidentsToday   int
	mealsServed      int
	birthdays        []string
}

// rollup is the single-branch path (the per-branch Dashboard): it fetches its
// own data then delegates to the shared tally, so the maths lives once.
func (s *branchOverviewService) rollup(ctx context.Context, slug string, capacityHint int) branchRollup {
	date := today()
	td := time.Now()
	kids, err := s.children.FindAll(ctx, repository.ChildFilter{Branch: slug, Status: string(models.ChildActive)})
	logWarnIf(err, "branch-dashboard: children read failed", "branch", slug)
	rooms, err := s.rooms.FindAll(ctx, slug)
	logWarnIf(err, "branch-dashboard: rooms read failed", "branch", slug)
	staff, err := s.staff.FindAll(ctx, repository.StaffFilter{Branch: slug, Status: string(models.StaffActive)})
	logWarnIf(err, "branch-dashboard: staff read failed", "branch", slug)
	sAtt, err := s.staffAtt.FindByDate(ctx, date, slug)
	logWarnIf(err, "branch-dashboard: staff attendance read failed", "branch", slug)
	att, err := s.att.FindByDate(ctx, date, slug)
	logWarnIf(err, "branch-dashboard: child attendance read failed", "branch", slug)
	return s.rollupFromGrouped(ctx, slug, capacityHint, td, date, kids, rooms, staff, sAtt, att)
}

// rollupFromGrouped tallies one branch from ALREADY-FETCHED slices (Overview
// batches the org-wide reads; rollup fetches per branch). The six small
// per-branch counts (enquiries ×2, daily ×4) run here in both paths.
func (s *branchOverviewService) rollupFromGrouped(ctx context.Context, slug string, capacityHint int, td time.Time, date string,
	kids []models.Child, rooms []models.Room, staff []models.Staff,
	sAtt []models.StaffAttendanceRecord, att []models.AttendanceRecord) branchRollup {
	var r branchRollup

	r.activeChildren = len(kids)
	for _, c := range kids {
		if bd, err := time.Parse("2006-01-02", c.DOB); err == nil && bd.Day() == td.Day() && bd.Month() == td.Month() {
			r.birthdays = append(r.birthdays, c.FirstName+" "+c.LastName)
		}
	}

	r.rooms = len(rooms)
	for _, rm := range rooms {
		r.capacity += rm.Capacity
	}
	if r.capacity == 0 {
		r.capacity = capacityHint
	}
	r.occupancy = percent(r.activeChildren, r.capacity)

	r.staffTotal = len(staff)
	activeStaff := make(map[string]bool, len(staff))
	for _, st := range staff {
		activeStaff[st.ID.Hex()] = true
	}
	for _, rec := range sAtt {
		if !activeStaff[rec.StaffID] {
			continue // ignore records for archived/inactive staff so present ≤ total
		}
		// Shared classification with the staff KPIs + attendance summary.
		if rec.IsWorking() {
			r.staffPresent++
		} else if models.IsAway(rec.Status) {
			r.staffOnLeave++
		}
	}

	// Count present only for active children (matching the occupancy denominator)
	// and de-dupe per child, so orphaned/duplicate records can't exceed 100%.
	activeChild := make(map[string]bool, len(kids))
	for _, c := range kids {
		activeChild[c.ID.Hex()] = true
	}
	counted := map[string]bool{}
	for _, rec := range att {
		if rec.Status == models.AttPresent && activeChild[rec.ChildID] && !counted[rec.ChildID] {
			counted[rec.ChildID] = true
			r.present++
		}
	}
	r.attendanceRate = clamp100(percent(r.present, r.activeChildren))

	if n, err := s.enquiries.Count(ctx, models.EnquiryFilter{Branch: slug}); err == nil {
		r.enquiries = int(n)
	} else {
		logWarnIf(err, "branch-overview: enquiry count failed", "branch", slug)
	}
	if n, err := s.enquiries.Count(ctx, models.EnquiryFilter{Branch: slug, Status: models.EnquiryStatusNew}); err == nil {
		r.newEnquiries = int(n)
	}

	r.safeguardingOpen, _ = s.daily.Count(ctx, repository.DailyRecordFilter{Type: string(models.RecSafeguarding), Status: string(models.RecOpen), Branch: slug})
	r.medicationDue, _ = s.daily.Count(ctx, repository.DailyRecordFilter{Type: string(models.RecMedication), Status: string(models.RecOpen), Date: date, Branch: slug})
	r.incidentsToday, _ = s.daily.Count(ctx, repository.DailyRecordFilter{Type: string(models.RecIncident), Date: date, Branch: slug})
	r.mealsServed, _ = s.daily.Count(ctx, repository.DailyRecordFilter{Type: string(models.RecMeal), Date: date, Branch: slug})
	return r
}

func clamp100(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

// Branch Health model tunables (B2). The dimension weights sum to 100. Kept as
// named constants (rather than scattered literals) so the model is auditable and
// easy to re-tune per org; move to a settings model if it ever needs to differ
// per branch.
const (
	neutralRatingPct     = 80 // review score assumed when a branch has no reviews yet
	maxStarRating        = 5  // Google/GBP star scale, for rating → percent
	complianceBase       = 100
	safeguardingPenalty  = 15 // points off compliance per open safeguarding concern
	incidentPenalty      = 8  // points off compliance per incident logged today
	admissionsBase       = 60
	admissionsPerEnquiry = 8 // points added per new enquiry

	weightOccupancy      = 20
	weightAttendance     = 20
	weightReviews        = 15
	weightStaffStability = 15
	weightCompliance     = 15
	weightAdmissions     = 15

	branchActivityLimit = 8 // recent daily-record rows shown on a branch dashboard
)

// performanceDimensions is the weighted Branch Health model (B2). Finance &
// parent-satisfaction proxy off reviews until those modules land.
func performanceDimensions(r branchRollup, rating float64) []models.PerfDimension {
	ratingPct := neutralRatingPct
	if rating > 0 {
		ratingPct = int(rating / maxStarRating * 100)
	}
	staffStability := 100
	if r.staffTotal > 0 {
		staffStability = percent(r.staffPresent, r.staffTotal)
	}
	compliance := clamp100(complianceBase - (r.safeguardingOpen*safeguardingPenalty + r.incidentsToday*incidentPenalty))
	admissions := clamp100(admissionsBase + r.newEnquiries*admissionsPerEnquiry)
	return []models.PerfDimension{
		{Label: "Occupancy", Score: clamp100(r.occupancy), Weight: weightOccupancy},
		{Label: "Attendance", Score: clamp100(r.attendanceRate), Weight: weightAttendance},
		{Label: "Reviews", Score: clamp100(ratingPct), Weight: weightReviews},
		{Label: "Staff stability", Score: clamp100(staffStability), Weight: weightStaffStability},
		{Label: "Compliance", Score: compliance, Weight: weightCompliance},
		{Label: "Admissions", Score: admissions, Weight: weightAdmissions},
	}
}

func overallPerformance(dims []models.PerfDimension) int {
	total, weight := 0.0, 0.0
	for _, d := range dims {
		total += float64(d.Score) * float64(d.Weight)
		weight += float64(d.Weight)
	}
	if weight == 0 {
		return 0
	}
	return int(total/weight + 0.5)
}

func performance(r branchRollup, rating float64) int {
	return overallPerformance(performanceDimensions(r, rating))
}

// Overview batches the org-wide reads ONCE and groups per branch in memory —
// the old shape issued ~11 queries PER BRANCH (audit finding: ~800 queries at
// 100 branches, several unindexed, inside the 15s write timeout) and discarded
// every error so a failing branch silently rendered as "0 children, 0 staff".
// The small per-branch counts (enquiries ×2, daily ×4 — indexed / tiny
// collections) stay per branch; the five heavy collection reads do not.
func (s *branchOverviewService) Overview(ctx context.Context, branches []models.Branch) ([]models.BranchOverviewRow, error) {
	date := today()
	td := time.Now()

	kids, kidsErr := s.children.FindAll(ctx, repository.ChildFilter{Status: string(models.ChildActive)})
	logWarnIf(kidsErr, "branch-overview: children read failed — child KPIs will be zero across all branches")
	rooms, roomsErr := s.rooms.FindAll(ctx, "")
	logWarnIf(roomsErr, "branch-overview: rooms read failed — capacity falls back to the branch hint")
	staff, staffErr := s.staff.FindAll(ctx, repository.StaffFilter{Status: string(models.StaffActive)})
	logWarnIf(staffErr, "branch-overview: staff read failed — staff KPIs will be zero across all branches")
	sAtt, sAttErr := s.staffAtt.FindByDate(ctx, date, "")
	logWarnIf(sAttErr, "branch-overview: staff attendance read failed — present counts will be zero")
	att, attErr := s.att.FindByDate(ctx, date, "")
	logWarnIf(attErr, "branch-overview: child attendance read failed — attendance rate will be zero")

	// Group everything by branch slug in one pass each.
	kidsBy := map[string][]models.Child{}
	for _, c := range kids {
		kidsBy[c.BranchSlug] = append(kidsBy[c.BranchSlug], c)
	}
	roomsBy := map[string][]models.Room{}
	for _, rm := range rooms {
		roomsBy[rm.BranchSlug] = append(roomsBy[rm.BranchSlug], rm)
	}
	staffBy := map[string][]models.Staff{}
	for _, st := range staff {
		staffBy[st.BranchSlug] = append(staffBy[st.BranchSlug], st)
	}
	sAttBy := map[string][]models.StaffAttendanceRecord{}
	for _, rec := range sAtt {
		sAttBy[rec.BranchSlug] = append(sAttBy[rec.BranchSlug], rec)
	}
	attBy := map[string][]models.AttendanceRecord{}
	for _, rec := range att {
		attBy[rec.BranchSlug] = append(attBy[rec.BranchSlug], rec)
	}

	rows := make([]models.BranchOverviewRow, 0, len(branches))
	for i := range branches {
		b := &branches[i]
		r := s.rollupFromGrouped(ctx, b.Slug, b.Capacity, td, date,
			kidsBy[b.Slug], roomsBy[b.Slug], staffBy[b.Slug], sAttBy[b.Slug], attBy[b.Slug])
		rows = append(rows, models.BranchOverviewRow{
			Slug: b.Slug, Name: b.Name, Ref: b.Ref, Status: string(b.Status), ManagerID: b.Managers.BranchManager,
			Children: r.activeChildren, Capacity: r.capacity, Occupancy: r.occupancy,
			Staff: r.staffTotal, StaffPresent: r.staffPresent, Rooms: r.rooms,
			Enquiries: r.enquiries, NewEnquiries: r.newEnquiries, AttendanceToday: r.attendanceRate,
			SafeguardingOpen: r.safeguardingOpen, MedicationDue: r.medicationDue,
			Rating: b.Google.Rating, Ofsted: b.OfstedRating, Performance: performance(r, b.Google.Rating),
			Lat: b.Lat, Lng: b.Lng,
		})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].Name < rows[j].Name })
	return rows, nil
}

func (s *branchOverviewService) Dashboard(ctx context.Context, b *models.Branch) (*models.BranchDashboard, error) {
	r := s.rollup(ctx, b.Slug, b.Capacity)
	available := r.capacity - r.activeChildren
	if available < 0 {
		available = 0
	}
	d := &models.BranchDashboard{
		Slug: b.Slug, Name: b.Name, Date: today(),
		ChildrenActive: r.activeChildren, ChildrenPresent: r.present, ChildrenExpected: r.activeChildren, AttendanceRate: r.attendanceRate,
		Capacity: r.capacity, Occupancy: r.occupancy, Available: available,
		StaffTotal: r.staffTotal, StaffPresent: r.staffPresent, StaffOnLeave: r.staffOnLeave, Rooms: r.rooms,
		Enquiries: r.enquiries, NewEnquiries: r.newEnquiries,
		MedicationDue: r.medicationDue, SafeguardingOpen: r.safeguardingOpen, IncidentsToday: r.incidentsToday, MealsServed: r.mealsServed,
		Rating: b.Google.Rating, ReviewCount: b.Google.ReviewCount, Ofsted: b.OfstedRating,
		Birthdays: r.birthdays,
	}
	if d.Birthdays == nil {
		d.Birthdays = []string{} // never emit null — the UI reads .length
	}
	dims := performanceDimensions(r, b.Google.Rating)
	d.Performance = overallPerformance(dims)
	d.PerformanceBreakdown = models.BranchPerformance{Overall: d.Performance, Dimensions: dims}
	// Live activity: most-recent daily records for this branch.
	d.Activity = []models.BranchActivityItem{}
	if recs, err := s.daily.FindAll(ctx, repository.DailyRecordFilter{Branch: b.Slug, Limit: branchActivityLimit}); err == nil {
		for _, rec := range recs {
			d.Activity = append(d.Activity, models.BranchActivityItem{
				Time: rec.Date, Text: rec.Title + branchActivitySuffix(rec), Kind: string(rec.Type),
			})
		}
	}
	return d, nil
}

func branchActivitySuffix(rec models.DailyRecord) string {
	if rec.ChildName != "" {
		return " · " + rec.ChildName
	}
	return ""
}
