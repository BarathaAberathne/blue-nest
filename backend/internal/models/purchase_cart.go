package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PurchaseCartStatus tracks a generated cart through its lifecycle:
// draft → ordered → (partially_received) → received. "sent" is the legacy value
// for "ordered" (kept so old rows read correctly).
type PurchaseCartStatus string

const (
	PurchaseCartDraft             PurchaseCartStatus = "draft"   // generated, awaiting review
	PurchaseCartSent              PurchaseCartStatus = "sent"    // legacy alias for "ordered"
	PurchaseCartOrdered           PurchaseCartStatus = "ordered" // emailed/placed with the supplier
	PurchaseCartPartiallyReceived PurchaseCartStatus = "partially_received"
	PurchaseCartReceived          PurchaseCartStatus = "received"
	PurchaseCartCancelled         PurchaseCartStatus = "cancelled"
	PurchaseCartFailed            PurchaseCartStatus = "failed"
)

// IsPlaced reports whether the order has been sent to the supplier (and so can
// move on to delivery tracking / receiving, and can no longer be edited).
func (c *PurchaseCart) IsPlaced() bool {
	switch c.Status {
	case PurchaseCartSent, PurchaseCartOrdered, PurchaseCartPartiallyReceived, PurchaseCartReceived:
		return true
	default:
		return false
	}
}

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
	QtyReceived      int      `bson:"qty_received,omitempty" json:"qty_received,omitempty"` // goods received so far
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
	SentAt           *time.Time         `bson:"sent_at,omitempty"  json:"sent_at,omitempty"` // placed-with-supplier time
	EmailRef         string             `bson:"email_ref,omitempty" json:"email_ref,omitempty"`
	// Fulfillment tracking (set after the order is placed).
	SupplierOrderRef     string     `bson:"supplier_order_ref,omitempty"     json:"supplier_order_ref,omitempty"`
	ExpectedDeliveryDate *time.Time `bson:"expected_delivery_date,omitempty" json:"expected_delivery_date,omitempty"`
	DeliveredAt          *time.Time `bson:"delivered_at,omitempty"           json:"delivered_at,omitempty"`
	// ExportResults records what the browser extension did per line when pushing
	// to the Gompels cart (added/failed, and the product it auto-picked for
	// search-by-description lines).
	ExportResults []PurchaseCartExportResult `bson:"export_results,omitempty" json:"export_results,omitempty"`
	Error         string                     `bson:"error,omitempty"    json:"error,omitempty"`
	CreatedAt     time.Time                  `bson:"created_at"         json:"created_at"`
	UpdatedAt     time.Time                  `bson:"updated_at"         json:"updated_at"`
}

// PurchaseCartExportResult is one line's outcome from the Gompels extension fill.
type PurchaseCartExportResult struct {
	Name            string `bson:"name"               json:"name"`
	Status          string `bson:"status"             json:"status"` // added | failed | not_found
	ResolvedCode    string `bson:"resolved_code,omitempty"     json:"resolved_code,omitempty"`
	CatalogueItemID string `bson:"catalogue_item_id,omitempty" json:"catalogue_item_id,omitempty"`
	PickedName      string `bson:"picked_name,omitempty"       json:"picked_name,omitempty"` // search auto-pick
	Searched        bool   `bson:"searched,omitempty"          json:"searched,omitempty"`    // resolved via description search
	Substituted     bool   `bson:"substituted,omitempty"       json:"substituted,omitempty"` // coded line filled with a search alternative (unavailable)
	Qty             int    `bson:"qty,omitempty"               json:"qty,omitempty"`         // final basket qty after add (incl. any existing)
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

// ExportedRequest is posted by the browser extension after it fills the Gompels cart.
type ExportedRequest struct {
	Results          []PurchaseCartExportResult `json:"results"`
	SupplierOrderRef string                     `json:"supplier_order_ref,omitempty"` // Gompels basket/order ref, best-effort
}

// UpdateFulfillmentRequest records the supplier order reference and expected
// delivery date once the order has been placed.
type UpdateFulfillmentRequest struct {
	SupplierOrderRef     string     `json:"supplier_order_ref"`
	ExpectedDeliveryDate *time.Time `json:"expected_delivery_date"`
}

// ReceiveItem is one line's goods-received quantity, matched by code (name fallback).
type ReceiveItem struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	QtyReceived int    `json:"qty_received"`
}

// ReceiveRequest records what physically arrived for a purchase order.
type ReceiveRequest struct {
	Items []ReceiveItem `json:"items"`
}

// LearnCatalogueRequest persists a confirmed search auto-pick into the catalogue.
type LearnCatalogueRequest struct {
	Name  string `json:"name"`
	Code  string `json:"code"`
	Price int64  `json:"price"` // pence, optional
}
