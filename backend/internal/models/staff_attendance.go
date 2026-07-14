package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StaffAttendanceStatus string

const (
	StaffAttExpected StaffAttendanceStatus = "expected" // active staff, not yet marked
	StaffAttPresent  StaffAttendanceStatus = "present"
	StaffAttAbsent   StaffAttendanceStatus = "absent"
	StaffAttLeave    StaffAttendanceStatus = "leave" // annual leave / holiday
	StaffAttSick     StaffAttendanceStatus = "sick"
	StaffAttTraining StaffAttendanceStatus = "training"
	StaffAttMeeting  StaffAttendanceStatus = "meeting"
	StaffAttRemote   StaffAttendanceStatus = "remote"
)

// AttendanceSource records how a record was captured — the kiosk is the primary,
// authoritative path; manual/import cover admin corrections and migrations.
type AttendanceSource string

const (
	AttSourceKiosk  AttendanceSource = "kiosk"
	AttSourceManual AttendanceSource = "manual"
	AttSourceImport AttendanceSource = "import"
)

// BreakEntry is one break within a working day. Break minutes are deducted from
// paid worked minutes.
type BreakEntry struct {
	Start *time.Time `bson:"start,omitempty" json:"start,omitempty"`
	End   *time.Time `bson:"end,omitempty"   json:"end,omitempty"`
}

// AttendanceCorrection is one manager edit to a record — append-only, never
// overwriting history (compliance).
type AttendanceCorrection struct {
	At        time.Time `bson:"at"         json:"at"`
	ActorID   string    `bson:"actor_id"   json:"actor_id"`
	ActorName string    `bson:"actor_name" json:"actor_name"`
	Field     string    `bson:"field"      json:"field"`
	From      string    `bson:"from"       json:"from"`
	To        string    `bson:"to"         json:"to"`
	Reason    string    `bson:"reason,omitempty" json:"reason,omitempty"`
}

// StaffAttendanceRecord is one staff member's attendance for one day. Upserted
// (one per staff per date) as staff clock in/out — the authoritative source of
// worked hours for payroll. All fields below the original set are additive so
// legacy records load unchanged.
type StaffAttendanceRecord struct {
	ID          primitive.ObjectID    `bson:"_id,omitempty"        json:"id"`
	StaffID     string                `bson:"staff_id"             json:"staff_id"`
	StaffName   string                `bson:"staff_name"           json:"staff_name"`
	BranchSlug  string                `bson:"branch_slug"          json:"branch_slug"`
	Date        string                `bson:"date"                 json:"date"` // YYYY-MM-DD
	Status      StaffAttendanceStatus `bson:"status"               json:"status"`
	ClockIn     *time.Time            `bson:"clock_in,omitempty"   json:"clock_in,omitempty"`
	ClockOut    *time.Time            `bson:"clock_out,omitempty"  json:"clock_out,omitempty"`
	LateArrival bool                  `bson:"late_arrival"         json:"late_arrival"`
	Notes       string                `bson:"notes,omitempty"      json:"notes,omitempty"`

	// Capture context.
	Source    AttendanceSource `bson:"source,omitempty"    json:"source,omitempty"`
	DeviceID  string           `bson:"device_id,omitempty" json:"device_id,omitempty"`
	IP        string           `bson:"ip,omitempty"        json:"ip,omitempty"`
	Location  string           `bson:"location,omitempty"  json:"location,omitempty"`
	CreatedBy string           `bson:"created_by,omitempty" json:"created_by,omitempty"`

	// Breaks + shift link (shift matching lands in Phase B).
	Breaks  []BreakEntry `bson:"breaks,omitempty"   json:"breaks,omitempty"`
	ShiftID string       `bson:"shift_id,omitempty" json:"shift_id,omitempty"`

	// Computed on clock-out (worked = clock_out−clock_in−breaks). Overtime/early
	// departure are populated once shifts exist (Phase B); zero until then.
	MissingClockOut       bool `bson:"missing_clockout"           json:"missing_clockout"`
	WorkedMinutes         int  `bson:"worked_minutes"             json:"worked_minutes"`
	BreakMinutes          int  `bson:"break_minutes"              json:"break_minutes"`
	OvertimeMinutes       int  `bson:"overtime_minutes"           json:"overtime_minutes"`
	LateMinutes           int  `bson:"late_minutes"               json:"late_minutes"`
	EarlyDepartureMinutes int  `bson:"early_departure_minutes"    json:"early_departure_minutes"`

	Corrections []AttendanceCorrection `bson:"corrections,omitempty" json:"corrections,omitempty"`
	CreatedAt   time.Time              `bson:"created_at"            json:"created_at"`
	UpdatedAt   time.Time              `bson:"updated_at"            json:"updated_at"`
}

type StaffClockInRequest struct {
	StaffID string `json:"staff_id" validate:"required"`
	Date    string `json:"date"`
	Notes   string `json:"notes"`
}

type StaffClockOutRequest struct {
	StaffID string `json:"staff_id" validate:"required"`
	Date    string `json:"date"`
}

// KioskClockRequest is the payload the entrance tablet posts to clock a staff
// member in/out — identified by staff id + personal PIN (device is authed
// separately by its token). More identifiers (QR/NFC/biometric) attach here later.
type KioskClockRequest struct {
	StaffID string `json:"staff_id" validate:"required"`
	PIN     string `json:"pin"      validate:"required"`
}

type StaffAttendanceMarkRequest struct {
	StaffID string                `json:"staff_id" validate:"required"`
	Date    string                `json:"date"`
	Status  StaffAttendanceStatus `json:"status" validate:"required"`
	Notes   string                `json:"notes"`
}
