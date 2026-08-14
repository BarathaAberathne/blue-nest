package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type StaffService interface {
	List(ctx context.Context, f repository.StaffFilter) ([]models.Staff, error)
	GetByID(ctx context.Context, id string) (*models.Staff, error)
	Create(ctx context.Context, req models.StaffRequest) (*models.Staff, error)
	Update(ctx context.Context, id string, req models.StaffRequest) (*models.Staff, error)
	// SetPhoto sets (or clears, with an empty URL) the staff profile photo.
	SetPhoto(ctx context.Context, id, url string) (*models.Staff, error)
	Delete(ctx context.Context, id string) error
}

// StaffAccounts is the subset of AuthService the staff module needs to
// provision/link a person's optional system login (the "People, login optional"
// model). AuthService satisfies it.
type StaffAccounts interface {
	CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error)
	UpdateUser(ctx context.Context, id string, req models.AdminUpdateUserRequest) (*models.User, error)
	FindUserByEmail(ctx context.Context, email string) (*models.User, error)
}

type staffService struct {
	repo     repository.StaffRepository
	counters repository.CounterRepository
	accounts StaffAccounts
	// roomAssignments is the canonical staff→room model; the staff service
	// only READS from it to project the computed Staff.RoomID (nil-safe for
	// unit tests). rooms resolves the room name for that projection.
	roomAssignments StaffRoomAssignmentService
	rooms           repository.RoomRepository
}

func NewStaffService(repo repository.StaffRepository, counters repository.CounterRepository, accounts StaffAccounts, roomAssignments StaffRoomAssignmentService, rooms repository.RoomRepository) StaffService {
	return &staffService{repo: repo, counters: counters, accounts: accounts, roomAssignments: roomAssignments, rooms: rooms}
}

// provisionLogin creates or links the person's login account and returns its id.
// Called when a staff record has EnableLogin set. Idempotent: an existing
// account (same email, or already linked) is updated with the role + branch
// scope rather than duplicated.
func (s *staffService) provisionLogin(ctx context.Context, st *models.Staff, req models.StaffRequest) error {
	email := strings.TrimSpace(st.Email)
	if email == "" {
		return errors.New("a login email is required to enable a system login — enter one in the Login email field")
	}
	role := req.LoginRole
	if role == "" {
		role = models.RoleStaff
	}
	scope := []string{st.BranchSlug}

	// Already linked → keep role/scope in sync.
	if st.UserID != "" {
		_, err := s.accounts.UpdateUser(ctx, st.UserID, models.AdminUpdateUserRequest{Role: role, BranchSlugs: scope})
		return err
	}
	// An account with this email already exists → link + rescope it, but never
	// steal a login that is already another staff member's identity.
	if existing, err := s.accounts.FindUserByEmail(ctx, email); err == nil && existing != nil {
		if other, oerr := s.repo.FindByUserID(ctx, existing.ID.Hex()); oerr == nil && other != nil && other.ID != st.ID {
			return errors.New("that email's login already belongs to " + other.FirstName + " " + other.LastName + " — use a different email")
		}
		if _, uerr := s.accounts.UpdateUser(ctx, existing.ID.Hex(), models.AdminUpdateUserRequest{Role: role, BranchSlugs: scope}); uerr != nil {
			return uerr
		}
		st.UserID = existing.ID.Hex()
		return nil
	}
	// Otherwise create a fresh account.
	if len(req.LoginPassword) < minPasswordLen {
		return errors.New("a password (min 8 chars) is required to create a new login")
	}
	u, err := s.accounts.CreateAdminUser(ctx, models.AdminCreateUserRequest{
		Email: email, Password: req.LoginPassword, FirstName: st.FirstName, LastName: st.LastName,
		Role: role, BranchSlugs: scope,
	})
	if err != nil {
		return err
	}
	st.UserID = u.ID.Hex()
	return nil
}

func (s *staffService) List(ctx context.Context, f repository.StaffFilter) ([]models.Staff, error) {
	// Room placement lives in the canonical staff_room_assignments — a ?room=
	// filter resolves through them, never a stored field (same pattern as
	// childService.List).
	roomFilter := f.Room
	f.Room = ""
	staff, err := s.repo.FindAll(ctx, f)
	if err != nil {
		return nil, err
	}
	// Project the computed primary room from the canonical assignment model
	// (one batched query — no stored scalar, no N+1).
	if s.roomAssignments != nil {
		primary := s.roomAssignments.PrimaryRoomsByBranch(ctx, f.Branch)
		names := s.roomNameMap(ctx, f.Branch)
		for i := range staff {
			if rid, ok := primary[staff[i].ID.Hex()]; ok {
				staff[i].RoomID = rid
				staff[i].RoomName = names[rid]
			}
		}
		if roomFilter != "" {
			filtered := staff[:0]
			for _, st := range staff {
				if st.RoomID == roomFilter {
					filtered = append(filtered, st)
				}
			}
			staff = filtered
		}
	}
	return staff, nil
}
func (s *staffService) GetByID(ctx context.Context, id string) (*models.Staff, error) {
	st, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	s.resolveRoom(ctx, st)
	return st, nil
}

// resolveRoom fills the transient RoomID/RoomName from the staff member's
// current primary active assignment in the canonical model.
func (s *staffService) resolveRoom(ctx context.Context, st *models.Staff) {
	if st == nil || s.roomAssignments == nil {
		return
	}
	rid := s.roomAssignments.PrimaryRoom(ctx, st.ID.Hex())
	if rid == "" {
		return
	}
	st.RoomID = rid
	if s.rooms != nil {
		if room, err := s.rooms.FindByID(ctx, rid); err == nil && room != nil {
			st.RoomName = room.Name
		}
	}
}

func (s *staffService) roomNameMap(ctx context.Context, branch string) map[string]string {
	out := map[string]string{}
	if s.rooms == nil {
		return out
	}
	rooms, err := s.rooms.FindAll(ctx, branch)
	if err != nil {
		return out
	}
	for _, r := range rooms {
		out[r.ID.Hex()] = r.Name
	}
	return out
}

// applyStaff copies a StaffRequest onto a Staff record for both Create and
// Update. Most fields only overwrite when the request actually supplies a
// non-empty value — a partial update must never silently wipe
// email/phone/job_title/DBS/First-Aid data. Room placement is not a field
// here; it is managed only through the staff-room-assignment endpoints.
func applyStaff(st *models.Staff, req models.StaffRequest) {
	if v := strings.TrimSpace(req.FirstName); v != "" {
		st.FirstName = v
	}
	if v := strings.TrimSpace(req.LastName); v != "" {
		st.LastName = v
	}
	if v := strings.TrimSpace(req.Email); v != "" {
		st.Email = v
	}
	if v := strings.TrimSpace(req.Phone); v != "" {
		st.Phone = v
	}
	if v := strings.TrimSpace(req.BranchSlug); v != "" {
		st.BranchSlug = v
	}
	// Room placement is NOT a field here — it is managed solely through the
	// staff-room-assignment endpoints (the canonical model).
	if v := strings.TrimSpace(req.JobTitle); v != "" {
		st.JobTitle = v
	}
	if req.StaffType != "" {
		st.StaffType = req.StaffType
	}
	if req.Status != "" {
		st.Status = req.Status
	}
	if v := strings.TrimSpace(req.StartDate); v != "" {
		st.StartDate = v
	}
	if req.ContractHours != 0 {
		st.ContractHours = req.ContractHours
	}
	st.AnnualLeaveDays = req.AnnualLeaveDays
	st.SickLeaveDays = req.SickLeaveDays
	if req.TermTimeOnly != nil {
		st.TermTimeOnly = *req.TermTimeOnly
	}
	if req.Qualifications != nil {
		st.Qualifications = req.Qualifications
	}
	if v := strings.TrimSpace(req.DBSNumber); v != "" {
		st.DBSNumber = v
	}
	if v := strings.TrimSpace(req.DBSExpiry); v != "" {
		st.DBSExpiry = v
	}
	if v := strings.TrimSpace(req.FirstAidExpiry); v != "" {
		st.FirstAidExpiry = v
	}
	if req.EmergencyContacts != nil {
		st.EmergencyContacts = req.EmergencyContacts
	}
}

func (s *staffService) mintRef(ctx context.Context) (string, error) {
	year := time.Now().Year()
	seq, err := s.counters.Next(ctx, models.CounterStaff+"-"+strconv.Itoa(year))
	if err != nil {
		return "", err
	}
	return models.FormatRef(models.RefPrefixStaff, year, seq), nil
}

func (s *staffService) Create(ctx context.Context, req models.StaffRequest) (*models.Staff, error) {
	if strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.LastName) == "" {
		return nil, errors.New("staff first and last name are required")
	}
	if strings.TrimSpace(req.BranchSlug) == "" {
		return nil, errors.New("branch is required")
	}
	if req.Status != "" && !models.IsValidStaffStatus(req.Status) {
		return nil, errors.New("invalid staff status")
	}
	if email := strings.TrimSpace(req.Email); email != "" {
		existing, err := s.repo.FindAll(ctx, repository.StaffFilter{Email: email})
		if err != nil {
			return nil, err
		}
		if len(existing) > 0 {
			return nil, errors.New("a staff member with that email already exists")
		}
	}
	st := &models.Staff{Status: models.StaffActive, StaffType: models.StaffPermanent}
	applyStaff(st, req)
	if req.EnableLogin {
		if err := s.provisionLogin(ctx, st, req); err != nil {
			return nil, err
		}
	}
	ref, err := s.mintRef(ctx)
	if err != nil {
		return nil, err
	}
	st.Ref = ref
	if err := s.repo.Create(ctx, st); err != nil {
		return nil, err
	}
	// Room placement is a first-class operation via the staff-room-assignment
	// endpoint — the create flow issues that as a separate canonical call.
	return st, nil
}

func (s *staffService) Update(ctx context.Context, id string, req models.StaffRequest) (*models.Staff, error) {
	if req.Status != "" && !models.IsValidStaffStatus(req.Status) {
		return nil, errors.New("invalid staff status")
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if email := strings.TrimSpace(req.Email); email != "" && !strings.EqualFold(email, existing.Email) {
		dupes, err := s.repo.FindAll(ctx, repository.StaffFilter{Email: email})
		if err != nil {
			return nil, err
		}
		for _, d := range dupes {
			if d.ID != existing.ID {
				return nil, errors.New("a staff member with that email already exists")
			}
		}
	}
	applyStaff(existing, req)
	if req.EnableLogin {
		if err := s.provisionLogin(ctx, existing, req); err != nil {
			return nil, err
		}
	}
	updated, err := s.repo.Update(ctx, id, *existing)
	if err != nil {
		return nil, err
	}
	// RoomID/RoomName are transient — re-project so an edit response still
	// carries the staff member's current room.
	s.resolveRoom(ctx, updated)
	return updated, nil
}

func (s *staffService) Delete(ctx context.Context, id string) error {
	// End any live room assignments first so no active row dangles on a
	// removed staff member (and their rooms stay cleanly deletable).
	if s.roomAssignments != nil {
		s.roomAssignments.EndAllForStaff(ctx, id, "staff-deleted")
	}
	return s.repo.Delete(ctx, id)
}

func (s *staffService) SetPhoto(ctx context.Context, id, url string) (*models.Staff, error) {
	url = strings.TrimSpace(url)
	if url != "" && !validPhotoURL(url) {
		return nil, errors.New("photo_url must reference an uploaded image")
	}
	updated, err := s.repo.SetPhoto(ctx, id, url)
	if err != nil {
		return nil, errors.New("staff member not found")
	}
	s.resolveRoom(ctx, updated)
	return updated, nil
}
