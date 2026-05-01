package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ExternalID  string             `bson:"external_id,omitempty" json:"external_id,omitempty"`
	SKU         string             `bson:"sku,omitempty" json:"sku,omitempty"`
	Slug        string             `bson:"slug"          json:"slug"`
	Name        string             `bson:"name"          json:"name"`
	Description string             `bson:"description"   json:"description"`
	Price       int64              `bson:"price"         json:"price"` // pence
	Currency    string             `bson:"currency"      json:"currency"`
	Category    string             `bson:"category,omitempty" json:"category,omitempty"`
	CategoryID  primitive.ObjectID `bson:"category_id"   json:"category_id"`
	ImageURL    string             `bson:"image_url"     json:"image_url,omitempty"`
	StockQty    int                `bson:"stock_qty"     json:"stock_qty"`
	IsActive    bool               `bson:"is_active"     json:"is_active"`
	BranchSlugs []string           `bson:"branch_slugs"  json:"branch_slugs,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"    json:"updated_at"`
}

type Category struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Slug      string             `bson:"slug"          json:"slug"`
	Name      string             `bson:"name"          json:"name"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
}
