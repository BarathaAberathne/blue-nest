package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NotificationPreferenceRepository stores per-user email opt-outs (collection
// notification_preferences), tenant-scoped via TenantCollection.
type NotificationPreferenceRepository interface {
	FindByUser(ctx context.Context, userID string) (*models.NotificationPreference, error)
	Upsert(ctx context.Context, userID string, mutedTypes []string) (*models.NotificationPreference, error)
}

type notificationPreferenceRepository struct {
	col *TenantCollection
}

func NewNotificationPreferenceRepository(db *mongo.Database) NotificationPreferenceRepository {
	return &notificationPreferenceRepository{col: NewTenantCollection(db, "notification_preferences")}
}

func (r *notificationPreferenceRepository) FindByUser(ctx context.Context, userID string) (*models.NotificationPreference, error) {
	var p models.NotificationPreference
	if err := r.col.FindOne(ctx, bson.M{"user_id": userID}).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *notificationPreferenceRepository) Upsert(ctx context.Context, userID string, mutedTypes []string) (*models.NotificationPreference, error) {
	if mutedTypes == nil {
		mutedTypes = []string{}
	}
	if _, err := r.col.UpdateOne(ctx,
		bson.M{"user_id": userID},
		bson.M{"$set": bson.M{"muted_types": mutedTypes, "updated_at": time.Now()}, "$setOnInsert": bson.M{"user_id": userID}},
		options.Update().SetUpsert(true),
	); err != nil {
		return nil, err
	}
	return r.FindByUser(ctx, userID)
}
