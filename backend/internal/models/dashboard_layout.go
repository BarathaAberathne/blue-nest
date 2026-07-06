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
// (order + hidden + size). One document per user; the UI falls back to defaults
// when none exists. This is the persistence behind the customizable dashboard
// (Phase 4).
type DashboardLayout struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id"       json:"user_id"`
	Widgets   []DashboardWidget  `bson:"widgets"       json:"widgets"`
	UpdatedAt time.Time          `bson:"updated_at"    json:"updated_at"`
}

// SaveDashboardLayoutRequest is the PUT payload.
type SaveDashboardLayoutRequest struct {
	Widgets []DashboardWidget `json:"widgets"`
}
