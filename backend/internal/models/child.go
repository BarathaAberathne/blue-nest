package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChildStatus string

const (
	ChildActive   ChildStatus = "active"
	ChildWaitlist ChildStatus = "waitlist"
	ChildLeft     ChildStatus = "left"
)

// IsValidChildStatus reports whether s is one of the approved statuses.
func IsValidChildStatus(s ChildStatus) bool {
	switch s {
	case ChildActive, ChildWaitlist, ChildLeft:
		return true
	default:
		return false
	}
}

// Funding types — the child's free-hours entitlement.
const (
	FundingNone = "none"
	Funding15h  = "15h"
	Funding30h  = "30h"
)

// Guardian is a parent/carer contact on a child record.
type Guardian struct {
	Name     string `bson:"name"     json:"name"`
	Relation string `bson:"relation" json:"relation"`
	Email    string `bson:"email"    json:"email"`
	Phone    string `bson:"phone"    json:"phone"`
	Primary  bool   `bson:"primary"  json:"primary"`
}

// ChildSession is a booked session in the weekly pattern (day + am/pm/full).
type ChildSession struct {
	Day  string `bson:"day"  json:"day"`  // Mon..Fri
	Type string `bson:"type" json:"type"` // full | am | pm
}

// Child is an enrolled (or waitlisted) child. The first real "who's in the
// nursery" record — occupancy, attendance and rooms all reference it.
type Child struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"        json:"id"`
	OrgID        string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref          string             `bson:"ref,omitempty"        json:"ref,omitempty"` // CHD-YYYY-NNNNNN
	FirstName    string             `bson:"first_name"           json:"first_name"`
	LastName     string             `bson:"last_name"            json:"last_name"`
	DOB          string             `bson:"dob"                  json:"dob"` // YYYY-MM-DD
	Gender       string             `bson:"gender,omitempty"     json:"gender,omitempty"`
	// Address is the child's home address (induction form; write-through from
	// the child_details section).
	Address string `bson:"address,omitempty" json:"address,omitempty"`
	// PhotoURL is the uploaded profile picture (served from /uploads).
	PhotoURL string `bson:"photo_url,omitempty" json:"photo_url,omitempty"`
	BranchSlug   string             `bson:"branch_slug"          json:"branch_slug"`
	Status       ChildStatus        `bson:"status"               json:"status"`
	StartDate    string             `bson:"start_date,omitempty" json:"start_date,omitempty"`
	Guardians    []Guardian         `bson:"guardians,omitempty"  json:"guardians,omitempty"`
	FundingType  string             `bson:"funding_type"         json:"funding_type"` // FundingNone | Funding15h | Funding30h
	Sessions     []ChildSession     `bson:"sessions,omitempty"   json:"sessions,omitempty"`
	// AllergyTags/DietaryTags hold configurable taxonomy codes (allergy_type /
	// dietary_label lists); Allergies/DietaryReqs remain as free-text notes
	// alongside them. Additive — legacy records keep their free-text values.
	AllergyTags  []string           `bson:"allergy_tags,omitempty" json:"allergy_tags,omitempty"`
	DietaryTags  []string           `bson:"dietary_tags,omitempty" json:"dietary_tags,omitempty"`
	Allergies    string             `bson:"allergies,omitempty"    json:"allergies,omitempty"`
	DietaryReqs  string             `bson:"dietary_reqs,omitempty" json:"dietary_reqs,omitempty"`
	MedicalNotes string             `bson:"medical_notes,omitempty" json:"medical_notes,omitempty"`
	EnquiryID    string             `bson:"enquiry_id,omitempty"   json:"enquiry_id,omitempty"` // originating admissions enquiry
	// KeyPersonID links the child to their key person (a staff record id). The
	// key person builds a secure attachment and tracks the child's development.
	KeyPersonID string `bson:"key_person_id,omitempty" json:"key_person_id,omitempty"`
	// LeaveDate records when the child left the nursery (set by the archive
	// action alongside Status=left). Additive — legacy records omit it.
	LeaveDate string    `bson:"leave_date,omitempty" json:"leave_date,omitempty"` // YYYY-MM-DD
	CreatedAt time.Time `bson:"created_at"           json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"           json:"updated_at"`

	// KeyPersonName is resolved from the staff record for display; never stored.
	KeyPersonName string `bson:"-" json:"key_person_name,omitempty"`

	// RoomID/RoomName are a COMPUTED read projection of the child's current
	// active room, resolved from the canonical child_room_assignments at read
	// time (never stored, never written). Room placement is managed only
	// through the assignment / transfer endpoints.
	RoomID   string `bson:"-" json:"room_id,omitempty"`
	RoomName string `bson:"-" json:"room_name,omitempty"`
}

// ChildKeyPersonRequest assigns (or clears, with an empty staff_id) a child's
// key person.
// ChildPhotoRequest sets (or clears, with an empty URL) the profile photo.
type ChildPhotoRequest struct {
	PhotoURL string `json:"photo_url"`
}

type ChildKeyPersonRequest struct {
	StaffID string `json:"staff_id"`
}

// ChildArchiveRequest marks a leaving child as left. LeaveDate is optional
// (YYYY-MM-DD; defaults to today) — the archive action also ends any live
// room placements so the child stops occupying capacity.
type ChildArchiveRequest struct {
	LeaveDate string `json:"leave_date"`
}

type ChildRequest struct {
	FirstName  string `json:"first_name" validate:"required"`
	LastName   string `json:"last_name"  validate:"required"`
	DOB        string `json:"dob"`
	Gender     string `json:"gender"`
	BranchSlug   string         `json:"branch_slug" validate:"required"`
	Status       ChildStatus    `json:"status"`
	StartDate    string         `json:"start_date"`
	Guardians    []Guardian     `json:"guardians"`
	FundingType  string         `json:"funding_type"`
	Sessions     []ChildSession `json:"sessions"`
	AllergyTags  []string       `json:"allergy_tags"`
	DietaryTags  []string       `json:"dietary_tags"`
	Allergies    string         `json:"allergies"`
	DietaryReqs  string         `json:"dietary_reqs"`
	MedicalNotes string         `json:"medical_notes"`
}

// ── Stats payload (drives the dashboard children/occupancy figures) ──────────
type ChildStatPoint struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type BranchChildStat struct {
	Branch        string `json:"branch"`
	Children      int    `json:"children"`
	Capacity      int    `json:"capacity"`
	OccupancyRate int    `json:"occupancy_rate"`
}

type ChildStats struct {
	Total         int               `json:"total"`
	Active        int               `json:"active"`
	Waitlist      int               `json:"waitlist"`
	Capacity      int               `json:"capacity"`
	Available     int               `json:"available"`
	OccupancyRate int               `json:"occupancy_rate"`
	ByBranch      []ChildStatPoint  `json:"by_branch"`
	ByAgeGroup    []ChildStatPoint  `json:"by_age_group"`
	Branches      []BranchChildStat `json:"branches"`
}

// ── Capacity forecast (Room planner / Future availability) ───────────────────
// Projects each room's currently-active roster forward across weeks from its
// weekly Sessions pattern (+ any future StartDate). There are no term dates or
// planned-leaving dates modelled yet, so this is only as good as "who's active
// or enrolled to start, and what they're booked for" — not a full booking
// system. Occupied/available are per session slot (AM/PM); required staff is
// ceil(occupied / Room.StaffRatio).
type CapacityDay struct {
	Day             string `json:"day"` // Mon..Fri
	AMChildren      int    `json:"am_children"`
	AMAvailable     int    `json:"am_available"` // capacity - am_children; negative = overbooked
	AMStaffRequired int    `json:"am_staff_required"`
	PMChildren      int    `json:"pm_children"`
	PMAvailable     int    `json:"pm_available"`
	PMStaffRequired int    `json:"pm_staff_required"`
}

type CapacityWeek struct {
	WeekStart string        `json:"week_start"` // YYYY-MM-DD, the Monday
	Days      []CapacityDay `json:"days"`
}

type RoomCapacityForecast struct {
	RoomID     string         `json:"room_id"`
	RoomName   string         `json:"room_name"`
	BranchSlug string         `json:"branch_slug"`
	Capacity   int            `json:"capacity"`
	StaffRatio int            `json:"staff_ratio"`
	Weeks      []CapacityWeek `json:"weeks"`
}

type CapacityForecast struct {
	Weeks []string               `json:"weeks"` // week-start dates, same order/length as each room's Weeks
	Rooms []RoomCapacityForecast `json:"rooms"`
}
