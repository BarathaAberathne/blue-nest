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
	Delete(ctx context.Context, id string) error
}

type roomService struct {
	repo repository.RoomRepository
}

func NewRoomService(repo repository.RoomRepository) RoomService {
	return &roomService{repo: repo}
}

func (s *roomService) List(ctx context.Context, branch string) ([]models.Room, error) {
	return s.repo.FindAll(ctx, branch)
}

func (s *roomService) GetByID(ctx context.Context, id string) (*models.Room, error) {
	return s.repo.FindByID(ctx, id)
}

func applyRoom(room *models.Room, req models.RoomRequest) {
	room.BranchSlug = strings.TrimSpace(req.BranchSlug)
	room.Name = strings.TrimSpace(req.Name)
	room.AgeRange = strings.TrimSpace(req.AgeRange)
	room.Capacity = req.Capacity
	room.StaffRatio = req.StaffRatio
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

func (s *roomService) Create(ctx context.Context, req models.RoomRequest) (*models.Room, error) {
	name := strings.TrimSpace(req.Name)
	branch := strings.TrimSpace(req.BranchSlug)
	if name == "" || branch == "" {
		return nil, errors.New("room name and branch are required")
	}
	if req.Capacity <= 0 {
		return nil, errors.New("capacity must be a positive number")
	}
	if dup, err := s.duplicateName(ctx, branch, name, ""); err != nil {
		return nil, err
	} else if dup {
		return nil, errors.New("a room with that name already exists at this branch")
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
	name := strings.TrimSpace(req.Name)
	branch := strings.TrimSpace(req.BranchSlug)
	if name != "" && branch != "" {
		if dup, err := s.duplicateName(ctx, branch, name, id); err != nil {
			return nil, err
		} else if dup {
			return nil, errors.New("a room with that name already exists at this branch")
		}
	}
	if req.Capacity <= 0 {
		return nil, errors.New("capacity must be a positive number")
	}
	applyRoom(existing, req)
	return s.repo.Update(ctx, id, *existing)
}

func (s *roomService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
