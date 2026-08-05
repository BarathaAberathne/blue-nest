package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Staff leave / holiday requests ───────────────────────────────────────────
// A staff member applies for time off; a different manager (four-eyes) approves
// or declines it. On approval the booked weekdays are written to the staff
// attendance register using the matching leave status, so approved leave flows
// straight into the register / roster / KPIs (see LeaveType → StaffAttendanceStatus).

type LeaveStatus string

const (
	LeavePending   LeaveStatus = "pending"   // submitted, awaiting a manager
	LeaveApproved  LeaveStatus = "approved"  // approved by a different manager
	LeaveDeclined  LeaveStatus = "declined"  // rejected (carries a reason)
	LeaveCancelled LeaveStatus = "cancelled" // withdrawn by the applicant before approval
)

// LeaveType values are deliberately identical to the staff-attendance leave
// statuses so an approved request maps straight onto the register.
const (
	LeaveTypeAnnual        = "leave"          // annual leave / holiday (default)
	LeaveTypeUnpaid        = "unpaid_leave"   // no-pay leave
	LeaveTypeMaternity     = "maternity"      // maternity / paternity / adoption
	LeaveTypeDependantSick = "dependant_sick" // caring for a sick dependant
	LeaveTypeSick          = "sick"           // own sickness
)

var LeaveTypes = []string{
	LeaveTypeAnnual, LeaveTypeUnpaid, LeaveTypeMaternity, LeaveTypeDependantSick, LeaveTypeSick,
}

// DefaultAnnualLeaveDays is the org-wide annual allowance used when a staff
// member has no per-person override (Staff.AnnualLeaveDays == 0).
const DefaultAnnualLeaveDays = 28

// LeaveBalance is a staff member's annual-leave position for the current leave
// year. Only annual leave (LeaveTypeAnnual) counts against the allowance.
type LeaveBalance struct {
	Type      string `json:"type"`      // leave type this balance is for
	Capped    bool   `json:"capped"`    // true = drawn against an allowance; false = uncapped (usage only)
	Year      int    `json:"year"`      // the leave year's starting calendar year (Apr–Mar)
	Allowance int `json:"allowance"` // working days entitled this year
	Taken     int `json:"taken"`     // approved annual-leave days this year
	Pending   int `json:"pending"`   // pending annual-leave days this year
	Remaining int `json:"remaining"` // allowance − taken − pending (floored at 0 for display uses)
}

// LeaveYearContains returns the [start, end] YYYY-MM-DD bounds of the UK leave
// year (1 Apr – 31 Mar) that contains the given date, plus its starting year.
func LeaveYearContains(t time.Time) (start, end string, year int) {
	year = t.Year()
	if int(t.Month()) < 4 { // Jan–Mar belongs to the previous April's year
		year--
	}
	start = time.Date(year, time.April, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	end = time.Date(year+1, time.March, 31, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	return start, end, year
}

func IsValidLeaveType(t string) bool {
	for _, v := range LeaveTypes {
		if v == t {
			return true
		}
	}
	return false
}

// LeaveTypeToAttendanceStatus maps a leave type onto the attendance status
// written for each booked day when the request is approved.
func LeaveTypeToAttendanceStatus(t string) StaffAttendanceStatus {
	return StaffAttendanceStatus(t) // 1:1 by construction
}

// LeaveRequest is a staff-submitted time-off request moving through approval.
type LeaveRequest struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"             json:"id"`
	OrgID         string             `bson:"org_id,omitempty"          json:"org_id,omitempty"`
	StaffID       string             `bson:"staff_id"                  json:"staff_id"`
	StaffName     string             `bson:"staff_name"                json:"staff_name"`
	BranchSlug    string             `bson:"branch_slug"               json:"branch_slug"`
	Type          string             `bson:"type"                      json:"type"`
	StartDate     string             `bson:"start_date"                json:"start_date"` // YYYY-MM-DD
	EndDate       string             `bson:"end_date"                  json:"end_date"`   // YYYY-MM-DD (inclusive)
	Days          int                `bson:"days"                      json:"days"`       // working days (Mon–Fri) in range
	Reason        string             `bson:"reason,omitempty"          json:"reason,omitempty"`
	Status        LeaveStatus        `bson:"status"                    json:"status"`
	RequestedByID string             `bson:"requested_by_id,omitempty" json:"requested_by_id,omitempty"` // the user who applied
	ReviewedByID  string             `bson:"reviewed_by_id,omitempty"  json:"reviewed_by_id,omitempty"`
	ReviewedBy    string             `bson:"reviewed_by,omitempty"     json:"reviewed_by,omitempty"` // reviewer display name
	ReviewedAt    *time.Time         `bson:"reviewed_at,omitempty"     json:"reviewed_at,omitempty"`
	DeclineReason string             `bson:"decline_reason,omitempty"  json:"decline_reason,omitempty"`
	CreatedAt     time.Time          `bson:"created_at"                json:"created_at"`
	UpdatedAt     time.Time          `bson:"updated_at"                json:"updated_at"`

	// Overlaps is a computed, transient count of OTHER staff at the same branch
	// whose approved/pending leave overlaps this request's dates - a coverage /
	// clash signal for the approver. Never stored.
	Overlaps int `bson:"-" json:"overlaps"`
}

// LeaveRequestCreate is the apply payload. StaffID is optional - a manager may
// file for a staff member; a staff member leaves it blank to apply for self.
type LeaveRequestCreate struct {
	StaffID   string `json:"staff_id"`
	Type      string `json:"type"`
	StartDate string `json:"start_date" validate:"required"`
	EndDate   string `json:"end_date"   validate:"required"`
	Reason    string `json:"reason"`
}

// LeaveDeclineRequest carries the mandatory decline reason.
type LeaveDeclineRequest struct {
	Reason string `json:"reason" validate:"required"`
}

// LeaveRequestFilter narrows the management list.
type LeaveRequestFilter struct {
	Branch  string
	Status  string
	StaffID string
}

// CountWeekdays returns the number of Mon–Fri days in the inclusive range
// [start, end] (both YYYY-MM-DD). Returns 0 if the dates are invalid or reversed.
func CountWeekdays(start, end string) int {
	s, err1 := time.Parse("2006-01-02", start)
	e, err2 := time.Parse("2006-01-02", end)
	if err1 != nil || err2 != nil || e.Before(s) {
		return 0
	}
	n := 0
	for d := s; !d.After(e); d = d.AddDate(0, 0, 1) {
		if wd := d.Weekday(); wd != time.Saturday && wd != time.Sunday {
			n++
		}
	}
	return n
}

// Weekdays returns each Mon–Fri date (YYYY-MM-DD) in the inclusive range.
func Weekdays(start, end string) []string {
	s, err1 := time.Parse("2006-01-02", start)
	e, err2 := time.Parse("2006-01-02", end)
	if err1 != nil || err2 != nil || e.Before(s) {
		return nil
	}
	var out []string
	for d := s; !d.After(e); d = d.AddDate(0, 0, 1) {
		if wd := d.Weekday(); wd != time.Saturday && wd != time.Sunday {
			out = append(out, d.Format("2006-01-02"))
		}
	}
	return out
}
