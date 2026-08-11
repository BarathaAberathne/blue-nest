package service

import (
	"context"
	"errors"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
)

// FeeConfigService serves and edits the per-branch fee/funding rules that drive
// the public fee calculator. The org's branch list is the source of truth for
// WHICH branches exist: the bundle only serves configs for real, non-archived
// branches (orphan docs left by deleted/renamed branches are invisible), and a
// config can only be saved against an existing branch.
type FeeConfigService interface {
	// Bundle is the public shape the calculator consumes: branch rates keyed by
	// branch slug + org-wide meta (falls back to defaults when unset).
	Bundle(ctx context.Context) (*models.FeeConfigBundle, error)
	List(ctx context.Context) ([]models.FeeConfig, error)
	UpsertBranch(ctx context.Context, branch string, req models.FeeConfigRequest) (*models.FeeConfig, error)
	UpsertMeta(ctx context.Context, meta models.FeeMeta) (*models.FeeConfig, error)
	// DeleteBranch prunes a branch's rates document. Deliberately NOT
	// restricted to existing branches — its purpose includes cleaning up
	// orphan docs whose branch was archived or deleted. The ""-slug meta
	// document cannot be deleted this way.
	DeleteBranch(ctx context.Context, branch string) (bool, error)
}

type feeConfigService struct {
	repo     repository.FeeConfigRepository
	branches repository.BranchRepository
}

func NewFeeConfigService(repo repository.FeeConfigRepository, branches repository.BranchRepository) FeeConfigService {
	return &feeConfigService{repo: repo, branches: branches}
}

// activeSlugs returns the set of the org's non-archived branch slugs.
func (s *feeConfigService) activeSlugs(ctx context.Context) (map[string]bool, error) {
	list, err := s.branches.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	slugs := make(map[string]bool, len(list))
	for _, b := range list {
		slugs[b.Slug] = true
	}
	return slugs, nil
}

func (s *feeConfigService) Bundle(ctx context.Context) (*models.FeeConfigBundle, error) {
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	slugs, err := s.activeSlugs(ctx)
	if err != nil {
		return nil, err
	}
	bundle := &models.FeeConfigBundle{Branches: map[string]models.FeeConfig{}}
	for _, c := range all {
		if c.BranchSlug == "" {
			bundle.Meta = c.Meta
			continue
		}
		if !slugs[c.BranchSlug] {
			continue
		}
		bundle.Branches[c.BranchSlug] = c
	}
	if bundle.Meta == nil {
		m := models.DefaultFeeMeta()
		bundle.Meta = &m
	}
	return bundle, nil
}

func (s *feeConfigService) List(ctx context.Context) ([]models.FeeConfig, error) {
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	slugs, err := s.activeSlugs(ctx)
	if err != nil {
		return nil, err
	}
	filtered := make([]models.FeeConfig, 0, len(all))
	for _, c := range all {
		if c.BranchSlug == "" || slugs[c.BranchSlug] {
			filtered = append(filtered, c)
		}
	}
	return filtered, nil
}

func (s *feeConfigService) UpsertBranch(ctx context.Context, branch string, req models.FeeConfigRequest) (*models.FeeConfig, error) {
	slugs, err := s.activeSlugs(ctx)
	if err != nil {
		return nil, err
	}
	if !slugs[branch] {
		return nil, errors.New("unknown branch: " + branch)
	}
	return s.repo.Upsert(ctx, branch, bson.M{
		"age_groups": req.AgeGroups,
		"early_bird": req.EarlyBird,
		"std_funded": req.StdFunded,
	})
}

func (s *feeConfigService) UpsertMeta(ctx context.Context, meta models.FeeMeta) (*models.FeeConfig, error) {
	return s.repo.Upsert(ctx, "", bson.M{"meta": meta})
}

func (s *feeConfigService) DeleteBranch(ctx context.Context, branch string) (bool, error) {
	if branch == "" {
		return false, errors.New("branch is required")
	}
	n, err := s.repo.DeleteByBranch(ctx, branch)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
