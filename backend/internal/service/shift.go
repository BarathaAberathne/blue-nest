package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type ShiftService interface {
	// ListWeek returns all shifts for a branch across the 7 days from weekStart.
	ListWeek(ctx context.Context, branch, weekStart string) ([]models.Shift, error)
	// Assign/Update/Delete take the caller's allowed-branch set (nil = org-wide)
	// so a branch-scoped user can only roster within their own branches.
	Assign(ctx context.Context, req models.ShiftRequest, actorID string, allowed []string) (*models.Shift, error)
	Update(ctx context.Context, id string, req models.ShiftRequest, actorID string, allowed []string) (*models.Shift, error)
	Delete(ctx context.Context, id string, allowed []string) error
}

// ErrOutsideScope is returned when a caller acts on another branch's rota.
var ErrOutsideScope = errors.New("outside your branch scope")

func shiftBranchAllowed(allowed []string, branch string) bool {
	if allowed == nil {
		return true
	}
	for _, s := range allowed {
		if s == branch {
			return true
		}
	}
	return false
}

type shiftService struct {
	repo  repository.ShiftRepository
	staff repository.StaffRepository
	rooms repository.RoomRepository
	leave repository.LeaveRequestRepository
}

func NewShiftService(repo repository.ShiftRepository, staff repository.StaffRepository, rooms repository.RoomRepository, leave repository.LeaveRequestRepository) ShiftService {
	return &shiftService{repo: repo, staff: staff, rooms: rooms, leave: leave}
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
// An external (off-roster) request carries its own name + branch; a roster
// request resolves them from the staff record.
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
	sh := &models.Shift{
		RoomID:    req.RoomID,
		Date:      req.Date,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		Notes:     strings.TrimSpace(req.Notes),
	}
	if req.External {
		name := strings.TrimSpace(req.StaffName)
		if name == "" {
			return nil, errors.New("a name is required for cover")
		}
		if req.BranchSlug == "" {
			return nil, errors.New("a branch is required for cover")
		}
		sh.External = true
		sh.StaffName = name
		sh.BranchSlug = req.BranchSlug
	} else {
		if req.StaffID == "" {
			return nil, errors.New("staff is required")
		}
		st, err := s.staff.FindByID(ctx, req.StaffID)
		if err != nil {
			return nil, errors.New("staff not found")
		}
		sh.StaffID = req.StaffID
		sh.StaffName = strings.TrimSpace(st.FirstName + " " + st.LastName)
		sh.BranchSlug = st.BranchSlug

		// Can't roster someone who is on approved leave that day.
		if s.leave != nil {
			if lr, err := s.leave.FindByStaffID(ctx, req.StaffID); err == nil {
				for _, l := range lr {
					if l.Status == models.LeaveApproved && l.StartDate <= req.Date && req.Date <= l.EndDate {
						return nil, fmt.Errorf("%s is on approved %s (%s → %s) on %s — they can't be rostered that day", sh.StaffName, leaveTypeLabel(l.Type), l.StartDate, l.EndDate, req.Date)
					}
				}
			}
		}
	}
	if req.RoomID != "" {
		if room, err := s.rooms.FindByID(ctx, req.RoomID); err == nil && room != nil {
			sh.RoomName = room.Name
		}
	}
	return sh, nil
}

func (s *shiftService) Assign(ctx context.Context, req models.ShiftRequest, actorID string, allowed []string) (*models.Shift, error) {
	sh, err := s.resolve(ctx, req)
	if err != nil {
		return nil, err
	}
	if !shiftBranchAllowed(allowed, sh.BranchSlug) {
		return nil, ErrOutsideScope
	}
	sh.CreatedBy = actorID
	if err := s.repo.Create(ctx, sh); err != nil {
		return nil, err
	}
	return sh, nil
}

func (s *shiftService) Update(ctx context.Context, id string, req models.ShiftRequest, actorID string, allowed []string) (*models.Shift, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !shiftBranchAllowed(allowed, existing.BranchSlug) {
		return nil, ErrOutsideScope
	}
	sh, err := s.resolve(ctx, req)
	if err != nil {
		return nil, err
	}
	if !shiftBranchAllowed(allowed, sh.BranchSlug) {
		return nil, ErrOutsideScope
	}
	return s.repo.Update(ctx, id, *sh)
}

func (s *shiftService) Delete(ctx context.Context, id string, allowed []string) error {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if !shiftBranchAllowed(allowed, existing.BranchSlug) {
		return ErrOutsideScope
	}
	return s.repo.Delete(ctx, id)
}
