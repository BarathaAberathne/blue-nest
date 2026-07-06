package repository

import (
	"context"
	"errors"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DashboardLayoutRepository interface {
	// FindByUserID returns the user's saved layout, or (nil, nil) when none exists.
	FindByUserID(ctx context.Context, userID string) (*models.DashboardLayout, error)
	Upsert(ctx context.Context, userID string, widgets []models.DashboardWidget) (*models.DashboardLayout, error)
}

type dashboardLayoutRepository struct {
	col *mongo.Collection
}

func NewDashboardLayoutRepository(db *mongo.Database) DashboardLayoutRepository {
	return &dashboardLayoutRepository{col: db.Collection("dashboard_layouts")}
}

func (r *dashboardLayoutRepository) FindByUserID(ctx context.Context, userID string) (*models.DashboardLayout, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	var l models.DashboardLayout
	err = r.col.FindOne(ctx, bson.M{"user_id": oid}).Decode(&l)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *dashboardLayoutRepository) Upsert(ctx context.Context, userID string, widgets []models.DashboardWidget) (*models.DashboardLayout, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	if widgets == nil {
		widgets = []models.DashboardWidget{}
	}
	update := bson.M{
		"$set":         bson.M{"widgets": widgets, "updated_at": time.Now()},
		"$setOnInsert": bson.M{"user_id": oid},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.DashboardLayout
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"user_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}
