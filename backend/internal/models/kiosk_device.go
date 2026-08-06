package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// KioskDevice is an entrance tablet registered to a branch. It authenticates to
// the isolated /kiosk API with its own token (never a user login), so the tablet
// can only search staff + clock in/out — nothing else in the CMS. A branch can
// have several devices; a device is bound to exactly one branch.
type KioskDevice struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"   json:"id"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Name       string             `bson:"name"            json:"name"` // e.g. "Harrow front entrance"
	BranchSlug string             `bson:"branch_slug"     json:"branch_slug"`
	TokenHash  string             `bson:"token_hash"      json:"-"`          // bcrypt of the device token
	TokenHint  string             `bson:"token_hint"      json:"token_hint"` // last 4 chars, for the admin list
	Active     bool               `bson:"active"          json:"active"`
	LastSeenAt *time.Time         `bson:"last_seen_at,omitempty" json:"last_seen_at,omitempty"`
	CreatedBy  string             `bson:"created_by,omitempty"   json:"created_by,omitempty"`
	CreatedAt  time.Time          `bson:"created_at"      json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at"      json:"updated_at"`
}

// KioskDeviceRequest creates a device (the plaintext token is returned once, on
// creation, and never stored in the clear).
type KioskDeviceRequest struct {
	Name       string `json:"name"        validate:"required"`
	BranchSlug string `json:"branch_slug" validate:"required"`
}

// KioskSession is what the tablet gets back after authenticating its token —
// enough to render the clock screen, no sensitive data.
type KioskSession struct {
	DeviceID   string `json:"device_id"`
	DeviceName string `json:"device_name"`
	BranchSlug string `json:"branch_slug"`
	BranchName string `json:"branch_name"`
	// OrgID is the device's tenant — internal only (never sent to the tablet).
	// KioskAuth re-pins the request context to it so every kiosk operation
	// reads/writes the device's own organisation, not the default tenant.
	OrgID string `json:"-"`
}

// KioskRecentCheckIn is one row in the "Recently Checked In" strip.
type KioskRecentCheckIn struct {
	Name       string `json:"name"`
	JobTitle   string `json:"job_title,omitempty"`
	RoomName   string `json:"room_name,omitempty"`
	Time       string `json:"time"` // HH:MM of the clock-in
	Late       bool   `json:"late"`
	ClockedOut bool   `json:"clocked_out"`
}

// KioskSummary is the "Today's Summary" tile counts for the device's branch.
type KioskSummary struct {
	CheckedIn    int `json:"checked_in"`
	NotCheckedIn int `json:"not_checked_in"`
	Late         int `json:"late"`
	CheckedOut   int `json:"checked_out"`
}

// KioskOverview powers the ambient parts of the kiosk home screen.
type KioskOverview struct {
	Recent  []KioskRecentCheckIn `json:"recent"`
	Summary KioskSummary         `json:"summary"`
}

// KioskStaffResult is a search hit on the kiosk (no PII beyond what the tablet
// needs to show a tappable card).
type KioskStaffResult struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	JobTitle string `json:"job_title,omitempty"`
	RoomName string `json:"room_name,omitempty"`
	HasPIN   bool   `json:"has_pin"`
	// State today so the tablet shows the right button.
	ClockedIn  bool   `json:"clocked_in"`
	ClockedOut bool   `json:"clocked_out"`
	Status     string `json:"status,omitempty"`
}
