package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── SEND / additional support ────────────────────────────────────────────────
//
// Two-tier model (see docs/send/send-management-design.md):
//   - Child.SendStatus is the OPERATIONAL marker stored on the canonical child
//     (badge/filter tier, like allergy tags) — set only by the SEND service.
//   - ChildSendSupport is the SENSITIVE profile in its own collection behind
//     send.manage. Absent doc = no additional-support information recorded.
// Room allocation is entirely independent: the profile never references rooms.

// SendStatus is the child's SEND/additional-support level, aligned to the real
// EYFS workflow (the induction form's "Early Years Action / Action Plus / SEN
// Statement" maps to sen_support/ehcp).
type SendStatus string

const (
	SendNone       SendStatus = ""            // not identified (default for every child)
	SendMonitoring SendStatus = "monitoring"  // under observation / early concerns
	SendSupport    SendStatus = "sen_support" // SEN support in place
	SendEHCP       SendStatus = "ehcp"        // EHCP in place
	SendEnded      SendStatus = "ended"       // support ended; history in the audit log
)

// ValidSendStatus reports whether s is a known status (including none).
func ValidSendStatus(s SendStatus) bool {
	switch s {
	case SendNone, SendMonitoring, SendSupport, SendEHCP, SendEnded:
		return true
	}
	return false
}

// SendStatusActive is the single classifier every SEND filter and KPI uses:
// a child currently requiring SEND/additional support.
func SendStatusActive(s SendStatus) bool {
	return s == SendMonitoring || s == SendSupport || s == SendEHCP
}

// Support-plan status (drives the "active support plan" KPI).
type SendPlanStatus string

const (
	SendPlanNone   SendPlanStatus = ""
	SendPlanDraft  SendPlanStatus = "draft"
	SendPlanActive SendPlanStatus = "active"
	SendPlanEnded  SendPlanStatus = "ended"
)

func ValidSendPlanStatus(s SendPlanStatus) bool {
	switch s {
	case SendPlanNone, SendPlanDraft, SendPlanActive, SendPlanEnded:
		return true
	}
	return false
}

// ChildSendSupport is the sensitive additional-support profile (collection
// child_send_support, tenant-scoped, unique per child).
type ChildSendSupport struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID   string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	ChildID string             `bson:"child_id" json:"child_id"`

	Status SendStatus `bson:"status" json:"status"`
	// Summary is the operational "support required in our setting" narrative.
	Summary string `bson:"summary,omitempty" json:"summary,omitempty"`
	// Categories come from the org-configurable send_category taxonomy list
	// (seeded with the four statutory EYFS broad areas) — never hardcoded.
	Categories []string `bson:"categories,omitempty" json:"categories,omitempty"`

	// SendLeadStaffID is the SEND-lead/SENCO RESPONSIBILITY for this child — a
	// staff reference, deliberately not tied to the senco security role.
	SendLeadStaffID string `bson:"send_lead_staff_id,omitempty" json:"send_lead_staff_id,omitempty"`

	PlanStatus SendPlanStatus `bson:"plan_status,omitempty" json:"plan_status"`
	ReviewDate string         `bson:"review_date,omitempty" json:"review_date,omitempty"` // YYYY-MM-DD
	StartDate  string         `bson:"start_date,omitempty"  json:"start_date,omitempty"`
	EndDate    string         `bson:"end_date,omitempty"    json:"end_date,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	// Read projection (resolved live, never stored).
	SendLeadName string `bson:"-" json:"send_lead_name,omitempty"`
}

// SendSupportRequest upserts the profile (PUT /admin/children/{id}/send-support).
type SendSupportRequest struct {
	Status          SendStatus     `json:"status"`
	Summary         string         `json:"summary"`
	Categories      []string       `json:"categories"`
	SendLeadStaffID string         `json:"send_lead_staff_id"`
	PlanStatus      SendPlanStatus `json:"plan_status"`
	ReviewDate      string         `json:"review_date"`
	StartDate       string         `json:"start_date"`
	EndDate         string         `json:"end_date"`
}

// ── Branch SEND overview (derived, never stored) ─────────────────────────────

type SendOverviewRow struct {
	ChildID    string     `json:"child_id"`
	ChildName  string     `json:"child_name"`
	AgeLabel   string     `json:"age_label,omitempty"`
	BranchSlug string     `json:"branch_slug"`
	RoomID     string     `json:"room_id,omitempty"`
	RoomName   string     `json:"room_name,omitempty"`
	Provision  string     `json:"provision"` // mainstream | send_dedicated | unallocated
	Status     SendStatus `json:"status"`
	PlanStatus string     `json:"plan_status,omitempty"`
	SendLead   string     `json:"send_lead,omitempty"`
	KeyPerson  string     `json:"key_person,omitempty"`
	ReviewDate string     `json:"review_date,omitempty"`
}

type SendOverview struct {
	TotalSend      int `json:"total_send"`
	Monitoring     int `json:"monitoring"`
	SenSupport     int `json:"sen_support"`
	EHCP           int `json:"ehcp"`
	DedicatedRooms int `json:"dedicated_rooms"`
	InSpecialist   int `json:"in_specialist"`
	InMainstream   int `json:"in_mainstream"`
	Unallocated    int `json:"unallocated"`
	ActivePlans    int `json:"active_plans"`

	Rows []SendOverviewRow `json:"rows"`
}
