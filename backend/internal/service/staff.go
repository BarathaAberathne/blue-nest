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
}

func NewStaffService(repo repository.StaffRepository, counters repository.CounterRepository, accounts StaffAccounts) StaffService {
	return &staffService{repo: repo, counters: counters, accounts: accounts}
}

// provisionLogin creates or links the person's login account and returns its id.
// Called when a staff record has EnableLogin set. Idempotent: an existing
// account (same email, or already linked) is updated with the role + branch
// scope rather than duplicated.
func (s *staffService) provisionLogin(ctx context.Context, st *models.Staff, req models.StaffRequest) error {
	email := strings.TrimSpace(st.Email)
	if email == "" {
		return errors.New("an email is required to enable a system login")
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
	// An account with this email already exists → link + rescope it.
	if existing, err := s.accounts.FindUserByEmail(ctx, email); err == nil && existing != nil {
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
	return s.repo.FindAll(ctx, f)
}
func (s *staffService) GetByID(ctx context.Context, id string) (*models.Staff, error) {
	return s.repo.FindByID(ctx, id)
}

// applyStaff copies a StaffRequest onto a Staff record for both Create and
// Update. Most fields only overwrite when the request actually supplies a
// non-empty value — a partial update (e.g. "just change room_id") must never
// silently wipe email/phone/job_title/DBS/First-Aid data, the same
// data-loss pattern already fixed for children's applyChild. RoomID stays
// unconditional: clearing it is the legitimate "unassign from room" action.
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
	st.RoomID = strings.TrimSpace(req.RoomID)
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
	return s.repo.Update(ctx, id, *existing)
}

func (s *staffService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
