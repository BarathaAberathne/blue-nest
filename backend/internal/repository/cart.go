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

type CartRepository interface {
	FindByUserID(ctx context.Context, userID string) (*models.Cart, error)
	UpsertByUserID(ctx context.Context, cart *models.Cart) (*models.Cart, error)
	ClearByUserID(ctx context.Context, userID string) error
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

	if cart.Items == nil {
		cart.Items = make([]models.CartItem, 0)
	}
	return &cart, nil
}

func (r *cartRepository) UpsertByUserID(ctx context.Context, cart *models.Cart) (*models.Cart, error) {
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"items":      cart.Items,
			"updated_at": now,
		},
		"$setOnInsert": bson.M{
			"_id":        primitive.NewObjectID(),
			"user_id":    cart.UserID,
			"created_at": now,
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var out models.Cart
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"user_id": cart.UserID}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	if out.Items == nil {
		out.Items = make([]models.CartItem, 0)
	}
	return &out, nil
}

func (r *cartRepository) ClearByUserID(ctx context.Context, userID string) error {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"user_id": oid}, bson.M{
		"$set": bson.M{
			"items":      make([]models.CartItem, 0),
			"updated_at": time.Now(),
		},
	})
	return err
}
