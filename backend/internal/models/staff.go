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

// StaffType distinguishes payroll categories — permanent employees vs agency /
// bank cover — which the workforce KPIs (agency count) and ratios rely on.
type StaffType string

const (
	StaffPermanent StaffType = "permanent"
	StaffAgency    StaffType = "agency"
	StaffBank      StaffType = "bank"
)

// Staff is an employed practitioner/manager. Deliberately separate from the
// `users` auth collection (per the project guide: keep accounts apart from
// employment/HR data so future modules attach cleanly).
type Staff struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	OrgID          string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref            string             `bson:"ref,omitempty"          json:"ref,omitempty"` // STF-YYYY-NNNNNN
	FirstName      string             `bson:"first_name"             json:"first_name"`
	LastName       string             `bson:"last_name"              json:"last_name"`
	Email          string             `bson:"email,omitempty"        json:"email,omitempty"`
	Phone          string             `bson:"phone,omitempty"        json:"phone,omitempty"`
	BranchSlug     string             `bson:"branch_slug"            json:"branch_slug"`
	RoomID         string             `bson:"room_id,omitempty"      json:"room_id,omitempty"`
	JobTitle       string             `bson:"job_title,omitempty"    json:"job_title,omitempty"`
	StaffType      StaffType          `bson:"staff_type"             json:"staff_type"`
	Status         StaffStatus        `bson:"status"                 json:"status"`
	StartDate      string             `bson:"start_date,omitempty"   json:"start_date,omitempty"` // YYYY-MM-DD
	ContractHours  float64            `bson:"contract_hours,omitempty" json:"contract_hours,omitempty"`
	Qualifications []string           `bson:"qualifications,omitempty" json:"qualifications,omitempty"`
	DBSNumber      string             `bson:"dbs_number,omitempty"   json:"dbs_number,omitempty"`
	DBSExpiry      string             `bson:"dbs_expiry,omitempty"   json:"dbs_expiry,omitempty"` // YYYY-MM-DD
	FirstAidExpiry string             `bson:"first_aid_expiry,omitempty" json:"first_aid_expiry,omitempty"`
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
}

type StaffRequest struct {
	FirstName      string      `json:"first_name" validate:"required"`
	LastName       string      `json:"last_name"  validate:"required"`
	Email          string      `json:"email"`
	Phone          string      `json:"phone"`
	BranchSlug     string      `json:"branch_slug" validate:"required"`
	RoomID         string      `json:"room_id"`
	JobTitle       string      `json:"job_title"`
	StaffType      StaffType   `json:"staff_type"`
	Status         StaffStatus `json:"status"`
	StartDate      string      `json:"start_date"`
	ContractHours  float64     `json:"contract_hours"`
	Qualifications []string    `json:"qualifications"`
	DBSNumber      string      `json:"dbs_number"`
	DBSExpiry      string      `json:"dbs_expiry"`
	FirstAidExpiry string      `json:"first_aid_expiry"`
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
	OnLeave        int               `json:"on_leave"`
	Training       int               `json:"training"`
	Sick           int               `json:"sick"`
	LateArrival    int               `json:"late_arrival"`
	Agency         int               `json:"agency"`
	Absent         int               `json:"absent"`
	DBSExpiring    int               `json:"dbs_expiring"` // valid DBS expiring within 90 days
	Branches       []BranchStaffStat `json:"branches"`
}
