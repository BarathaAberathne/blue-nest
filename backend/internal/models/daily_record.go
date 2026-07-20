package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DailyRecordType discriminates the practitioner daily-log entries that share
// one collection (learning journal, safeguarding, medical, meals).
type DailyRecordType string

const (
	RecObservation  DailyRecordType = "observation"  // EYFS learning journal
	RecIncident     DailyRecordType = "incident"     // incident / accident
	RecSafeguarding DailyRecordType = "safeguarding" // safeguarding concern
	RecMedication   DailyRecordType = "medication"   // medication due / administered
	RecMeal         DailyRecordType = "meal"         // meal served
)

// DailyRecordStatus is the lifecycle of an actionable record. Informational
// records (observations, meals) are "logged".
type DailyRecordStatus string

const (
	RecOpen         DailyRecordStatus = "open"         // safeguarding/incident awaiting action; medication due
	RecResolved     DailyRecordStatus = "resolved"     // safeguarding/incident closed
	RecAdministered DailyRecordStatus = "administered" // medication given
	RecLogged       DailyRecordStatus = "logged"       // observation/meal (informational)
)

// DailyRecord is one dated practitioner entry against a child (or branch-wide).
type DailyRecord struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"       json:"id"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref        string             `bson:"ref,omitempty"       json:"ref,omitempty"` // LOG-YYYY-NNNNNN
	Type       DailyRecordType    `bson:"type"                json:"type"`
	ChildID    string             `bson:"child_id,omitempty"  json:"child_id,omitempty"`
	ChildName  string             `bson:"child_name,omitempty" json:"child_name,omitempty"`
	BranchSlug string             `bson:"branch_slug"         json:"branch_slug"`
	RoomID     string             `bson:"room_id,omitempty"   json:"room_id,omitempty"`
	Date       string             `bson:"date"                json:"date"` // YYYY-MM-DD
	Title      string             `bson:"title"               json:"title"`
	Detail     string             `bson:"detail,omitempty"    json:"detail,omitempty"`
	Status     DailyRecordStatus  `bson:"status"              json:"status"`
	Severity   string             `bson:"severity,omitempty"  json:"severity,omitempty"` // low|medium|high (incident/safeguarding)
	Author     string             `bson:"author,omitempty"    json:"author,omitempty"`
	// Observation-specific
	EYFSAreas []string `bson:"eyfs_areas,omitempty" json:"eyfs_areas,omitempty"`
	NextSteps string   `bson:"next_steps,omitempty" json:"next_steps,omitempty"`
	// Medication-specific
	Medication string `bson:"medication,omitempty" json:"medication,omitempty"`
	Dose       string `bson:"dose,omitempty"       json:"dose,omitempty"`
	// Meal-specific
	MealType  string    `bson:"meal_type,omitempty" json:"meal_type,omitempty"` // breakfast|lunch|snack|tea
	Eaten     string    `bson:"eaten,omitempty"     json:"eaten,omitempty"`     // all|most|some|none
	CreatedAt time.Time `bson:"created_at"        json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"        json:"updated_at"`
}

type DailyRecordRequest struct {
	Type       DailyRecordType   `json:"type" validate:"required"`
	ChildID    string            `json:"child_id"`
	BranchSlug string            `json:"branch_slug" validate:"required"`
	RoomID     string            `json:"room_id"`
	Date       string            `json:"date"`
	Title      string            `json:"title" validate:"required"`
	Detail     string            `json:"detail"`
	Status     DailyRecordStatus `json:"status"`
	Severity   string            `json:"severity"`
	EYFSAreas  []string          `json:"eyfs_areas"`
	NextSteps  string            `json:"next_steps"`
	Medication string            `json:"medication"`
	Dose       string            `json:"dose"`
	MealType   string            `json:"meal_type"`
	Eaten      string            `json:"eaten"`
}

// ── Stats payload (drives the Operations tiles + Safeguarding KPI + Ofsted) ──
type LabelCount struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type DailyStats struct {
	Date             string       `json:"date"`
	SafeguardingOpen int          `json:"safeguarding_open"`
	IncidentsToday   int          `json:"incidents_today"`
	MedicationDue    int          `json:"medication_due"`
	MealsServed      int          `json:"meals_served"`
	ObservationsWeek int          `json:"observations_week"`
	ByType           []LabelCount `json:"by_type"`
}
