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
	UpdateShipping(ctx context.Context, id string, addr models.ShippingAddress, customerEmail string) error
	// MarkPaid sets status=paid, stores Stripe IDs and paid timestamp.
	// Safe to call multiple times — subsequent calls are no-ops once already paid.
	MarkPaid(ctx context.Context, id, stripeSessionID, paymentIntentID string) error
	// TryMarkConfirmationEmailSent atomically flags the customer confirmation email as sent.
	// Returns true only the first time; subsequent calls return false (idempotency guard).
	TryMarkConfirmationEmailSent(ctx context.Context, id string) (bool, error)
	// TryMarkAdminEmailSent is the same guard for the admin notification email.
	TryMarkAdminEmailSent(ctx context.Context, id string) (bool, error)
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

func (r *orderRepository) UpdateShipping(ctx context.Context, id string, addr models.ShippingAddress, customerEmail string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	fields := bson.M{
		"shipping_address": addr,
		"updated_at":       time.Now(),
	}
	if customerEmail != "" {
		fields["customer_email"] = customerEmail
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func (r *orderRepository) MarkPaid(ctx context.Context, id, stripeSessionID, paymentIntentID string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	now := time.Now()
	fields := bson.M{
		"status":     string(models.OrderPaid),
		"paid_at":    now,
		"updated_at": now,
	}
	if stripeSessionID != "" {
		fields["stripe_session_id"] = stripeSessionID
	}
	if paymentIntentID != "" {
		fields["payment_intent_id"] = paymentIntentID
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func (r *orderRepository) TryMarkConfirmationEmailSent(ctx context.Context, id string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, err
	}
	now := time.Now()
	res, err := r.col.UpdateOne(ctx,
		// Only update if the field doesn't exist yet — atomic idempotency guard.
		bson.M{"_id": oid, "confirmation_email_sent_at": bson.M{"$exists": false}},
		bson.M{"$set": bson.M{"confirmation_email_sent_at": now, "updated_at": now}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
}

func (r *orderRepository) TryMarkAdminEmailSent(ctx context.Context, id string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, err
	}
	now := time.Now()
	res, err := r.col.UpdateOne(ctx,
		bson.M{"_id": oid, "admin_email_sent_at": bson.M{"$exists": false}},
		bson.M{"$set": bson.M{"admin_email_sent_at": now, "updated_at": now}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
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
