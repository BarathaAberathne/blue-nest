package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderRequestStatus tracks a supply request through the management workflow.
type OrderRequestStatus string

const (
	OrderRequestPending   OrderRequestStatus = "pending"   // submitted by staff, awaiting management
	OrderRequestOrdered   OrderRequestStatus = "ordered"   // management has placed the real order
	OrderRequestReceived  OrderRequestStatus = "received"  // goods arrived at the branch
	OrderRequestCancelled OrderRequestStatus = "cancelled" // rejected / withdrawn
)

// OrderRequestItem is a single line on a supply request. Supplier is a free-ish
// field for now (Gompels | Amazon | Other); it will graduate to a Supplier
// entity when the inventory module lands.
type OrderRequestItem struct {
	ItemName string `bson:"item_name"        json:"item_name"`
	Supplier string `bson:"supplier"         json:"supplier"`
	Qty      int    `bson:"qty"              json:"qty"`
	Notes    string `bson:"notes,omitempty"  json:"notes,omitempty"`
	// CatalogueItemID optionally links this line to a catalogue item (when the
	// staff member picked a known item). Empty for free-text/unknown items, which
	// the sourcing engine resolves at cart-generation time. Non-breaking.
	CatalogueItemID string `bson:"catalogue_item_id,omitempty" json:"catalogue_item_id,omitempty"`
}

// OrderRequest is a staff-submitted list of items needed at a branch. Management
// reviews the aggregated list (weekly/monthly/on-demand) and places the real
// supplier orders. This is the foundation for the future inventory module.
type OrderRequest struct {
	ID               primitive.ObjectID `bson:"_id,omitempty"      json:"id"`
	UserID           primitive.ObjectID `bson:"user_id"            json:"user_id"`
	RequestedByName  string             `bson:"requested_by_name"  json:"requested_by_name"`
	RequestedByEmail string             `bson:"requested_by_email" json:"requested_by_email"`
	BranchSlug       string             `bson:"branch_slug"        json:"branch_slug"`
	Items            []OrderRequestItem `bson:"items"              json:"items"`
	Status           OrderRequestStatus `bson:"status"             json:"status"`
	Notes            string             `bson:"notes,omitempty"    json:"notes,omitempty"`
	CreatedAt        time.Time          `bson:"created_at"         json:"created_at"`
	UpdatedAt        time.Time          `bson:"updated_at"         json:"updated_at"`
}

// CreateOrderRequestRequest is the staff submission payload.
type CreateOrderRequestRequest struct {
	BranchSlug string             `json:"branch_slug"`
	Notes      string             `json:"notes"`
	Items      []OrderRequestItem `json:"items"`
}
