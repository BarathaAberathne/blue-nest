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
	Ref          string             `bson:"ref,omitempty"        json:"ref,omitempty"` // CHD-YYYY-NNNNNN
	FirstName    string             `bson:"first_name"           json:"first_name"`
	LastName     string             `bson:"last_name"            json:"last_name"`
	DOB          string             `bson:"dob"                  json:"dob"` // YYYY-MM-DD
	Gender       string             `bson:"gender,omitempty"     json:"gender,omitempty"`
	BranchSlug   string             `bson:"branch_slug"          json:"branch_slug"`
	RoomID       string             `bson:"room_id,omitempty"    json:"room_id,omitempty"`
	Status       ChildStatus        `bson:"status"               json:"status"`
	StartDate    string             `bson:"start_date,omitempty" json:"start_date,omitempty"`
	Guardians    []Guardian         `bson:"guardians,omitempty"  json:"guardians,omitempty"`
	FundingType  string             `bson:"funding_type"         json:"funding_type"` // none | 15h | 30h
	Sessions     []ChildSession     `bson:"sessions,omitempty"   json:"sessions,omitempty"`
	Allergies    string             `bson:"allergies,omitempty"    json:"allergies,omitempty"`
	DietaryReqs  string             `bson:"dietary_reqs,omitempty" json:"dietary_reqs,omitempty"`
	MedicalNotes string             `bson:"medical_notes,omitempty" json:"medical_notes,omitempty"`
	EnquiryID    string             `bson:"enquiry_id,omitempty"   json:"enquiry_id,omitempty"` // originating admissions enquiry
	CreatedAt    time.Time          `bson:"created_at"           json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at"           json:"updated_at"`
}

type ChildRequest struct {
	FirstName    string         `json:"first_name" validate:"required"`
	LastName     string         `json:"last_name"  validate:"required"`
	DOB          string         `json:"dob"`
	Gender       string         `json:"gender"`
	BranchSlug   string         `json:"branch_slug" validate:"required"`
	RoomID       string         `json:"room_id"`
	Status       ChildStatus    `json:"status"`
	StartDate    string         `json:"start_date"`
	Guardians    []Guardian     `json:"guardians"`
	FundingType  string         `json:"funding_type"`
	Sessions     []ChildSession `json:"sessions"`
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
