package repository

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type BranchRepository interface {
	FindAll(ctx context.Context) ([]models.Branch, error)
	FindBySlug(ctx context.Context, slug string) (*models.Branch, error)
}

type branchRepository struct {
	col *mongo.Collection
}

func NewBranchRepository(db *mongo.Database) BranchRepository {
	return &branchRepository{col: db.Collection("branches")}
}

func (r *branchRepository) FindAll(ctx context.Context) ([]models.Branch, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	results := make([]models.Branch, 0)
	return results, cursor.All(ctx, &results)
}

func (r *branchRepository) FindBySlug(ctx context.Context, slug string) (*models.Branch, error) {
	var branch models.Branch
	if err := r.col.FindOne(ctx, bson.M{"slug": slug}).Decode(&branch); err != nil {
		return nil, err
	}
	return &branch, nil
}
