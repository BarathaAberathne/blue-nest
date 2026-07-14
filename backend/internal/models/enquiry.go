package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Enquiry status workflow ──────────────────────────────────────────────────
// The admissions CRM tracks an enquiry through a soft funnel. Legacy records
// stored "new" | "read" | "responded"; NormalizeStatus migrates those on read
// so historical data renders correctly without a destructive migration.
const (
	EnquiryStatusNew            = "new"
	EnquiryStatusContacted      = "contacted"
	EnquiryStatusAwaitingReply  = "awaiting_reply"
	EnquiryStatusBookedVisit    = "booked_visit"
	EnquiryStatusVisitCompleted = "visit_completed"
	EnquiryStatusRegistered     = "registered"
	EnquiryStatusCancelled      = "cancelled"
	EnquiryStatusLost           = "lost"
	EnquiryStatusSpam           = "spam"
)

// EnquiryStatuses lists the approved statuses in funnel order (terminal/off-funnel
// states last). Drives validation plus ordered UI and stage maths.
var EnquiryStatuses = []string{
	EnquiryStatusNew,
	EnquiryStatusContacted,
	EnquiryStatusAwaitingReply,
	EnquiryStatusBookedVisit,
	EnquiryStatusVisitCompleted,
	EnquiryStatusRegistered,
	EnquiryStatusCancelled,
	EnquiryStatusLost,
	EnquiryStatusSpam,
}

// IsValidEnquiryStatus reports whether s is one of the approved statuses.
func IsValidEnquiryStatus(s string) bool {
	for _, v := range EnquiryStatuses {
		if v == s {
			return true
		}
	}
	return false
}

// NormalizeStatus maps legacy statuses onto the current workflow so old records
// render correctly. Unknown values fall back to "new".
func NormalizeStatus(s string) string {
	switch s {
	case "", EnquiryStatusNew, "read":
		return EnquiryStatusNew
	case "responded":
		return EnquiryStatusContacted
	default:
		if IsValidEnquiryStatus(s) {
			return s
		}
		return EnquiryStatusNew
	}
}

// Activity log entry types.
const (
	EnquiryActivityStatusChange = "status_change"
	EnquiryActivityNoteAdded    = "note_added"
	EnquiryActivityEmailReply   = "email_reply"
	EnquiryActivityFollowUp     = "follow_up_updated"
	EnquiryActivityAssigned     = "assigned"
	EnquiryActivityRegistered   = "registered"
	EnquiryActivityCreated      = "created" // logged manually by an admin
)

// Follow-up priorities.
const (
	EnquiryPriorityLow    = "low"
	EnquiryPriorityMedium = "medium"
	EnquiryPriorityHigh   = "high"
)

// IsValidPriority reports whether p is an approved follow-up priority.
func IsValidPriority(p string) bool {
	return p == EnquiryPriorityLow || p == EnquiryPriorityMedium || p == EnquiryPriorityHigh
}

type FeeQuote struct {
	Branch         string  `bson:"branch,omitempty"          json:"branch,omitempty"`
	AgeGroup       string  `bson:"age_group,omitempty"       json:"age_group,omitempty"`
	Session        string  `bson:"session,omitempty"         json:"session,omitempty"`
	Days           int     `bson:"days,omitempty"            json:"days,omitempty"`
	EarlyBird      bool    `bson:"early_bird,omitempty"      json:"early_bird,omitempty"`
	Discount       string  `bson:"discount,omitempty"        json:"discount,omitempty"`        // "sibling" | "staff"
	DiscountAmount float64 `bson:"discount_amount,omitempty" json:"discount_amount,omitempty"` // weekly £ saving
	Funding        string  `bson:"funding,omitempty"         json:"funding,omitempty"`
	YearWeeks      int     `bson:"year_weeks,omitempty"      json:"year_weeks,omitempty"`      // 38 = term-time, 52 = full-year
	GrossWeekly    float64 `bson:"gross_weekly"              json:"gross_weekly"`
	FundingOffset  float64 `bson:"funding_offset,omitempty"  json:"funding_offset,omitempty"`
	NetWeekly      float64 `bson:"net_weekly"                json:"net_weekly"`
	NetMonthly     float64 `bson:"net_monthly"               json:"net_monthly"`
}

// ── Application form ─────────────────────────────────────────────────────────
// Structured payload accompanying an Enquiry whose EnquiryType is
// "Application form". The Contact handler persists this verbatim and the
// email renderer surfaces it in both the admin notification and the parent
// confirmation, just like FeeQuote does.

type ApplicationChild struct {
	Name   string  `bson:"name"             json:"name"`
	Dob    string  `bson:"dob"              json:"dob"`
	Gender *string `bson:"gender,omitempty" json:"gender,omitempty"`
}

type ApplicationParent struct {
	Name  string `bson:"name"  json:"name"`
	Email string `bson:"email" json:"email"`
	Phone string `bson:"phone" json:"phone"`
}

type ApplicationSession struct {
	Day   string `bson:"day"             json:"day"`
	Type  string `bson:"type"            json:"type"`
	Label string `bson:"label,omitempty" json:"label,omitempty"`
	Time  string `bson:"time,omitempty"  json:"time,omitempty"`
}

type Application struct {
	Child            ApplicationChild     `bson:"child"                       json:"child"`
	Parent           ApplicationParent    `bson:"parent"                      json:"parent"`
	Branch           string               `bson:"branch"                      json:"branch"`
	SettlingIn       string               `bson:"settling_in,omitempty"       json:"settling_in,omitempty"`
	WaitingList      bool                 `bson:"waiting_list"                json:"waiting_list"`
	Sessions         []ApplicationSession `bson:"sessions,omitempty"          json:"sessions,omitempty"`
	SignatureDataURL string               `bson:"signature_data_url,omitempty" json:"signature_data_url,omitempty"`
}

// ── CRM sub-documents ────────────────────────────────────────────────────────

// EnquiryNote is an internal, staff-authored note attached to an enquiry.
type EnquiryNote struct {
	ID         string    `bson:"id"          json:"id"`
	Note       string    `bson:"note"        json:"note"`
	AuthorID   string    `bson:"author_id"   json:"author_id"`
	AuthorName string    `bson:"author_name" json:"author_name"`
	CreatedAt  time.Time `bson:"created_at"  json:"created_at"`
}

// EnquiryActivity is an append-only audit entry on the enquiry timeline.
type EnquiryActivity struct {
	ID         string    `bson:"id"                    json:"id"`
	Type       string    `bson:"type"                  json:"type"` // see EnquiryActivity* constants
	Message    string    `bson:"message"               json:"message"`
	FromStatus string    `bson:"from_status,omitempty" json:"from_status,omitempty"`
	ToStatus   string    `bson:"to_status,omitempty"   json:"to_status,omitempty"`
	AuthorID   string    `bson:"author_id"             json:"author_id"`
	AuthorName string    `bson:"author_name"           json:"author_name"`
	CreatedAt  time.Time `bson:"created_at"            json:"created_at"`
}

// EnquiryRegistration captures admissions outcome data once a child is enrolled.
type EnquiryRegistration struct {
	IsRegistered      bool       `bson:"is_registered"                 json:"is_registered"`
	RegistrationDate  *time.Time `bson:"registration_date,omitempty"   json:"registration_date,omitempty"`
	ExpectedStartDate *time.Time `bson:"expected_start_date,omitempty" json:"expected_start_date,omitempty"`
	ChildAgeGroup     string     `bson:"child_age_group,omitempty"     json:"child_age_group,omitempty"`
	RoomAllocation    string     `bson:"room_allocation,omitempty"     json:"room_allocation,omitempty"`
	FundingType       string     `bson:"funding_type,omitempty"        json:"funding_type,omitempty"`
}

type Enquiry struct {
	ID          primitive.ObjectID `bson:"_id"                 json:"id"`
	Name        string             `bson:"name"                json:"name"`
	Email       string             `bson:"email"               json:"email"`
	Phone       string             `bson:"phone"               json:"phone"`
	Branch      string             `bson:"branch"              json:"branch"`
	ChildAge    string             `bson:"child_age"           json:"child_age"`
	EnquiryType string             `bson:"enquiry_type"        json:"enquiry_type"`
	Message     string             `bson:"message"             json:"message"`
	FeeQuote    *FeeQuote          `bson:"fee_quote,omitempty"   json:"fee_quote,omitempty"`
	Application *Application       `bson:"application,omitempty" json:"application,omitempty"`
	// Status is one of the EnquiryStatus* constants; NormalizeStatus migrates legacy values.
	Status string `bson:"status" json:"status"`
	Source string `bson:"source,omitempty" json:"source,omitempty"`

	// CRM workflow fields.
	AssignedTo     string               `bson:"assigned_to,omitempty"      json:"assigned_to,omitempty"`
	AssignedToName string               `bson:"assigned_to_name,omitempty" json:"assigned_to_name,omitempty"`
	Priority       string               `bson:"priority,omitempty"         json:"priority,omitempty"`
	FollowUpDate   *time.Time           `bson:"follow_up_date,omitempty"   json:"follow_up_date,omitempty"`
	NextAction     string               `bson:"next_action,omitempty"      json:"next_action,omitempty"`
	Notes          []EnquiryNote        `bson:"notes,omitempty"            json:"notes"`
	ActivityLog    []EnquiryActivity    `bson:"activity_log,omitempty"     json:"activity_log"`
	Registration   *EnquiryRegistration `bson:"registration,omitempty"     json:"registration,omitempty"`

	CreatedAt time.Time `bson:"created_at"          json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at,omitempty" json:"updated_at,omitempty"`
}

type EnquiryRequest struct {
	Name        string       `json:"name"`
	Email       string       `json:"email"`
	Phone       string       `json:"phone"`
	Branch      string       `json:"branch"`
	ChildAge    string       `json:"child_age"`
	EnquiryType string       `json:"enquiry_type"`
	Message     string       `json:"message"`
	Source      string       `json:"source,omitempty"`
	Consent     bool         `json:"consent"`
	FeeQuote    *FeeQuote    `json:"fee_quote,omitempty"`
	Application *Application `json:"application,omitempty"`
}

// AdminEnquiryCreateRequest logs an enquiry that arrived off-website (phone,
// walk-in, email, referral, event…). Unlike the public form it carries no
// consent gate and sends no auto-emails; the admin can set the source channel,
// priority, an owner and an opening note. Requires a name, a branch, a type and
// at least one contact method (email or phone).
type AdminEnquiryCreateRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Branch      string `json:"branch"`
	ChildAge    string `json:"child_age"`
	EnquiryType string `json:"enquiry_type"`
	Message     string `json:"message"`
	Source      string `json:"source"`      // channel: phone | walk_in | email | referral | social | event | other
	Priority       string `json:"priority"`         // optional; defaults to medium
	AssignedTo     string `json:"assigned_to"`      // optional user id to own it
	AssignedToName string `json:"assigned_to_name"` // display name for the owner
	Note           string `json:"note"`             // optional opening internal note
}

// ── Admin request DTOs ───────────────────────────────────────────────────────

type EnquiryNoteRequest struct {
	Note string `json:"note"`
}

type EnquiryFollowUpRequest struct {
	AssignedTo     string     `json:"assigned_to"`
	AssignedToName string     `json:"assigned_to_name"`
	Priority       string     `json:"priority"`
	FollowUpDate   *time.Time `json:"follow_up_date"`
	NextAction     string     `json:"next_action"`
}

type EnquiryAssignRequest struct {
	AssignedTo     string `json:"assigned_to"`
	AssignedToName string `json:"assigned_to_name"`
}

type EnquiryRegisterRequest struct {
	RegistrationDate  *time.Time `json:"registration_date"`
	ExpectedStartDate *time.Time `json:"expected_start_date"`
	ChildAgeGroup     string     `json:"child_age_group"`
	RoomAllocation    string     `json:"room_allocation"`
	FundingType       string     `json:"funding_type"`
}

// EnquiryActor identifies the authenticated staff member performing an action,
// recorded on notes and activity entries.
type EnquiryActor struct {
	ID   string
	Name string
}

// EnquiryFilter drives server-side list filtering / sorting / pagination.
type EnquiryFilter struct {
	Branch     string
	Type       string
	Status     string
	AssignedTo string
	From       *time.Time
	To         *time.Time
	SortBy     string // created_at | name | branch | enquiry_type | status | assigned_to | follow_up_date
	SortDir    int    // 1 asc, -1 desc
	Limit      int64
	Skip       int64
}

// ── Dashboard stats ──────────────────────────────────────────────────────────

// EnquiryStatPoint is a generic label/value pair for charts.
type EnquiryStatPoint struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

// EnquiryBranchStat is one row of the branch comparison table.
type EnquiryBranchStat struct {
	Branch           string  `json:"branch"`
	Total            int     `json:"total"`
	TotalThisMonth   int     `json:"total_this_month"`
	New              int     `json:"new"`
	BookedVisits     int     `json:"booked_visits"`
	Registered       int     `json:"registered"`
	LostCancelled    int     `json:"lost_cancelled"`
	ConversionRate   float64 `json:"conversion_rate"`
	OverdueFollowUps int     `json:"overdue_follow_ups"`
}

// EnquiryStats is the full admissions KPI/chart payload.
type EnquiryStats struct {
	TotalThisMonth   int     `json:"total_this_month"`
	New              int     `json:"new"`
	Contacted        int     `json:"contacted"`
	BookedVisits     int     `json:"booked_visits"`
	Registrations    int     `json:"registrations"`
	LostCancelled    int     `json:"lost_cancelled"`
	ConversionRate   float64 `json:"conversion_rate"`    // registrations / qualified enquiries
	VisitBookingRate float64 `json:"visit_booking_rate"` // booked visits / qualified enquiries
	AvgResponseHours float64 `json:"avg_response_hours"`
	HasResponseData  bool    `json:"has_response_data"`
	OverdueFollowUps int     `json:"overdue_follow_ups"`
	Total            int     `json:"total"`

	ByBranch              []EnquiryStatPoint  `json:"by_branch"`
	ByStatus              []EnquiryStatPoint  `json:"by_status"`
	ByType                []EnquiryStatPoint  `json:"by_type"`
	MonthlyTrend          []EnquiryStatPoint  `json:"monthly_trend"`
	Funnel                []EnquiryStatPoint  `json:"funnel"`
	RegistrationsByBranch []EnquiryStatPoint  `json:"registrations_by_branch"`
	BranchComparison      []EnquiryBranchStat `json:"branch_comparison"`
}

// ── Paginated list ───────────────────────────────────────────────────────────

// EnquiryPage is the payload for the paginated table view: a single page of
// enquiries plus the total matching the filter (for page-count maths).
type EnquiryPage struct {
	Items []Enquiry `json:"items"`
	Total int64     `json:"total"`
	Limit int64     `json:"limit"`
	Skip  int64     `json:"skip"`
}

// ── Admissions tasks (in-admin notifications + dashboard "Today's tasks") ─────

// EnquiryTaskItem is a lightweight enquiry summary used in the tasks/notifications
// feed — just enough to render a clickable row without shipping the full record.
type EnquiryTaskItem struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	ChildAge       string     `json:"child_age,omitempty"`
	Branch         string     `json:"branch"`
	Status         string     `json:"status"`
	EnquiryType    string     `json:"enquiry_type"`
	Priority       string     `json:"priority,omitempty"`
	AssignedToName string     `json:"assigned_to_name,omitempty"`
	FollowUpDate   *time.Time `json:"follow_up_date,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// EnquiryTasks groups admissions work that needs attention. Note: there is no
// dedicated visit-date field on the model, so VisitsToday/ThisWeek use
// follow_up_date on booked_visit enquiries as the visit-date proxy.
type EnquiryTasks struct {
	OverdueFollowUps   []EnquiryTaskItem `json:"overdue_follow_ups"`
	DueToday           []EnquiryTaskItem `json:"due_today"`
	Uncontacted24h     []EnquiryTaskItem `json:"uncontacted_24h"`
	VisitsToday        []EnquiryTaskItem `json:"visits_today"`
	VisitsThisWeek     []EnquiryTaskItem `json:"visits_this_week"`
	AppsMissingReg     []EnquiryTaskItem `json:"apps_missing_registration"`
	RegistrationsMonth []EnquiryTaskItem `json:"registrations_this_month"`
	// NotificationCount is the badge total for the admin bell (overdue +
	// uncontacted + visits today + applications missing registration).
	NotificationCount int `json:"notification_count"`
}

// ── Bulk actions (table view) ────────────────────────────────────────────────

// EnquiryBulkAction enumerates the supported bulk operations.
const (
	EnquiryBulkAssign   = "assign"
	EnquiryBulkStatus   = "status"
	EnquiryBulkPriority = "priority"
	EnquiryBulkNote     = "note"
)

// EnquiryBulkRequest applies one action to many enquiries at once. Only the
// fields relevant to Action need be set.
type EnquiryBulkRequest struct {
	IDs            []string `json:"ids"`
	Action         string   `json:"action"`
	Status         string   `json:"status,omitempty"`
	AssignedTo     string   `json:"assigned_to,omitempty"`
	AssignedToName string   `json:"assigned_to_name,omitempty"`
	Priority       string   `json:"priority,omitempty"`
	Note           string   `json:"note,omitempty"`
}

// EnquiryBulkResult reports how a bulk action fared.
type EnquiryBulkResult struct {
	Updated int                  `json:"updated"`
	Failed  []EnquiryBulkFailure `json:"failed"`
}

type EnquiryBulkFailure struct {
	ID    string `json:"id"`
	Error string `json:"error"`
}
