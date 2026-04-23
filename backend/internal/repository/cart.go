package repository

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type CartRepository interface {
	FindByUserID(ctx context.Context, userID string) (*models.Cart, error)
}

type cartRepository struct {
	col *mongo.Collection
}

func NewCartRepository(db *mongo.Database) CartRepository {
	return &cartRepository{col: db.Collection("carts")}
}

func (r *cartRepository) FindByUserID(ctx context.Context, userID string) (*models.Cart, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	var cart models.Cart
	if err = r.col.FindOne(ctx, bson.M{"user_id": oid}).Decode(&cart); err != nil {
		return nil, err
	}
	return &cart, nil
}
