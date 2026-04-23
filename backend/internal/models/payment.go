package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentStatus string

const (
	PaymentSucceeded PaymentStatus = "succeeded"
	PaymentFailed    PaymentStatus = "failed"
	PaymentRefunded  PaymentStatus = "refunded"
)

type Payment struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	OrderID         primitive.ObjectID `bson:"order_id"         json:"order_id"`
	UserID          primitive.ObjectID `bson:"user_id"          json:"user_id"`
	StripePaymentID string             `bson:"stripe_payment_id" json:"stripe_payment_id"`
	Amount          int64              `bson:"amount"           json:"amount"`
	Currency        string             `bson:"currency"         json:"currency"`
	Status          PaymentStatus      `bson:"status"           json:"status"`
	CreatedAt       time.Time          `bson:"created_at"       json:"created_at"`
}
