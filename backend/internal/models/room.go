package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Room is a class/room within a branch. Its capacity + staff ratio drive
// occupancy and available-places figures across the dashboard.
type Room struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	BranchSlug string             `bson:"branch_slug"   json:"branch_slug"`
	Name       string             `bson:"name"          json:"name"`
	AgeRange   string             `bson:"age_range"     json:"age_range"`
	Capacity   int                `bson:"capacity"      json:"capacity"`
	StaffRatio int                `bson:"staff_ratio"   json:"staff_ratio"` // 1 staff : N children
	CreatedAt  time.Time          `bson:"created_at"    json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at"    json:"updated_at"`
}

type RoomRequest struct {
	BranchSlug string `json:"branch_slug" validate:"required"`
	Name       string `json:"name"        validate:"required"`
	AgeRange   string `json:"age_range"`
	Capacity   int    `json:"capacity"`
	StaffRatio int    `json:"staff_ratio"`
}
