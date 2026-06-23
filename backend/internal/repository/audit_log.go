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

type AuditLogRepository interface {
	Create(ctx context.Context, log *models.AuditLog) error
	FindAll(ctx context.Context, filter models.AuditLogFilter) ([]models.AuditLog, error)
}

type auditLogRepository struct {
	col *mongo.Collection
}

func NewAuditLogRepository(db *mongo.Database) AuditLogRepository {
	return &auditLogRepository{col: db.Collection("audit_logs")}
}

func (r *auditLogRepository) Create(ctx context.Context, log *models.AuditLog) error {
	log.ID = primitive.NewObjectID()
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	_, err := r.col.InsertOne(ctx, log)
	return err
}

func (r *auditLogRepository) FindAll(ctx context.Context, filter models.AuditLogFilter) ([]models.AuditLog, error) {
	q := bson.M{}
	if filter.ActorEmail != "" {
		q["actor_email"] = filter.ActorEmail
	}
	if filter.EntityType != "" {
		q["entity_type"] = filter.EntityType
	}
	if filter.Action != "" {
		q["action"] = filter.Action
	}

	limit := filter.Limit
	if limit <= 0 || limit > 500 {
		limit = 200
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.col.Find(ctx, q, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.AuditLog, 0)
	return results, cursor.All(ctx, &results)
}
