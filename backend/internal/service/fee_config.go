package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
)

// FeeConfigService serves and edits the per-branch fee/funding rules that drive
// the public fee calculator.
type FeeConfigService interface {
	// Bundle is the public shape the calculator consumes: branch rates keyed by
	// branch slug + org-wide meta (falls back to defaults when unset).
	Bundle(ctx context.Context) (*models.FeeConfigBundle, error)
	List(ctx context.Context) ([]models.FeeConfig, error)
	UpsertBranch(ctx context.Context, branch string, req models.FeeConfigRequest) (*models.FeeConfig, error)
	UpsertMeta(ctx context.Context, meta models.FeeMeta) (*models.FeeConfig, error)
}

type feeConfigService struct {
	repo repository.FeeConfigRepository
}

func NewFeeConfigService(repo repository.FeeConfigRepository) FeeConfigService {
	return &feeConfigService{repo: repo}
}

func (s *feeConfigService) Bundle(ctx context.Context) (*models.FeeConfigBundle, error) {
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	bundle := &models.FeeConfigBundle{Branches: map[string]models.FeeConfig{}}
	for _, c := range all {
		if c.BranchSlug == "" {
			bundle.Meta = c.Meta
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
	return s.repo.FindAll(ctx)
}

func (s *feeConfigService) UpsertBranch(ctx context.Context, branch string, req models.FeeConfigRequest) (*models.FeeConfig, error) {
	return s.repo.Upsert(ctx, branch, bson.M{
		"age_groups": req.AgeGroups,
		"early_bird": req.EarlyBird,
		"std_funded": req.StdFunded,
	})
}

func (s *feeConfigService) UpsertMeta(ctx context.Context, meta models.FeeMeta) (*models.FeeConfig, error) {
	return s.repo.Upsert(ctx, "", bson.M{"meta": meta})
}
