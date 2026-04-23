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
}

type ShippingAddress struct {
	Line1      string `bson:"line1"       json:"line1"`
	Line2      string `bson:"line2"       json:"line2,omitempty"`
	City       string `bson:"city"        json:"city"`
	PostalCode string `bson:"postal_code" json:"postal_code"`
	Country    string `bson:"country"     json:"country"`
}

type Order struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	UserID          primitive.ObjectID `bson:"user_id"          json:"user_id"`
	Items           []OrderItem        `bson:"items"            json:"items"`
	Status          OrderStatus        `bson:"status"           json:"status"`
	TotalAmount     int64              `bson:"total_amount"     json:"total_amount"`
	Currency        string             `bson:"currency"         json:"currency"`
	ShippingAddress ShippingAddress    `bson:"shipping_address" json:"shipping_address"`
	StripeSessionID string             `bson:"stripe_session_id" json:"stripe_session_id,omitempty"`
	CreatedAt       time.Time          `bson:"created_at"       json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"       json:"updated_at"`
}
