package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Shift is one planned working slot on the rota: a staff member assigned to a
// room, on a date, for a start–end time. It is the *plan*; attendance
// (StaffAttendanceRecord) is the *actual*, and the two are matched on
// (staff_id, date) so late/overtime/early-departure become real numbers.
// A staff member can have more than one shift on a day (split shifts).
type Shift struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	OrgID      string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	StaffID    string             `bson:"staff_id,omitempty" json:"staff_id,omitempty"`
	StaffName  string             `bson:"staff_name"       json:"staff_name"`
	BranchSlug string             `bson:"branch_slug"      json:"branch_slug"`
	// External marks an off-roster person (EYFS consultant, council visitor,
	// agency cover) who has no staff record — StaffID is empty, StaffName is the
	// typed name. Their shifts appear on the rota but never match attendance.
	External  bool      `bson:"external,omitempty"  json:"external,omitempty"`
	RoomID    string    `bson:"room_id,omitempty"   json:"room_id,omitempty"`
	RoomName  string    `bson:"room_name,omitempty" json:"room_name,omitempty"`
	Date      string    `bson:"date"             json:"date"`       // YYYY-MM-DD
	StartTime string    `bson:"start_time"       json:"start_time"` // HH:MM
	EndTime   string    `bson:"end_time"         json:"end_time"`   // HH:MM
	Notes     string    `bson:"notes,omitempty"  json:"notes,omitempty"`
	CreatedBy string    `bson:"created_by,omitempty" json:"created_by,omitempty"`
	CreatedAt time.Time `bson:"created_at"       json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"       json:"updated_at"`
}

// ShiftRequest creates or updates a shift. Either StaffID (a roster member) or
// External+StaffName+BranchSlug (off-roster cover) identifies the person.
type ShiftRequest struct {
	StaffID    string `json:"staff_id"`
	External   bool   `json:"external"`
	StaffName  string `json:"staff_name"`  // required when External
	BranchSlug string `json:"branch_slug"` // required when External (no staff to derive it)
	RoomID     string `json:"room_id"`
	Date       string `json:"date"       validate:"required"` // YYYY-MM-DD
	StartTime  string `json:"start_time" validate:"required"` // HH:MM
	EndTime    string `json:"end_time"   validate:"required"` // HH:MM
	Notes      string `json:"notes"`
}
