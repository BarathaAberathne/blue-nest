package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// BranchTemplateService manages reusable branch-setup presets and applies them
// to a branch (creating its rooms) or captures one from an existing branch.
type BranchTemplateService interface {
	List(ctx context.Context) ([]models.BranchTemplate, error)
	Get(ctx context.Context, id string) (*models.BranchTemplate, error)
	Create(ctx context.Context, req models.BranchTemplateRequest) (*models.BranchTemplate, error)
	Update(ctx context.Context, id string, req models.BranchTemplateRequest) (*models.BranchTemplate, error)
	Delete(ctx context.Context, id string) error
	// Apply creates the template's rooms on the target branch, skipping any room
	// whose name already exists there (idempotent-ish, non-destructive).
	Apply(ctx context.Context, id, branchSlug string) (*models.BranchTemplateApplyResult, error)
	// CreateFromBranch captures a branch's current rooms into a new template.
	CreateFromBranch(ctx context.Context, branchSlug, name, description string) (*models.BranchTemplate, error)
}

type branchTemplateService struct {
	repo     repository.BranchTemplateRepository
	rooms    RoomService
	branches BranchService
}

func NewBranchTemplateService(repo repository.BranchTemplateRepository, rooms RoomService, branches BranchService) BranchTemplateService {
	return &branchTemplateService{repo: repo, rooms: rooms, branches: branches}
}

func (s *branchTemplateService) List(ctx context.Context) ([]models.BranchTemplate, error) {
	return s.repo.FindAll(ctx)
}

func (s *branchTemplateService) Get(ctx context.Context, id string) (*models.BranchTemplate, error) {
	return s.repo.FindByID(ctx, id)
}

func applyBranchTemplate(t *models.BranchTemplate, req models.BranchTemplateRequest) error {
	t.Name = strings.TrimSpace(req.Name)
	if t.Name == "" {
		return errors.New("name is required")
	}
	t.Description = strings.TrimSpace(req.Description)
	t.Rooms = req.Rooms
	t.AgeGroups = req.AgeGroups
	return nil
}

func (s *branchTemplateService) Create(ctx context.Context, req models.BranchTemplateRequest) (*models.BranchTemplate, error) {
	t := &models.BranchTemplate{}
	if err := applyBranchTemplate(t, req); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *branchTemplateService) Update(ctx context.Context, id string, req models.BranchTemplateRequest) (*models.BranchTemplate, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := applyBranchTemplate(existing, req); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, *existing)
}

func (s *branchTemplateService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *branchTemplateService) Apply(ctx context.Context, id, branchSlug string) (*models.BranchTemplateApplyResult, error) {
	branchSlug = strings.TrimSpace(branchSlug)
	if branchSlug == "" {
		return nil, errors.New("branch is required")
	}
	tmpl, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if _, err := s.branches.GetBySlug(ctx, branchSlug); err != nil {
		return nil, errors.New("branch not found")
	}
	// Existing room names on the branch, lower-cased, so applying twice does not
	// create duplicates.
	existing, _ := s.rooms.List(ctx, branchSlug)
	have := map[string]bool{}
	for _, r := range existing {
		have[strings.ToLower(strings.TrimSpace(r.Name))] = true
	}
	res := &models.BranchTemplateApplyResult{BranchSlug: branchSlug}
	for _, rt := range tmpl.Rooms {
		if have[strings.ToLower(strings.TrimSpace(rt.Name))] {
			res.Skipped = append(res.Skipped, rt.Name)
			continue
		}
		_, err := s.rooms.Create(ctx, models.RoomRequest{
			BranchSlug: branchSlug, Name: rt.Name, Code: rt.Code, AgeRange: rt.AgeRange,
			MinAgeMonths: rt.MinAgeMonths, MaxAgeMonths: rt.MaxAgeMonths,
			Capacity: rt.Capacity, StaffRatio: rt.StaffRatio,
		})
		if err != nil {
			res.Skipped = append(res.Skipped, rt.Name)
			continue
		}
		res.RoomsCreated++
	}
	return res, nil
}

func (s *branchTemplateService) CreateFromBranch(ctx context.Context, branchSlug, name, description string) (*models.BranchTemplate, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("name is required")
	}
	rooms, err := s.rooms.List(ctx, strings.TrimSpace(branchSlug))
	if err != nil {
		return nil, err
	}
	t := &models.BranchTemplate{Name: name, Description: strings.TrimSpace(description)}
	for _, r := range rooms {
		t.Rooms = append(t.Rooms, models.BranchTemplateRoom{
			Name: r.Name, Code: r.Code, AgeRange: r.AgeRange,
			MinAgeMonths: r.MinAgeMonths, MaxAgeMonths: r.MaxAgeMonths,
			Capacity: r.Capacity, StaffRatio: r.StaffRatio,
		})
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}
