package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CatalogueOffer is one supplier's offer for a catalogue item — the product code
// (Gompels SKU or Amazon ASIN), pack size, and price. The sourcing engine
// populates these from background supplier searches; admins can also curate them.
type CatalogueOffer struct {
	Supplier     string    `bson:"supplier"               json:"supplier"`                   // Gompels | Amazon | Other
	Code         string    `bson:"code"                   json:"code"`                       // Gompels SKU or Amazon ASIN
	OfferID      string    `bson:"offer_id,omitempty"     json:"offer_id,omitempty"`         // Amazon offer id (optional)
	PackSize     string    `bson:"pack_size,omitempty"    json:"pack_size,omitempty"`        // e.g. "80 Pack"
	Unit         string    `bson:"unit,omitempty"         json:"unit,omitempty"`             // e.g. "pack", "each"
	Price        int64     `bson:"price"                  json:"price"`                      // pence (pack price, inc VAT where known)
	PricePerUnit int64     `bson:"price_per_unit,omitempty" json:"price_per_unit,omitempty"` // pence per single unit (best-effort)
	SourceURL    string    `bson:"source_url,omitempty"   json:"source_url,omitempty"`
	LastSeenAt   time.Time `bson:"last_seen_at,omitempty" json:"last_seen_at,omitempty"`
}

// CatalogueItem is a logical product that can be sourced from one or more
// suppliers. It is the cache + curation layer over background search results:
// known items resolve instantly, and the sourcing engine upserts new offers as
// it discovers them. Foundation for the future inventory module.
type CatalogueItem struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name"          json:"name"`
	Category  string             `bson:"category,omitempty" json:"category,omitempty"`
	Offers    []CatalogueOffer   `bson:"offers"        json:"offers"`
	Aliases   []string           `bson:"aliases,omitempty" json:"aliases,omitempty"` // search terms that mapped here
	IsActive  bool               `bson:"is_active"     json:"is_active"`
	CreatedAt time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

// CatalogueItemRequest is the admin create/update payload.
type CatalogueItemRequest struct {
	Name     string           `json:"name"`
	Category string           `json:"category"`
	Offers   []CatalogueOffer `json:"offers"`
	Aliases  []string         `json:"aliases"`
	IsActive *bool            `json:"is_active"`
}
