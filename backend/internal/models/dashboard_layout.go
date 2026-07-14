package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DashboardWidget is one card/section on the admin dashboard, as arranged by a
// user. Order is implied by position in the slice.
type DashboardWidget struct {
	Key    string `bson:"key"            json:"key"`            // stable widget identifier
	Hidden bool   `bson:"hidden"         json:"hidden"`         // hidden from the board
	Size   string `bson:"size,omitempty" json:"size,omitempty"` // "normal" | "wide"
}

// DashboardLayout is a per-user saved arrangement of the dashboard widgets
// (order + hidden + size). A user can keep several *named* layouts (e.g.
// "Morning Briefing", "Finance End-of-Month") and switch between them; exactly
// one is flagged Active at a time. The UI falls back to defaults when a user has
// no layouts. This is the persistence behind the customizable dashboard
// (Phase 4 → B3.3 named layouts).
type DashboardLayout struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id"       json:"user_id"`
	Name      string             `bson:"name"          json:"name"`
	Active    bool               `bson:"active"        json:"active"`
	Widgets   []DashboardWidget  `bson:"widgets"       json:"widgets"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

// DefaultLayoutName is the implicit layout used before a user names their own.
const DefaultLayoutName = "My Dashboard"

// SaveDashboardLayoutRequest is the PUT payload for the active layout (widgets
// only — back-compatible with the original single-layout API).
type SaveDashboardLayoutRequest struct {
	Name    string            `json:"name"` // optional: which named layout to save (defaults to the active one)
	Widgets []DashboardWidget `json:"widgets"`
}

// ActivateLayoutRequest selects which named layout becomes active.
type ActivateLayoutRequest struct {
	Name string `json:"name"`
}
