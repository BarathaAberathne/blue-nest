package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// BranchTemplateRepository stores reusable branch-setup presets (collection
// branch_templates), tenant-scoped via TenantCollection.
type BranchTemplateRepository interface {
	FindAll(ctx context.Context) ([]models.BranchTemplate, error)
	FindByID(ctx context.Context, id string) (*models.BranchTemplate, error)
	Create(ctx context.Context, t *models.BranchTemplate) error
	Update(ctx context.Context, id string, t models.BranchTemplate) (*models.BranchTemplate, error)
	Delete(ctx context.Context, id string) error
}

type branchTemplateRepository struct {
	col *TenantCollection
}

func NewBranchTemplateRepository(db *mongo.Database) BranchTemplateRepository {
	return &branchTemplateRepository{col: NewTenantCollection(db, "branch_templates")}
}

func (r *branchTemplateRepository) FindAll(ctx context.Context) ([]models.BranchTemplate, error) {
	cursor, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.BranchTemplate, 0)
	return out, cursor.All(ctx, &out)
}

func (r *branchTemplateRepository) FindByID(ctx context.Context, id string) (*models.BranchTemplate, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var t models.BranchTemplate
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *branchTemplateRepository) Create(ctx context.Context, t *models.BranchTemplate) error {
	t.ID = primitive.NewObjectID()
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, t)
	return err
}

func (r *branchTemplateRepository) Update(ctx context.Context, id string, t models.BranchTemplate) (*models.BranchTemplate, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	t.UpdatedAt = time.Now()
	set := bson.M{
		"name": t.Name, "description": t.Description, "rooms": t.Rooms,
		"age_groups": t.AgeGroups, "updated_at": t.UpdatedAt,
	}
	if _, err := r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": set}); err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

func (r *branchTemplateRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
