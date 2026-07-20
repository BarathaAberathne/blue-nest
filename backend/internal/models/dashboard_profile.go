package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DashboardProfile is an org-wide, named dashboard arrangement curated by a
// Super Admin (e.g. "Executive", "Branch Manager", "Finance"). A profile can be
// set as the default for one or more roles: a user who hasn't saved a personal
// layout inherits their role's profile. This is the shared/template layer above
// the per-user DashboardLayout (B3.3b).
type DashboardProfile struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	OrgID           string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Name            string             `bson:"name"             json:"name"`
	Slug            string             `bson:"slug"             json:"slug"`
	Description     string             `bson:"description,omitempty" json:"description,omitempty"`
	Widgets         []DashboardWidget  `bson:"widgets"          json:"widgets"`
	DefaultForRoles []Role             `bson:"default_for_roles" json:"default_for_roles"`
	UpdatedAt       time.Time          `bson:"updated_at"       json:"updated_at"`
}

// SaveDashboardProfileRequest is the create/update payload (super-admin).
type SaveDashboardProfileRequest struct {
	Name            string            `json:"name"`
	Slug            string            `json:"slug"` // optional; derived from name when empty
	Description     string            `json:"description"`
	Widgets         []DashboardWidget `json:"widgets"`
	DefaultForRoles []Role            `json:"default_for_roles"`
}
