package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Supplier is a managed vendor the nursery buys from. The procurement engine
// still keys offers/orders on the free-text supplier name (Gompels | Amazon |
// Other) for backward-compat; this entity is the curated directory + contact
// book layered on top (Phase 3 of the procurement roadmap). It is the foundation
// for supplier-scoped analytics and, later, automated ordering per supplier.
type Supplier struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"        json:"id"`
	OrgID        string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Name         string             `bson:"name"                 json:"name"`
	Slug         string             `bson:"slug"                 json:"slug"`
	Category     string             `bson:"category,omitempty"   json:"category,omitempty"`
	ContactName  string             `bson:"contact_name,omitempty"  json:"contact_name,omitempty"`
	ContactEmail string             `bson:"contact_email,omitempty" json:"contact_email,omitempty"`
	ContactPhone string             `bson:"contact_phone,omitempty" json:"contact_phone,omitempty"`
	Website      string             `bson:"website,omitempty"    json:"website,omitempty"`
	// OrderEmail is where purchase orders are emailed (may differ from the
	// general contact email).
	OrderEmail string `bson:"order_email,omitempty" json:"order_email,omitempty"`
	// AccountRef is the nursery's account/customer number with this supplier.
	AccountRef   string    `bson:"account_ref,omitempty"   json:"account_ref,omitempty"`
	LeadTimeDays int       `bson:"lead_time_days,omitempty" json:"lead_time_days,omitempty"`
	Notes        string    `bson:"notes,omitempty"      json:"notes,omitempty"`
	IsActive     bool      `bson:"is_active"            json:"is_active"`
	CreatedAt    time.Time `bson:"created_at"           json:"created_at"`
	UpdatedAt    time.Time `bson:"updated_at"           json:"updated_at"`
}

// SupplierRequest is the create/update payload (admin-managed).
type SupplierRequest struct {
	Name         string `json:"name"`
	Category     string `json:"category"`
	ContactName  string `json:"contact_name"`
	ContactEmail string `json:"contact_email"`
	ContactPhone string `json:"contact_phone"`
	Website      string `json:"website"`
	OrderEmail   string `json:"order_email"`
	AccountRef   string `json:"account_ref"`
	LeadTimeDays int    `json:"lead_time_days"`
	Notes        string `json:"notes"`
	IsActive     *bool  `json:"is_active"`
}
