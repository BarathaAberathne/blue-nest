package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RoomStatus — "" (legacy rooms) and "active" both mean active; "inactive"
// closes the room to NEW allocations without touching existing history.
type RoomStatus string

const (
	RoomActive   RoomStatus = "active"
	RoomInactive RoomStatus = "inactive"
)

// Room is a class/room within a branch. Its capacity + staff ratio drive
// occupancy and available-places figures across the dashboard.
type Room struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	BranchSlug string             `bson:"branch_slug"   json:"branch_slug"`
	Name       string             `bson:"name"          json:"name"`
	// Code is an optional short identifier (e.g. "NST-1"), unique per branch
	// when set.
	Code        string `bson:"code,omitempty"        json:"code,omitempty"`
	Description string `bson:"description,omitempty" json:"description,omitempty"`
	// AgeRange stays as the free-text display label; MinAgeMonths/MaxAgeMonths
	// are the structured values age-compatibility checks use. 0/0 = not
	// configured, checks skipped.
	AgeRange     string     `bson:"age_range"     json:"age_range"`
	MinAgeMonths int        `bson:"min_age_months,omitempty" json:"min_age_months,omitempty"`
	MaxAgeMonths int        `bson:"max_age_months,omitempty" json:"max_age_months,omitempty"`
	Capacity     int        `bson:"capacity"      json:"capacity"`
	StaffRatio   int        `bson:"staff_ratio"   json:"staff_ratio"` // 1 staff : N children
	Status       RoomStatus `bson:"status,omitempty" json:"status,omitempty"`
	OpeningDate  string     `bson:"opening_date,omitempty" json:"opening_date,omitempty"` // YYYY-MM-DD
	ClosingDate  string     `bson:"closing_date,omitempty" json:"closing_date,omitempty"` // YYYY-MM-DD
	CreatedAt    time.Time  `bson:"created_at"    json:"created_at"`
	UpdatedAt    time.Time  `bson:"updated_at"    json:"updated_at"`
}

// IsActive treats the zero value as active so every pre-existing room keeps
// working without a backfill.
func (r *Room) IsActive() bool {
	return r.Status == "" || r.Status == RoomActive
}

type RoomRequest struct {
	BranchSlug   string `json:"branch_slug" validate:"required"`
	Name         string `json:"name"        validate:"required"`
	Code         string `json:"code"`
	Description  string `json:"description"`
	AgeRange     string `json:"age_range"`
	MinAgeMonths int    `json:"min_age_months"`
	MaxAgeMonths int    `json:"max_age_months"`
	Capacity     int    `json:"capacity"`
	StaffRatio   int    `json:"staff_ratio"`
	OpeningDate  string `json:"opening_date"`
	ClosingDate  string `json:"closing_date"`
}

// RoomStatusRequest activates/deactivates a room — deliberately a dedicated
// endpoint, so a stale edit payload can never flip status as a side effect.
type RoomStatusRequest struct {
	Status RoomStatus `json:"status" validate:"required"`
}
