package service

import (
	"context"
	"errors"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type ChildService interface {
	List(ctx context.Context, f repository.ChildFilter) ([]models.Child, error)
	GetByID(ctx context.Context, id string) (*models.Child, error)
	Create(ctx context.Context, req models.ChildRequest) (*models.Child, error)
	Update(ctx context.Context, id string, req models.ChildRequest) (*models.Child, error)
	Delete(ctx context.Context, id string) error
	// Stats aggregates children/occupancy. Empty branch = org-wide (org-wide
	// roles); a branch-scoped caller passes their branch so the totals — and the
	// per-branch breakdown — never include another branch's counts.
	Stats(ctx context.Context, branch string) (*models.ChildStats, error)
	// EnsureFromEnquiry idempotently creates a child from a registered enquiry —
	// req carries the child's identity/branch (+ optionally funding/guardians/
	// sessions collected at registration time); enquiryID links the two records
	// and is the idempotency key (a re-run returns the already-linked child
	// unchanged, so a duplicate/retried "register" call never creates a
	// second Child).
	EnsureFromEnquiry(ctx context.Context, enquiryID string, req models.ChildRequest) (*models.Child, error)
	// SetKeyPerson assigns (or clears, with empty staffID) the child's key
	// person. The key person must be an active staff member at the child's branch.
	SetKeyPerson(ctx context.Context, childID, staffID string) (*models.Child, error)
	// KeyChildren lists the children a staff member is key person for.
	KeyChildren(ctx context.Context, staffID string) ([]models.Child, error)
	// CapacityForecast projects each room's booked children forward across
	// `weeks` (bounded to [1, maxCapacityForecastWeeks]) from the active
	// roster's weekly Sessions pattern — the Room planner / Future
	// availability report. Empty branch = org-wide.
	CapacityForecast(ctx context.Context, branch string, weeks int) (*models.CapacityForecast, error)
}

type childService struct {
	repo     repository.ChildRepository
	rooms    repository.RoomRepository
	counters repository.CounterRepository
	staff    repository.StaffRepository
}

func NewChildService(repo repository.ChildRepository, rooms repository.RoomRepository, counters repository.CounterRepository, staff repository.StaffRepository) ChildService {
	return &childService{repo: repo, rooms: rooms, counters: counters, staff: staff}
}

func (s *childService) List(ctx context.Context, f repository.ChildFilter) ([]models.Child, error) {
	return s.repo.FindAll(ctx, f)
}
func (s *childService) GetByID(ctx context.Context, id string) (*models.Child, error) {
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	s.resolveKeyPerson(ctx, c)
	return c, nil
}

// resolveKeyPerson fills the transient KeyPersonName from the staff record.
func (s *childService) resolveKeyPerson(ctx context.Context, c *models.Child) {
	if c == nil || c.KeyPersonID == "" || s.staff == nil {
		return
	}
	if st, err := s.staff.FindByID(ctx, c.KeyPersonID); err == nil && st != nil {
		c.KeyPersonName = strings.TrimSpace(st.FirstName + " " + st.LastName)
	}
}

func (s *childService) SetKeyPerson(ctx context.Context, childID, staffID string) (*models.Child, error) {
	child, err := s.repo.FindByID(ctx, childID)
	if err != nil {
		return nil, errors.New("child not found")
	}
	staffID = strings.TrimSpace(staffID)
	if staffID != "" {
		st, err := s.staff.FindByID(ctx, staffID)
		if err != nil || st == nil {
			return nil, errors.New("staff member not found")
		}
		if st.BranchSlug != child.BranchSlug {
			return nil, errors.New("the key person must be a staff member at the child's branch")
		}
	}
	updated, err := s.repo.SetKeyPerson(ctx, childID, staffID)
	if err != nil {
		return nil, err
	}
	s.resolveKeyPerson(ctx, updated)
	return updated, nil
}

func (s *childService) KeyChildren(ctx context.Context, staffID string) ([]models.Child, error) {
	if strings.TrimSpace(staffID) == "" {
		return []models.Child{}, nil
	}
	return s.repo.FindAll(ctx, repository.ChildFilter{KeyPerson: staffID})
}

// applyChild copies a ChildRequest onto a Child record for both Create and
// Update. Identity and safety-relevant fields only overwrite when the
// request actually supplies a value — a partial update (e.g. "just change
// room_id") must never silently wipe DOB/allergies/medical notes/guardians.
// RoomID stays unconditional: clearing it is the legitimate "unassign from
// room" action.
func applyChild(c *models.Child, req models.ChildRequest) {
	if s := strings.TrimSpace(req.FirstName); s != "" {
		c.FirstName = s
	}
	if s := strings.TrimSpace(req.LastName); s != "" {
		c.LastName = s
	}
	if s := strings.TrimSpace(req.DOB); s != "" {
		c.DOB = s
	}
	if s := strings.TrimSpace(req.Gender); s != "" {
		c.Gender = s
	}
	if s := strings.TrimSpace(req.BranchSlug); s != "" {
		c.BranchSlug = s
	}
	c.RoomID = strings.TrimSpace(req.RoomID)
	if req.Status != "" {
		c.Status = req.Status
	}
	if s := strings.TrimSpace(req.StartDate); s != "" {
		c.StartDate = s
	}
	if req.Guardians != nil {
		c.Guardians = req.Guardians
	}
	if req.FundingType != "" {
		c.FundingType = req.FundingType
	}
	if req.Sessions != nil {
		c.Sessions = req.Sessions
	}
	if s := strings.TrimSpace(req.Allergies); s != "" {
		c.Allergies = s
	}
	if s := strings.TrimSpace(req.DietaryReqs); s != "" {
		c.DietaryReqs = s
	}
	if s := strings.TrimSpace(req.MedicalNotes); s != "" {
		c.MedicalNotes = s
	}
}

// mintRef allocates the next CHD-YYYY-NNNNNN reference for the current year.
func (s *childService) mintRef(ctx context.Context) (string, error) {
	year := time.Now().Year()
	seq, err := s.counters.Next(ctx, models.CounterChild+"-"+strconv.Itoa(year))
	if err != nil {
		return "", err
	}
	return models.FormatRef(models.RefPrefixChild, year, seq), nil
}

// duplicateChild reports whether branch already has an active/waitlisted
// child with the same first+last name (case-insensitive) and DOB as the
// given record, other than excludeID (empty on create). "left" children are
// excluded — a former child re-enrolling under the same identity is a
// legitimate, not a duplicate, record.
func (s *childService) duplicateChild(ctx context.Context, branch string, c *models.Child, excludeID string) (bool, error) {
	if strings.TrimSpace(c.DOB) == "" {
		return false, nil // nothing to key a duplicate check on
	}
	children, err := s.repo.FindAll(ctx, repository.ChildFilter{Branch: branch})
	if err != nil {
		return false, err
	}
	for _, existing := range children {
		if existing.ID.Hex() == excludeID || existing.Status == models.ChildLeft {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(existing.FirstName), c.FirstName) &&
			strings.EqualFold(strings.TrimSpace(existing.LastName), c.LastName) &&
			existing.DOB == c.DOB {
			return true, nil
		}
	}
	return false, nil
}

func (s *childService) Create(ctx context.Context, req models.ChildRequest) (*models.Child, error) {
	if strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.LastName) == "" {
		return nil, errors.New("child first and last name are required")
	}
	if strings.TrimSpace(req.BranchSlug) == "" {
		return nil, errors.New("branch is required")
	}
	if req.Status != "" && !models.IsValidChildStatus(req.Status) {
		return nil, errors.New("invalid child status")
	}
	c := &models.Child{Status: models.ChildActive, FundingType: models.FundingNone}
	applyChild(c, req)
	if dup, err := s.duplicateChild(ctx, c.BranchSlug, c, ""); err != nil {
		return nil, err
	} else if dup {
		return nil, errors.New("a child with that name and date of birth already exists at this branch")
	}
	ref, err := s.mintRef(ctx)
	if err != nil {
		return nil, err
	}
	c.Ref = ref
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *childService) Update(ctx context.Context, id string, req models.ChildRequest) (*models.Child, error) {
	if req.Status != "" && !models.IsValidChildStatus(req.Status) {
		return nil, errors.New("invalid child status")
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	applyChild(existing, req)
	if dup, err := s.duplicateChild(ctx, existing.BranchSlug, existing, id); err != nil {
		return nil, err
	} else if dup {
		return nil, errors.New("a child with that name and date of birth already exists at this branch")
	}
	updated, err := s.repo.Update(ctx, id, *existing)
	if err != nil {
		return nil, err
	}
	// KeyPersonName is transient (bson:"-"), resolved via a staff lookup — the
	// repo's raw Decode leaves it blank, so it must be re-resolved here (same
	// as GetByID does) or a save would appear to have cleared the key person's
	// display name even though key_person_id itself is untouched.
	s.resolveKeyPerson(ctx, updated)
	return updated, nil
}

func (s *childService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *childService) EnsureFromEnquiry(ctx context.Context, enquiryID string, req models.ChildRequest) (*models.Child, error) {
	if existing, err := s.repo.FindByEnquiryID(ctx, enquiryID); err == nil && existing != nil {
		return existing, nil // already linked — idempotent
	}
	if req.Status == "" {
		req.Status = models.ChildActive
	}
	c := &models.Child{Status: models.ChildActive, FundingType: models.FundingNone, EnquiryID: enquiryID}
	applyChild(c, req)
	// A DIFFERENT enquiry registering the same name+DOB (e.g. two enquiry
	// threads for the same family) must link to the existing child, not
	// create a second enrolment record for it.
	if dup, err := s.duplicateChild(ctx, c.BranchSlug, c, ""); err != nil {
		return nil, err
	} else if dup {
		return nil, errors.New("a child with that name and date of birth already exists at this branch")
	}
	ref, err := s.mintRef(ctx)
	if err != nil {
		return nil, err
	}
	c.Ref = ref
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// ageYears returns whole years from a YYYY-MM-DD dob (0 if unparseable).
// Age-group buckets for the children stats breakdown. The top bucket is
// unbounded (every child from 3 up), so it is labelled "3+ years" rather than a
// misleading closed "3–5 years" range.
const (
	ageBucket2 = 2
	ageBucket3 = 3

	ageGroupUnder2 = "Under 2"
	ageGroup2to3   = "2–3 years"
	ageGroup3plus  = "3+ years"
)

func ageYears(dob string) int {
	t, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return 0
	}
	now := time.Now()
	years := now.Year() - t.Year()
	if now.YearDay() < t.YearDay() {
		years--
	}
	if years < 0 {
		years = 0
	}
	return years
}

func (s *childService) Stats(ctx context.Context, branch string) (*models.ChildStats, error) {
	children, err := s.repo.FindAll(ctx, repository.ChildFilter{Branch: branch})
	if err != nil {
		return nil, err
	}
	rooms, err := s.rooms.FindAll(ctx, branch)
	if err != nil {
		return nil, err
	}

	capByBranch := map[string]int{}
	totalCap := 0
	for _, r := range rooms {
		capByBranch[r.BranchSlug] += r.Capacity
		totalCap += r.Capacity
	}

	stats := &models.ChildStats{Capacity: totalCap}
	childrenByBranch := map[string]int{}
	ageGroups := map[string]int{ageGroupUnder2: 0, ageGroup2to3: 0, ageGroup3plus: 0}
	for _, c := range children {
		stats.Total++
		switch c.Status {
		case models.ChildActive:
			stats.Active++
			childrenByBranch[c.BranchSlug]++
			switch a := ageYears(c.DOB); {
			case a < ageBucket2:
				ageGroups[ageGroupUnder2]++
			case a < ageBucket3:
				ageGroups[ageGroup2to3]++
			default:
				ageGroups[ageGroup3plus]++ // unbounded top bucket (labelled "3+ years")
			}
		case models.ChildWaitlist:
			stats.Waitlist++
		}
	}
	stats.Available = totalCap - stats.Active
	if stats.Available < 0 {
		stats.Available = 0
	}
	stats.OccupancyRate = percent(stats.Active, totalCap)

	// deterministic ordering
	branches := make([]string, 0, len(capByBranch)+len(childrenByBranch))
	seen := map[string]bool{}
	for b := range capByBranch {
		if !seen[b] {
			branches = append(branches, b)
			seen[b] = true
		}
	}
	for b := range childrenByBranch {
		if !seen[b] {
			branches = append(branches, b)
			seen[b] = true
		}
	}
	sort.Strings(branches)
	for _, b := range branches {
		cap := capByBranch[b]
		ch := childrenByBranch[b]
		rate := percent(ch, cap)
		stats.Branches = append(stats.Branches, models.BranchChildStat{Branch: b, Children: ch, Capacity: cap, OccupancyRate: rate})
		stats.ByBranch = append(stats.ByBranch, models.ChildStatPoint{Label: b, Value: ch})
	}
	for _, g := range []string{ageGroupUnder2, ageGroup2to3, ageGroup3plus} {
		stats.ByAgeGroup = append(stats.ByAgeGroup, models.ChildStatPoint{Label: g, Value: ageGroups[g]})
	}
	return stats, nil
}

const (
	defaultCapacityForecastWeeks = 12 // ~3 months ahead
	maxCapacityForecastWeeks     = 26 // ~6 months — a sane ceiling against abuse
)

var forecastWeekdays = []string{"Mon", "Tue", "Wed", "Thu", "Fri"}

// mondayOf returns the Monday (00:00) of t's week.
func mondayOf(t time.Time) time.Time {
	t = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
	offset := int(time.Monday - t.Weekday())
	if offset > 0 {
		offset -= 7
	}
	return t.AddDate(0, 0, offset)
}

// sessionCovers reports whether a session type occupies the AM slot
// (~08:00–13:00) and/or PM slot (~13:00–18:00) — mirrors the frontend's
// SESSION_TYPES (am/pm/school/full); "school" spans the midday split so it
// counts toward both.
func sessionCovers(sessionType string) (am, pm bool) {
	switch sessionType {
	case "am":
		return true, false
	case "pm":
		return false, true
	case "school", "full":
		return true, true
	default:
		return false, false
	}
}

// sessionTypeFor returns the child's booked session type for a weekday
// ("" if not attending that day).
func sessionTypeFor(sessions []models.ChildSession, day string) string {
	for _, s := range sessions {
		if s.Day == day {
			return s.Type
		}
	}
	return ""
}

// childStarted reports whether c has started (or will have started) by date —
// an empty/unparseable StartDate is treated as already-started so legacy
// records without one are never silently dropped from the forecast.
func childStarted(c models.Child, date time.Time) bool {
	start := strings.TrimSpace(c.StartDate)
	if start == "" {
		return true
	}
	t, err := time.Parse("2006-01-02", start)
	if err != nil {
		return true
	}
	return !date.Before(t)
}

// requiredStaff is ceil(children / ratio); 0 when there's nothing to staff or
// no ratio is configured.
func requiredStaff(children, ratio int) int {
	if ratio <= 0 || children <= 0 {
		return 0
	}
	return (children + ratio - 1) / ratio
}

func (s *childService) CapacityForecast(ctx context.Context, branch string, weeks int) (*models.CapacityForecast, error) {
	if weeks <= 0 {
		weeks = defaultCapacityForecastWeeks
	}
	if weeks > maxCapacityForecastWeeks {
		weeks = maxCapacityForecastWeeks
	}

	rooms, err := s.rooms.FindAll(ctx, branch)
	if err != nil {
		return nil, err
	}
	children, err := s.repo.FindAll(ctx, repository.ChildFilter{Branch: branch, Status: string(models.ChildActive)})
	if err != nil {
		return nil, err
	}

	byRoom := map[string][]models.Child{}
	for _, c := range children {
		if c.RoomID != "" {
			byRoom[c.RoomID] = append(byRoom[c.RoomID], c)
		}
	}

	firstMonday := mondayOf(time.Now())
	weekStarts := make([]string, weeks)
	for i := 0; i < weeks; i++ {
		weekStarts[i] = firstMonday.AddDate(0, 0, 7*i).Format("2006-01-02")
	}

	forecast := &models.CapacityForecast{Weeks: weekStarts}
	for _, room := range rooms {
		roomID := room.ID.Hex()
		rf := models.RoomCapacityForecast{
			RoomID: roomID, RoomName: room.Name, BranchSlug: room.BranchSlug,
			Capacity: room.Capacity, StaffRatio: room.StaffRatio,
		}
		roomChildren := byRoom[roomID]
		for i := 0; i < weeks; i++ {
			weekMonday := firstMonday.AddDate(0, 0, 7*i)
			week := models.CapacityWeek{WeekStart: weekStarts[i]}
			for d, label := range forecastWeekdays {
				date := weekMonday.AddDate(0, 0, d)
				am, pm := 0, 0
				for _, c := range roomChildren {
					if !childStarted(c, date) {
						continue
					}
					sessAM, sessPM := sessionCovers(sessionTypeFor(c.Sessions, label))
					if sessAM {
						am++
					}
					if sessPM {
						pm++
					}
				}
				week.Days = append(week.Days, models.CapacityDay{
					Day:             label,
					AMChildren:      am,
					AMAvailable:     room.Capacity - am,
					AMStaffRequired: requiredStaff(am, room.StaffRatio),
					PMChildren:      pm,
					PMAvailable:     room.Capacity - pm,
					PMStaffRequired: requiredStaff(pm, room.StaffRatio),
				})
			}
			rf.Weeks = append(rf.Weeks, week)
		}
		forecast.Rooms = append(forecast.Rooms, rf)
	}
	return forecast, nil
}
