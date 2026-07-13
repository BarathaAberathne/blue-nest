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
	CreatedAt      time.Time          `bson:"created_at"             json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at"             json:"updated_at"`
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
