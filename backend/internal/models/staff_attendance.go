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
	StaffAttLeave    StaffAttendanceStatus = "leave" // annual leave
	StaffAttSick     StaffAttendanceStatus = "sick"
	StaffAttTraining StaffAttendanceStatus = "training"
)

// StaffAttendanceRecord is one staff member's attendance for one day. Upserted
// (one per staff per date) as staff clock in/out.
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
	CreatedAt   time.Time             `bson:"created_at"           json:"created_at"`
	UpdatedAt   time.Time             `bson:"updated_at"           json:"updated_at"`
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

type StaffAttendanceMarkRequest struct {
	StaffID string                `json:"staff_id" validate:"required"`
	Date    string                `json:"date"`
	Status  StaffAttendanceStatus `json:"status" validate:"required"`
	Notes   string                `json:"notes"`
}
