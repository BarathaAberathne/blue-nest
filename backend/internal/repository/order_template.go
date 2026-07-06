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

type OrderTemplateRepository interface {
	Create(ctx context.Context, t *models.OrderTemplate) error
	FindAll(ctx context.Context) ([]models.OrderTemplate, error)
	Delete(ctx context.Context, id string) error
}

type orderTemplateRepository struct {
	col *mongo.Collection
}

func NewOrderTemplateRepository(db *mongo.Database) OrderTemplateRepository {
	return &orderTemplateRepository{col: db.Collection("order_templates")}
}

func (r *orderTemplateRepository) Create(ctx context.Context, t *models.OrderTemplate) error {
	t.ID = primitive.NewObjectID()
	t.CreatedAt = time.Now()
	_, err := r.col.InsertOne(ctx, t)
	return err
}

func (r *orderTemplateRepository) FindAll(ctx context.Context) ([]models.OrderTemplate, error) {
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.OrderTemplate, 0)
	return results, cursor.All(ctx, &results)
}

func (r *orderTemplateRepository) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
