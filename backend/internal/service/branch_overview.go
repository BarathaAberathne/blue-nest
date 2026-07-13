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

func (s *branchOverviewService) rollup(ctx context.Context, slug string, capacityHint int) branchRollup {
	date := today()
	var r branchRollup

	kids, _ := s.children.FindAll(ctx, repository.ChildFilter{Branch: slug, Status: string(models.ChildActive)})
	r.activeChildren = len(kids)
	td := time.Now()
	for _, c := range kids {
		if bd, err := time.Parse("2006-01-02", c.DOB); err == nil && bd.Day() == td.Day() && bd.Month() == td.Month() {
			r.birthdays = append(r.birthdays, c.FirstName+" "+c.LastName)
		}
	}

	rooms, _ := s.rooms.FindAll(ctx, slug)
	r.rooms = len(rooms)
	for _, rm := range rooms {
		r.capacity += rm.Capacity
	}
	if r.capacity == 0 {
		r.capacity = capacityHint
	}
	r.occupancy = percent(r.activeChildren, r.capacity)

	staff, _ := s.staff.FindAll(ctx, repository.StaffFilter{Branch: slug, Status: string(models.StaffActive)})
	r.staffTotal = len(staff)
	if sAtt, err := s.staffAtt.FindByDate(ctx, date, slug); err == nil {
		for _, rec := range sAtt {
			switch rec.Status {
			case models.StaffAttPresent:
				r.staffPresent++
			case models.StaffAttLeave, models.StaffAttSick:
				r.staffOnLeave++
			}
		}
	}

	if recs, err := s.att.FindByDate(ctx, date, slug); err == nil {
		for _, rec := range recs {
			if rec.Status == models.AttPresent {
				r.present++
			}
		}
	}
	r.attendanceRate = percent(r.present, r.activeChildren)

	if n, err := s.enquiries.Count(ctx, models.EnquiryFilter{Branch: slug}); err == nil {
		r.enquiries = int(n)
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

// performance is a lightweight composite health score (0–100). B2 replaces this
// with the full weighted model (finance, staff stability, satisfaction, …).
func performance(r branchRollup, rating float64) int {
	ratingPct := 0
	if rating > 0 {
		ratingPct = int(rating / 5 * 100)
	} else {
		ratingPct = 80 // no reviews yet → neutral
	}
	alertsPenalty := (r.safeguardingOpen*10 + r.incidentsToday*5)
	if alertsPenalty > 100 {
		alertsPenalty = 100
	}
	score := float64(r.occupancy)*0.3 + float64(r.attendanceRate)*0.3 + float64(ratingPct)*0.2 + float64(100-alertsPenalty)*0.2
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return int(score + 0.5)
}

func (s *branchOverviewService) Overview(ctx context.Context, branches []models.Branch) ([]models.BranchOverviewRow, error) {
	rows := make([]models.BranchOverviewRow, 0, len(branches))
	for i := range branches {
		b := &branches[i]
		r := s.rollup(ctx, b.Slug, b.Capacity)
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
		Performance: performance(r, b.Google.Rating), Birthdays: r.birthdays,
	}
	// Live activity: most-recent daily records for this branch.
	if recs, err := s.daily.FindAll(ctx, repository.DailyRecordFilter{Branch: b.Slug, Limit: 8}); err == nil {
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
