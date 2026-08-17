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

type NotificationRepository interface {
	CreateMany(ctx context.Context, ns []models.Notification) error
	FindByUser(ctx context.Context, userID string, limit int64) ([]models.Notification, error)
	CountUnread(ctx context.Context, userID string) (int64, error)
	MarkRead(ctx context.Context, id, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
}

type notificationRepository struct {
	col *TenantCollection
}

func NewNotificationRepository(db *mongo.Database) NotificationRepository {
	col := db.Collection("notifications")
	// The bell polls {user} list + {user, read:false} count on every admin
	// page load — previously both scanned the whole collection.
	ensureIndexes("notifications", col,
		mongo.IndexModel{
			Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}},
			Options: options.Index().SetName("idx_notif_org_user_created"),
		},
		mongo.IndexModel{
			Keys:    bson.D{{Key: "org_id", Value: 1}, {Key: "user_id", Value: 1}, {Key: "read", Value: 1}},
			Options: options.Index().SetName("idx_notif_org_user_read"),
		},
	)
	return &notificationRepository{col: NewTenantCollectionFrom(col)}
}

func (r *notificationRepository) CreateMany(ctx context.Context, ns []models.Notification) error {
	if len(ns) == 0 {
		return nil
	}
	now := time.Now()
	for i := range ns {
		ns[i].ID = primitive.NewObjectID()
		ns[i].CreatedAt = now
		if _, err := r.col.InsertOne(ctx, ns[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *notificationRepository) FindByUser(ctx context.Context, userID string, limit int64) ([]models.Notification, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	if limit > 0 {
		opts.SetLimit(limit)
	}
	cur, err := r.col.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, err
	}
	out := make([]models.Notification, 0)
	return out, cur.All(ctx, &out)
}

func (r *notificationRepository) CountUnread(ctx context.Context, userID string) (int64, error) {
	return r.col.CountDocuments(ctx, bson.M{"user_id": userID, "read": false})
}

func (r *notificationRepository) MarkRead(ctx context.Context, id, userID string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid, "user_id": userID}, bson.M{"$set": bson.M{"read": true, "read_at": now}})
	return err
}

func (r *notificationRepository) MarkAllRead(ctx context.Context, userID string) error {
	now := time.Now()
	_, err := r.col.UpdateMany(ctx, bson.M{"user_id": userID, "read": false}, bson.M{"$set": bson.M{"read": true, "read_at": now}})
	return err
}
