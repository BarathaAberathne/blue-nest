package service

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/mongo"
)

type BranchService interface {
	List(ctx context.Context) ([]models.Branch, error)
	ListAdmin(ctx context.Context, includeArchived bool) ([]models.Branch, error)
	GetBySlug(ctx context.Context, slug string) (*models.Branch, error)
	Create(ctx context.Context, req models.BranchRequest) (*models.Branch, error)
	Update(ctx context.Context, slug string, req models.BranchRequest) (*models.Branch, error)
	SetManagers(ctx context.Context, slug string, m models.BranchManagers) (*models.Branch, error)
	Archive(ctx context.Context, slug string, archived bool) error
}

type branchService struct {
	repo     repository.BranchRepository
	counters repository.CounterRepository
}

func NewBranchService(repo repository.BranchRepository, counters repository.CounterRepository) BranchService {
	return &branchService{repo: repo, counters: counters}
}

func (s *branchService) List(ctx context.Context) ([]models.Branch, error) {
	return s.repo.FindAll(ctx)
}

func (s *branchService) ListAdmin(ctx context.Context, includeArchived bool) ([]models.Branch, error) {
	return s.repo.FindAllAdmin(ctx, includeArchived)
}

func (s *branchService) GetBySlug(ctx context.Context, slug string) (*models.Branch, error) {
	return s.repo.FindBySlug(ctx, slug)
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func applyBranch(b *models.Branch, req models.BranchRequest) {
	b.Name = strings.TrimSpace(req.Name)
	if req.Status != "" {
		b.Status = req.Status
	}
	b.ShortDescription = req.ShortDescription
	b.HeroImageURL = req.HeroImageURL
	b.LogoURL = req.LogoURL
	b.Gallery = req.Gallery
	b.Contact = req.Contact
	b.Admissions = req.Admissions
	b.Postcode = strings.TrimSpace(req.Postcode)
	b.Lat = req.Lat
	b.Lng = req.Lng
	b.Website = strings.TrimSpace(req.Website)
	b.Parking = req.Parking
	b.OpeningHours = req.OpeningHours
	b.Capacity = req.Capacity
	b.AgeGroups = req.AgeGroups
	b.OfstedRating = req.OfstedRating
	b.OfstedReportURL = req.OfstedReportURL
	b.Google = req.Google
	b.Social = req.Social
	b.GroupID = req.GroupID
}

func (s *branchService) Create(ctx context.Context, req models.BranchRequest) (*models.Branch, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("branch name is required")
	}
	slug := slugify(req.Slug)
	if slug == "" {
		slug = slugify(req.Name)
	}
	if slug == "" {
		return nil, errors.New("could not derive a slug")
	}
	if existing, _ := s.repo.FindBySlug(ctx, slug); existing != nil {
		return nil, errors.New("a branch with that slug already exists")
	}
	b := &models.Branch{Slug: slug, Status: models.BranchActive}
	applyBranch(b, req)
	year := time.Now().Year()
	if seq, err := s.counters.Next(ctx, models.CounterBranch+"-"+strconv.Itoa(year)); err == nil {
		b.Ref = models.FormatRef(models.RefPrefixBranch, year, seq)
	}
	if err := s.repo.Create(ctx, b); err != nil {
		// The FindBySlug pre-check above is the UX path; the unique
		// {org_id, slug} index catches the concurrent-create race — surface it
		// as the same friendly message, never the raw Mongo write exception.
		if mongo.IsDuplicateKeyError(err) {
			return nil, errors.New("a branch with that slug already exists")
		}
		return nil, err
	}
	return b, nil
}

func (s *branchService) Update(ctx context.Context, slug string, req models.BranchRequest) (*models.Branch, error) {
	existing, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	applyBranch(existing, req)
	return s.repo.Update(ctx, slug, *existing)
}

func (s *branchService) SetManagers(ctx context.Context, slug string, m models.BranchManagers) (*models.Branch, error) {
	return s.repo.SetManagers(ctx, slug, m)
}

func (s *branchService) Archive(ctx context.Context, slug string, archived bool) error {
	return s.repo.Archive(ctx, slug, archived)
}
