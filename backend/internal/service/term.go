package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type TermService interface {
	List(ctx context.Context, branch string) ([]models.Term, error)
	GetByID(ctx context.Context, id string) (*models.Term, error)
	Create(ctx context.Context, req models.TermRequest) (*models.Term, error)
	Update(ctx context.Context, id string, req models.TermRequest) (*models.Term, error)
	Delete(ctx context.Context, id string) error
}

type termService struct {
	repo repository.TermRepository
}

func NewTermService(repo repository.TermRepository) TermService {
	return &termService{repo: repo}
}

func (s *termService) List(ctx context.Context, branch string) ([]models.Term, error) {
	return s.repo.FindAll(ctx, branch)
}

func (s *termService) GetByID(ctx context.Context, id string) (*models.Term, error) {
	return s.repo.FindByID(ctx, id)
}

func validTermDate(d string) bool {
	_, err := time.Parse("2006-01-02", d)
	return err == nil
}

func applyTerm(t *models.Term, req models.TermRequest) {
	t.BranchSlug = strings.TrimSpace(req.BranchSlug)
	t.Name = strings.TrimSpace(req.Name)
	t.StartDate = strings.TrimSpace(req.StartDate)
	t.EndDate = strings.TrimSpace(req.EndDate)
}

func (s *termService) validate(t *models.Term) error {
	if t.Name == "" {
		return errors.New("term name is required")
	}
	if !validTermDate(t.StartDate) || !validTermDate(t.EndDate) {
		return errors.New("start_date and end_date must be YYYY-MM-DD")
	}
	if t.EndDate < t.StartDate {
		return errors.New("end_date must not be before start_date")
	}
	return nil
}

func (s *termService) Create(ctx context.Context, req models.TermRequest) (*models.Term, error) {
	t := &models.Term{}
	applyTerm(t, req)
	if err := s.validate(t); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *termService) Update(ctx context.Context, id string, req models.TermRequest) (*models.Term, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	applyTerm(existing, req)
	if err := s.validate(existing); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, *existing)
}

func (s *termService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
