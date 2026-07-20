package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// StripeDetails carries the customer + address data reconciled from a verified
// Stripe checkout session into the order (the DB stays the source of truth).
type StripeDetails struct {
	CustomerEmail    string
	CustomerName     string
	CustomerPhone    string
	StripeCustomerID string
	Shipping         models.ShippingAddress
	Billing          models.ShippingAddress
}

type OrderRepository interface {
	FindAll(ctx context.Context) ([]models.Order, error)
	FindByUserID(ctx context.Context, userID string) ([]models.Order, error)
	FindByID(ctx context.Context, id string) (*models.Order, error)
	UpdateStatus(ctx context.Context, id, status string) error
	// AttachStripeSession stores the Stripe checkout session id on a pending order
	// (set right after the session is created, before the customer is redirected).
	AttachStripeSession(ctx context.Context, id, sessionID string) error
	// SaveStripeDetails reconciles verified customer + billing/shipping data from
	// the webhook onto the order. Only non-empty fields overwrite existing values.
	SaveStripeDetails(ctx context.Context, id string, d StripeDetails) error
	// MarkPaid sets status=paid, payment_status=paid, stores Stripe IDs and paid
	// timestamp. Safe to call multiple times — a no-op once already paid.
	MarkPaid(ctx context.Context, id, stripeSessionID, paymentIntentID string) error
	// MarkPaymentFailed flags a failed payment (status=cancelled, payment_status=failed).
	MarkPaymentFailed(ctx context.Context, id string) error
	// TryMark…EmailSent atomically flags a given email class as sent; returns true
	// only the first time (idempotency guard against webhook retries).
	TryMarkConfirmationEmailSent(ctx context.Context, id string) (bool, error)
	TryMarkAdminEmailSent(ctx context.Context, id string) (bool, error)
	TryMarkBranchEmailSent(ctx context.Context, id string) (bool, error)
	TryMarkBAEmailSent(ctx context.Context, id string) (bool, error)
	// TryMarkStockAdjusted guards stock decrement against duplicate webhook deliveries.
	TryMarkStockAdjusted(ctx context.Context, id string) (bool, error)
	Create(ctx context.Context, order models.Order) (*models.Order, error)
}

type orderRepository struct {
	col     *TenantCollection
	counter CounterRepository
}

func NewOrderRepository(db *mongo.Database, counter CounterRepository) OrderRepository {
	return &orderRepository{col: NewTenantCollection(db, "orders"), counter: counter}
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

func (r *orderRepository) AttachStripeSession(ctx context.Context, id, sessionID string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	if sessionID == "" {
		return nil
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid},
		bson.M{"$set": bson.M{"stripe_session_id": sessionID, "updated_at": time.Now()}})
	return err
}

func (r *orderRepository) SaveStripeDetails(ctx context.Context, id string, d StripeDetails) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	fields := bson.M{"updated_at": time.Now()}
	if d.CustomerEmail != "" {
		fields["customer_email"] = d.CustomerEmail
	}
	if d.CustomerName != "" {
		fields["customer_name"] = d.CustomerName
	}
	if d.CustomerPhone != "" {
		fields["customer_phone"] = d.CustomerPhone
	}
	if d.StripeCustomerID != "" {
		fields["stripe_customer_id"] = d.StripeCustomerID
	}
	if d.Shipping.HasContent() {
		fields["shipping_address"] = d.Shipping
	}
	if d.Billing.HasContent() {
		fields["billing_address"] = d.Billing
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func (r *orderRepository) MarkPaid(ctx context.Context, id, stripeSessionID, paymentIntentID string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	// Read current ref + created_at so the human ORD number is minted ONLY on the
	// first successful payment (abandoned/unpaid orders never consume a number).
	var existing models.Order
	_ = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&existing)

	now := time.Now()
	fields := bson.M{
		"status":         string(models.OrderPaid),
		"payment_status": string(models.PaymentPaid),
		"paid_at":        now,
		"updated_at":     now,
	}
	if stripeSessionID != "" {
		fields["stripe_session_id"] = stripeSessionID
	}
	if paymentIntentID != "" {
		fields["payment_intent_id"] = paymentIntentID
	}
	// Mint the sequential ORD ref on first payment (best-effort — a counter hiccup
	// must never block marking an order paid; the display layer has a fallback).
	if existing.Ref == "" && r.counter != nil {
		year := existing.CreatedAt.Year()
		if year == 0 {
			year = now.Year()
		}
		if seq, cErr := r.counter.Next(ctx, fmt.Sprintf("%s-%d", models.CounterOrder, year)); cErr == nil {
			fields["ref"] = models.FormatRef(models.RefPrefixOrder, year, seq)
		}
	}
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": fields})
	return err
}

func (r *orderRepository) MarkPaymentFailed(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"status":         string(models.OrderCancelled),
		"payment_status": string(models.PaymentFailed),
		"updated_at":     now,
	}})
	return err
}

// tryMarkEmailSent is the shared atomic idempotency guard for a given "…_sent_at"
// field: it sets the timestamp only if absent, returning true just the first time.
func (r *orderRepository) tryMarkEmailSent(ctx context.Context, id, field string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, err
	}
	now := time.Now()
	res, err := r.col.UpdateOne(ctx,
		bson.M{"_id": oid, field: bson.M{"$exists": false}},
		bson.M{"$set": bson.M{field: now, "updated_at": now}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
}

func (r *orderRepository) TryMarkConfirmationEmailSent(ctx context.Context, id string) (bool, error) {
	return r.tryMarkEmailSent(ctx, id, "confirmation_email_sent_at")
}

func (r *orderRepository) TryMarkAdminEmailSent(ctx context.Context, id string) (bool, error) {
	return r.tryMarkEmailSent(ctx, id, "admin_email_sent_at")
}

func (r *orderRepository) TryMarkBranchEmailSent(ctx context.Context, id string) (bool, error) {
	return r.tryMarkEmailSent(ctx, id, "branch_email_sent_at")
}

func (r *orderRepository) TryMarkBAEmailSent(ctx context.Context, id string) (bool, error) {
	return r.tryMarkEmailSent(ctx, id, "ba_email_sent_at")
}

func (r *orderRepository) TryMarkStockAdjusted(ctx context.Context, id string) (bool, error) {
	return r.tryMarkEmailSent(ctx, id, "stock_adjusted_at")
}

func (r *orderRepository) Create(ctx context.Context, order models.Order) (*models.Order, error) {
	order.ID = primitive.NewObjectID()
	order.CreatedAt = time.Now()
	order.UpdatedAt = order.CreatedAt
	// NOTE: the human ORD-YYYY-NNNNNN reference is intentionally NOT minted here.
	// It's assigned in MarkPaid on the first successful payment, so abandoned /
	// unpaid checkout attempts never consume a sequential order number.
	_, err := r.col.InsertOne(ctx, order)
	if err != nil {
		return nil, err
	}
	return &order, nil
}
