package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type RoomService interface {
	List(ctx context.Context, branch string) ([]models.Room, error)
	GetByID(ctx context.Context, id string) (*models.Room, error)
	Create(ctx context.Context, req models.RoomRequest) (*models.Room, error)
	Update(ctx context.Context, id string, req models.RoomRequest) (*models.Room, error)
	// SetStatus activates/deactivates a room — a dedicated operation so a
	// stale edit payload can never flip status as a side effect.
	SetStatus(ctx context.Context, id string, status models.RoomStatus) (*models.Room, error)
	Delete(ctx context.Context, id string) error
}

type roomService struct {
	repo repository.RoomRepository
	// Assignment repos guard Delete: a room with allocation history must be
	// deactivated, not deleted (history is never destroyed). Optional (nil in
	// some tests) — when nil the legacy unguarded delete applies.
	staffAssignments repository.StaffRoomAssignmentRepository
	childAssignments repository.ChildRoomAssignmentRepository
}

func NewRoomService(repo repository.RoomRepository) RoomService {
	return &roomService{repo: repo}
}

// NewRoomServiceWithGuards wires the assignment repos so Delete can refuse to
// destroy allocation history.
func NewRoomServiceWithGuards(repo repository.RoomRepository, staffAssignments repository.StaffRoomAssignmentRepository, childAssignments repository.ChildRoomAssignmentRepository) RoomService {
	return &roomService{repo: repo, staffAssignments: staffAssignments, childAssignments: childAssignments}
}

func (s *roomService) List(ctx context.Context, branch string) ([]models.Room, error) {
	return s.repo.FindAll(ctx, branch)
}

func (s *roomService) GetByID(ctx context.Context, id string) (*models.Room, error) {
	return s.repo.FindByID(ctx, id)
}

// applyRoom copies a RoomRequest onto a Room for Create and Update. The five
// original fields keep their historical overwrite semantics (existing API
// contract); the NEWER optional fields only overwrite when supplied, so a
// legacy payload that predates them can never wipe curated values (the same
// partial-update convention as applyStaff/applyChild). Status is deliberately
// absent — SetStatus is the only writer.
func applyRoom(room *models.Room, req models.RoomRequest) {
	room.BranchSlug = strings.TrimSpace(req.BranchSlug)
	room.Name = strings.TrimSpace(req.Name)
	room.AgeRange = strings.TrimSpace(req.AgeRange)
	room.Capacity = req.Capacity
	room.StaffRatio = req.StaffRatio
	if v := strings.TrimSpace(req.Code); v != "" {
		room.Code = v
	}
	if v := strings.TrimSpace(req.Description); v != "" {
		room.Description = v
	}
	if req.MinAgeMonths != 0 {
		room.MinAgeMonths = req.MinAgeMonths
	}
	if req.MaxAgeMonths != 0 {
		room.MaxAgeMonths = req.MaxAgeMonths
	}
	if v := strings.TrimSpace(req.OpeningDate); v != "" {
		room.OpeningDate = v
	}
	if v := strings.TrimSpace(req.ClosingDate); v != "" {
		room.ClosingDate = v
	}
	// Provision always overwrites (a plain select in the UI): "" = mainstream.
	room.Provision = models.RoomProvision(strings.TrimSpace(req.Provision))
}

// duplicateName reports whether branch already has a room named name, other
// than the room identified by excludeID (empty on create).
func (s *roomService) duplicateName(ctx context.Context, branch, name, excludeID string) (bool, error) {
	rooms, err := s.repo.FindAll(ctx, branch)
	if err != nil {
		return false, err
	}
	for _, r := range rooms {
		if r.ID.Hex() == excludeID {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(r.Name), name) {
			return true, nil
		}
	}
	return false, nil
}

// duplicateCode mirrors duplicateName for the optional short room code.
func (s *roomService) duplicateCode(ctx context.Context, branch, code, excludeID string) (bool, error) {
	if code == "" {
		return false, nil
	}
	rooms, err := s.repo.FindAll(ctx, branch)
	if err != nil {
		return false, err
	}
	for _, r := range rooms {
		if r.ID.Hex() == excludeID {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(r.Code), code) {
			return true, nil
		}
	}
	return false, nil
}

func (s *roomService) validate(ctx context.Context, req models.RoomRequest, excludeID string) error {
	name := strings.TrimSpace(req.Name)
	branch := strings.TrimSpace(req.BranchSlug)
	if name == "" || branch == "" {
		return errors.New("room name and branch are required")
	}
	if req.Capacity <= 0 {
		return errors.New("capacity must be a positive number")
	}
	if req.MinAgeMonths < 0 || req.MaxAgeMonths < 0 {
		return errors.New("age range months cannot be negative")
	}
	if req.MinAgeMonths > 0 && req.MaxAgeMonths > 0 && req.MinAgeMonths > req.MaxAgeMonths {
		return errors.New("minimum age cannot exceed maximum age")
	}
	if !models.ValidRoomProvision(models.RoomProvision(strings.TrimSpace(req.Provision))) {
		return errors.New("provision must be empty (mainstream) or send_dedicated")
	}
	if dup, err := s.duplicateName(ctx, branch, name, excludeID); err != nil {
		return err
	} else if dup {
		return errors.New("a room with that name already exists at this branch")
	}
	if dup, err := s.duplicateCode(ctx, branch, strings.TrimSpace(req.Code), excludeID); err != nil {
		return err
	} else if dup {
		return errors.New("a room with that code already exists at this branch")
	}
	return nil
}

func (s *roomService) Create(ctx context.Context, req models.RoomRequest) (*models.Room, error) {
	if err := s.validate(ctx, req, ""); err != nil {
		return nil, err
	}
	room := &models.Room{}
	applyRoom(room, req)
	if err := s.repo.Create(ctx, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *roomService) Update(ctx context.Context, id string, req models.RoomRequest) (*models.Room, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.validate(ctx, req, id); err != nil {
		return nil, err
	}
	applyRoom(existing, req)
	return s.repo.Update(ctx, id, *existing)
}

func (s *roomService) SetStatus(ctx context.Context, id string, status models.RoomStatus) (*models.Room, error) {
	if status != models.RoomActive && status != models.RoomInactive {
		return nil, errors.New("status must be active or inactive")
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Status = status
	return s.repo.Update(ctx, id, *existing)
}

// Delete refuses while the room still has LIVE (active or scheduled)
// allocations — end or transfer them first, or deactivate the room instead.
// Rooms whose only assignments are ended history may still be deleted
// (fixture/teardown flows depend on it); the history rows are retained.
func (s *roomService) Delete(ctx context.Context, id string) error {
	if s.staffAssignments != nil && s.childAssignments != nil {
		staff, err := s.staffAssignments.FindAll(ctx, repository.StaffRoomAssignmentFilter{RoomID: id, Status: models.AssignmentActive})
		if err != nil {
			return err
		}
		activeChildren, err := s.childAssignments.FindAll(ctx, repository.ChildRoomAssignmentFilter{RoomID: id, Status: models.AssignmentActive})
		if err != nil {
			return err
		}
		scheduledChildren, err := s.childAssignments.FindAll(ctx, repository.ChildRoomAssignmentFilter{RoomID: id, Status: models.AssignmentScheduled})
		if err != nil {
			return err
		}
		if len(staff) > 0 || len(activeChildren) > 0 || len(scheduledChildren) > 0 {
			return errors.New("this room still has active allocations — end or transfer them first, or deactivate the room")
		}
	}
	return s.repo.Delete(ctx, id)
}
