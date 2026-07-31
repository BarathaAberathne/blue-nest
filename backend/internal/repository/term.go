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

type TermRepository interface {
	Create(ctx context.Context, t *models.Term) error
	FindAll(ctx context.Context, branch string) ([]models.Term, error)
	FindByID(ctx context.Context, id string) (*models.Term, error)
	Update(ctx context.Context, id string, t models.Term) (*models.Term, error)
	Delete(ctx context.Context, id string) error
}

type termRepository struct {
	col *TenantCollection
}

func NewTermRepository(db *mongo.Database) TermRepository {
	return &termRepository{col: NewTenantCollection(db, "terms")}
}

func (r *termRepository) Create(ctx context.Context, t *models.Term) error {
	t.ID = primitive.NewObjectID()
	now := time.Now()
	t.CreatedAt = now
	t.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, t)
	return err
}

func (r *termRepository) FindAll(ctx context.Context, branch string) ([]models.Term, error) {
	q := bson.M{}
	if branch != "" {
		q["$or"] = bson.A{
			bson.M{"branch_slug": branch},
			bson.M{"branch_slug": ""},
			bson.M{"branch_slug": bson.M{"$exists": false}},
		}
	}
	opts := options.Find().SetSort(bson.D{{Key: "start_date", Value: 1}})
	cursor, err := r.col.Find(ctx, q, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.Term, 0)
	return results, cursor.All(ctx, &results)
}

func (r *termRepository) FindByID(ctx context.Context, id string) (*models.Term, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var t models.Term
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *termRepository) Update(ctx context.Context, id string, t models.Term) (*models.Term, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	t.UpdatedAt = time.Now()
	set := bson.M{
		"branch_slug": t.BranchSlug, "name": t.Name,
		"start_date": t.StartDate, "end_date": t.EndDate, "updated_at": t.UpdatedAt,
	}
	if _, err := r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": set}); err != nil {
		return nil, err
	}
	return r.FindByID(ctx, id)
}

func (r *termRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
