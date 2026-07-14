package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type RoleService interface {
	// EnsureSeeded inserts any missing built-in roles from the defaults and loads
	// the effective role→permission cache. Called once at startup.
	EnsureSeeded(ctx context.Context) error
	List(ctx context.Context) ([]models.RoleDefinition, error)
	UpdatePermissions(ctx context.Context, name string, perms []models.Permission) (*models.RoleDefinition, error)
	CreateCustom(ctx context.Context, name, label string, perms []models.Permission) (*models.RoleDefinition, error)
	Delete(ctx context.Context, name string) error
}

type roleService struct {
	repo repository.RoleRepository
}

func NewRoleService(repo repository.RoleRepository) RoleService {
	return &roleService{repo: repo}
}

func (s *roleService) EnsureSeeded(ctx context.Context) error {
	existing, err := s.repo.FindAll(ctx)
	if err != nil {
		return err
	}
	have := make(map[models.Role]bool, len(existing))
	for _, d := range existing {
		have[d.Name] = true
	}
	defaults := models.DefaultRolePermissions()
	for _, role := range models.BuiltInRoles() {
		if have[role] {
			continue
		}
		perms := defaults[role]
		if perms == nil {
			perms = []models.Permission{} // never store null (staff/customer have no perms)
		}
		if err := s.repo.Upsert(ctx, models.RoleDefinition{
			Name: role, Label: models.RoleLabel(role), Permissions: perms, IsCustom: false,
		}); err != nil {
			return err
		}
	}
	return s.refresh(ctx)
}

// refresh loads all role definitions into the models cache.
func (s *roleService) refresh(ctx context.Context) error {
	defs, err := s.repo.FindAll(ctx)
	if err != nil {
		return err
	}
	m := make(map[models.Role][]models.Permission, len(defs))
	labels := make(map[models.Role]string)
	for _, d := range defs {
		m[d.Name] = d.Permissions
		if d.IsCustom {
			labels[d.Name] = d.Label
		}
	}
	models.SetRolePermissions(m, labels)
	return nil
}

func (s *roleService) List(ctx context.Context) ([]models.RoleDefinition, error) {
	defs, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	for i := range defs {
		if defs[i].Permissions == nil {
			defs[i].Permissions = []models.Permission{} // never emit null to the UI
		}
	}
	return defs, nil
}

// sanitizePerms drops anything not in the known catalogue.
func sanitizePerms(perms []models.Permission) []models.Permission {
	valid := map[models.Permission]bool{}
	for _, p := range models.PermissionCatalogue {
		valid[p.Key] = true
	}
	out := make([]models.Permission, 0, len(perms))
	seen := map[models.Permission]bool{}
	for _, p := range perms {
		if valid[p] && !seen[p] {
			out = append(out, p)
			seen[p] = true
		}
	}
	return out
}

func (s *roleService) UpdatePermissions(ctx context.Context, name string, perms []models.Permission) (*models.RoleDefinition, error) {
	existing, err := s.repo.FindByName(ctx, name)
	if err != nil {
		return nil, errors.New("role not found")
	}
	// Guard: super_admin always keeps every permission.
	if existing.Name == models.RoleSuperAdmin {
		perms = models.AllPermissions
	}
	existing.Permissions = sanitizePerms(perms)
	if err := s.repo.Upsert(ctx, *existing); err != nil {
		return nil, err
	}
	if err := s.refresh(ctx); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *roleService) CreateCustom(ctx context.Context, name, label string, perms []models.Permission) (*models.RoleDefinition, error) {
	slug := slugify(name)
	if slug == "" {
		slug = slugify(label)
	}
	slug = strings.ReplaceAll(slug, "-", "_")
	if slug == "" {
		return nil, errors.New("a role name is required")
	}
	for _, r := range models.BuiltInRoles() {
		if string(r) == slug {
			return nil, errors.New("that name clashes with a built-in role")
		}
	}
	if _, err := s.repo.FindByName(ctx, slug); err == nil {
		return nil, errors.New("a role with that name already exists")
	}
	def := models.RoleDefinition{Name: models.Role(slug), Label: strings.TrimSpace(label), IsCustom: true, Permissions: sanitizePerms(perms)}
	if def.Label == "" {
		def.Label = slug
	}
	if err := s.repo.Upsert(ctx, def); err != nil {
		return nil, err
	}
	if err := s.refresh(ctx); err != nil {
		return nil, err
	}
	return &def, nil
}

func (s *roleService) Delete(ctx context.Context, name string) error {
	existing, err := s.repo.FindByName(ctx, name)
	if err != nil {
		return errors.New("role not found")
	}
	if !existing.IsCustom {
		return errors.New("built-in roles cannot be deleted")
	}
	if err := s.repo.Delete(ctx, name); err != nil {
		return err
	}
	return s.refresh(ctx)
}
