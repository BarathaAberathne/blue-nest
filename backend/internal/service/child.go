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
	// Archive marks a leaving child as left (status=left + leave_date) and
	// ends any live room placements so the child stops occupying capacity.
	Archive(ctx context.Context, id, leaveDate string) (*models.Child, error)
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
	// roomAssignments is the canonical child→room model; the child service
	// only READS from it to project the computed Child.RoomID and ends a
	// child's placements on delete (nil-safe for unit tests).
	roomAssignments ChildRoomAssignmentService
	// taxonomy supplies the org-configurable age bands for Stats bucketing;
	// nil-safe — when absent, Stats falls back to the built-in default bands.
	taxonomy repository.TaxonomyRepository
	// parentRels/parents back the computed Guardians projection: once a child
	// has canonical child_parent_relationships, they REPLACE the legacy
	// embedded guardians array at read time (nil-safe for unit tests).
	parentRels repository.ChildParentRepository
	parents    repository.ParentRepository
}

func NewChildService(repo repository.ChildRepository, rooms repository.RoomRepository, counters repository.CounterRepository, staff repository.StaffRepository, roomAssignments ChildRoomAssignmentService, taxonomy repository.TaxonomyRepository, parentRels repository.ChildParentRepository, parents repository.ParentRepository) ChildService {
	return &childService{repo: repo, rooms: rooms, counters: counters, staff: staff, roomAssignments: roomAssignments, taxonomy: taxonomy, parentRels: parentRels, parents: parents}
}

func (s *childService) List(ctx context.Context, f repository.ChildFilter) ([]models.Child, error) {
	children, err := s.repo.FindAll(ctx, f)
	if err != nil {
		return nil, err
	}
	// Project the computed current room from the canonical assignment model
	// (one batched query — no stored scalar, no N+1).
	if s.roomAssignments != nil {
		rooms := s.roomAssignments.CurrentRoomsByBranch(ctx, f.Branch)
		names := s.roomNameMap(ctx, f.Branch)
		for i := range children {
			if rid, ok := rooms[children[i].ID.Hex()]; ok {
				children[i].RoomID = rid
				children[i].RoomName = names[rid]
			}
		}
	}
	return children, nil
}
func (s *childService) GetByID(ctx context.Context, id string) (*models.Child, error) {
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	s.resolveKeyPerson(ctx, c)
	s.resolveRoom(ctx, c)
	s.resolveGuardians(ctx, c)
	return c, nil
}

// resolveGuardians projects the canonical child_parent_relationships onto the
// legacy Guardians shape for display compatibility. Once ANY relationship
// exists the projection wins; children not yet migrated keep their embedded
// array. (Same playbook as room_id → room assignments.)
func (s *childService) resolveGuardians(ctx context.Context, c *models.Child) {
	if c == nil || s.parentRels == nil || s.parents == nil {
		return
	}
	rels, err := s.parentRels.FindByChild(ctx, c.ID.Hex())
	if err != nil || len(rels) == 0 {
		return
	}
	ids := make([]string, 0, len(rels))
	for _, r := range rels {
		ids = append(ids, r.ParentID)
	}
	people, err := s.parents.FindByIDs(ctx, ids)
	if err != nil {
		return
	}
	byID := map[string]models.Parent{}
	for _, p := range people {
		byID[p.ID.Hex()] = p
	}
	out := make([]models.Guardian, 0, len(rels))
	for _, r := range rels {
		p, ok := byID[r.ParentID]
		if !ok {
			continue
		}
		phone := p.MobilePhone
		if phone == "" {
			phone = p.HomePhone
		}
		out = append(out, models.Guardian{
			Name:     strings.TrimSpace(p.FirstName + " " + p.LastName),
			Relation: r.Relationship,
			Email:    p.Email,
			Phone:    phone,
			Primary:  r.PrimaryContact,
		})
	}
	if len(out) > 0 {
		c.Guardians = out
	}
}

// resolveRoom fills the transient RoomID/RoomName from the child's current
// active placement in the canonical assignment model.
func (s *childService) resolveRoom(ctx context.Context, c *models.Child) {
	if c == nil || s.roomAssignments == nil {
		return
	}
	rid := s.roomAssignments.CurrentRoom(ctx, c.ID.Hex())
	if rid == "" {
		return
	}
	c.RoomID = rid
	if room, err := s.rooms.FindByID(ctx, rid); err == nil && room != nil {
		c.RoomName = room.Name
	}
}

// roomNameMap builds room_id → name for a branch (empty = all).
func (s *childService) roomNameMap(ctx context.Context, branch string) map[string]string {
	out := map[string]string{}
	if s.rooms == nil {
		return out
	}
	rooms, err := s.rooms.FindAll(ctx, branch)
	if err != nil {
		return out
	}
	for _, r := range rooms {
		out[r.ID.Hex()] = r.Name
	}
	return out
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
// request actually supplies a value — a partial update must never silently
// wipe DOB/allergies/medical notes/guardians. Room placement is NOT a field
// here: it is managed solely through the child-room-assignment endpoints.
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
	if req.AllergyTags != nil {
		c.AllergyTags = req.AllergyTags
	}
	if req.DietaryTags != nil {
		c.DietaryTags = req.DietaryTags
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

// dobNotInFuture rejects a date of birth after today — a child cannot be born
// in the future. Catches year-typo registrations before they create a record.
func dobNotInFuture(dob string) error {
	d := strings.TrimSpace(dob)
	if d == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", d)
	if err != nil {
		return errors.New("date of birth must be YYYY-MM-DD")
	}
	if t.After(time.Now()) {
		return errors.New("date of birth cannot be in the future")
	}
	return nil
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
	if err := dobNotInFuture(req.DOB); err != nil {
		return nil, err
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
	// Room placement is a first-class operation via the child-room-assignment
	// endpoint — not a field on the child record — so Create never touches it.
	return c, nil
}

func (s *childService) Update(ctx context.Context, id string, req models.ChildRequest) (*models.Child, error) {
	if req.Status != "" && !models.IsValidChildStatus(req.Status) {
		return nil, errors.New("invalid child status")
	}
	if err := dobNotInFuture(req.DOB); err != nil {
		return nil, err
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
	// KeyPersonName + RoomName are transient (bson:"-"), resolved from their
	// canonical sources — re-resolve so an edit doesn't appear to blank them.
	s.resolveKeyPerson(ctx, updated)
	s.resolveRoom(ctx, updated)
	return updated, nil
}

// normalizeLeaveDate defaults an empty leave date to today and validates the
// YYYY-MM-DD format otherwise.
func normalizeLeaveDate(s string) (string, error) {
	if s == "" {
		return time.Now().Format("2006-01-02"), nil
	}
	if _, err := time.Parse("2006-01-02", s); err != nil {
		return "", errors.New("leave_date must be YYYY-MM-DD")
	}
	return s, nil
}

func (s *childService) Archive(ctx context.Context, id, leaveDate string) (*models.Child, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.Status == models.ChildLeft {
		return nil, errors.New("child is already marked as left")
	}
	leaveDate, err = normalizeLeaveDate(leaveDate)
	if err != nil {
		return nil, err
	}
	existing.Status = models.ChildLeft
	existing.LeaveDate = leaveDate
	updated, err := s.repo.Update(ctx, id, *existing)
	if err != nil {
		return nil, err
	}
	// End (never delete) live placements so the room's capacity frees up and
	// history stays intact.
	if s.roomAssignments != nil {
		s.roomAssignments.EndAllForChild(ctx, id, "child-left")
	}
	s.resolveKeyPerson(ctx, updated)
	s.resolveRoom(ctx, updated)
	return updated, nil
}

func (s *childService) Delete(ctx context.Context, id string) error {
	// End (never delete) any live placements first so their room can later be
	// deactivated/deleted without dangling active rows.
	if s.roomAssignments != nil {
		s.roomAssignments.EndAllForChild(ctx, id, "child-deleted")
	}
	return s.repo.Delete(ctx, id)
}

func (s *childService) EnsureFromEnquiry(ctx context.Context, enquiryID string, req models.ChildRequest) (*models.Child, error) {
	if err := dobNotInFuture(req.DOB); err != nil {
		return nil, err
	}
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

// Default age-group labels used when an org has not configured its own age_group
// taxonomy. The top bucket is unbounded (every child from 3 up), so it is
// labelled "3+ years" rather than a misleading closed "3–5 years" range.
const (
	ageGroupUnder2 = "Under 2"
	ageGroup2to3   = "2–3 years"
	ageGroup3plus  = "3+ years"
)

// ageMonths returns a child's whole-month age from their DOB.
func ageMonths(dob string) int {
	t, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return 0
	}
	now := time.Now()
	months := (now.Year()-t.Year())*12 + int(now.Month()) - int(t.Month())
	if now.Day() < t.Day() {
		months--
	}
	if months < 0 {
		months = 0
	}
	return months
}

// ageBand is one bucket for child-stats grouping; Max 0 = unbounded top band.
type ageBand struct {
	label    string
	min, max int // months
}

// ageBands returns the org's configured age groups (sorted), falling back to the
// built-in Under 2 / 2–3 / 3+ bands when none are configured or taxonomy is
// unavailable, so behaviour is unchanged until an org customises them.
func (s *childService) ageBands(ctx context.Context) []ageBand {
	if s.taxonomy != nil {
		terms, err := s.taxonomy.FindAll(ctx, repository.TaxonomyFilter{
			Category: models.TaxonomyAgeGroup, ActiveOnly: true, OrgWideAlso: true,
		})
		if err == nil && len(terms) > 0 {
			sort.Slice(terms, func(i, j int) bool { return terms[i].SortOrder < terms[j].SortOrder })
			bands := make([]ageBand, 0, len(terms))
			for _, t := range terms {
				bands = append(bands, ageBand{label: t.Label, min: t.MinAgeMonths, max: t.MaxAgeMonths})
			}
			return bands
		}
	}
	return []ageBand{
		{ageGroupUnder2, 0, 24},
		{ageGroup2to3, 24, 36},
		{ageGroup3plus, 36, 0},
	}
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
	// Age buckets come from the org-configurable age_group taxonomy (falls back
	// to the built-in bands). Children are placed into the first band whose
	// [min, max) months range contains their age (max 0 = unbounded top).
	bands := s.ageBands(ctx)
	ageCounts := make([]int, len(bands))
	for _, c := range children {
		stats.Total++
		switch c.Status {
		case models.ChildActive:
			stats.Active++
			childrenByBranch[c.BranchSlug]++
			m := ageMonths(c.DOB)
			for i, b := range bands {
				if m >= b.min && (b.max == 0 || m < b.max) {
					ageCounts[i]++
					break
				}
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
	for i, b := range bands {
		stats.ByAgeGroup = append(stats.ByAgeGroup, models.ChildStatPoint{Label: b.label, Value: ageCounts[i]})
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

// slotCoverage is a session code → (covers AM, covers PM) map derived from the
// org's session_type taxonomy times.
type slotCoverage map[string][2]bool

// middayCutoff splits the day into the planner's AM/PM slots.
const middayCutoff = "13:00"

// sessionSlotCoverage builds the coverage map from the org-configurable
// session_type terms: a session covers the AM slot when it starts before
// midday and the PM slot when it ends after midday. Session codes are
// org-specific (derived from each org's labels), so the classifier must come
// from the org's own configuration, never a hardcoded code list — an org whose
// codes aren't am/pm/full/school otherwise counts as zero booked everywhere.
// Terms without times fall through to the legacy fallback in sessionCovers.
func (s *childService) sessionSlotCoverage(ctx context.Context) slotCoverage {
	cov := slotCoverage{}
	if s.taxonomy == nil {
		return cov
	}
	terms, err := s.taxonomy.FindAll(ctx, repository.TaxonomyFilter{Category: models.TaxonomySessionType})
	if err != nil {
		return cov
	}
	for _, t := range terms {
		start, end := strings.TrimSpace(t.StartTime), strings.TrimSpace(t.EndTime)
		if start == "" || end == "" {
			continue
		}
		cov[t.Code] = [2]bool{start < middayCutoff, end > middayCutoff}
	}
	return cov
}

// sessionCovers reports whether a session type occupies the AM slot
// (~08:00–13:00) and/or PM slot (~13:00–18:00). The org's configured
// session_type times decide; the legacy am/pm/school/full switch remains the
// fallback for codes with no configured term (pre-taxonomy child records).
func sessionCovers(cov slotCoverage, sessionType string) (am, pm bool) {
	if c, ok := cov[sessionType]; ok {
		return c[0], c[1]
	}
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

// placementResolver answers "which room is this child in on date D" from the
// branch's live (active + scheduled) placement rows: the row with the LATEST
// start_date on or before D wins — a scheduled transfer therefore takes over
// from its effective date in forward projections, while dates before it still
// resolve to the current room.
type placementResolver struct {
	byChild map[string][]models.ChildRoomAssignment // sorted by StartDate desc
}

func newPlacementResolver(rows []models.ChildRoomAssignment) *placementResolver {
	byChild := map[string][]models.ChildRoomAssignment{}
	for _, r := range rows {
		byChild[r.ChildID] = append(byChild[r.ChildID], r)
	}
	for id := range byChild {
		rs := byChild[id]
		sort.Slice(rs, func(i, j int) bool { return rs[i].StartDate > rs[j].StartDate })
		byChild[id] = rs
	}
	return &placementResolver{byChild: byChild}
}

// roomOn returns the child's room id as of date (YYYY-MM-DD), "" if unplaced.
// Dates before the child's FIRST placement resolve to that earliest placement
// (retroactive): the planner is a planning surface, so a child placed mid-week
// still counts across the whole displayed week — only a scheduled TRANSFER
// flips rooms at its effective date.
func (p *placementResolver) roomOn(childID, date string) string {
	rows := p.byChild[childID]
	for _, r := range rows {
		if r.StartDate == "" || r.StartDate <= date {
			return r.RoomID
		}
	}
	if len(rows) > 0 {
		return rows[len(rows)-1].RoomID // earliest placement, applied retroactively
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

	// Resolve each child's room PER DATE from the canonical assignment model
	// (active + scheduled rows, two batched queries) — a scheduled transfer
	// shows in the week it takes effect, not just after it activates.
	var resolver *placementResolver
	if s.roomAssignments != nil {
		resolver = newPlacementResolver(s.roomAssignments.PlacementsByBranch(ctx, branch))
	} else {
		resolver = newPlacementResolver(nil)
	}

	firstMonday := mondayOf(time.Now())
	weekStarts := make([]string, weeks)
	for i := 0; i < weeks; i++ {
		weekStarts[i] = firstMonday.AddDate(0, 0, 7*i).Format("2006-01-02")
	}

	// AM/PM classification comes from the org's configured session times.
	coverage := s.sessionSlotCoverage(ctx)

	forecast := &models.CapacityForecast{Weeks: weekStarts}
	for _, room := range rooms {
		roomID := room.ID.Hex()
		rf := models.RoomCapacityForecast{
			RoomID: roomID, RoomName: room.Name, BranchSlug: room.BranchSlug,
			Capacity: room.Capacity, StaffRatio: room.StaffRatio,
		}
		for i := 0; i < weeks; i++ {
			weekMonday := firstMonday.AddDate(0, 0, 7*i)
			week := models.CapacityWeek{WeekStart: weekStarts[i]}
			for d, label := range forecastWeekdays {
				date := weekMonday.AddDate(0, 0, d)
				dateStr := date.Format("2006-01-02")
				am, pm := 0, 0
				for _, c := range children {
					if resolver.roomOn(c.ID.Hex(), dateStr) != roomID {
						continue
					}
					if !childStarted(c, date) {
						continue
					}
					sessAM, sessPM := sessionCovers(coverage, sessionTypeFor(c.Sessions, label))
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
