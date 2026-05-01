package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CartItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Name      string             `bson:"name"       json:"name"`
	Price     int64              `bson:"price"      json:"price"`
	Qty       int                `bson:"qty"        json:"qty"`
	ImageURL  string             `bson:"image_url"  json:"image_url,omitempty"`
}

type Cart struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id"       json:"user_id"`
	Items     []CartItem         `bson:"items"         json:"items"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

type AddCartItemRequest struct {
	ProductID string `json:"product_id" validate:"required"`
	Qty       int    `json:"qty"        validate:"required,min=1"`
}

type UpdateCartItemRequest struct {
	Qty int `json:"qty" validate:"required,min=1"`
}
