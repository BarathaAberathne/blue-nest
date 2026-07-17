package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// OrganisationService manages tenants (platform-operator scope) and each org's
// self-service profile.
type OrganisationService interface {
	List(ctx context.Context) ([]models.Organisation, error)
	GetByID(ctx context.Context, id string) (*models.Organisation, error)
	GetBySlug(ctx context.Context, slug string) (*models.Organisation, error)
	// ResolveByHost maps a request host to its tenant (custom domain / subdomain).
	ResolveByHost(ctx context.Context, host string) (*models.Organisation, error)
	// Create provisions a tenant; when AdminEmail/Password are set it also creates
	// the org's first super-admin so the tenant is immediately usable.
	Create(ctx context.Context, req models.OrganisationRequest) (*models.Organisation, error)
	Update(ctx context.Context, id string, req models.OrganisationRequest) (*models.Organisation, error)
	// UpdateProfile lets an org's own super-admin edit name/branding/settings only.
	UpdateProfile(ctx context.Context, id string, req models.OrgProfileRequest) (*models.Organisation, error)
}

type organisationService struct {
	repo repository.OrganisationRepository
	auth AuthService // for onboarding the first admin of a new tenant
}

func NewOrganisationService(repo repository.OrganisationRepository, auth AuthService) OrganisationService {
	return &organisationService{repo: repo, auth: auth}
}

var orgSlugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

func (s *organisationService) List(ctx context.Context) ([]models.Organisation, error) {
	return s.repo.FindAll(ctx)
}
func (s *organisationService) GetByID(ctx context.Context, id string) (*models.Organisation, error) {
	return s.repo.FindByID(ctx, id)
}
func (s *organisationService) GetBySlug(ctx context.Context, slug string) (*models.Organisation, error) {
	return s.repo.FindBySlug(ctx, slug)
}

// ResolveByHost strips the port, tries an exact domain match, then the leftmost
// subdomain label as a slug (e.g. "harrow.bluenest.app" → org slug "harrow" is
// NOT used; the tenant subdomain would be the org slug). Returns nil, nil when
// no tenant matches — callers fall back to the default org.
func (s *organisationService) ResolveByHost(ctx context.Context, host string) (*models.Organisation, error) {
	host = strings.ToLower(strings.TrimSpace(host))
	if i := strings.IndexByte(host, ':'); i >= 0 {
		host = host[:i]
	}
	if host == "" {
		return nil, nil
	}
	if o, err := s.repo.FindByDomain(ctx, host); err == nil && o != nil {
		return o, nil
	}
	// leftmost label as a tenant slug (subdomain routing)
	if i := strings.IndexByte(host, '.'); i > 0 {
		if o, err := s.repo.FindBySlug(ctx, host[:i]); err == nil && o != nil {
			return o, nil
		}
	}
	return nil, nil
}

func (s *organisationService) Create(ctx context.Context, req models.OrganisationRequest) (*models.Organisation, error) {
	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	if !orgSlugRe.MatchString(slug) {
		return nil, errors.New("slug must be lowercase letters, numbers and hyphens")
	}
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("name is required")
	}
	if existing, _ := s.repo.FindBySlug(ctx, slug); existing != nil {
		return nil, errors.New("an organisation with that slug already exists")
	}
	o := &models.Organisation{
		Slug: slug, Name: strings.TrimSpace(req.Name), Plan: req.Plan,
		Status: models.OrgActive, Branding: req.Branding, Domains: req.Domains, Settings: req.Settings,
	}
	if err := s.repo.Create(ctx, o); err != nil {
		return nil, err
	}
	// Onboarding: provision the tenant's first super-admin so it's usable
	// immediately. Runs in the NEW org's context so the user is stamped with it.
	if strings.TrimSpace(req.AdminEmail) != "" && s.auth != nil {
		orgCtx := repository.WithOrg(ctx, o.ID.Hex())
		_, err := s.auth.CreateAdminUser(orgCtx, models.AdminCreateUserRequest{
			Email:     strings.TrimSpace(req.AdminEmail),
			Password:  req.AdminPassword,
			FirstName: firstOr(req.AdminFirstName, "Org"),
			LastName:  firstOr(req.AdminLastName, "Admin"),
			Role:      models.RoleSuperAdmin,
		})
		if err != nil {
			return nil, errors.New("organisation created but admin provisioning failed: " + err.Error())
		}
	}
	return o, nil
}

func firstOr(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

func (s *organisationService) UpdateProfile(ctx context.Context, id string, req models.OrgProfileRequest) (*models.Organisation, error) {
	cur, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("name is required")
	}
	cur.Name = strings.TrimSpace(req.Name)
	cur.Branding = req.Branding
	cur.Settings = req.Settings
	return s.repo.Update(ctx, id, *cur)
}

func (s *organisationService) Update(ctx context.Context, id string, req models.OrganisationRequest) (*models.Organisation, error) {
	cur, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	cur.Name = strings.TrimSpace(req.Name)
	cur.Plan = req.Plan
	cur.Branding = req.Branding
	cur.Domains = req.Domains
	cur.Settings = req.Settings
	return s.repo.Update(ctx, id, *cur)
}
