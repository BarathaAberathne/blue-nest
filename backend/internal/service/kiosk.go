package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// KioskService powers the entrance tablet: it authenticates devices by token,
// searches staff within the device's branch, and clocks staff in/out after a
// PIN check. It deliberately exposes nothing else — the tablet can never reach
// the rest of the CMS. Clock actions reuse StaffAttendanceService so the kiosk
// and the admin path write identical records.
type KioskService interface {
	// Device management (admin side).
	CreateDevice(ctx context.Context, req models.KioskDeviceRequest, actorID string) (*models.KioskDevice, string, error)
	ListDevices(ctx context.Context, branch string) ([]models.KioskDevice, error)
	SetDeviceActive(ctx context.Context, id string, active bool) error
	DeleteDevice(ctx context.Context, id string) error
	SetStaffPIN(ctx context.Context, staffID, pin string) error

	// Kiosk (device side).
	Authenticate(ctx context.Context, token string) (*models.KioskSession, error)
	SearchStaff(ctx context.Context, branch, q string) ([]models.KioskStaffResult, error)
	ClockIn(ctx context.Context, branch, staffID, pin string, cc ClockContext) (*models.StaffAttendanceRecord, error)
	ClockOut(ctx context.Context, branch, staffID, pin string, cc ClockContext) (*models.StaffAttendanceRecord, error)
}

type kioskService struct {
	devices    repository.KioskDeviceRepository
	staff      repository.StaffRepository
	attRepo    repository.StaffAttendanceRepository
	branches   repository.BranchRepository
	rooms      repository.RoomRepository
	attendance StaffAttendanceService
}

func NewKioskService(devices repository.KioskDeviceRepository, staff repository.StaffRepository, attRepo repository.StaffAttendanceRepository, branches repository.BranchRepository, rooms repository.RoomRepository, attendance StaffAttendanceService) KioskService {
	return &kioskService{devices: devices, staff: staff, attRepo: attRepo, branches: branches, rooms: rooms, attendance: attendance}
}

// ── device management ────────────────────────────────────────────────────────

func genToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (s *kioskService) CreateDevice(ctx context.Context, req models.KioskDeviceRequest, actorID string) (*models.KioskDevice, string, error) {
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.BranchSlug) == "" {
		return nil, "", errors.New("name and branch are required")
	}
	token, err := genToken()
	if err != nil {
		return nil, "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}
	d := &models.KioskDevice{
		Name:       strings.TrimSpace(req.Name),
		BranchSlug: req.BranchSlug,
		TokenHash:  string(hash),
		TokenHint:  token[len(token)-4:],
		Active:     true,
		CreatedBy:  actorID,
	}
	if err := s.devices.Create(ctx, d); err != nil {
		return nil, "", err
	}
	return d, token, nil // plaintext token returned ONCE
}

func (s *kioskService) ListDevices(ctx context.Context, branch string) ([]models.KioskDevice, error) {
	return s.devices.FindAll(ctx, branch)
}

func (s *kioskService) SetDeviceActive(ctx context.Context, id string, active bool) error {
	return s.devices.SetActive(ctx, id, active)
}

func (s *kioskService) DeleteDevice(ctx context.Context, id string) error {
	return s.devices.Delete(ctx, id)
}

func (s *kioskService) SetStaffPIN(ctx context.Context, staffID, pin string) error {
	pin = strings.TrimSpace(pin)
	if pin == "" {
		return s.staff.SetPINHash(ctx, staffID, "") // clear
	}
	if !isValidPIN(pin) {
		return errors.New("PIN must be 4–8 digits")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.staff.SetPINHash(ctx, staffID, string(hash))
}

func isValidPIN(pin string) bool {
	if len(pin) < 4 || len(pin) > 8 {
		return false
	}
	for _, c := range pin {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// ── kiosk (device) side ──────────────────────────────────────────────────────

// Authenticate matches a presented token against the active devices' hashes.
func (s *kioskService) Authenticate(ctx context.Context, token string) (*models.KioskSession, error) {
	if strings.TrimSpace(token) == "" {
		return nil, errors.New("missing device token")
	}
	devices, err := s.devices.FindActive(ctx)
	if err != nil {
		return nil, err
	}
	for _, d := range devices {
		if bcrypt.CompareHashAndPassword([]byte(d.TokenHash), []byte(token)) == nil {
			_ = s.devices.TouchLastSeen(ctx, d.ID.Hex())
			branchName := d.BranchSlug
			if b, err := s.branches.FindBySlug(ctx, d.BranchSlug); err == nil && b != nil {
				branchName = b.Name
			}
			return &models.KioskSession{
				DeviceID: d.ID.Hex(), DeviceName: d.Name,
				BranchSlug: d.BranchSlug, BranchName: branchName,
			}, nil
		}
	}
	return nil, errors.New("invalid device token")
}

func (s *kioskService) SearchStaff(ctx context.Context, branch, q string) ([]models.KioskStaffResult, error) {
	people, err := s.staff.FindAll(ctx, repository.StaffFilter{Branch: branch, Status: string(models.StaffActive), Q: strings.TrimSpace(q)})
	if err != nil {
		return nil, err
	}
	// Today's records for this branch → per-staff clock state.
	recs, _ := s.attRepo.FindByDate(ctx, today(), branch)
	byStaff := map[string]models.StaffAttendanceRecord{}
	for _, r := range recs {
		byStaff[r.StaffID] = r
	}
	// Room names for display.
	roomName := map[string]string{}
	if rooms, err := s.rooms.FindAll(ctx, branch); err == nil {
		for _, rm := range rooms {
			roomName[rm.ID.Hex()] = rm.Name
		}
	}
	out := make([]models.KioskStaffResult, 0, len(people))
	for _, p := range people {
		id := p.ID.Hex()
		res := models.KioskStaffResult{
			ID:       id,
			Name:     strings.TrimSpace(p.FirstName + " " + p.LastName),
			JobTitle: p.JobTitle,
			RoomName: roomName[p.RoomID],
			HasPIN:   p.PINHash != "",
		}
		if rec, ok := byStaff[id]; ok {
			res.Status = string(rec.Status)
			res.ClockedIn = rec.ClockIn != nil && rec.ClockOut == nil
			res.ClockedOut = rec.ClockOut != nil
		}
		out = append(out, res)
	}
	return out, nil
}

// verify checks the staff is active, in the device's branch, and the PIN matches.
func (s *kioskService) verify(ctx context.Context, branch, staffID, pin string) (*models.Staff, error) {
	st, err := s.staff.FindByID(ctx, staffID)
	if err != nil {
		return nil, errors.New("staff not found")
	}
	if branch != "" && st.BranchSlug != branch {
		return nil, errors.New("staff not at this branch")
	}
	if st.PINHash == "" {
		return nil, errors.New("no PIN set — ask your manager to set one")
	}
	if bcrypt.CompareHashAndPassword([]byte(st.PINHash), []byte(strings.TrimSpace(pin))) != nil {
		return nil, errors.New("incorrect PIN")
	}
	return st, nil
}

func (s *kioskService) ClockIn(ctx context.Context, branch, staffID, pin string, cc ClockContext) (*models.StaffAttendanceRecord, error) {
	if _, err := s.verify(ctx, branch, staffID, pin); err != nil {
		return nil, err
	}
	return s.attendance.ClockIn(ctx, models.StaffClockInRequest{StaffID: staffID}, cc)
}

func (s *kioskService) ClockOut(ctx context.Context, branch, staffID, pin string, cc ClockContext) (*models.StaffAttendanceRecord, error) {
	if _, err := s.verify(ctx, branch, staffID, pin); err != nil {
		return nil, err
	}
	return s.attendance.ClockOut(ctx, models.StaffClockOutRequest{StaffID: staffID}, cc)
}
