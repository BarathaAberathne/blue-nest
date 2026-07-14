package service

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type ShiftService interface {
	// ListWeek returns all shifts for a branch across the 7 days from weekStart.
	ListWeek(ctx context.Context, branch, weekStart string) ([]models.Shift, error)
	Assign(ctx context.Context, req models.ShiftRequest, actorID string) (*models.Shift, error)
	Update(ctx context.Context, id string, req models.ShiftRequest, actorID string) (*models.Shift, error)
	Delete(ctx context.Context, id string) error
}

type shiftService struct {
	repo  repository.ShiftRepository
	staff repository.StaffRepository
	rooms repository.RoomRepository
}

func NewShiftService(repo repository.ShiftRepository, staff repository.StaffRepository, rooms repository.RoomRepository) ShiftService {
	return &shiftService{repo: repo, staff: staff, rooms: rooms}
}

var (
	dateRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	timeRe = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)
)

func (s *shiftService) ListWeek(ctx context.Context, branch, weekStart string) ([]models.Shift, error) {
	if !dateRe.MatchString(weekStart) {
		return nil, errors.New("invalid week start date")
	}
	t, err := time.Parse("2006-01-02", weekStart)
	if err != nil {
		return nil, err
	}
	end := t.AddDate(0, 0, 6).Format("2006-01-02")
	shifts, err := s.repo.FindByBranchRange(ctx, branch, weekStart, end)
	if err != nil {
		return nil, err
	}
	if shifts == nil {
		shifts = []models.Shift{}
	}
	return shifts, nil
}

// resolve validates a request and fills staff/branch/room denormalised fields.
func (s *shiftService) resolve(ctx context.Context, req models.ShiftRequest) (*models.Shift, error) {
	if !dateRe.MatchString(req.Date) {
		return nil, errors.New("invalid date")
	}
	if !timeRe.MatchString(req.StartTime) || !timeRe.MatchString(req.EndTime) {
		return nil, errors.New("times must be HH:MM")
	}
	if req.EndTime <= req.StartTime {
		return nil, errors.New("end time must be after start time")
	}
	st, err := s.staff.FindByID(ctx, req.StaffID)
	if err != nil {
		return nil, errors.New("staff not found")
	}
	sh := &models.Shift{
		StaffID:    req.StaffID,
		StaffName:  strings.TrimSpace(st.FirstName + " " + st.LastName),
		BranchSlug: st.BranchSlug,
		RoomID:     req.RoomID,
		Date:       req.Date,
		StartTime:  req.StartTime,
		EndTime:    req.EndTime,
		Notes:      strings.TrimSpace(req.Notes),
	}
	if req.RoomID != "" {
		if room, err := s.rooms.FindByID(ctx, req.RoomID); err == nil && room != nil {
			sh.RoomName = room.Name
		}
	}
	return sh, nil
}

func (s *shiftService) Assign(ctx context.Context, req models.ShiftRequest, actorID string) (*models.Shift, error) {
	sh, err := s.resolve(ctx, req)
	if err != nil {
		return nil, err
	}
	sh.CreatedBy = actorID
	if err := s.repo.Create(ctx, sh); err != nil {
		return nil, err
	}
	return sh, nil
}

func (s *shiftService) Update(ctx context.Context, id string, req models.ShiftRequest, actorID string) (*models.Shift, error) {
	sh, err := s.resolve(ctx, req)
	if err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, *sh)
}

func (s *shiftService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
