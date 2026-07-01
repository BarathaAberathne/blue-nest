package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderStatus string

const (
	OrderPending    OrderStatus = "pending"
	OrderPaid       OrderStatus = "paid"
	OrderProcessing OrderStatus = "processing"
	OrderShipped    OrderStatus = "shipped"
	OrderDelivered  OrderStatus = "delivered"
	OrderCancelled  OrderStatus = "cancelled"
)

type OrderItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Name      string             `bson:"name"       json:"name"`
	Price     int64              `bson:"price"      json:"price"`
	Qty       int                `bson:"qty"        json:"qty"`
	Size      string             `bson:"size,omitempty" json:"size,omitempty"`
}

type ShippingAddress struct {
	Name       string `bson:"name"        json:"name,omitempty"`
	Line1      string `bson:"line1"       json:"line1"`
	Line2      string `bson:"line2"       json:"line2,omitempty"`
	City       string `bson:"city"        json:"city"`
	PostalCode string `bson:"postal_code" json:"postal_code"`
	Country    string `bson:"country"     json:"country"`
}

type Order struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	Ref             string             `bson:"ref,omitempty"    json:"ref,omitempty"` // human ref e.g. ORD-2026-000042
	UserID          primitive.ObjectID `bson:"user_id"          json:"user_id"`
	Items           []OrderItem        `bson:"items"            json:"items"`
	Status          OrderStatus        `bson:"status"           json:"status"`
	TotalAmount     int64              `bson:"total_amount"     json:"total_amount"`
	Currency        string             `bson:"currency"         json:"currency"`
	ShippingAddress ShippingAddress    `bson:"shipping_address" json:"shipping_address"`
	CustomerEmail   string             `bson:"customer_email,omitempty"    json:"customer_email,omitempty"`
	StripeSessionID string             `bson:"stripe_session_id,omitempty" json:"stripe_session_id,omitempty"`
	PaymentIntentID string             `bson:"payment_intent_id,omitempty" json:"payment_intent_id,omitempty"`
	// PaidAt is set by the Stripe webhook — do not set from the frontend.
	PaidAt                  *time.Time `bson:"paid_at,omitempty"                    json:"paid_at,omitempty"`
	ConfirmationEmailSentAt *time.Time `bson:"confirmation_email_sent_at,omitempty" json:"confirmation_email_sent_at,omitempty"`
	AdminEmailSentAt        *time.Time `bson:"admin_email_sent_at,omitempty"        json:"admin_email_sent_at,omitempty"`
	CreatedAt               time.Time  `bson:"created_at"                           json:"created_at"`
	UpdatedAt               time.Time  `bson:"updated_at"                           json:"updated_at"`
}
