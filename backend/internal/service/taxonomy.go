package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type TaxonomyService interface {
	// List returns active terms for a category available to a branch (branch's
	// own terms + org-wide defaults) — powers the pickers.
	List(ctx context.Context, category, branch string) ([]models.TaxonomyTerm, error)
	// ListAll returns every term in a category (all branches + org-wide) for the
	// management screen; category "" returns everything.
	ListAll(ctx context.Context, category string) ([]models.TaxonomyTerm, error)
	GetByID(ctx context.Context, id string) (*models.TaxonomyTerm, error)
	Create(ctx context.Context, req models.TaxonomyRequest) (*models.TaxonomyTerm, error)
	Update(ctx context.Context, id string, req models.TaxonomyRequest) (*models.TaxonomyTerm, error)
	Delete(ctx context.Context, id string) error
}

type taxonomyService struct {
	repo repository.TaxonomyRepository
}

func NewTaxonomyService(repo repository.TaxonomyRepository) TaxonomyService {
	return &taxonomyService{repo: repo}
}

var taxonomyCodeRE = regexp.MustCompile("[^a-z0-9]+")

func taxonomyCode(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = taxonomyCodeRE.ReplaceAllString(s, "_")
	return strings.Trim(s, "_")
}

func (s *taxonomyService) List(ctx context.Context, category, branch string) ([]models.TaxonomyTerm, error) {
	return s.repo.FindAll(ctx, repository.TaxonomyFilter{Category: category, Branch: branch, ActiveOnly: true, OrgWideAlso: true})
}

func (s *taxonomyService) ListAll(ctx context.Context, category string) ([]models.TaxonomyTerm, error) {
	return s.repo.FindAll(ctx, repository.TaxonomyFilter{Category: category})
}

func (s *taxonomyService) GetByID(ctx context.Context, id string) (*models.TaxonomyTerm, error) {
	return s.repo.FindByID(ctx, id)
}

// apply copies the editable request fields onto a term (shared by create+update).
func applyTaxonomy(t *models.TaxonomyTerm, req models.TaxonomyRequest, isCreate bool) {
	t.BranchSlug = strings.TrimSpace(req.BranchSlug)
	t.Category = strings.TrimSpace(req.Category)
	t.Label = strings.TrimSpace(req.Label)
	code := strings.TrimSpace(req.Code)
	if code == "" {
		code = taxonomyCode(req.Label)
	}
	t.Code = code
	t.StartTime = strings.TrimSpace(req.StartTime)
	t.EndTime = strings.TrimSpace(req.EndTime)
	t.SortOrder = req.SortOrder
	if req.Active != nil {
		t.Active = *req.Active
	} else if isCreate {
		t.Active = true
	}
}

func (s *taxonomyService) validate(t *models.TaxonomyTerm) error {
	if !models.ValidTaxonomyCategory(t.Category) {
		return errors.New("unknown taxonomy category")
	}
	if t.Label == "" {
		return errors.New("label is required")
	}
	if t.Code == "" {
		return errors.New("could not derive a code from the label")
	}
	return nil
}

func (s *taxonomyService) Create(ctx context.Context, req models.TaxonomyRequest) (*models.TaxonomyTerm, error) {
	t := &models.TaxonomyTerm{}
	applyTaxonomy(t, req, true)
	if err := s.validate(t); err != nil {
		return nil, err
	}
	dup, err := s.repo.ExistsCode(ctx, t.Category, t.BranchSlug, t.Code, "")
	if err != nil {
		return nil, err
	}
	if dup {
		return nil, errors.New("a term with that code already exists for this list and branch")
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *taxonomyService) Update(ctx context.Context, id string, req models.TaxonomyRequest) (*models.TaxonomyTerm, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	// Category is immutable on update (records reference code within a category).
	req.Category = existing.Category
	applyTaxonomy(existing, req, false)
	if err := s.validate(existing); err != nil {
		return nil, err
	}
	dup, err := s.repo.ExistsCode(ctx, existing.Category, existing.BranchSlug, existing.Code, id)
	if err != nil {
		return nil, err
	}
	if dup {
		return nil, errors.New("a term with that code already exists for this list and branch")
	}
	return s.repo.Update(ctx, id, *existing)
}

func (s *taxonomyService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
