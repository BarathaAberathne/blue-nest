package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// EmailTemplateRepository stores per-org customised transactional-email copy
// (collection email_templates), tenant-scoped via TenantCollection.
type EmailTemplateRepository interface {
	FindAll(ctx context.Context) ([]models.EmailTemplate, error)
	FindByKey(ctx context.Context, key string) (*models.EmailTemplate, error)
	Upsert(ctx context.Context, key, subject, body string) (*models.EmailTemplate, error)
	Delete(ctx context.Context, key string) error
}

type emailTemplateRepository struct {
	col *TenantCollection
}

func NewEmailTemplateRepository(db *mongo.Database) EmailTemplateRepository {
	return &emailTemplateRepository{col: NewTenantCollection(db, "email_templates")}
}

func (r *emailTemplateRepository) FindAll(ctx context.Context) ([]models.EmailTemplate, error) {
	cursor, err := r.col.Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "key", Value: 1}}))
	if err != nil {
		return nil, err
	}
	out := make([]models.EmailTemplate, 0)
	return out, cursor.All(ctx, &out)
}

func (r *emailTemplateRepository) FindByKey(ctx context.Context, key string) (*models.EmailTemplate, error) {
	var t models.EmailTemplate
	if err := r.col.FindOne(ctx, bson.M{"key": key}).Decode(&t); err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *emailTemplateRepository) Upsert(ctx context.Context, key, subject, body string) (*models.EmailTemplate, error) {
	if _, err := r.col.UpdateOne(ctx,
		bson.M{"key": key},
		bson.M{"$set": bson.M{"subject": subject, "body": body, "updated_at": time.Now()}, "$setOnInsert": bson.M{"key": key}},
		options.Update().SetUpsert(true),
	); err != nil {
		return nil, err
	}
	return r.FindByKey(ctx, key)
}

func (r *emailTemplateRepository) Delete(ctx context.Context, key string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"key": key})
	return err
}
