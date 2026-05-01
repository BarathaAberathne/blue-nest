package repository

import (
	"context"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type OrderRepository interface {
	FindAll(ctx context.Context) ([]models.Order, error)
	FindByUserID(ctx context.Context, userID string) ([]models.Order, error)
	FindByID(ctx context.Context, id string) (*models.Order, error)
	UpdateStatus(ctx context.Context, id, status string) error
	Create(ctx context.Context, order models.Order) (*models.Order, error)
}

type orderRepository struct {
	col *mongo.Collection
}

func NewOrderRepository(db *mongo.Database) OrderRepository {
	return &orderRepository{col: db.Collection("orders")}
}

func (r *orderRepository) FindAll(ctx context.Context) ([]models.Order, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	results := make([]models.Order, 0)
	return results, cursor.All(ctx, &results)
}

func (r *orderRepository) FindByUserID(ctx context.Context, userID string) ([]models.Order, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	cursor, err := r.col.Find(ctx, bson.M{"user_id": oid})
	if err != nil {
		return nil, err
	}
	results := make([]models.Order, 0)
	return results, cursor.All(ctx, &results)
}

func (r *orderRepository) FindByID(ctx context.Context, id string) (*models.Order, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var o models.Order
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&o); err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *orderRepository) UpdateStatus(ctx context.Context, id, status string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{"status": status, "updated_at": time.Now()}},
	)
	return err
}

func (r *orderRepository) Create(ctx context.Context, order models.Order) (*models.Order, error) {
	order.ID = primitive.NewObjectID()
	order.CreatedAt = time.Now()
	order.UpdatedAt = order.CreatedAt
	_, err := r.col.InsertOne(ctx, order)
	if err != nil {
		return nil, err
	}
	return &order, nil
}
