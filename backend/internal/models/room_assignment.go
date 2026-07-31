package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AssignmentStatus is the lifecycle of a room assignment. History is never
// deleted: ending an assignment flips it to ended, and a future-dated child
// placement waits as scheduled until its start date (lazily activated).
type AssignmentStatus string

const (
	AssignmentActive    AssignmentStatus = "active"
	AssignmentScheduled AssignmentStatus = "scheduled"
	AssignmentEnded     AssignmentStatus = "ended"
)

// StaffRoomAssignment is the authoritative staff→room relationship. A staff
// member can hold several active assignments at once (multi-room working) but
// only one may be primary; the primary room is what syncs onto the derived
// Staff.RoomID read model that the rota and attendance register consume.
type StaffRoomAssignment struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"          json:"id"`
	OrgID      string             `bson:"org_id,omitempty"       json:"org_id,omitempty"`
	BranchSlug string             `bson:"branch_slug"            json:"branch_slug"`
	RoomID     string             `bson:"room_id"                json:"room_id"`
	StaffID    string             `bson:"staff_id"               json:"staff_id"`
	RoleInRoom string             `bson:"role_in_room,omitempty" json:"role_in_room,omitempty"`
	IsPrimary  bool               `bson:"is_primary"             json:"is_primary"`
	StartDate  string             `bson:"start_date"             json:"start_date"`         // YYYY-MM-DD
	EndDate    string             `bson:"end_date,omitempty"     json:"end_date,omitempty"` // YYYY-MM-DD
	Status     AssignmentStatus   `bson:"status"                 json:"status"`
	CreatedBy  string             `bson:"created_by,omitempty"   json:"created_by,omitempty"`
	UpdatedBy  string             `bson:"updated_by,omitempty"   json:"updated_by,omitempty"`
	CreatedAt  time.Time          `bson:"created_at"             json:"created_at"`
	UpdatedAt  time.Time          `bson:"updated_at"             json:"updated_at"`

	// Resolved for display; never stored.
	RoomName  string `bson:"-" json:"room_name,omitempty"`
	StaffName string `bson:"-" json:"staff_name,omitempty"`
}

// StaffRoomAssignmentRequest creates an assignment. The same body is accepted
// whether the caller arrived from the room profile or the staff profile —
// both routes call the identical service method.
type StaffRoomAssignmentRequest struct {
	StaffID    string `json:"staff_id"    validate:"required"`
	RoomID     string `json:"room_id"     validate:"required"`
	RoleInRoom string `json:"role_in_room"`
	IsPrimary  bool   `json:"is_primary"`
	StartDate  string `json:"start_date"` // defaults to today
	EndDate    string `json:"end_date"`   // optional planned end
}

// StaffRoomAssignmentUpdate ends an assignment and/or updates its role/primary
// flag. Pointer fields distinguish "omitted" from explicit values.
type StaffRoomAssignmentUpdate struct {
	End        bool    `json:"end"`          // true = end the assignment
	EndDate    string  `json:"end_date"`     // used with End; defaults to today
	IsPrimary  *bool   `json:"is_primary"`   // set/unset primary
	RoleInRoom *string `json:"role_in_room"` // change role label
}

// ChildRoomAssignment is the authoritative child→room placement. Exactly one
// active placement per child (a partial unique index enforces it even under
// races), optionally one scheduled future placement. The active placement
// syncs onto the derived Child.RoomID read model used by attendance and the
// capacity forecast.
type ChildRoomAssignment struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"            json:"id"`
	OrgID          string             `bson:"org_id,omitempty"         json:"org_id,omitempty"`
	BranchSlug     string             `bson:"branch_slug"              json:"branch_slug"`
	ChildID        string             `bson:"child_id"                 json:"child_id"`
	RoomID         string             `bson:"room_id"                  json:"room_id"`
	StartDate      string             `bson:"start_date"               json:"start_date"`
	EndDate        string             `bson:"end_date,omitempty"       json:"end_date,omitempty"`
	Status         AssignmentStatus   `bson:"status"                   json:"status"`
	TransferReason string             `bson:"transfer_reason,omitempty" json:"transfer_reason,omitempty"`
	Notes          string             `bson:"notes,omitempty"          json:"notes,omitempty"`
	// OverrideReason is required (and audit-logged) whenever the allocation
	// went ahead despite a failed capacity or age-range check.
	OverrideReason string    `bson:"override_reason,omitempty" json:"override_reason,omitempty"`
	CreatedBy      string    `bson:"created_by,omitempty"      json:"created_by,omitempty"`
	UpdatedBy      string    `bson:"updated_by,omitempty"      json:"updated_by,omitempty"`
	CreatedAt      time.Time `bson:"created_at"                json:"created_at"`
	UpdatedAt      time.Time `bson:"updated_at"                json:"updated_at"`

	// Resolved for display; never stored.
	RoomName  string `bson:"-" json:"room_name,omitempty"`
	ChildName string `bson:"-" json:"child_name,omitempty"`
	// AppliedOverrides lists which checks were overridden on this write
	// ("capacity_override"/"age_override") so the handler can audit each —
	// transient, never stored or serialised.
	AppliedOverrides []string `bson:"-" json:"-"`
}

type ChildRoomAssignmentRequest struct {
	ChildID        string `json:"child_id" validate:"required"`
	RoomID         string `json:"room_id"  validate:"required"`
	StartDate      string `json:"start_date"` // defaults to today; future = scheduled
	Notes          string `json:"notes"`
	OverrideReason string `json:"override_reason"` // required to pass a failed capacity/age check
}

// ChildTransferRequest moves a child between rooms transactionally: the
// current placement is closed and the new one created (or scheduled, when
// EffectiveDate is in the future).
type ChildTransferRequest struct {
	RoomID         string `json:"room_id"        validate:"required"`
	EffectiveDate  string `json:"effective_date"` // defaults to today
	Reason         string `json:"reason"         validate:"required"`
	Notes          string `json:"notes"`
	OverrideReason string `json:"override_reason"`
}

// ChildRoomAssignmentUpdate ends a placement (leaving the child roomless —
// e.g. when they leave the nursery). Transfers use ChildTransferRequest.
type ChildRoomAssignmentUpdate struct {
	End     bool   `json:"end"`
	EndDate string `json:"end_date"`
	Reason  string `json:"reason"`
}

// RoomCapacitySummary is the single authoritative capacity calculation —
// dashboards and room pages consume this rather than re-deriving it.
// AvailableSpaces is placement-based (capacity - active allocations);
// PresentChildren (today's attendance) is reported separately and is never
// part of the available-spaces formula.
type RoomCapacitySummary struct {
	RoomID            string `json:"room_id"`
	RoomName          string `json:"room_name"`
	BranchSlug        string `json:"branch_slug"`
	Status            string `json:"status"` // active | inactive
	Capacity          int    `json:"capacity"`
	AllocatedChildren int    `json:"allocated_children"` // current active placements
	FutureChildren    int    `json:"future_children"`    // scheduled placements
	AvailableSpaces   int    `json:"available_spaces"`   // max(capacity - allocated, 0)
	OverCapacity      bool   `json:"over_capacity"`      // allocated > capacity (override)
	StaffAllocated    int    `json:"staff_allocated"`    // current active staff assignments
	PresentChildren   int    `json:"present_children"`   // today's attendance, informational
	OccupancyRate     int    `json:"occupancy_rate"`     // allocated ÷ capacity, percent
}
