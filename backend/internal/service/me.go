package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// MeService backs the self-service "My Profile" hub: the signed-in user's own
// staff record, plus their attendance history and personal rota. It resolves
// the caller's Staff record via Staff.UserID and only exposes their own data.
type MeService interface {
	Profile(ctx context.Context, userID string) (*models.Staff, error)
	UpdateProfile(ctx context.Context, userID string, in models.MeProfileUpdate) (*models.Staff, error)
	// Attendance returns the caller's attendance records in [from,to] plus the
	// aggregated summary for the same range.
	Attendance(ctx context.Context, userID, from, to string) ([]models.StaffAttendanceRecord, *models.StaffAbsenceSummary, error)
	// Rota returns the caller's shifts in [from,to].
	Rota(ctx context.Context, userID, from, to string) ([]models.Shift, error)
}

type meService struct {
	staff      repository.StaffRepository
	attendance StaffAttendanceService
	attRepo    repository.StaffAttendanceRepository
	shifts     repository.ShiftRepository
}

func NewMeService(staff repository.StaffRepository, attendance StaffAttendanceService, attRepo repository.StaffAttendanceRepository, shifts repository.ShiftRepository) MeService {
	return &meService{staff: staff, attendance: attendance, attRepo: attRepo, shifts: shifts}
}

var errNoStaffProfile = errors.New("no staff profile is linked to your account — ask an admin to link your login")

// staffForUser resolves the Staff record linked to a login user (Staff.UserID).
func (s *meService) staffForUser(ctx context.Context, userID string) (*models.Staff, error) {
	all, err := s.staff.FindAll(ctx, repository.StaffFilter{})
	if err != nil {
		return nil, err
	}
	for i := range all {
		if all[i].UserID == userID {
			return &all[i], nil
		}
	}
	return nil, errNoStaffProfile
}

func (s *meService) Profile(ctx context.Context, userID string) (*models.Staff, error) {
	st, err := s.staffForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Return the canonical record via FindByID so computed projections
	// (room_id/room_name, has_pin) are populated consistently with the admin view.
	return s.staff.FindByID(ctx, st.ID.Hex())
}

func (s *meService) UpdateProfile(ctx context.Context, userID string, in models.MeProfileUpdate) (*models.Staff, error) {
	st, err := s.staffForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Apply only the self-editable subset; everything else is preserved.
	st.Phone = strings.TrimSpace(in.Phone)
	st.Email = strings.TrimSpace(in.Email)
	st.Qualifications = in.Qualifications
	st.EmergencyContacts = in.EmergencyContacts
	st.DBSNumber = strings.TrimSpace(in.DBSNumber)
	st.DBSExpiry = strings.TrimSpace(in.DBSExpiry)
	st.FirstAidExpiry = strings.TrimSpace(in.FirstAidExpiry)
	return s.staff.Update(ctx, st.ID.Hex(), *st)
}

func (s *meService) Attendance(ctx context.Context, userID, from, to string) ([]models.StaffAttendanceRecord, *models.StaffAbsenceSummary, error) {
	st, err := s.staffForUser(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	from, to = normalizeRange(from, to)
	summary, err := s.attendance.PeriodSummary(ctx, st.ID.Hex(), from, to)
	if err != nil {
		return nil, nil, err
	}
	recs, err := s.attRepo.FindByStaffRange(ctx, st.ID.Hex(), from, to)
	if err != nil {
		return nil, nil, err
	}
	if recs == nil {
		recs = []models.StaffAttendanceRecord{}
	}
	return recs, summary, nil
}

func (s *meService) Rota(ctx context.Context, userID, from, to string) ([]models.Shift, error) {
	st, err := s.staffForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	from, to = normalizeRange(from, to)
	shifts, err := s.shifts.FindByStaffRange(ctx, st.ID.Hex(), from, to)
	if err != nil {
		return nil, err
	}
	if shifts == nil {
		shifts = []models.Shift{}
	}
	return shifts, nil
}

// normalizeRange defaults an empty range to the last 30 → next 30 days.
func normalizeRange(from, to string) (string, string) {
	if from == "" {
		from = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().AddDate(0, 0, 30).Format("2006-01-02")
	}
	return from, to
}
