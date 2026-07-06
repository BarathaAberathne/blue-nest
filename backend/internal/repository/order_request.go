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

type OrderRequestRepository interface {
	Create(ctx context.Context, req *models.OrderRequest) error
	FindAll(ctx context.Context) ([]models.OrderRequest, error)
	FindByUserID(ctx context.Context, userID string) ([]models.OrderRequest, error)
	FindByID(ctx context.Context, id string) (*models.OrderRequest, error)
	UpdateStatus(ctx context.Context, id, status string) error
	SetExpectedDelivery(ctx context.Context, id string, expected *time.Time) error
	SetDelivered(ctx context.Context, id string, delivered time.Time) error
}

type orderRequestRepository struct {
	col *mongo.Collection
}

func NewOrderRequestRepository(db *mongo.Database) OrderRequestRepository {
	return &orderRequestRepository{col: db.Collection("order_requests")}
}

func (r *orderRequestRepository) Create(ctx context.Context, req *models.OrderRequest) error {
	req.ID = primitive.NewObjectID()
	now := time.Now()
	req.CreatedAt = now
	req.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, req)
	return err
}

func (r *orderRequestRepository) FindAll(ctx context.Context) ([]models.OrderRequest, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.OrderRequest, 0)
	return results, cursor.All(ctx, &results)
}

func (r *orderRequestRepository) FindByUserID(ctx context.Context, userID string) ([]models.OrderRequest, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{"user_id": oid}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.OrderRequest, 0)
	return results, cursor.All(ctx, &results)
}

func (r *orderRequestRepository) FindByID(ctx context.Context, id string) (*models.OrderRequest, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var req models.OrderRequest
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *orderRequestRepository) UpdateStatus(ctx context.Context, id, status string) error {
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

func (r *orderRequestRepository) SetExpectedDelivery(ctx context.Context, id string, expected *time.Time) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{"expected_delivery_date": expected, "updated_at": time.Now()}},
	)
	return err
}

func (r *orderRequestRepository) SetDelivered(ctx context.Context, id string, delivered time.Time) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{"delivered_at": delivered, "updated_at": time.Now()}},
	)
	return err
}
