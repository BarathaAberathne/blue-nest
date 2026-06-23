package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PurchaseCartStatus tracks a generated cart through send.
type PurchaseCartStatus string

const (
	PurchaseCartDraft  PurchaseCartStatus = "draft" // generated, awaiting review/send
	PurchaseCartSent   PurchaseCartStatus = "sent"  // emailed/placed with the supplier
	PurchaseCartFailed PurchaseCartStatus = "failed"
)

// PurchaseCartLine is one aggregated order line within a supplier cart. Matched
// is false when sourcing could not find a supplier code/price — the admin must
// fill it in on the preview before sending.
type PurchaseCartLine struct {
	CatalogueItemID  string   `bson:"catalogue_item_id,omitempty" json:"catalogue_item_id,omitempty"`
	Name             string   `bson:"name"              json:"name"`
	Code             string   `bson:"code,omitempty"    json:"code,omitempty"`
	PackSize         string   `bson:"pack_size,omitempty" json:"pack_size,omitempty"`
	Qty              int      `bson:"qty"               json:"qty"`
	UnitPrice        int64    `bson:"unit_price"        json:"unit_price"` // pence
	LineTotal        int64    `bson:"line_total"        json:"line_total"` // pence
	Matched          bool     `bson:"matched"           json:"matched"`
	SourceRequestIDs []string `bson:"source_request_ids,omitempty" json:"source_request_ids,omitempty"`
}

// PurchaseCart is one supplier's generated order, aggregated from one or more
// supply requests. The "best & cheapest" sourcing chooses which supplier each
// item lands in; carts are split per supplier.
type PurchaseCart struct {
	ID               primitive.ObjectID `bson:"_id,omitempty"      json:"id"`
	Supplier         string             `bson:"supplier"           json:"supplier"`
	Status           PurchaseCartStatus `bson:"status"             json:"status"`
	RecipientEmail   string             `bson:"recipient_email,omitempty" json:"recipient_email,omitempty"`
	Lines            []PurchaseCartLine `bson:"lines"              json:"lines"`
	Subtotal         int64              `bson:"subtotal"           json:"subtotal"` // pence
	SourceRequestIDs []string           `bson:"source_request_ids" json:"source_request_ids"`
	GeneratedBy      string             `bson:"generated_by,omitempty" json:"generated_by,omitempty"`
	SentAt           *time.Time         `bson:"sent_at,omitempty"  json:"sent_at,omitempty"`
	EmailRef         string             `bson:"email_ref,omitempty" json:"email_ref,omitempty"`
	Error            string             `bson:"error,omitempty"    json:"error,omitempty"`
	CreatedAt        time.Time          `bson:"created_at"         json:"created_at"`
	UpdatedAt        time.Time          `bson:"updated_at"         json:"updated_at"`
}

// GenerateCartRequest is the admin payload selecting which requests to turn into carts.
type GenerateCartRequest struct {
	RequestIDs []string `json:"request_ids"`
}

// UpdateCartRequest lets the admin override lines + recipient on the preview.
type UpdateCartRequest struct {
	RecipientEmail string             `json:"recipient_email"`
	Lines          []PurchaseCartLine `json:"lines"`
}
