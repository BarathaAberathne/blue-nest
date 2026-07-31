package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── In-memory fakes ───────────────────────────────────────────────────────────

type memChildAssignRepo struct {
	items map[string]*models.ChildRoomAssignment
}

func newMemChildAssignRepo() *memChildAssignRepo {
	return &memChildAssignRepo{items: map[string]*models.ChildRoomAssignment{}}
}

func (m *memChildAssignRepo) Create(_ context.Context, a *models.ChildRoomAssignment) error {
	if a.ID.IsZero() {
		a.ID = primitive.NewObjectID()
	}
	// Emulate the partial unique index: at most one active + one scheduled per child.
	for _, e := range m.items {
		if e.ChildID == a.ChildID && e.Status == a.Status &&
			(a.Status == models.AssignmentActive || a.Status == models.AssignmentScheduled) {
			return &dupKeyErr{}
		}
	}
	cp := *a
	m.items[a.ID.Hex()] = &cp
	return nil
}
func (m *memChildAssignRepo) FindAll(_ context.Context, f repository.ChildRoomAssignmentFilter) ([]models.ChildRoomAssignment, error) {
	var out []models.ChildRoomAssignment
	for _, e := range m.items {
		if f.ChildID != "" && e.ChildID != f.ChildID {
			continue
		}
		if f.RoomID != "" && e.RoomID != f.RoomID {
			continue
		}
		if f.Branch != "" && e.BranchSlug != f.Branch {
			continue
		}
		if f.Status != "" && e.Status != f.Status {
			continue
		}
		out = append(out, *e)
	}
	return out, nil
}
func (m *memChildAssignRepo) FindByID(_ context.Context, id string) (*models.ChildRoomAssignment, error) {
	if e, ok := m.items[id]; ok {
		cp := *e
		return &cp, nil
	}
	return nil, &notFoundErr{}
}
func (m *memChildAssignRepo) Update(_ context.Context, a *models.ChildRoomAssignment) error {
	// Re-check the active/scheduled uniqueness against OTHER rows.
	for _, e := range m.items {
		if e.ID == a.ID {
			continue
		}
		if e.ChildID == a.ChildID && e.Status == a.Status &&
			(a.Status == models.AssignmentActive || a.Status == models.AssignmentScheduled) {
			return &dupKeyErr{}
		}
	}
	cp := *a
	m.items[a.ID.Hex()] = &cp
	return nil
}
func (m *memChildAssignRepo) Delete(_ context.Context, id string) error {
	delete(m.items, id)
	return nil
}

type memStaffAssignRepo struct {
	items map[string]*models.StaffRoomAssignment
}

func newMemStaffAssignRepo() *memStaffAssignRepo {
	return &memStaffAssignRepo{items: map[string]*models.StaffRoomAssignment{}}
}
func (m *memStaffAssignRepo) Create(_ context.Context, a *models.StaffRoomAssignment) error {
	if a.ID.IsZero() {
		a.ID = primitive.NewObjectID()
	}
	for _, e := range m.items {
		if e.StaffID == a.StaffID && e.RoomID == a.RoomID && e.Status == models.AssignmentActive && a.Status == models.AssignmentActive {
			return &dupKeyErr{}
		}
	}
	cp := *a
	m.items[a.ID.Hex()] = &cp
	return nil
}
func (m *memStaffAssignRepo) FindAll(_ context.Context, f repository.StaffRoomAssignmentFilter) ([]models.StaffRoomAssignment, error) {
	var out []models.StaffRoomAssignment
	for _, e := range m.items {
		if f.StaffID != "" && e.StaffID != f.StaffID {
			continue
		}
		if f.RoomID != "" && e.RoomID != f.RoomID {
			continue
		}
		if f.Branch != "" && e.BranchSlug != f.Branch {
			continue
		}
		if f.Status != "" && e.Status != f.Status {
			continue
		}
		out = append(out, *e)
	}
	return out, nil
}
func (m *memStaffAssignRepo) FindByID(_ context.Context, id string) (*models.StaffRoomAssignment, error) {
	if e, ok := m.items[id]; ok {
		cp := *e
		return &cp, nil
	}
	return nil, &notFoundErr{}
}
func (m *memStaffAssignRepo) Update(_ context.Context, a *models.StaffRoomAssignment) error {
	cp := *a
	m.items[a.ID.Hex()] = &cp
	return nil
}
func (m *memStaffAssignRepo) Delete(_ context.Context, id string) error {
	delete(m.items, id)
	return nil
}

type memRoomRepo struct{ rooms map[string]*models.Room }

func (m *memRoomRepo) Create(_ context.Context, r *models.Room) error {
	if r.ID.IsZero() {
		r.ID = primitive.NewObjectID()
	}
	m.rooms[r.ID.Hex()] = r
	return nil
}
func (m *memRoomRepo) FindAll(_ context.Context, branch string) ([]models.Room, error) {
	var out []models.Room
	for _, r := range m.rooms {
		if branch == "" || r.BranchSlug == branch {
			out = append(out, *r)
		}
	}
	return out, nil
}
func (m *memRoomRepo) FindByID(_ context.Context, id string) (*models.Room, error) {
	if r, ok := m.rooms[id]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, &notFoundErr{}
}
func (m *memRoomRepo) Update(_ context.Context, id string, r models.Room) (*models.Room, error) {
	m.rooms[id] = &r
	return &r, nil
}
func (m *memRoomRepo) Delete(_ context.Context, id string) error { delete(m.rooms, id); return nil }

type memChildRepo struct {
	repository.ChildRepository
	children map[string]*models.Child
}

func (m *memChildRepo) FindByID(_ context.Context, id string) (*models.Child, error) {
	if c, ok := m.children[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, &notFoundErr{}
}

type memStaffRepo struct {
	repository.StaffRepository
	staff map[string]*models.Staff
}

func (m *memStaffRepo) FindByID(_ context.Context, id string) (*models.Staff, error) {
	if s, ok := m.staff[id]; ok {
		cp := *s
		return &cp, nil
	}
	return nil, &notFoundErr{}
}

type memAttendanceRepo struct{ repository.AttendanceRepository }

func (m *memAttendanceRepo) FindByDate(_ context.Context, _, _ string) ([]models.AttendanceRecord, error) {
	return nil, nil
}

type dupKeyErr struct{}

func (*dupKeyErr) Error() string { return "E11000 duplicate key error" }

type notFoundErr struct{}

func (*notFoundErr) Error() string { return "not found" }

// ── Fixtures ──────────────────────────────────────────────────────────────────

func oid() string { return primitive.NewObjectID().Hex() }

func childFixtures(t *testing.T) (*childRoomAssignmentService, *memChildRepo, *memRoomRepo, map[string]string) {
	t.Helper()
	rooms := &memRoomRepo{rooms: map[string]*models.Room{}}
	nest := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "harrow", Name: "Nest", Capacity: 1, MinAgeMonths: 0, MaxAgeMonths: 24}
	burrow := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "harrow", Name: "Burrow", Capacity: 5, MinAgeMonths: 24, MaxAgeMonths: 60}
	other := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "pinner", Name: "Pinner Room", Capacity: 5}
	inactive := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "harrow", Name: "Closed", Capacity: 5, Status: models.RoomInactive}
	for _, r := range []*models.Room{nest, burrow, other, inactive} {
		rooms.rooms[r.ID.Hex()] = r
	}
	children := &memChildRepo{children: map[string]*models.Child{}}
	baby := &models.Child{ID: primitive.NewObjectID(), BranchSlug: "harrow", FirstName: "Baby", LastName: "One", DOB: time.Now().AddDate(0, -6, 0).Format("2006-01-02")}
	children.children[baby.ID.Hex()] = baby
	ids := map[string]string{
		"nest": nest.ID.Hex(), "burrow": burrow.ID.Hex(), "other": other.ID.Hex(),
		"inactive": inactive.ID.Hex(), "baby": baby.ID.Hex(),
	}
	svc := &childRoomAssignmentService{
		repo:       newMemChildAssignRepo(),
		children:   children,
		rooms:      rooms,
		staffRepo:  newMemStaffAssignRepo(),
		attendance: &memAttendanceRepo{},
	}
	return svc, children, rooms, ids
}

// ── Tests ─────────────────────────────────────────────────────────────────────

func TestChildAssign_SyncsDerivedRoomAndPreventsDuplicate(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()

	a, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"]}, "actor", nil)
	if err != nil {
		t.Fatalf("assign: %v", err)
	}
	if a.Status != models.AssignmentActive {
		t.Fatalf("status = %q, want active", a.Status)
	}
	if got := svc.CurrentRoom(ctx, ids["baby"]); got != ids["nest"] {
		t.Fatalf("CurrentRoom = %q, want nest", got)
	}
	// A second active placement must be rejected (use transfer instead).
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["burrow"]}, "actor", nil); err == nil {
		t.Fatal("expected error assigning a second active room, got nil")
	}
}

func TestChildAssign_CrossBranchRejected(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	_, err := svc.Assign(context.Background(), models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["other"]}, "actor", nil)
	if err != ErrCrossBranch {
		t.Fatalf("err = %v, want ErrCrossBranch", err)
	}
}

func TestChildAssign_InactiveRoomRejected(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	_, err := svc.Assign(context.Background(), models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["inactive"]}, "actor", nil)
	if err != ErrRoomInactive {
		t.Fatalf("err = %v, want ErrRoomInactive", err)
	}
}

func TestChildAssign_CapacityBlockedThenOverride(t *testing.T) {
	svc, children, _, ids := childFixtures(t)
	ctx := context.Background()
	// Fill the capacity-1 Nest with another child.
	other := &models.Child{ID: primitive.NewObjectID(), BranchSlug: "harrow", FirstName: "Filler", DOB: time.Now().AddDate(0, -8, 0).Format("2006-01-02")}
	children.children[other.ID.Hex()] = other
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: other.ID.Hex(), RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("seed assign: %v", err)
	}
	// Now the baby can't fit without an override.
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"]}, "actor", nil); err != ErrCapacityFull {
		t.Fatalf("err = %v, want ErrCapacityFull", err)
	}
	a, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"], OverrideReason: "manager approved"}, "actor", nil)
	if err != nil {
		t.Fatalf("override assign: %v", err)
	}
	if a.OverrideReason == "" || len(a.AppliedOverrides) == 0 {
		t.Fatalf("override not recorded: reason=%q applied=%v", a.OverrideReason, a.AppliedOverrides)
	}
}

func TestChildAssign_AgeMismatchBlockedThenOverride(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()
	// Baby is 6 months old; Burrow requires 24–60 months.
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["burrow"]}, "actor", nil); err != ErrAgeMismatch {
		t.Fatalf("err = %v, want ErrAgeMismatch", err)
	}
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["burrow"], OverrideReason: "settling visit"}, "actor", nil); err != nil {
		t.Fatalf("override age assign: %v", err)
	}
}

func TestChildTransfer_ClosesPreviousKeepsHistoryAndSyncs(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("assign: %v", err)
	}
	// Transfer to Burrow needs an age override (baby is 6mo).
	next, err := svc.Transfer(ctx, ids["baby"], models.ChildTransferRequest{RoomID: ids["burrow"], Reason: "moving up", OverrideReason: "early move"}, "actor", nil)
	if err != nil {
		t.Fatalf("transfer: %v", err)
	}
	if next.RoomID != ids["burrow"] || next.Status != models.AssignmentActive {
		t.Fatalf("new placement wrong: room=%q status=%q", next.RoomID, next.Status)
	}
	all, _ := svc.repo.FindAll(ctx, repository.ChildRoomAssignmentFilter{ChildID: ids["baby"]})
	var active, ended int
	for _, a := range all {
		switch a.Status {
		case models.AssignmentActive:
			active++
		case models.AssignmentEnded:
			ended++
		}
	}
	if active != 1 || ended != 1 {
		t.Fatalf("history wrong: active=%d ended=%d (want 1/1)", active, ended)
	}
	if got := svc.CurrentRoom(ctx, ids["baby"]); got != ids["burrow"] {
		t.Fatalf("CurrentRoom after transfer = %q, want burrow", got)
	}
}

func TestChildTransfer_SameRoomRejected(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("assign: %v", err)
	}
	if _, err := svc.Transfer(ctx, ids["baby"], models.ChildTransferRequest{RoomID: ids["nest"], Reason: "x"}, "actor", nil); err != ErrSameRoomTransfer {
		t.Fatalf("err = %v, want ErrSameRoomTransfer", err)
	}
}

func TestChildTransfer_NothingToTransfer(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	if _, err := svc.Transfer(context.Background(), ids["baby"], models.ChildTransferRequest{RoomID: ids["nest"], Reason: "x"}, "actor", nil); err != ErrNothingToTransfer {
		t.Fatalf("err = %v, want ErrNothingToTransfer", err)
	}
}

func TestChildTransfer_FutureDatedSchedulesAndKeepsCurrentActive(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("assign: %v", err)
	}
	future := time.Now().AddDate(0, 0, 14).Format("2006-01-02")
	next, err := svc.Transfer(ctx, ids["baby"], models.ChildTransferRequest{RoomID: ids["burrow"], EffectiveDate: future, Reason: "moving up", OverrideReason: "planned"}, "actor", nil)
	if err != nil {
		t.Fatalf("future transfer: %v", err)
	}
	if next.Status != models.AssignmentScheduled {
		t.Fatalf("status = %q, want scheduled", next.Status)
	}
	// The current room stays active until the effective date.
	if got := svc.CurrentRoom(ctx, ids["baby"]); got != ids["nest"] {
		t.Fatalf("CurrentRoom changed early to %q, want nest", got)
	}
}

func TestChildScheduled_LazilyActivatesWhenDue(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("assign: %v", err)
	}
	// Manually insert a due (today) scheduled placement to Burrow.
	due := &models.ChildRoomAssignment{
		ChildID: ids["baby"], RoomID: ids["burrow"], BranchSlug: "harrow",
		StartDate: time.Now().Format("2006-01-02"), Status: models.AssignmentScheduled,
	}
	if err := svc.repo.Create(ctx, due); err != nil {
		t.Fatalf("seed scheduled: %v", err)
	}
	// Any read triggers activateDue.
	if _, err := svc.ListForChild(ctx, ids["baby"], nil); err != nil {
		t.Fatalf("list: %v", err)
	}
	if got := svc.CurrentRoom(ctx, ids["baby"]); got != ids["burrow"] {
		t.Fatalf("scheduled placement did not activate: CurrentRoom = %q, want burrow", got)
	}
}

func TestCapacitySummary_AvailableExcludesEndedAndSeparatesAttendance(t *testing.T) {
	svc, _, _, ids := childFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.ChildRoomAssignmentRequest{ChildID: ids["baby"], RoomID: ids["burrow"], OverrideReason: "ok"}, "actor", nil); err != nil {
		t.Fatalf("assign: %v", err)
	}
	sum, err := svc.CapacitySummary(ctx, ids["burrow"], nil)
	if err != nil {
		t.Fatalf("capacity: %v", err)
	}
	if sum.Capacity != 5 || sum.AllocatedChildren != 1 || sum.AvailableSpaces != 4 {
		t.Fatalf("capacity summary wrong: cap=%d alloc=%d avail=%d", sum.Capacity, sum.AllocatedChildren, sum.AvailableSpaces)
	}
	if sum.PresentChildren != 0 {
		t.Fatalf("present should be 0 (no attendance) but was %d", sum.PresentChildren)
	}
}

// ── Staff ─────────────────────────────────────────────────────────────────────

func staffFixtures(t *testing.T) (*staffRoomAssignmentService, *memStaffRepo, map[string]string) {
	t.Helper()
	rooms := &memRoomRepo{rooms: map[string]*models.Room{}}
	nest := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "harrow", Name: "Nest", Capacity: 3}
	burrow := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "harrow", Name: "Burrow", Capacity: 3}
	other := &models.Room{ID: primitive.NewObjectID(), BranchSlug: "pinner", Name: "Pinner", Capacity: 3}
	for _, r := range []*models.Room{nest, burrow, other} {
		rooms.rooms[r.ID.Hex()] = r
	}
	staff := &memStaffRepo{staff: map[string]*models.Staff{}}
	active := &models.Staff{ID: primitive.NewObjectID(), BranchSlug: "harrow", FirstName: "Practitioner", LastName: "One", Status: models.StaffActive}
	inactive := &models.Staff{ID: primitive.NewObjectID(), BranchSlug: "harrow", FirstName: "Left", LastName: "Two", Status: models.StaffInactive}
	staff.staff[active.ID.Hex()] = active
	staff.staff[inactive.ID.Hex()] = inactive
	ids := map[string]string{
		"nest": nest.ID.Hex(), "burrow": burrow.ID.Hex(), "other": other.ID.Hex(),
		"active": active.ID.Hex(), "inactive": inactive.ID.Hex(),
	}
	svc := &staffRoomAssignmentService{repo: newMemStaffAssignRepo(), staff: staff, rooms: rooms}
	return svc, staff, ids
}

func TestStaffAssign_MultiRoomWithSinglePrimaryAndSync(t *testing.T) {
	svc, _, ids := staffFixtures(t)
	ctx := context.Background()
	// First assignment auto-primary → the projected primary room is nest.
	if _, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("assign 1: %v", err)
	}
	if got := svc.PrimaryRoom(ctx, ids["active"]); got != ids["nest"] {
		t.Fatalf("PrimaryRoom = %q, want nest", got)
	}
	// Second room, explicitly primary → moves primary, syncs.
	if _, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["burrow"], IsPrimary: true}, "actor", nil); err != nil {
		t.Fatalf("assign 2: %v", err)
	}
	if got := svc.PrimaryRoom(ctx, ids["active"]); got != ids["burrow"] {
		t.Fatalf("PrimaryRoom did not move, got %q, want burrow", got)
	}
	active, _ := svc.repo.FindAll(ctx, repository.StaffRoomAssignmentFilter{StaffID: ids["active"], Status: models.AssignmentActive})
	primaries := 0
	for _, a := range active {
		if a.IsPrimary {
			primaries++
		}
	}
	if len(active) != 2 || primaries != 1 {
		t.Fatalf("want 2 active with exactly 1 primary, got %d active %d primary", len(active), primaries)
	}
}

func TestStaffAssign_DuplicateRejected(t *testing.T) {
	svc, _, ids := staffFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["nest"]}, "actor", nil); err != nil {
		t.Fatalf("assign: %v", err)
	}
	if _, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["nest"]}, "actor", nil); err != ErrDuplicateActive {
		t.Fatalf("err = %v, want ErrDuplicateActive", err)
	}
}

func TestStaffAssign_InactiveStaffAndCrossBranchRejected(t *testing.T) {
	svc, _, ids := staffFixtures(t)
	ctx := context.Background()
	if _, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["inactive"], RoomID: ids["nest"]}, "actor", nil); err != ErrInactivePerson {
		t.Fatalf("err = %v, want ErrInactivePerson", err)
	}
	if _, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["other"]}, "actor", nil); err != ErrCrossBranch {
		t.Fatalf("err = %v, want ErrCrossBranch", err)
	}
}

func TestStaffAssign_OutsideScopeRejected(t *testing.T) {
	svc, _, ids := staffFixtures(t)
	// Caller allowed only in "pinner"; the room is in "harrow".
	_, err := svc.Assign(context.Background(), models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["nest"]}, "actor", []string{"pinner"})
	if err != ErrOutsideScope {
		t.Fatalf("err = %v, want ErrOutsideScope", err)
	}
}

func TestStaffEnd_ClearsDerivedWhenNoPrimaryLeft(t *testing.T) {
	svc, _, ids := staffFixtures(t)
	ctx := context.Background()
	a, err := svc.Assign(ctx, models.StaffRoomAssignmentRequest{StaffID: ids["active"], RoomID: ids["nest"]}, "actor", nil)
	if err != nil {
		t.Fatalf("assign: %v", err)
	}
	if _, err := svc.Update(ctx, a.ID.Hex(), models.StaffRoomAssignmentUpdate{End: true}, "actor", nil); err != nil {
		t.Fatalf("end: %v", err)
	}
	if got := svc.PrimaryRoom(ctx, ids["active"]); got != "" {
		t.Fatalf("PrimaryRoom not cleared after ending only assignment, got %q", got)
	}
}

func TestAgeInMonths(t *testing.T) {
	at := "2026-01-01"
	if got := ageInMonths("2024-01-01", at); got != 24 {
		t.Fatalf("ageInMonths = %d, want 24", got)
	}
	if got := ageInMonths("", at); got != -1 {
		t.Fatalf("ageInMonths(empty) = %d, want -1", got)
	}
}

// guard against accidental import removal
var _ = strings.TrimSpace
