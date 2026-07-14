package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type DashboardProfileService interface {
	List(ctx context.Context) ([]models.DashboardProfile, error)
	Save(ctx context.Context, req models.SaveDashboardProfileRequest) (*models.DashboardProfile, error)
	Delete(ctx context.Context, slug string) error
	// ResolveForRole returns the profile a role defaults to, or nil.
	ResolveForRole(ctx context.Context, role models.Role) (*models.DashboardProfile, error)
}

type dashboardProfileService struct {
	repo repository.DashboardProfileRepository
}

func NewDashboardProfileService(repo repository.DashboardProfileRepository) DashboardProfileService {
	return &dashboardProfileService{repo: repo}
}

func (s *dashboardProfileService) List(ctx context.Context) ([]models.DashboardProfile, error) {
	profiles, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	if profiles == nil {
		profiles = []models.DashboardProfile{} // never emit null to the UI
	}
	for i := range profiles {
		if profiles[i].Widgets == nil {
			profiles[i].Widgets = []models.DashboardWidget{}
		}
		if profiles[i].DefaultForRoles == nil {
			profiles[i].DefaultForRoles = []models.Role{}
		}
	}
	return profiles, nil
}

func (s *dashboardProfileService) Save(ctx context.Context, req models.SaveDashboardProfileRequest) (*models.DashboardProfile, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("a profile name is required")
	}
	slug := slugify(req.Slug)
	if slug == "" {
		slug = slugify(name)
	}
	if slug == "" {
		return nil, errors.New("a valid profile name is required")
	}
	// A role can only default to one profile, so pull the chosen roles off any others.
	roles := dedupeRoles(req.DefaultForRoles)
	for _, role := range roles {
		if err := s.repo.ClearRoleFromOthers(ctx, role, slug); err != nil {
			return nil, err
		}
	}
	return s.repo.Upsert(ctx, models.DashboardProfile{
		Name:            name,
		Slug:            slug,
		Description:     strings.TrimSpace(req.Description),
		Widgets:         req.Widgets,
		DefaultForRoles: roles,
	})
}

func (s *dashboardProfileService) Delete(ctx context.Context, slug string) error {
	return s.repo.Delete(ctx, slug)
}

func (s *dashboardProfileService) ResolveForRole(ctx context.Context, role models.Role) (*models.DashboardProfile, error) {
	if role == "" {
		return nil, nil
	}
	return s.repo.FindByRole(ctx, role)
}

func dedupeRoles(in []models.Role) []models.Role {
	seen := map[models.Role]bool{}
	out := make([]models.Role, 0, len(in))
	for _, r := range in {
		r = models.Role(strings.TrimSpace(string(r)))
		if r == "" || seen[r] {
			continue
		}
		seen[r] = true
		out = append(out, r)
	}
	return out
}
