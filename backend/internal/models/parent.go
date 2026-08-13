package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Parent / guardian ─────────────────────────────────────────────────────────
//
// Parent is the CANONICAL person record for parents, carers, emergency
// contacts and authorised collectors — one row per real person, shared across
// siblings. It replaces the embedded Child.guardians array as the write model
// (Child.Guardians remains a computed read projection during the migration
// window). A parent MAY hold a portal login (UserID links to a `customer`
// user); contacts who never log in simply have no user.

// PortalAccessState is the parent's portal lifecycle — deliberately separate
// from the User record so access can be restricted without deleting the
// account, relationships, or history.
type PortalAccessState string

const (
	PortalNone       PortalAccessState = ""           // no portal access granted
	PortalInvited    PortalAccessState = "invited"    // invitation sent, not yet activated
	PortalTemporary  PortalAccessState = "temporary"  // activated with a time-boxed window
	PortalActive     PortalAccessState = "active"     // full access (onboarding requirements met)
	PortalRestricted PortalAccessState = "restricted" // limited (e.g. payment setup outstanding)
	PortalSuspended  PortalAccessState = "suspended"  // manually suspended by a manager
)

func IsValidPortalState(s PortalAccessState) bool {
	switch s {
	case PortalNone, PortalInvited, PortalTemporary, PortalActive, PortalRestricted, PortalSuspended:
		return true
	}
	return false
}

// PortalAllowsLogin reports whether a parent in this state may use the portal.
func PortalAllowsLogin(s PortalAccessState) bool {
	switch s {
	case PortalTemporary, PortalActive, PortalRestricted:
		return true
	}
	return false
}

type Parent struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref   string             `bson:"ref,omitempty" json:"ref,omitempty"` // PAR-YYYY-NNNNNN

	FirstName  string `bson:"first_name" json:"first_name"`
	LastName   string `bson:"last_name" json:"last_name"`
	Email      string `bson:"email,omitempty" json:"email,omitempty"`
	Profession string `bson:"profession,omitempty" json:"profession,omitempty"`

	MobilePhone string `bson:"mobile_phone,omitempty" json:"mobile_phone,omitempty"`
	WorkPhone   string `bson:"work_phone,omitempty" json:"work_phone,omitempty"`
	HomePhone   string `bson:"home_phone,omitempty" json:"home_phone,omitempty"`

	HomeAddress string `bson:"home_address,omitempty" json:"home_address,omitempty"`
	WorkAddress string `bson:"work_address,omitempty" json:"work_address,omitempty"`

	// Portal access lifecycle. UserID links to the `customer` User once an
	// invitation is accepted; the invite token is stored HASHED (bcrypt), shown
	// once in the invitation link, single-use, expiring.
	PortalState     PortalAccessState `bson:"portal_state,omitempty" json:"portal_state,omitempty"`
	UserID          string            `bson:"user_id,omitempty" json:"user_id,omitempty"`
	InviteTokenHash string            `bson:"invite_token_hash,omitempty" json:"-"`
	InviteExpiresAt *time.Time        `bson:"invite_expires_at,omitempty" json:"invite_expires_at,omitempty"`
	// TemporaryUntil bounds a temporary-access window (org-configurable
	// duration); empty for full access.
	TemporaryUntil *time.Time `bson:"temporary_until,omitempty" json:"temporary_until,omitempty"`

	// Contact-preference consents from the privacy notice (post/email/phone).
	ContactPrefs []string `bson:"contact_prefs,omitempty" json:"contact_prefs,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// ── Child ↔ parent relationship ───────────────────────────────────────────────

// RelationshipType is free-form-ish but normalised lowercase (mother, father,
// guardian, grandparent, aunt, uncle, family friend, …). No structural
// assumption of one mother + one father — any number of relationships per
// child, any combination of flags.
type ChildParentRelationship struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID    string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	ChildID  string             `bson:"child_id" json:"child_id"`
	ParentID string             `bson:"parent_id" json:"parent_id"`

	Relationship string `bson:"relationship" json:"relationship"` // e.g. "mother", "guardian"

	ParentalResponsibility bool `bson:"parental_responsibility" json:"parental_responsibility"`
	PrimaryContact         bool `bson:"primary_contact" json:"primary_contact"`
	EmergencyContact       bool `bson:"emergency_contact" json:"emergency_contact"`
	AuthorisedCollection   bool `bson:"authorised_collection" json:"authorised_collection"`
	BillingContact         bool `bson:"billing_contact" json:"billing_contact"`
	ReceivesComms          bool `bson:"receives_communications" json:"receives_communications"`
	LivesWithChild         bool `bson:"lives_with_child" json:"lives_with_child"`
	PortalAccess           bool `bson:"portal_access" json:"portal_access"` // this parent may see THIS child in the portal
	FinanceAccess          bool `bson:"finance_access" json:"finance_access"`

	// LegalContact marks an "other person with legal contact" (e.g. an S8
	// order); ContactArrangements holds the manager-only safeguarding note.
	LegalContact        bool   `bson:"legal_contact,omitempty" json:"legal_contact,omitempty"`
	ContactArrangements string `bson:"contact_arrangements,omitempty" json:"contact_arrangements,omitempty"`

	// Priority orders emergency contacts (1 = call first).
	Priority int `bson:"priority,omitempty" json:"priority,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	// Read projections (resolved at read time, never stored).
	ParentName string `bson:"-" json:"parent_name,omitempty"`
	ChildName  string `bson:"-" json:"child_name,omitempty"`
}

// ── Requests ─────────────────────────────────────────────────────────────────

type ParentRequest struct {
	FirstName   string   `json:"first_name" validate:"required"`
	LastName    string   `json:"last_name"  validate:"required"`
	Email       string   `json:"email"`
	Profession  string   `json:"profession"`
	MobilePhone string   `json:"mobile_phone"`
	WorkPhone   string   `json:"work_phone"`
	HomePhone   string   `json:"home_phone"`
	HomeAddress string   `json:"home_address"`
	WorkAddress string   `json:"work_address"`
	ContactPrefs []string `json:"contact_prefs"`
}

// RelationshipFlags is the editable flag set shared by link + update requests.
type RelationshipFlags struct {
	Relationship           string `json:"relationship"`
	ParentalResponsibility bool   `json:"parental_responsibility"`
	PrimaryContact         bool   `json:"primary_contact"`
	EmergencyContact       bool   `json:"emergency_contact"`
	AuthorisedCollection   bool   `json:"authorised_collection"`
	BillingContact         bool   `json:"billing_contact"`
	ReceivesComms          bool   `json:"receives_communications"`
	LivesWithChild         bool   `json:"lives_with_child"`
	PortalAccess           bool   `json:"portal_access"`
	FinanceAccess          bool   `json:"finance_access"`
	LegalContact           bool   `json:"legal_contact"`
	ContactArrangements    string `json:"contact_arrangements"`
	Priority               int    `json:"priority"`
}

// LinkChildRequest links an existing parent to a child (or, with Parent set,
// creates the parent and links in one call — the manager UI's common path).
type LinkChildRequest struct {
	ChildID  string         `json:"child_id" validate:"required"`
	ParentID string         `json:"parent_id"`
	Parent   *ParentRequest `json:"parent"`
	RelationshipFlags
}

// ParentInviteRequest sends (or re-sends) a portal invitation.
type ParentInviteRequest struct {
	// TemporaryDays overrides the org default temporary-access window; 0 uses
	// the configured default.
	TemporaryDays int `json:"temporary_days"`
}

// InviteAcceptRequest activates a portal account from an invitation link.
type InviteAcceptRequest struct {
	ParentID string `json:"parent_id" validate:"required"`
	Token    string `json:"token"     validate:"required"`
	Password string `json:"password"  validate:"required"`
}
