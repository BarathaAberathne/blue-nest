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
	staffSvc   StaffService
	attendance StaffAttendanceService
	attRepo    repository.StaffAttendanceRepository
	shifts     repository.ShiftRepository
}

func NewMeService(staff repository.StaffRepository, staffSvc StaffService, attendance StaffAttendanceService, attRepo repository.StaffAttendanceRepository, shifts repository.ShiftRepository) MeService {
	return &meService{staff: staff, staffSvc: staffSvc, attendance: attendance, attRepo: attRepo, shifts: shifts}
}

var errNoStaffProfile = errors.New("no staff profile is linked to your account - ask an admin to link your login")

// staffForUser resolves the Staff record linked to a login user (Staff.UserID).
func (s *meService) staffForUser(ctx context.Context, userID string) (*models.Staff, error) {
	if userID == "" {
		return nil, errNoStaffProfile
	}
	st, err := s.staff.FindByUserID(ctx, userID)
	if err != nil {
		return nil, errNoStaffProfile
	}
	return st, nil
}

func (s *meService) Profile(ctx context.Context, userID string) (*models.Staff, error) {
	st, err := s.staffForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Return the record via the canonical StaffService so computed projections
	// (room_id/room_name, has_pin) are populated consistently with the admin view.
	return s.staffSvc.GetByID(ctx, st.ID.Hex())
}

func (s *meService) UpdateProfile(ctx context.Context, userID string, in models.MeProfileUpdate) (*models.Staff, error) {
	st, err := s.staffForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Route the edit through the canonical StaffService.Update so the same
	// rules apply as on the admin path: duplicate-email rejection and
	// "empty means don't overwrite" semantics. Only the self-editable subset is
	// forwarded; allowances are copied from the existing record because
	// applyStaff sets them unconditionally.
	return s.staffSvc.Update(ctx, st.ID.Hex(), models.StaffRequest{
		Phone:             strings.TrimSpace(in.Phone),
		Email:             strings.TrimSpace(in.Email),
		Qualifications:    in.Qualifications,
		EmergencyContacts: in.EmergencyContacts,
		DBSNumber:         strings.TrimSpace(in.DBSNumber),
		DBSExpiry:         strings.TrimSpace(in.DBSExpiry),
		FirstAidExpiry:    strings.TrimSpace(in.FirstAidExpiry),
		AnnualLeaveDays:   st.AnnualLeaveDays,
		SickLeaveDays:     st.SickLeaveDays,
	})
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
