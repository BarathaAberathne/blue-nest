package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// This file is the ONE authoritative implementation of room allocation.
// Room-profile endpoints and staff/child-profile endpoints all call the same
// service methods below — allocation business logic must never be duplicated
// in a second controller path (see docs/rooms/room-allocation-design.md).

// Errors callers may branch on. ErrOutsideScope is shared with shifts.
var (
	ErrRoomInactive      = errors.New("room is inactive and cannot receive new allocations")
	ErrSameRoomTransfer  = errors.New("child is already in that room")
	ErrCapacityFull      = errors.New("room is at capacity — provide an override reason to allocate anyway")
	ErrAgeMismatch       = errors.New("child's age is outside the room's age range — provide an override reason to allocate anyway")
	ErrDuplicateActive   = errors.New("an identical active allocation already exists")
	ErrHasActiveRoom     = errors.New("child already has an active room — use transfer instead")
	ErrCrossBranch       = errors.New("room and person must belong to the same branch")
	ErrInactivePerson    = errors.New("inactive people cannot receive a new allocation")
	ErrNothingToTransfer = errors.New("child has no active room assignment to transfer from")
)

func todayYMD() string { return time.Now().Format("2006-01-02") }

// validYMD accepts an empty string (callers default it) or YYYY-MM-DD.
func validYMD(s string) bool {
	if s == "" {
		return true
	}
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}

// ageInMonths returns the child's whole-month age at the given date, or -1
// when the DOB is missing/unparseable (age checks are then skipped).
func ageInMonths(dob, at string) int {
	b, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return -1
	}
	a, err := time.Parse("2006-01-02", at)
	if err != nil {
		return -1
	}
	months := (a.Year()-b.Year())*12 + int(a.Month()) - int(b.Month())
	if a.Day() < b.Day() {
		months--
	}
	if months < 0 {
		return -1
	}
	return months
}

// ── Staff room assignments ────────────────────────────────────────────────────

type StaffRoomAssignmentService interface {
	// Assign creates an active assignment. Called identically from the room
	// profile and the staff profile.
	Assign(ctx context.Context, req models.StaffRoomAssignmentRequest, actor string, allowed []string) (*models.StaffRoomAssignment, error)
	// Update ends an assignment and/or changes its primary flag or room role.
	Update(ctx context.Context, id string, req models.StaffRoomAssignmentUpdate, actor string, allowed []string) (*models.StaffRoomAssignment, error)
	ListForStaff(ctx context.Context, staffID string, includeHistory bool, allowed []string) ([]models.StaffRoomAssignment, error)
	ListForRoom(ctx context.Context, roomID string, includeHistory bool, allowed []string) ([]models.StaffRoomAssignment, error)
	// PrimaryRoom returns a staff member's current primary active room id
	// ("" if none) — projects the computed Staff.RoomID at read time.
	PrimaryRoom(ctx context.Context, staffID string) string
	// PrimaryRoomsByBranch returns staff_id → primary active room_id for a
	// branch in one query — the batch projection for staff list responses.
	PrimaryRoomsByBranch(ctx context.Context, branch string) map[string]string
	// EndAllForStaff ends every active assignment for a staff member (used on
	// delete) so no dangling active row is left referencing a removed person.
	EndAllForStaff(ctx context.Context, staffID, actor string)
}

type staffRoomAssignmentService struct {
	repo  repository.StaffRoomAssignmentRepository
	staff repository.StaffRepository
	rooms repository.RoomRepository
}

func NewStaffRoomAssignmentService(repo repository.StaffRoomAssignmentRepository, staff repository.StaffRepository, rooms repository.RoomRepository) StaffRoomAssignmentService {
	return &staffRoomAssignmentService{repo: repo, staff: staff, rooms: rooms}
}

// PrimaryStaffRooms returns staff_id → primary active room_id for a branch
// (empty branch = all). The staff service uses this to project the computed
// Staff.RoomID at read time — the assignment model stays the only source of
// truth (no stored scalar, no sync).
func PrimaryStaffRooms(ctx context.Context, repo repository.StaffRoomAssignmentRepository, branch string) map[string]string {
	out := map[string]string{}
	active, err := repo.FindAll(ctx, repository.StaffRoomAssignmentFilter{Branch: branch, Status: models.AssignmentActive})
	if err != nil {
		log.Printf("room-assignment: PrimaryStaffRooms(%q) failed: %v", branch, err)
		return out
	}
	for _, a := range active {
		if a.IsPrimary {
			out[a.StaffID] = a.RoomID
		}
	}
	return out
}

func (s *staffRoomAssignmentService) PrimaryRoom(ctx context.Context, staffID string) string {
	active, err := s.repo.FindAll(ctx, repository.StaffRoomAssignmentFilter{StaffID: staffID, Status: models.AssignmentActive})
	if err != nil {
		return ""
	}
	for _, a := range active {
		if a.IsPrimary {
			return a.RoomID
		}
	}
	return ""
}

func (s *staffRoomAssignmentService) PrimaryRoomsByBranch(ctx context.Context, branch string) map[string]string {
	return PrimaryStaffRooms(ctx, s.repo, branch)
}

func (s *staffRoomAssignmentService) EndAllForStaff(ctx context.Context, staffID, actor string) {
	active, err := s.repo.FindAll(ctx, repository.StaffRoomAssignmentFilter{StaffID: staffID, Status: models.AssignmentActive})
	if err != nil {
		log.Printf("room-assignment: EndAllForStaff(%s) failed: %v", staffID, err)
		return
	}
	for i := range active {
		active[i].Status = models.AssignmentEnded
		active[i].EndDate = todayYMD()
		active[i].IsPrimary = false
		active[i].UpdatedBy = actor
		if err := s.repo.Update(ctx, &active[i]); err != nil {
			log.Printf("room-assignment: EndAllForStaff(%s) failed: %v", staffID, err)
		}
	}
}

func (s *staffRoomAssignmentService) resolveNames(ctx context.Context, list []models.StaffRoomAssignment) {
	roomNames := map[string]string{}
	staffNames := map[string]string{}
	for i := range list {
		a := &list[i]
		if _, ok := roomNames[a.RoomID]; !ok {
			if room, err := s.rooms.FindByID(ctx, a.RoomID); err == nil {
				roomNames[a.RoomID] = room.Name
			}
		}
		if _, ok := staffNames[a.StaffID]; !ok {
			if st, err := s.staff.FindByID(ctx, a.StaffID); err == nil {
				staffNames[a.StaffID] = strings.TrimSpace(st.FirstName + " " + st.LastName)
			}
		}
		a.RoomName = roomNames[a.RoomID]
		a.StaffName = staffNames[a.StaffID]
	}
}

func (s *staffRoomAssignmentService) Assign(ctx context.Context, req models.StaffRoomAssignmentRequest, actor string, allowed []string) (*models.StaffRoomAssignment, error) {
	staffID := strings.TrimSpace(req.StaffID)
	roomID := strings.TrimSpace(req.RoomID)
	if staffID == "" || roomID == "" {
		return nil, errors.New("staff_id and room_id are required")
	}
	if !validYMD(req.StartDate) || !validYMD(req.EndDate) {
		return nil, errors.New("dates must be YYYY-MM-DD")
	}
	st, err := s.staff.FindByID(ctx, staffID)
	if err != nil {
		return nil, errors.New("staff member not found")
	}
	room, err := s.rooms.FindByID(ctx, roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if st.Status == models.StaffInactive {
		return nil, ErrInactivePerson
	}
	if !room.IsActive() {
		return nil, ErrRoomInactive
	}
	if st.BranchSlug != room.BranchSlug {
		return nil, ErrCrossBranch
	}
	if !policy.InAllowed(allowed, room.BranchSlug) {
		return nil, ErrOutsideScope
	}
	// Duplicate prevention (the partial unique index is the racing backstop).
	existing, err := s.repo.FindAll(ctx, repository.StaffRoomAssignmentFilter{StaffID: staffID, Status: models.AssignmentActive})
	if err != nil {
		return nil, err
	}
	for _, a := range existing {
		if a.RoomID == roomID {
			return nil, ErrDuplicateActive
		}
	}
	start := strings.TrimSpace(req.StartDate)
	if start == "" {
		start = todayYMD()
	}
	a := &models.StaffRoomAssignment{
		BranchSlug: room.BranchSlug,
		RoomID:     roomID,
		StaffID:    staffID,
		RoleInRoom: strings.TrimSpace(req.RoleInRoom),
		// The first room a staff member is allocated to becomes their primary
		// automatically; after that the caller opts in.
		IsPrimary: req.IsPrimary || len(existing) == 0,
		StartDate: start,
		EndDate:   strings.TrimSpace(req.EndDate),
		Status:    models.AssignmentActive,
		CreatedBy: actor,
	}
	if a.IsPrimary {
		if err := s.clearPrimary(ctx, staffID, actor); err != nil {
			return nil, err
		}
	}
	if err := s.repo.Create(ctx, a); err != nil {
		if strings.Contains(err.Error(), "E11000") {
			return nil, ErrDuplicateActive
		}
		return nil, err
	}
	a.RoomName = room.Name
	a.StaffName = strings.TrimSpace(st.FirstName + " " + st.LastName)
	return a, nil
}

func (s *staffRoomAssignmentService) clearPrimary(ctx context.Context, staffID, actor string) error {
	active, err := s.repo.FindAll(ctx, repository.StaffRoomAssignmentFilter{StaffID: staffID, Status: models.AssignmentActive})
	if err != nil {
		return err
	}
	for i := range active {
		if active[i].IsPrimary {
			active[i].IsPrimary = false
			active[i].UpdatedBy = actor
			if err := s.repo.Update(ctx, &active[i]); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *staffRoomAssignmentService) Update(ctx context.Context, id string, req models.StaffRoomAssignmentUpdate, actor string, allowed []string) (*models.StaffRoomAssignment, error) {
	a, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("assignment not found")
	}
	if !policy.InAllowed(allowed, a.BranchSlug) {
		return nil, ErrOutsideScope
	}
	if req.End {
		if a.Status == models.AssignmentEnded {
			return nil, errors.New("assignment is already ended")
		}
		end := strings.TrimSpace(req.EndDate)
		if end == "" {
			end = todayYMD()
		}
		if !validYMD(end) {
			return nil, errors.New("dates must be YYYY-MM-DD")
		}
		a.Status = models.AssignmentEnded
		a.EndDate = end
		a.IsPrimary = false
	}
	if req.RoleInRoom != nil {
		a.RoleInRoom = strings.TrimSpace(*req.RoleInRoom)
	}
	if req.IsPrimary != nil && !req.End {
		if *req.IsPrimary {
			if a.Status != models.AssignmentActive {
				return nil, errors.New("only an active assignment can be primary")
			}
			if err := s.clearPrimary(ctx, a.StaffID, actor); err != nil {
				return nil, err
			}
		}
		a.IsPrimary = *req.IsPrimary
	}
	a.UpdatedBy = actor
	if err := s.repo.Update(ctx, a); err != nil {
		return nil, err
	}
	s.resolveOne(ctx, a)
	return a, nil
}

func (s *staffRoomAssignmentService) resolveOne(ctx context.Context, a *models.StaffRoomAssignment) {
	if room, err := s.rooms.FindByID(ctx, a.RoomID); err == nil {
		a.RoomName = room.Name
	}
	if st, err := s.staff.FindByID(ctx, a.StaffID); err == nil {
		a.StaffName = strings.TrimSpace(st.FirstName + " " + st.LastName)
	}
}

func (s *staffRoomAssignmentService) ListForStaff(ctx context.Context, staffID string, includeHistory bool, allowed []string) ([]models.StaffRoomAssignment, error) {
	st, err := s.staff.FindByID(ctx, staffID)
	if err != nil {
		return nil, errors.New("staff member not found")
	}
	if !policy.InAllowed(allowed, st.BranchSlug) {
		return nil, ErrOutsideScope
	}
	f := repository.StaffRoomAssignmentFilter{StaffID: staffID}
	if !includeHistory {
		f.Status = models.AssignmentActive
	}
	list, err := s.repo.FindAll(ctx, f)
	if err != nil {
		return nil, err
	}
	s.resolveNames(ctx, list)
	return list, nil
}

func (s *staffRoomAssignmentService) ListForRoom(ctx context.Context, roomID string, includeHistory bool, allowed []string) ([]models.StaffRoomAssignment, error) {
	room, err := s.rooms.FindByID(ctx, roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if !policy.InAllowed(allowed, room.BranchSlug) {
		return nil, ErrOutsideScope
	}
	f := repository.StaffRoomAssignmentFilter{RoomID: roomID}
	if !includeHistory {
		f.Status = models.AssignmentActive
	}
	list, err := s.repo.FindAll(ctx, f)
	if err != nil {
		return nil, err
	}
	s.resolveNames(ctx, list)
	return list, nil
}

// ── Child room assignments ────────────────────────────────────────────────────

type ChildRoomAssignmentService interface {
	Assign(ctx context.Context, req models.ChildRoomAssignmentRequest, actor string, allowed []string) (*models.ChildRoomAssignment, error)
	Transfer(ctx context.Context, childID string, req models.ChildTransferRequest, actor string, allowed []string) (*models.ChildRoomAssignment, error)
	// BulkTransfer moves several children into one room (age-group promotion).
	// Each child runs through the FULL canonical Transfer sequentially, so all
	// guards apply per child and capacity is consumed incrementally; the batch
	// never aborts — every child gets an ok/error row.
	BulkTransfer(ctx context.Context, req models.BulkChildTransferRequest, actor string, allowed []string) []models.BulkChildTransferResult
	End(ctx context.Context, id string, req models.ChildRoomAssignmentUpdate, actor string, allowed []string) (*models.ChildRoomAssignment, error)
	ListForChild(ctx context.Context, childID string, allowed []string) ([]models.ChildRoomAssignment, error)
	ListForRoom(ctx context.Context, roomID string, includeHistory bool, allowed []string) ([]models.ChildRoomAssignment, error)
	CapacitySummary(ctx context.Context, roomID string, allowed []string) (*models.RoomCapacitySummary, error)
	CapacityByBranch(ctx context.Context, branch string) ([]models.RoomCapacitySummary, error)
	// CurrentRoom returns the child's current active room id ("" if none),
	// activating any due scheduled placement first. Used to project the
	// computed Child.RoomID at read time.
	CurrentRoom(ctx context.Context, childID string) string
	// CurrentRoomsByBranch returns child_id → active room_id for a branch, in
	// one query — the batch projection for child list responses.
	CurrentRoomsByBranch(ctx context.Context, branch string) map[string]string
	// PlacementsByBranch returns every live (active + scheduled) placement row
	// for a branch, so date-aware consumers (the capacity forecast) can resolve
	// each child's room AS OF any future date — a scheduled transfer must show
	// in the week it takes effect, not be invisible until it activates.
	PlacementsByBranch(ctx context.Context, branch string) []models.ChildRoomAssignment
	// EndAllForChild ends every live placement for a child (used on delete).
	EndAllForChild(ctx context.Context, childID, actor string)
}

type childRoomAssignmentService struct {
	repo       repository.ChildRoomAssignmentRepository
	children   repository.ChildRepository
	rooms      repository.RoomRepository
	staffRepo  repository.StaffRoomAssignmentRepository
	attendance repository.AttendanceRepository
}

func NewChildRoomAssignmentService(
	repo repository.ChildRoomAssignmentRepository,
	children repository.ChildRepository,
	rooms repository.RoomRepository,
	staffRepo repository.StaffRoomAssignmentRepository,
	attendance repository.AttendanceRepository,
) ChildRoomAssignmentService {
	return &childRoomAssignmentService{repo: repo, children: children, rooms: rooms, staffRepo: staffRepo, attendance: attendance}
}

// CurrentChildRooms returns child_id → active room_id for a branch (empty
// branch = all). The child service uses this to project the computed
// Child.RoomID for list responses at read time — one query, no N+1, no
// stored scalar.
func CurrentChildRooms(ctx context.Context, repo repository.ChildRoomAssignmentRepository, branch string) map[string]string {
	out := map[string]string{}
	active, err := repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{Branch: branch, Status: models.AssignmentActive})
	if err != nil {
		log.Printf("room-assignment: CurrentChildRooms(%q) failed: %v", branch, err)
		return out
	}
	for _, a := range active {
		out[a.ChildID] = a.RoomID
	}
	return out
}

func (s *childRoomAssignmentService) CurrentRoom(ctx context.Context, childID string) string {
	s.activateDue(ctx, childID)
	active, err := s.currentActive(ctx, childID)
	if err != nil || active == nil {
		return ""
	}
	return active.RoomID
}

func (s *childRoomAssignmentService) CurrentRoomsByBranch(ctx context.Context, branch string) map[string]string {
	return CurrentChildRooms(ctx, s.repo, branch)
}

func (s *childRoomAssignmentService) PlacementsByBranch(ctx context.Context, branch string) []models.ChildRoomAssignment {
	out := []models.ChildRoomAssignment{}
	for _, status := range []models.AssignmentStatus{models.AssignmentActive, models.AssignmentScheduled} {
		rows, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{Branch: branch, Status: status})
		if err != nil {
			log.Printf("room-assignment: PlacementsByBranch(%q, %s) failed: %v", branch, status, err)
			continue
		}
		out = append(out, rows...)
	}
	return out
}

func (s *childRoomAssignmentService) currentActive(ctx context.Context, childID string) (*models.ChildRoomAssignment, error) {
	list, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{ChildID: childID, Status: models.AssignmentActive})
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, nil
	}
	return &list[0], nil
}

// activateDue lazily promotes a scheduled placement whose start date has
// arrived: the overlapping active placement is ended and the scheduled one
// becomes active. Called at the top of every read/write path so future-dated
// transfers take effect without a scheduler.
func (s *childRoomAssignmentService) activateDue(ctx context.Context, childID string) {
	scheduled, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{ChildID: childID, Status: models.AssignmentScheduled})
	if err != nil || len(scheduled) == 0 {
		return
	}
	due := scheduled[0]
	if due.StartDate > todayYMD() {
		return
	}
	if cur, err := s.currentActive(ctx, childID); err == nil && cur != nil {
		cur.Status = models.AssignmentEnded
		if cur.EndDate == "" || cur.EndDate > due.StartDate {
			cur.EndDate = due.StartDate
		}
		cur.UpdatedBy = "scheduler"
		if err := s.repo.Update(ctx, cur); err != nil {
			log.Printf("room-assignment: activating scheduled placement for child %s failed: %v", childID, err)
			return
		}
	}
	due.Status = models.AssignmentActive
	due.UpdatedBy = "scheduler"
	if err := s.repo.Update(ctx, &due); err != nil {
		log.Printf("room-assignment: activating scheduled placement for child %s failed: %v", childID, err)
		return
	}
}

// checkCapacityAndAge enforces the placement rules for a target room. A
// non-empty overrideReason converts each failure into a recorded override
// (returned so the handler can audit it); with no override the error stands.
func (s *childRoomAssignmentService) checkCapacityAndAge(ctx context.Context, room *models.Room, child *models.Child, at, overrideReason string) ([]string, error) {
	var overrides []string
	active, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{RoomID: room.ID.Hex(), Status: models.AssignmentActive})
	if err != nil {
		return nil, err
	}
	if room.Capacity > 0 && len(active) >= room.Capacity {
		if strings.TrimSpace(overrideReason) == "" {
			return nil, ErrCapacityFull
		}
		overrides = append(overrides, "capacity_override")
	}
	if room.MinAgeMonths > 0 || room.MaxAgeMonths > 0 {
		if age := ageInMonths(child.DOB, at); age >= 0 {
			tooYoung := room.MinAgeMonths > 0 && age < room.MinAgeMonths
			tooOld := room.MaxAgeMonths > 0 && age > room.MaxAgeMonths
			if tooYoung || tooOld {
				if strings.TrimSpace(overrideReason) == "" {
					return nil, ErrAgeMismatch
				}
				overrides = append(overrides, "age_override")
			}
		}
	}
	return overrides, nil
}

func (s *childRoomAssignmentService) Assign(ctx context.Context, req models.ChildRoomAssignmentRequest, actor string, allowed []string) (*models.ChildRoomAssignment, error) {
	childID := strings.TrimSpace(req.ChildID)
	roomID := strings.TrimSpace(req.RoomID)
	if childID == "" || roomID == "" {
		return nil, errors.New("child_id and room_id are required")
	}
	if !validYMD(req.StartDate) {
		return nil, errors.New("dates must be YYYY-MM-DD")
	}
	s.activateDue(ctx, childID)
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return nil, errors.New("child not found")
	}
	room, err := s.rooms.FindByID(ctx, roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if !room.IsActive() {
		return nil, ErrRoomInactive
	}
	if child.BranchSlug != room.BranchSlug {
		return nil, ErrCrossBranch
	}
	if !policy.InAllowed(allowed, room.BranchSlug) {
		return nil, ErrOutsideScope
	}
	cur, err := s.currentActive(ctx, childID)
	if err != nil {
		return nil, err
	}
	if cur != nil {
		if cur.RoomID == roomID {
			return nil, ErrDuplicateActive
		}
		return nil, ErrHasActiveRoom
	}
	start := strings.TrimSpace(req.StartDate)
	if start == "" {
		start = todayYMD()
	}
	status := models.AssignmentActive
	if start > todayYMD() {
		status = models.AssignmentScheduled
	}
	overrides, err := s.checkCapacityAndAge(ctx, room, child, start, req.OverrideReason)
	if err != nil {
		return nil, err
	}
	a := &models.ChildRoomAssignment{
		BranchSlug: room.BranchSlug,
		ChildID:    childID,
		RoomID:     roomID,
		StartDate:  start,
		Status:     status,
		Notes:      strings.TrimSpace(req.Notes),
		CreatedBy:  actor,
	}
	if len(overrides) > 0 {
		a.OverrideReason = strings.TrimSpace(req.OverrideReason)
	}
	if err := s.repo.Create(ctx, a); err != nil {
		if strings.Contains(err.Error(), "E11000") {
			return nil, ErrDuplicateActive
		}
		return nil, err
	}
	if status == models.AssignmentActive {
	}
	a.RoomName = room.Name
	a.ChildName = strings.TrimSpace(child.FirstName + " " + child.LastName)
	a.AppliedOverrides = overrides
	return a, nil
}

// BulkTransfer promotes a cohort into one room. Deliberately a thin loop over
// the canonical Transfer — no second allocation implementation — so every
// per-child rule (same branch, active room, capacity, age band, override
// reason) applies exactly as a one-by-one move would, and the child that
// overflows the target's capacity fails alone instead of aborting the batch.
func (s *childRoomAssignmentService) BulkTransfer(ctx context.Context, req models.BulkChildTransferRequest, actor string, allowed []string) []models.BulkChildTransferResult {
	single := models.ChildTransferRequest{
		RoomID:         req.RoomID,
		EffectiveDate:  req.EffectiveDate,
		Reason:         req.Reason,
		Notes:          req.Notes,
		OverrideReason: req.OverrideReason,
	}
	out := make([]models.BulkChildTransferResult, 0, len(req.ChildIDs))
	for _, id := range req.ChildIDs {
		res := models.BulkChildTransferResult{ChildID: id}
		if c, err := s.children.FindByID(ctx, id); err == nil && c != nil {
			res.ChildName = strings.TrimSpace(c.FirstName + " " + c.LastName)
		}
		if _, err := s.Transfer(ctx, id, single, actor, allowed); err != nil {
			res.Error = err.Error()
		} else {
			res.OK = true
		}
		out = append(out, res)
	}
	return out
}

func (s *childRoomAssignmentService) Transfer(ctx context.Context, childID string, req models.ChildTransferRequest, actor string, allowed []string) (*models.ChildRoomAssignment, error) {
	roomID := strings.TrimSpace(req.RoomID)
	if roomID == "" {
		return nil, errors.New("room_id is required")
	}
	if strings.TrimSpace(req.Reason) == "" {
		return nil, errors.New("a transfer reason is required")
	}
	if !validYMD(req.EffectiveDate) {
		return nil, errors.New("dates must be YYYY-MM-DD")
	}
	s.activateDue(ctx, childID)
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return nil, errors.New("child not found")
	}
	room, err := s.rooms.FindByID(ctx, roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if !room.IsActive() {
		return nil, ErrRoomInactive
	}
	if child.BranchSlug != room.BranchSlug {
		return nil, ErrCrossBranch
	}
	if !policy.InAllowed(allowed, room.BranchSlug) {
		return nil, ErrOutsideScope
	}
	cur, err := s.currentActive(ctx, childID)
	if err != nil {
		return nil, err
	}
	if cur == nil {
		return nil, ErrNothingToTransfer
	}
	if cur.RoomID == roomID {
		return nil, ErrSameRoomTransfer
	}
	effective := strings.TrimSpace(req.EffectiveDate)
	if effective == "" {
		effective = todayYMD()
	}
	overrides, err := s.checkCapacityAndAge(ctx, room, child, effective, req.OverrideReason)
	if err != nil {
		return nil, err
	}

	next := &models.ChildRoomAssignment{
		BranchSlug:     room.BranchSlug,
		ChildID:        childID,
		RoomID:         roomID,
		StartDate:      effective,
		Status:         models.AssignmentActive,
		TransferReason: strings.TrimSpace(req.Reason),
		Notes:          strings.TrimSpace(req.Notes),
		CreatedBy:      actor,
	}
	if len(overrides) > 0 {
		next.OverrideReason = strings.TrimSpace(req.OverrideReason)
	}

	if effective > todayYMD() {
		// Future-dated: the current placement stays active until the effective
		// date; the destination waits as `scheduled` and is lazily activated.
		next.Status = models.AssignmentScheduled
		if err := s.repo.Create(ctx, next); err != nil {
			if strings.Contains(err.Error(), "E11000") {
				return nil, errors.New("a scheduled transfer already exists for this child")
			}
			return nil, err
		}
		cur.EndDate = effective
		cur.UpdatedBy = actor
		if err := s.repo.Update(ctx, cur); err != nil {
			// Compensate: don't leave a scheduled row the current one ignores.
			_ = s.repo.Delete(ctx, next.ID.Hex())
			return nil, fmt.Errorf("could not schedule transfer: %w", err)
		}
		next.RoomName = room.Name
		next.ChildName = strings.TrimSpace(child.FirstName + " " + child.LastName)
		next.AppliedOverrides = overrides
		return next, nil
	}

	// Immediate transfer: close the current placement, then create the new one.
	// No multi-document transactions on a single-node Mongo, so order + a
	// compensating rollback keep the invariant "never two active, never none":
	// the partial unique index blocks double-active; a failed create restores
	// the closed placement.
	prevStatus, prevEnd := cur.Status, cur.EndDate
	cur.Status = models.AssignmentEnded
	cur.EndDate = effective
	cur.UpdatedBy = actor
	if err := s.repo.Update(ctx, cur); err != nil {
		return nil, fmt.Errorf("could not close the current placement: %w", err)
	}
	if err := s.repo.Create(ctx, next); err != nil {
		// Compensating rollback — restore the previous placement.
		cur.Status = prevStatus
		cur.EndDate = prevEnd
		if restoreErr := s.repo.Update(ctx, cur); restoreErr != nil {
			log.Printf("room-assignment: TRANSFER ROLLBACK FAILED for child %s — previous assignment %s could not be restored: %v", childID, cur.ID.Hex(), restoreErr)
			return nil, fmt.Errorf("transfer failed AND rollback failed — child may be without a room, contact support: %w", err)
		}
		if strings.Contains(err.Error(), "E11000") {
			return nil, errors.New("a concurrent transfer already placed this child — reload and retry")
		}
		return nil, fmt.Errorf("transfer failed and was rolled back: %w", err)
	}
	next.RoomName = room.Name
	next.ChildName = strings.TrimSpace(child.FirstName + " " + child.LastName)
	next.AppliedOverrides = overrides
	return next, nil
}

func (s *childRoomAssignmentService) End(ctx context.Context, id string, req models.ChildRoomAssignmentUpdate, actor string, allowed []string) (*models.ChildRoomAssignment, error) {
	if !req.End {
		return nil, errors.New("end=true is required — transfers use the transfer-room endpoint")
	}
	a, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("assignment not found")
	}
	if !policy.InAllowed(allowed, a.BranchSlug) {
		return nil, ErrOutsideScope
	}
	if a.Status == models.AssignmentEnded {
		return nil, errors.New("assignment is already ended")
	}
	end := strings.TrimSpace(req.EndDate)
	if end == "" {
		end = todayYMD()
	}
	if !validYMD(end) {
		return nil, errors.New("dates must be YYYY-MM-DD")
	}
	a.Status = models.AssignmentEnded
	a.EndDate = end
	if r := strings.TrimSpace(req.Reason); r != "" {
		a.TransferReason = r
	}
	a.UpdatedBy = actor
	if err := s.repo.Update(ctx, a); err != nil {
		return nil, err
	}
	s.resolveOne(ctx, a)
	return a, nil
}

func (s *childRoomAssignmentService) resolveOne(ctx context.Context, a *models.ChildRoomAssignment) {
	if room, err := s.rooms.FindByID(ctx, a.RoomID); err == nil {
		a.RoomName = room.Name
	}
	if c, err := s.children.FindByID(ctx, a.ChildID); err == nil {
		a.ChildName = strings.TrimSpace(c.FirstName + " " + c.LastName)
	}
}

func (s *childRoomAssignmentService) resolveNames(ctx context.Context, list []models.ChildRoomAssignment) {
	roomNames := map[string]string{}
	childNames := map[string]string{}
	for i := range list {
		a := &list[i]
		if _, ok := roomNames[a.RoomID]; !ok {
			if room, err := s.rooms.FindByID(ctx, a.RoomID); err == nil {
				roomNames[a.RoomID] = room.Name
			}
		}
		if _, ok := childNames[a.ChildID]; !ok {
			if c, err := s.children.FindByID(ctx, a.ChildID); err == nil {
				childNames[a.ChildID] = strings.TrimSpace(c.FirstName + " " + c.LastName)
			}
		}
		a.RoomName = roomNames[a.RoomID]
		a.ChildName = childNames[a.ChildID]
	}
}

func (s *childRoomAssignmentService) ListForChild(ctx context.Context, childID string, allowed []string) ([]models.ChildRoomAssignment, error) {
	s.activateDue(ctx, childID)
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return nil, errors.New("child not found")
	}
	if !policy.InAllowed(allowed, child.BranchSlug) {
		return nil, ErrOutsideScope
	}
	list, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{ChildID: childID})
	if err != nil {
		return nil, err
	}
	s.resolveNames(ctx, list)
	return list, nil
}

func (s *childRoomAssignmentService) ListForRoom(ctx context.Context, roomID string, includeHistory bool, allowed []string) ([]models.ChildRoomAssignment, error) {
	room, err := s.rooms.FindByID(ctx, roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if !policy.InAllowed(allowed, room.BranchSlug) {
		return nil, ErrOutsideScope
	}
	f := repository.ChildRoomAssignmentFilter{RoomID: roomID}
	if !includeHistory {
		f.Status = models.AssignmentActive
	}
	list, err := s.repo.FindAll(ctx, f)
	if err != nil {
		return nil, err
	}
	s.resolveNames(ctx, list)
	return list, nil
}

func (s *childRoomAssignmentService) summaryForRoom(ctx context.Context, room *models.Room, todaysAttendance []models.AttendanceRecord) (*models.RoomCapacitySummary, error) {
	roomID := room.ID.Hex()
	active, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{RoomID: roomID, Status: models.AssignmentActive})
	if err != nil {
		return nil, err
	}
	scheduled, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{RoomID: roomID, Status: models.AssignmentScheduled})
	if err != nil {
		return nil, err
	}
	present := 0
	for _, rec := range todaysAttendance {
		if rec.RoomID == roomID && rec.CheckIn != nil {
			present++
		}
	}
	staffActive, err := s.staffRepo.FindAll(ctx, repository.StaffRoomAssignmentFilter{RoomID: roomID, Status: models.AssignmentActive})
	if err != nil {
		return nil, err
	}
	allocated := len(active)
	sendCount := 0
	for _, a := range active {
		if c, err := s.children.FindByID(ctx, a.ChildID); err == nil && c != nil && models.SendStatusActive(c.SendStatus) {
			sendCount++
		}
	}
	available := room.Capacity - allocated
	if available < 0 {
		available = 0
	}
	status := string(models.RoomActive)
	if !room.IsActive() {
		status = string(models.RoomInactive)
	}
	rate := 0
	if room.Capacity > 0 {
		rate = int(float64(allocated)/float64(room.Capacity)*100 + 0.5)
	}
	return &models.RoomCapacitySummary{
		RoomID:            roomID,
		RoomName:          room.Name,
		BranchSlug:        room.BranchSlug,
		Status:            status,
		Capacity:          room.Capacity,
		AllocatedChildren: allocated,
		FutureChildren:    len(scheduled),
		AvailableSpaces:   available,
		OverCapacity:      room.Capacity > 0 && allocated > room.Capacity,
		StaffAllocated:    len(staffActive),
		PresentChildren:   present,
		OccupancyRate:     rate,
		SendChildren:      sendCount,
	}, nil
}

func (s *childRoomAssignmentService) CapacitySummary(ctx context.Context, roomID string, allowed []string) (*models.RoomCapacitySummary, error) {
	room, err := s.rooms.FindByID(ctx, roomID)
	if err != nil {
		return nil, errors.New("room not found")
	}
	if !policy.InAllowed(allowed, room.BranchSlug) {
		return nil, ErrOutsideScope
	}
	attendance, err := s.attendance.FindByDate(ctx, todayYMD(), room.BranchSlug)
	if err != nil {
		attendance = nil // attendance is informational — never block capacity
	}
	return s.summaryForRoom(ctx, room, attendance)
}

func (s *childRoomAssignmentService) CapacityByBranch(ctx context.Context, branch string) ([]models.RoomCapacitySummary, error) {
	rooms, err := s.rooms.FindAll(ctx, branch)
	if err != nil {
		return nil, err
	}
	attendance, err := s.attendance.FindByDate(ctx, todayYMD(), branch)
	if err != nil {
		attendance = nil
	}
	out := make([]models.RoomCapacitySummary, 0, len(rooms))
	for i := range rooms {
		sum, err := s.summaryForRoom(ctx, &rooms[i], attendance)
		if err != nil {
			return nil, err
		}
		out = append(out, *sum)
	}
	return out, nil
}

// EndAllForChild ends every live (active or scheduled) placement for a child
// — used when the child is deleted, so no live assignment (and no active
// row blocking its room's later cleanup) is left dangling. History rows are
// retained. Best-effort; the caller (child delete) shouldn't fail on it.
func (s *childRoomAssignmentService) EndAllForChild(ctx context.Context, childID, actor string) {
	for _, st := range []models.AssignmentStatus{models.AssignmentActive, models.AssignmentScheduled} {
		rows, err := s.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{ChildID: childID, Status: st})
		if err != nil {
			log.Printf("room-assignment: EndAllForChild(%s) failed: %v", childID, err)
			continue
		}
		for i := range rows {
			rows[i].Status = models.AssignmentEnded
			rows[i].EndDate = todayYMD()
			rows[i].UpdatedBy = actor
			if err := s.repo.Update(ctx, &rows[i]); err != nil {
				log.Printf("room-assignment: EndAllForChild(%s) failed: %v", childID, err)
			}
		}
	}
}
