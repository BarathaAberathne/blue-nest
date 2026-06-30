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

type PurchaseCartRepository interface {
	Create(ctx context.Context, c *models.PurchaseCart) error
	FindAll(ctx context.Context) ([]models.PurchaseCart, error)
	FindByID(ctx context.Context, id string) (*models.PurchaseCart, error)
	Update(ctx context.Context, id string, c models.PurchaseCart) (*models.PurchaseCart, error)
	MarkSent(ctx context.Context, id, emailRef string) error
	MarkFailed(ctx context.Context, id, errMsg string) error
}

type purchaseCartRepository struct {
	col *mongo.Collection
}

func NewPurchaseCartRepository(db *mongo.Database) PurchaseCartRepository {
	return &purchaseCartRepository{col: db.Collection("purchase_carts")}
}

func (r *purchaseCartRepository) Create(ctx context.Context, c *models.PurchaseCart) error {
	c.ID = primitive.NewObjectID()
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now
	_, err := r.col.InsertOne(ctx, c)
	return err
}

func (r *purchaseCartRepository) FindAll(ctx context.Context) ([]models.PurchaseCart, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	results := make([]models.PurchaseCart, 0)
	return results, cursor.All(ctx, &results)
}

func (r *purchaseCartRepository) FindByID(ctx context.Context, id string) (*models.PurchaseCart, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var c models.PurchaseCart
	if err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *purchaseCartRepository) Update(ctx context.Context, id string, c models.PurchaseCart) (*models.PurchaseCart, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"recipient_email": c.RecipientEmail,
		"lines":           c.Lines,
		"subtotal":        c.Subtotal,
		"updated_at":      time.Now(),
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var out models.PurchaseCart
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (r *purchaseCartRepository) MarkSent(ctx context.Context, id, emailRef string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"status":     string(models.PurchaseCartSent),
		"sent_at":    now,
		"email_ref":  emailRef,
		"error":      "",
		"updated_at": now,
	}})
	return err
}

func (r *purchaseCartRepository) MarkFailed(ctx context.Context, id, errMsg string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"status":     string(models.PurchaseCartFailed),
		"error":      errMsg,
		"updated_at": time.Now(),
	}})
	return err
}
