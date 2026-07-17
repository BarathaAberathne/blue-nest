package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderRequestStatus tracks a supply request through the management workflow.
type OrderRequestStatus string

const (
	OrderRequestPending     OrderRequestStatus = "pending"         // submitted by staff, awaiting management
	OrderRequestApproved    OrderRequestStatus = "approved"        // management approved, ready to convert
	OrderRequestConvertedPO OrderRequestStatus = "converted_to_po" // rolled into a purchase order
	OrderRequestOrdered     OrderRequestStatus = "ordered"         // management has placed the real order
	OrderRequestReceived    OrderRequestStatus = "received"        // goods arrived at the branch
	OrderRequestCancelled   OrderRequestStatus = "cancelled"       // rejected / withdrawn
)

// OrderRequestStatuses lists the valid statuses in workflow order. Drives
// validation + the admin Kanban lanes.
var OrderRequestStatuses = []OrderRequestStatus{
	OrderRequestPending, OrderRequestApproved, OrderRequestConvertedPO,
	OrderRequestOrdered, OrderRequestReceived, OrderRequestCancelled,
}

func IsValidOrderRequestStatus(s string) bool {
	for _, v := range OrderRequestStatuses {
		if string(v) == s {
			return true
		}
	}
	return false
}

// Request priority. "normal" is the default; "urgent" surfaces to the top of the
// board.
const (
	PriorityLow    = "low"
	PriorityNormal = "normal"
	PriorityHigh   = "high"
	PriorityUrgent = "urgent"
)

func IsValidRequestPriority(p string) bool {
	return p == PriorityLow || p == PriorityNormal || p == PriorityHigh || p == PriorityUrgent
}

// OrderRequestItem is a single line on a supply request. Supplier is a free-ish
// field for now (Gompels | Amazon | Other); it will graduate to a Supplier
// entity when the inventory module lands.
type OrderRequestItem struct {
	ItemName string `bson:"item_name"        json:"item_name"`
	Supplier string `bson:"supplier"         json:"supplier"`
	Qty      int    `bson:"qty"              json:"qty"`
	Notes    string `bson:"notes,omitempty"  json:"notes,omitempty"`
	// Code is the supplier product code (e.g. Gompels SKU) when the staff member
	// picked a known catalogue item — denormalised so management sees the exact
	// SKU without a lookup. Empty for free-text items.
	Code string `bson:"code,omitempty" json:"code,omitempty"`
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
	OrgID            string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref              string             `bson:"ref,omitempty"      json:"ref,omitempty"` // human ref e.g. SR-2026-000045
	UserID           primitive.ObjectID `bson:"user_id"            json:"user_id"`
	RequestedByName  string             `bson:"requested_by_name"  json:"requested_by_name"`
	RequestedByEmail string             `bson:"requested_by_email" json:"requested_by_email"`
	BranchSlug       string             `bson:"branch_slug"        json:"branch_slug"`
	Classroom        string             `bson:"classroom,omitempty" json:"classroom,omitempty"`
	Priority         string             `bson:"priority,omitempty"  json:"priority,omitempty"` // low|normal|high|urgent
	Items            []OrderRequestItem `bson:"items"              json:"items"`
	Status           OrderRequestStatus `bson:"status"             json:"status"`
	Notes            string             `bson:"notes,omitempty"    json:"notes,omitempty"`
	// Delivery feedback for the requesting staff member (set from the covering
	// purchase order). Staff see status + these dates — never prices/invoices.
	ExpectedDeliveryDate *time.Time `bson:"expected_delivery_date,omitempty" json:"expected_delivery_date,omitempty"`
	DeliveredAt          *time.Time `bson:"delivered_at,omitempty"           json:"delivered_at,omitempty"`
	CreatedAt            time.Time  `bson:"created_at"         json:"created_at"`
	UpdatedAt            time.Time  `bson:"updated_at"         json:"updated_at"`
}

// CreateOrderRequestRequest is the staff submission payload.
type CreateOrderRequestRequest struct {
	BranchSlug string             `json:"branch_slug"`
	Classroom  string             `json:"classroom"`
	Priority   string             `json:"priority"`
	Notes      string             `json:"notes"`
	Items      []OrderRequestItem `json:"items"`
}
