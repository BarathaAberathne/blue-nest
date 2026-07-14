package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AttendanceStatus string

const (
	AttExpected AttendanceStatus = "expected" // active child, not yet marked
	AttPresent  AttendanceStatus = "present"
	AttAbsent   AttendanceStatus = "absent"
	AttHoliday  AttendanceStatus = "holiday"
	AttSick     AttendanceStatus = "sick"
)

// AttendanceRecord is one child's attendance for one day. Upserted (one per
// child per date) as staff check children in/out.
type AttendanceRecord struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	ChildID      string             `bson:"child_id"               json:"child_id"`
	ChildName    string             `bson:"child_name"             json:"child_name"`
	BranchSlug   string             `bson:"branch_slug"            json:"branch_slug"`
	RoomID       string             `bson:"room_id,omitempty"      json:"room_id,omitempty"`
	Date         string             `bson:"date"                   json:"date"` // YYYY-MM-DD
	Status       AttendanceStatus   `bson:"status"                 json:"status"`
	CheckIn      *time.Time         `bson:"check_in,omitempty"     json:"check_in,omitempty"`
	CheckOut     *time.Time         `bson:"check_out,omitempty"    json:"check_out,omitempty"`
	CheckedInBy  string             `bson:"checked_in_by,omitempty"  json:"checked_in_by,omitempty"`
	CheckedOutBy string             `bson:"checked_out_by,omitempty" json:"checked_out_by,omitempty"`
	LatePickup   bool               `bson:"late_pickup"            json:"late_pickup"`
	Notes        string             `bson:"notes,omitempty"        json:"notes,omitempty"`
	CreatedAt    time.Time          `bson:"created_at"             json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at"             json:"updated_at"`
}

type CheckInRequest struct {
	ChildID string `json:"child_id" validate:"required"`
	Date    string `json:"date"` // defaults to today
	Notes   string `json:"notes"`
}

type CheckOutRequest struct {
	ChildID    string `json:"child_id" validate:"required"`
	Date       string `json:"date"`
	LatePickup bool   `json:"late_pickup"`
}

type AttendanceMarkRequest struct {
	ChildID string           `json:"child_id" validate:"required"`
	Date    string           `json:"date"`
	Status  AttendanceStatus `json:"status" validate:"required"`
	Notes   string           `json:"notes"`
}

// ── Stats payload (drives the dashboard attendance figures) ──────────────────
type BranchAttendanceStat struct {
	Branch         string `json:"branch"`
	Present        int    `json:"present"`
	Expected       int    `json:"expected"`
	AttendanceRate int    `json:"attendance_rate"`
}

type AttendanceStats struct {
	Date           string                 `json:"date"`
	Present        int                    `json:"present"`
	CheckedIn      int                    `json:"checked_in"` // present & not yet checked out
	Absent         int                    `json:"absent"`
	Expected       int                    `json:"expected"`
	AttendanceRate int                    `json:"attendance_rate"`
	LatePickups    int                    `json:"late_pickups"`
	Branches       []BranchAttendanceStat `json:"branches"`
}
