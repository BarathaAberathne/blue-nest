package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Branch templates - reusable presets for spinning up a new branch's setup
// (its room layout + optional default age-group labels). Tenant-scoped. Applying
// a template to a branch creates its rooms in one step instead of adding each by
// hand; a template can also be captured FROM an existing branch's rooms.

// BranchTemplateRoom is one room preset within a template (branch-agnostic - the
// branch is supplied at apply time).
type BranchTemplateRoom struct {
	Name         string `bson:"name"           json:"name"`
	Code         string `bson:"code,omitempty" json:"code,omitempty"`
	AgeRange     string `bson:"age_range,omitempty" json:"age_range,omitempty"`
	MinAgeMonths int    `bson:"min_age_months,omitempty" json:"min_age_months,omitempty"`
	MaxAgeMonths int    `bson:"max_age_months,omitempty" json:"max_age_months,omitempty"`
	Capacity     int    `bson:"capacity,omitempty"    json:"capacity,omitempty"`
	StaffRatio   int    `bson:"staff_ratio,omitempty" json:"staff_ratio,omitempty"`
}

// BranchTemplate is a named, reusable branch-setup preset.
type BranchTemplate struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	OrgID       string               `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Name        string               `bson:"name"        json:"name"`
	Description string               `bson:"description,omitempty" json:"description,omitempty"`
	Rooms       []BranchTemplateRoom `bson:"rooms,omitempty" json:"rooms"`
	AgeGroups   []string             `bson:"age_groups,omitempty" json:"age_groups,omitempty"`
	CreatedAt   time.Time            `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time            `bson:"updated_at" json:"updated_at"`
}

// BranchTemplateRequest is the admin create/update payload.
type BranchTemplateRequest struct {
	Name        string               `json:"name"`
	Description string               `json:"description"`
	Rooms       []BranchTemplateRoom `json:"rooms"`
	AgeGroups   []string             `json:"age_groups"`
}

// BranchTemplateApplyResult reports what an apply produced.
type BranchTemplateApplyResult struct {
	BranchSlug   string   `json:"branch_slug"`
	RoomsCreated int      `json:"rooms_created"`
	Skipped      []string `json:"skipped,omitempty"` // room names skipped (e.g. name clash)
}
