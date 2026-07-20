package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Organisation is the top-level TENANT — a nursery group that owns branches,
// users and all operational data. The platform is multi-tenant: one database,
// every tenant-scoped document carries `org_id`, and isolation is enforced
// centrally (repository tenant wrapper + policy). Branches, rooms, children,
// staff, etc. all belong to exactly one organisation.
type Organisation struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Slug     string             `bson:"slug"          json:"slug"` // stable url-safe key, e.g. "blue-nest"
	Name     string             `bson:"name"          json:"name"`
	Status   OrgStatus          `bson:"status"        json:"status"`
	Plan     string             `bson:"plan,omitempty" json:"plan,omitempty"` // pricing/feature tier
	Branding OrgBranding        `bson:"branding"      json:"branding"`
	// Domains this org is served on (custom domain / subdomain), used to resolve
	// the tenant for unauthenticated/public requests.
	Domains   []string    `bson:"domains,omitempty"  json:"domains,omitempty"`
	Settings  OrgSettings `bson:"settings"          json:"settings"`
	CreatedAt time.Time   `bson:"created_at"        json:"created_at"`
	UpdatedAt time.Time   `bson:"updated_at"        json:"updated_at"`
}

type OrgStatus string

const (
	OrgActive    OrgStatus = "active"
	OrgSuspended OrgStatus = "suspended"
	OrgArchived  OrgStatus = "archived"
)

// OrgBranding replaces the env-baked brand so each tenant renders as itself.
type OrgBranding struct {
	LogoURL      string `bson:"logo_url,omitempty"      json:"logo_url,omitempty"`
	PrimaryColor string `bson:"primary_color,omitempty" json:"primary_color,omitempty"`
	AccentColor  string `bson:"accent_color,omitempty"  json:"accent_color,omitempty"`
}

// OrgSettings holds per-org configuration (extended over T1: term dates, funding
// rules, email templates…). Features are the org's enabled capability flags.
type OrgSettings struct {
	Timezone string   `bson:"timezone,omitempty" json:"timezone,omitempty"`
	Currency string   `bson:"currency,omitempty" json:"currency,omitempty"`
	Features []string `bson:"features,omitempty" json:"features,omitempty"` // enabled feature flags
}

// HasFeature reports whether a feature flag is enabled for this org — the hook
// every future module uses to gate tenant-specific / plan-tier capabilities.
func (o Organisation) HasFeature(name string) bool {
	for _, f := range o.Settings.Features {
		if f == name {
			return true
		}
	}
	return false
}

// OrganisationRequest creates/updates an organisation (platform operator). When
// AdminEmail + AdminPassword are supplied on create, the first super-admin of the
// new tenant is provisioned in one step so the org is immediately usable.
type OrganisationRequest struct {
	Slug     string      `json:"slug" validate:"required"`
	Name     string      `json:"name" validate:"required"`
	Plan     string      `json:"plan"`
	Branding OrgBranding `json:"branding"`
	Domains  []string    `json:"domains"`
	Settings OrgSettings `json:"settings"`
	// Optional first-admin provisioning (onboarding).
	AdminEmail     string `json:"admin_email"`
	AdminPassword  string `json:"admin_password"`
	AdminFirstName string `json:"admin_first_name"`
	AdminLastName  string `json:"admin_last_name"`
}

// OrgProfileRequest is an org's OWN super-admin editing their organisation —
// name, branding and settings only. Slug, plan, status and domains are
// platform-controlled and cannot be changed here.
type OrgProfileRequest struct {
	Name     string      `json:"name" validate:"required"`
	Branding OrgBranding `json:"branding"`
	Settings OrgSettings `json:"settings"`
}
