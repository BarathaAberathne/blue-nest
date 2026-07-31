package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Term is a term-time date range for a branch (e.g. "Autumn Term 2026"). It is
// the configurable calendar that term-time-only contracts and attendance
// expectations reference. Tenant-scoped by org_id; BranchSlug "" = org-wide.
type Term struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	OrgID      string             `bson:"org_id,omitempty"      json:"org_id,omitempty"`
	BranchSlug string             `bson:"branch_slug,omitempty" json:"branch_slug,omitempty"` // "" = org-wide
	Name       string             `bson:"name"                  json:"name"`
	StartDate  string             `bson:"start_date"            json:"start_date"` // YYYY-MM-DD inclusive
	EndDate    string             `bson:"end_date"              json:"end_date"`   // YYYY-MM-DD inclusive
	CreatedAt  time.Time          `bson:"created_at"            json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at"            json:"updated_at"`
}

// TermRequest is the create/update payload (admin-managed).
type TermRequest struct {
	BranchSlug string `json:"branch_slug"`
	Name       string `json:"name"`
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
}
