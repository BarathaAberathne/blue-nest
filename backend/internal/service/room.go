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

func (s *roomService) Create(ctx context.Context, req models.RoomRequest) (*models.Room, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.BranchSlug) == "" {
		return nil, errors.New("room name and branch are required")
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
	applyRoom(existing, req)
	return s.repo.Update(ctx, id, *existing)
}

func (s *roomService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
