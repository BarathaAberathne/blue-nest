package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StaffStatus string

const (
	StaffActive   StaffStatus = "active"
	StaffOnLeave  StaffStatus = "on_leave"
	StaffInactive StaffStatus = "inactive" // left / archived
)

// IsValidStaffStatus reports whether s is one of the approved statuses.
func IsValidStaffStatus(s StaffStatus) bool {
	switch s {
	case StaffActive, StaffOnLeave, StaffInactive:
		return true
	default:
		return false
	}
}

// StaffType distinguishes payroll categories — permanent employees vs agency /
// bank cover — which the workforce KPIs (agency count) and ratios rely on.
type StaffType string

const (
	StaffPermanent StaffType = "permanent"
	StaffAgency    StaffType = "agency"
	StaffBank      StaffType = "bank"
)

// EmergencyContact is a person to reach for this staff member — next-of-kin,
// emergencies, or day-to-day updates. Deliberately separate from Child's
// Guardian (a different relationship, on a different entity).
type EmergencyContact struct {
	Name     string `bson:"name"               json:"name"`
	Relation string `bson:"relation,omitempty" json:"relation,omitempty"`
	Phone    string `bson:"phone,omitempty"    json:"phone,omitempty"`
	Email    string `bson:"email,omitempty"    json:"email,omitempty"`
}

// Staff is an employed practitioner/manager. Deliberately separate from the
// `users` auth collection (per the project guide: keep accounts apart from
// employment/HR data so future modules attach cleanly).
type Staff struct {
	ID                primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	OrgID             string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref               string             `bson:"ref,omitempty"          json:"ref,omitempty"` // STF-YYYY-NNNNNN
	FirstName         string             `bson:"first_name"             json:"first_name"`
	LastName          string             `bson:"last_name"              json:"last_name"`
	Email             string             `bson:"email,omitempty"        json:"email,omitempty"`
	Phone             string             `bson:"phone,omitempty"        json:"phone,omitempty"`
	BranchSlug        string             `bson:"branch_slug"            json:"branch_slug"`
	JobTitle          string             `bson:"job_title,omitempty"    json:"job_title,omitempty"`
	StaffType         StaffType          `bson:"staff_type"             json:"staff_type"`
	Status            StaffStatus        `bson:"status"                 json:"status"`
	StartDate         string             `bson:"start_date,omitempty"   json:"start_date,omitempty"` // YYYY-MM-DD
	ContractHours     float64            `bson:"contract_hours,omitempty" json:"contract_hours,omitempty"`
	AnnualLeaveDays   int                `bson:"annual_leave_days,omitempty" json:"annual_leave_days,omitempty"` // 0 = use org default (28)
	// TermTimeOnly marks a staff member contracted for term time only (works
	// during term dates, not school holidays) — see the terms collection.
	TermTimeOnly      bool               `bson:"term_time_only,omitempty" json:"term_time_only"`
	Qualifications    []string           `bson:"qualifications,omitempty" json:"qualifications,omitempty"`
	DBSNumber         string             `bson:"dbs_number,omitempty"   json:"dbs_number,omitempty"`
	DBSExpiry         string             `bson:"dbs_expiry,omitempty"   json:"dbs_expiry,omitempty"` // YYYY-MM-DD
	FirstAidExpiry    string             `bson:"first_aid_expiry,omitempty" json:"first_aid_expiry,omitempty"`
	EmergencyContacts []EmergencyContact `bson:"emergency_contacts,omitempty" json:"emergency_contacts,omitempty"`
	// UserID links this person to their system login account (users collection)
	// when they can sign in. Empty = HR-only record, no login. This is the
	// "one People entity, login optional" model (B3).
	UserID string `bson:"user_id,omitempty" json:"user_id,omitempty"`
	// PINHash is the bcrypt of the staff member's kiosk clock-in PIN. Never
	// serialised to JSON; HasPIN exposes only whether one is set (computed).
	PINHash   string    `bson:"pin_hash,omitempty" json:"-"`
	HasPIN    bool      `bson:"-"                  json:"has_pin"`
	CreatedAt time.Time `bson:"created_at"        json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"        json:"updated_at"`

	// RoomID/RoomName are a COMPUTED read projection of the staff member's
	// current PRIMARY active room, resolved from the canonical
	// staff_room_assignments at read time (never stored, never written — the
	// same pattern as Child.KeyPersonName). Room allocation is managed only
	// through the assignment endpoints; there is no stored room scalar.
	RoomID   string `bson:"-" json:"room_id,omitempty"`
	RoomName string `bson:"-" json:"room_name,omitempty"`
}

type StaffRequest struct {
	FirstName  string `json:"first_name" validate:"required"`
	LastName   string `json:"last_name"  validate:"required"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	BranchSlug        string             `json:"branch_slug" validate:"required"`
	JobTitle          string             `json:"job_title"`
	StaffType         StaffType          `json:"staff_type"`
	Status            StaffStatus        `json:"status"`
	StartDate         string             `json:"start_date"`
	ContractHours     float64            `json:"contract_hours"`
	AnnualLeaveDays   int                `json:"annual_leave_days"`
	TermTimeOnly      *bool              `json:"term_time_only"`
	Qualifications    []string           `json:"qualifications"`
	DBSNumber         string             `json:"dbs_number"`
	DBSExpiry         string             `json:"dbs_expiry"`
	FirstAidExpiry    string             `json:"first_aid_expiry"`
	EmergencyContacts []EmergencyContact `json:"emergency_contacts"`
	// Optional system login: when EnableLogin is true the person is provisioned
	// (or linked to) a user account with LoginRole, scoped to their branch.
	EnableLogin   bool   `json:"enable_login"`
	LoginRole     Role   `json:"login_role"`
	LoginPassword string `json:"login_password"`
}

// ── Stats payload (drives the People tab + Staff KPIs) ───────────────────────
type BranchStaffStat struct {
	Branch  string `json:"branch"`
	Total   int    `json:"total"`
	Present int    `json:"present"`
}

type StaffStats struct {
	Date           string            `json:"date"`
	AttendanceRate int               `json:"attendance_rate"` // present ÷ total, round-half-up
	Total          int               `json:"total"`
	Present        int               `json:"present"`
	OnLeave        int               `json:"on_leave"` // annual leave (+ meeting/remote)
	Training       int               `json:"training"`
	Sick           int               `json:"sick"`
	DependantSick  int               `json:"dependant_sick"`
	UnpaidLeave    int               `json:"unpaid_leave"`
	Maternity      int               `json:"maternity"`
	LateArrival    int               `json:"late_arrival"`
	Agency         int               `json:"agency"`
	Absent         int               `json:"absent"` // unauthorised / unexplained absence
	DBSExpiring    int               `json:"dbs_expiring"` // valid DBS expiring within 90 days
	Branches       []BranchStaffStat `json:"branches"`
}
