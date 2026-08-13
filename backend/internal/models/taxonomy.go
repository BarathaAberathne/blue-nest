package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Taxonomy categories — the configurable, tenant/branch-scoped lookup lists that
// replace hardcoded dropdown values. Add a new constant here (kebab_case, stable
// — records store the code, never the label) to introduce a new configurable
// list; the admin UI and pickers pick categories up from ValidTaxonomyCategory.
const (
	TaxonomySessionType  = "session_type"  // weekly-session slots (carry start/end times)
	TaxonomyAllergyType  = "allergy_type"  // child allergy tags
	TaxonomyDietaryLabel = "dietary_label" // child dietary tags
	TaxonomyAgeGroup     = "age_group"     // configurable age bands (carry min/max age in months)
	TaxonomySendCategory = "send_category" // SEND/additional-support broad areas (EYFS statutory four by default)
)

// ValidTaxonomyCategory reports whether a category string is a known list.
func ValidTaxonomyCategory(c string) bool {
	switch c {
	case TaxonomySessionType, TaxonomyAllergyType, TaxonomyDietaryLabel, TaxonomyAgeGroup, TaxonomySendCategory:
		return true
	}
	return false
}

// TaxonomyTerm is one configurable option in a lookup list (e.g. an "AM" session
// slot, or a "Peanuts" allergy tag). Tenant-scoped by org_id; BranchSlug is
// optional — empty means an org-wide default available to every branch, a
// non-empty value scopes the term to that one branch. Consumer records (a
// child's sessions/allergy_tags/dietary_tags) store the Code; the Label + times
// are resolved from here at render time, so editing a term updates every
// consumer without touching their records.
type TaxonomyTerm struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	OrgID      string             `bson:"org_id,omitempty"      json:"org_id,omitempty"`
	BranchSlug string             `bson:"branch_slug,omitempty" json:"branch_slug,omitempty"` // "" = org-wide default
	Category   string             `bson:"category"              json:"category"`
	Code       string             `bson:"code"                  json:"code"`  // stable machine key stored on records
	Label      string             `bson:"label"                 json:"label"` // human display
	// Session-type only: the slot's times (informational display; "" otherwise).
	StartTime string `bson:"start_time,omitempty" json:"start_time,omitempty"` // "HH:MM"
	EndTime   string `bson:"end_time,omitempty"   json:"end_time,omitempty"`   // "HH:MM"
	// Age-group only: the band's bounds in months. 0 is MEANINGFUL (min 0 = from
	// birth; max 0 = unbounded top bucket, e.g. "3+ years"), so neither bson nor
	// json is omitempty: a 0 must persist (omitempty would drop it from the
	// write, silently keeping the old bound) and clients must be able to tell
	// "unbounded" from "unset". Consumers (child-stats bucketing, room age-band
	// pickers) resolve against these.
	MinAgeMonths int       `bson:"min_age_months" json:"min_age_months"`
	MaxAgeMonths int       `bson:"max_age_months" json:"max_age_months"`
	SortOrder    int       `bson:"sort_order"           json:"sort_order"`
	Active    bool      `bson:"active"               json:"active"`
	CreatedAt time.Time `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"           json:"updated_at"`
}

// TaxonomyRequest is the create/update payload (admin-managed).
type TaxonomyRequest struct {
	BranchSlug string `json:"branch_slug"` // "" = org-wide default
	Category   string `json:"category"`
	Code         string `json:"code"` // optional on create — derived from Label when empty
	Label        string `json:"label"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	MinAgeMonths int    `json:"min_age_months"`
	MaxAgeMonths int    `json:"max_age_months"`
	SortOrder    int    `json:"sort_order"`
	Active       *bool  `json:"active"`
}
