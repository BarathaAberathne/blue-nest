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

// DBSExpiryWarnDays is how many days before a DBS check expires it starts being
// flagged on the staff KPIs / compliance views.
const DBSExpiryWarnDays = 90

// awayStatuses are the "away but accounted-for" states — staff not on the floor
// who must NOT be counted absent (annual leave, sickness, training, off-site
// meeting, remote work).
var awayStatuses = map[StaffAttendanceStatus]bool{
	StaffAttLeave:    true,
	StaffAttSick:     true,
	StaffAttTraining: true,
	StaffAttMeeting:  true,
	StaffAttRemote:   true,
}

// IsAway reports whether a status is an accounted-for absence (so it is neither
// "present/attended" nor "absent"). The single source of truth for the away set,
// shared by every staff/attendance KPI.
func IsAway(s StaffAttendanceStatus) bool { return awayStatuses[s] }

// IsWorking reports whether this record counts as present/attended for the day:
// an explicit "present" status OR any clock-in (kiosk or manual). Shared by the
// staff stats, the attendance-dashboard summary and the branch rollup so all
// three agree on who counts as present.
func (r StaffAttendanceRecord) IsWorking() bool {
	return r.Status == StaffAttPresent || r.ClockIn != nil
}

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

	// Transient display fields — resolved from the staff record for the register
	// table, never persisted on the attendance document.
	JobTitle string `bson:"-" json:"job_title,omitempty"`
	RoomName string `bson:"-" json:"room_name,omitempty"`
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

// StaffBranchAttendanceStat is one branch's line in the company-wide comparison.
type StaffBranchAttendanceStat struct {
	Branch      string `json:"branch"`
	Total       int    `json:"total"`
	CurrentlyIn int    `json:"currently_in"`
	Attended    int    `json:"attended"`
	Late        int    `json:"late"`
	Rate        int    `json:"attendance_rate"`
}

// AttendanceDaySummary powers the attendance dashboard KPI strip for a date +
// branch. When branch is empty it is company-wide and Branches[] is populated.
type AttendanceDaySummary struct {
	Date            string                      `json:"date"`
	Total           int                         `json:"total"`
	Attended        int                         `json:"attended"` // working (present) count — the rate numerator
	CurrentlyIn     int                         `json:"currently_in"`
	ClockedOut      int                         `json:"clocked_out"`
	Absent          int                         `json:"absent"`
	OnLeave         int                         `json:"on_leave"`
	Late            int                         `json:"late"`
	OvertimeMinutes int                         `json:"overtime_minutes"`
	MissingClockOut int                         `json:"missing_clockout"`
	AttendanceRate  int                         `json:"attendance_rate"`
	AvgArrival      string                      `json:"avg_arrival"` // HH:MM
	Branches        []StaffBranchAttendanceStat `json:"branches,omitempty"`
}

// AttendanceCorrectionRequest is a manager's manual edit to a record. Each
// non-nil field that changes appends an append-only correction entry. StaffID +
// Date let the correction create a record on the fly when the day has none yet
// (an "expected" staff member the kiosk never captured) — manual backfill.
type AttendanceCorrectionRequest struct {
	StaffID  string  `json:"staff_id"`  // required only when creating (id is nil)
	Date     string  `json:"date"`      // YYYY-MM-DD, for the create path
	Status   *string `json:"status"`    // one of the attendance statuses
	ClockIn  *string `json:"clock_in"`  // "HH:MM" on the record's date, "" clears
	ClockOut *string `json:"clock_out"` // "HH:MM", "" clears
	Notes    *string `json:"notes"`
	Reason   string  `json:"reason"`
}

type StaffAttendanceMarkRequest struct {
	StaffID string                `json:"staff_id" validate:"required"`
	Date    string                `json:"date"`
	Status  StaffAttendanceStatus `json:"status" validate:"required"`
	Notes   string                `json:"notes"`
}
