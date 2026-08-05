package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// FeeConfigRepository stores the per-branch fee/funding rules (collection
// fee_configs). Tenant-scoped via TenantCollection: reads/writes are auto-scoped
// to the request's org, so a branch is keyed by (org_id implicit) + branch_slug.
// The ""-branch document holds the org-wide meta.
type FeeConfigRepository interface {
	FindAll(ctx context.Context) ([]models.FeeConfig, error)
	FindByBranch(ctx context.Context, branch string) (*models.FeeConfig, error)
	Upsert(ctx context.Context, branch string, set bson.M) (*models.FeeConfig, error)
}

type feeConfigRepository struct {
	col *TenantCollection
}

func NewFeeConfigRepository(db *mongo.Database) FeeConfigRepository {
	return &feeConfigRepository{col: NewTenantCollection(db, "fee_configs")}
}

func (r *feeConfigRepository) FindAll(ctx context.Context) ([]models.FeeConfig, error) {
	cursor, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "branch_slug", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.FeeConfig, 0)
	return out, cursor.All(ctx, &out)
}

func (r *feeConfigRepository) FindByBranch(ctx context.Context, branch string) (*models.FeeConfig, error) {
	var c models.FeeConfig
	if err := r.col.FindOne(ctx, bson.M{"branch_slug": branch}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

// Upsert sets the given fields on the (org, branch) document, creating it if
// absent, and returns the fresh document.
func (r *feeConfigRepository) Upsert(ctx context.Context, branch string, set bson.M) (*models.FeeConfig, error) {
	set["updated_at"] = time.Now()
	if _, err := r.col.UpdateOne(ctx,
		bson.M{"branch_slug": branch},
		bson.M{"$set": set, "$setOnInsert": bson.M{"branch_slug": branch}},
		options.Update().SetUpsert(true),
	); err != nil {
		return nil, err
	}
	return r.FindByBranch(ctx, branch)
}
