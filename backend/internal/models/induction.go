package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Child induction (source of truth: Child Induction Form.pdf) ──────────────
//
// One induction per child, organised into the PDF's sections. Each section is
// a free-form field map (the form's questions) + a completion flag, so the
// form can evolve without migrations. Sections whose data already has a
// canonical home (allergies/dietary/medical → Child) WRITE THROUGH to that
// home on save — the induction never forks a second copy.

type InductionStatus string

const (
	InductionNotStarted InductionStatus = "not_started"
	InductionInProgress InductionStatus = "in_progress"
	InductionSubmitted  InductionStatus = "submitted" // awaiting manager review
	InductionReviewed   InductionStatus = "reviewed"  // manager signed off
)

// InductionSectionKeys is the catalogue of form sections, in display order.
// `Required` sections count toward completeness; optional ones (equality
// monitoring) don't block readiness.
type InductionSectionDef struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

var InductionSections = []InductionSectionDef{
	{Key: "child_details", Label: "Child details", Required: true},           // address, birth cert seen, previous childcare
	{Key: "family", Label: "Family details", Required: true},                 // lives-with narrative (contacts live in relationships)
	{Key: "legal_contact", Label: "Legal contact (S8)", Required: false},     // safeguarding — manager-only visibility
	{Key: "professionals", Label: "Professionals (GP, health visitor…)", Required: true},
	{Key: "collectors", Label: "Authorised collectors & password", Required: true},
	{Key: "health", Label: "Health & immunisations", Required: true},
	{Key: "allergies_dietary", Label: "Allergies & dietary", Required: true}, // writes through to the Child record
	{Key: "cultural", Label: "Cultural background & languages", Required: true},
	{Key: "routine", Label: "Routine & about your child", Required: true},
	{Key: "development", Label: "Development & SEN", Required: true},
	{Key: "equality", Label: "Equality monitoring (optional)", Required: false},
}

func InductionSectionByKey(key string) *InductionSectionDef {
	for i := range InductionSections {
		if InductionSections[i].Key == key {
			return &InductionSections[i]
		}
	}
	return nil
}

type InductionSection struct {
	Data      map[string]any `bson:"data,omitempty" json:"data,omitempty"`
	Complete  bool           `bson:"complete" json:"complete"`
	UpdatedAt time.Time      `bson:"updated_at" json:"updated_at"`
	UpdatedBy string         `bson:"updated_by,omitempty" json:"updated_by,omitempty"` // user id (staff or parent)
}

type ChildInduction struct {
	ID      primitive.ObjectID          `bson:"_id,omitempty" json:"id"`
	OrgID   string                      `bson:"org_id,omitempty" json:"org_id,omitempty"`
	ChildID string                      `bson:"child_id" json:"child_id"`
	Status  InductionStatus             `bson:"status" json:"status"`
	Sections map[string]InductionSection `bson:"sections,omitempty" json:"sections,omitempty"`

	SubmittedBy string     `bson:"submitted_by,omitempty" json:"submitted_by,omitempty"`
	SubmittedAt *time.Time `bson:"submitted_at,omitempty" json:"submitted_at,omitempty"`
	ReviewedBy  string     `bson:"reviewed_by,omitempty" json:"reviewed_by,omitempty"`
	ReviewedAt  *time.Time `bson:"reviewed_at,omitempty" json:"reviewed_at,omitempty"`
	ReviewNote  string     `bson:"review_note,omitempty" json:"review_note,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// SectionSaveRequest saves one section (save & continue / resume later).
type SectionSaveRequest struct {
	Data     map[string]any `json:"data"`
	Complete bool           `json:"complete"`
}

// ── Consents (the form's signed permissions) ─────────────────────────────────
//
// Append-only: each decision is a new row; the latest row per key is the
// current position (a natural audit trail — consent changes are never edited
// in place).

type ConsentDef struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

var ConsentCatalogue = []ConsentDef{
	{Key: "cctv", Label: "CCTV monitoring", Required: true},
	{Key: "emergency_treatment", Label: "Emergency treatment declaration", Required: true},
	{Key: "inhalers", Label: "Inhalers / auto-injectors (EpiPen)", Required: false},
	{Key: "teething_gel", Label: "Teething gels (babies)", Required: false},
	{Key: "nappy_cream", Label: "Nappy cream", Required: false},
	{Key: "paracetamol", Label: "Paracetamol-based medicine (e.g. Calpol)", Required: true},
	{Key: "sun_cream", Label: "Sun cream", Required: true},
	{Key: "outings", Label: "Short trips & general outings", Required: true},
	{Key: "photos_internal", Label: "Photographs for records & displays", Required: true},
	{Key: "photos_marketing", Label: "Photos/video on website & social media", Required: true},
	{Key: "animals", Label: "Supervised animal visits", Required: true},
	{Key: "learning_journey", Label: "Online learning journey account", Required: false},
	{Key: "policies_ack", Label: "Policies & information sharing acknowledged", Required: true},
	{Key: "ae_ack", Label: "A&E accompaniment understood", Required: true},
	{Key: "fees_notice_ack", Label: "Notice period & fees policy understood", Required: true},
	{Key: "weather_ack", Label: "Adverse weather / closure policy understood", Required: true},
	{Key: "declaration", Label: "Information accurate & will notify of changes", Required: true},
}

func ConsentByKey(key string) *ConsentDef {
	for i := range ConsentCatalogue {
		if ConsentCatalogue[i].Key == key {
			return &ConsentCatalogue[i]
		}
	}
	return nil
}

type Consent struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID   string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	ChildID string             `bson:"child_id" json:"child_id"`
	Key     string             `bson:"key" json:"key"`
	Granted bool               `bson:"granted" json:"granted"`
	Note    string             `bson:"note,omitempty" json:"note,omitempty"` // e.g. animal allergies

	// Signatory: the parent who signed (typed-name signature) or the staff
	// member recording a paper form.
	SignedByParentID string    `bson:"signed_by_parent_id,omitempty" json:"signed_by_parent_id,omitempty"`
	SignedByUserID   string    `bson:"signed_by_user_id,omitempty" json:"signed_by_user_id,omitempty"`
	SignatureName    string    `bson:"signature_name" json:"signature_name"`
	CreatedAt        time.Time `bson:"created_at" json:"created_at"`
}

type ConsentRequest struct {
	Key           string `json:"key"           validate:"required"`
	Granted       bool   `json:"granted"`
	Note          string `json:"note"`
	SignatureName string `json:"signature_name" validate:"required"`
}
