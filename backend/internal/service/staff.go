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

type staffService struct {
	repo     repository.StaffRepository
	counters repository.CounterRepository
}

func NewStaffService(repo repository.StaffRepository, counters repository.CounterRepository) StaffService {
	return &staffService{repo: repo, counters: counters}
}

func (s *staffService) List(ctx context.Context, f repository.StaffFilter) ([]models.Staff, error) {
	return s.repo.FindAll(ctx, f)
}
func (s *staffService) GetByID(ctx context.Context, id string) (*models.Staff, error) {
	return s.repo.FindByID(ctx, id)
}

func applyStaff(st *models.Staff, req models.StaffRequest) {
	st.FirstName = strings.TrimSpace(req.FirstName)
	st.LastName = strings.TrimSpace(req.LastName)
	st.Email = strings.TrimSpace(req.Email)
	st.Phone = strings.TrimSpace(req.Phone)
	st.BranchSlug = strings.TrimSpace(req.BranchSlug)
	st.RoomID = strings.TrimSpace(req.RoomID)
	st.JobTitle = strings.TrimSpace(req.JobTitle)
	if req.StaffType != "" {
		st.StaffType = req.StaffType
	}
	if req.Status != "" {
		st.Status = req.Status
	}
	st.StartDate = strings.TrimSpace(req.StartDate)
	st.ContractHours = req.ContractHours
	st.Qualifications = req.Qualifications
	st.DBSNumber = strings.TrimSpace(req.DBSNumber)
	st.DBSExpiry = strings.TrimSpace(req.DBSExpiry)
	st.FirstAidExpiry = strings.TrimSpace(req.FirstAidExpiry)
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
	st := &models.Staff{Status: models.StaffActive, StaffType: models.StaffPermanent}
	applyStaff(st, req)
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
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	applyStaff(existing, req)
	return s.repo.Update(ctx, id, *existing)
}

func (s *staffService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
