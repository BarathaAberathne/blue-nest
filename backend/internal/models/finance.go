package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Family / billing account ─────────────────────────────────────────────────
//
// Payments belong to a FAMILY (one parent may have several children); charges
// are attributable to specific children. Provider (Stripe) references only —
// never raw bank details (Bacs mandates live entirely in Stripe).

type MandateStatus string

const (
	MandateNone     MandateStatus = ""
	MandatePending  MandateStatus = "pending"
	MandateActive   MandateStatus = "active"
	MandateFailed   MandateStatus = "failed"
	MandateCancelled MandateStatus = "cancelled"
)

type Family struct {
	ID    primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref   string             `bson:"ref,omitempty" json:"ref,omitempty"` // FAM-YYYY-NNNNNN
	Name  string             `bson:"name" json:"name"`                   // e.g. "Thompson Family"

	ParentIDs       []string `bson:"parent_ids,omitempty" json:"parent_ids,omitempty"`
	BillingParentID string   `bson:"billing_parent_id,omitempty" json:"billing_parent_id,omitempty"`
	ChildIDs        []string `bson:"child_ids,omitempty" json:"child_ids,omitempty"`

	// Stripe references (ids + status only).
	StripeCustomerID      string        `bson:"stripe_customer_id,omitempty" json:"stripe_customer_id,omitempty"`
	StripePaymentMethodID string        `bson:"stripe_payment_method_id,omitempty" json:"stripe_payment_method_id,omitempty"`
	StripeMandateID       string        `bson:"stripe_mandate_id,omitempty" json:"stripe_mandate_id,omitempty"`
	DDSetupSessionID      string        `bson:"dd_setup_session_id,omitempty" json:"dd_setup_session_id,omitempty"`
	MandateStatus         MandateStatus `bson:"mandate_status,omitempty" json:"mandate_status"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	// Read projections (derived, never stored).
	BillingParentName string `bson:"-" json:"billing_parent_name,omitempty"`
	BalancePence      int64  `bson:"-" json:"balance_pence"`
}

// ── Charges (invoices) ───────────────────────────────────────────────────────

type ChargeStatus string

const (
	ChargeDraft         ChargeStatus = "draft"
	ChargeUpcoming      ChargeStatus = "upcoming"
	ChargeDue           ChargeStatus = "due"
	ChargeProcessing    ChargeStatus = "processing"
	ChargePaid          ChargeStatus = "paid"
	ChargePartiallyPaid ChargeStatus = "partially_paid"
	ChargeOverdue       ChargeStatus = "overdue"
	ChargeFailed        ChargeStatus = "failed"
	ChargeCancelled     ChargeStatus = "cancelled"
	ChargeRefunded      ChargeStatus = "refunded"
	ChargeWrittenOff    ChargeStatus = "written_off"
)

type Charge struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID    string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref      string             `bson:"ref,omitempty" json:"ref,omitempty"` // INV-YYYY-NNNNNN
	FamilyID string             `bson:"family_id" json:"family_id"`
	ChildID  string             `bson:"child_id,omitempty" json:"child_id,omitempty"`

	Description string       `bson:"description" json:"description"`
	AmountPence int64        `bson:"amount_pence" json:"amount_pence"`
	DueDate     string       `bson:"due_date" json:"due_date"` // YYYY-MM-DD
	Status      ChargeStatus `bson:"status" json:"status"`
	// FirstPayment marks the onboarding-gating charges (deposit + first month).
	FirstPayment bool `bson:"first_payment,omitempty" json:"first_payment,omitempty"`

	PaidPence             int64      `bson:"paid_pence,omitempty" json:"paid_pence,omitempty"`
	PaidAt                *time.Time `bson:"paid_at,omitempty" json:"paid_at,omitempty"`
	StripePaymentIntentID string     `bson:"stripe_payment_intent_id,omitempty" json:"stripe_payment_intent_id,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	ChildName string `bson:"-" json:"child_name,omitempty"`
}

// ── Payments + allocations ───────────────────────────────────────────────────

type PaymentAllocation struct {
	ChargeID    string `bson:"charge_id" json:"charge_id"`
	AmountPence int64  `bson:"amount_pence" json:"amount_pence"`
}

type Payment struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID    string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	FamilyID string             `bson:"family_id" json:"family_id"`

	AmountPence int64         `bson:"amount_pence" json:"amount_pence"`
	Method      string        `bson:"method" json:"method"` // bacs_debit | card | manual
	Status      PaymentStatus `bson:"status" json:"status"`
	FailureNote string        `bson:"failure_note,omitempty" json:"failure_note,omitempty"`

	Allocations []PaymentAllocation `bson:"allocations,omitempty" json:"allocations,omitempty"`

	StripePaymentIntentID string `bson:"stripe_payment_intent_id,omitempty" json:"stripe_payment_intent_id,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// ── Payment schedule ─────────────────────────────────────────────────────────

// PaymentSchedule generates a monthly charge per child (amount confirmed by
// the manager, prefilled from the fee calculator).
type PaymentSchedule struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID    string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	FamilyID string             `bson:"family_id" json:"family_id"`
	ChildID  string             `bson:"child_id" json:"child_id"`

	AmountPence int64  `bson:"amount_pence" json:"amount_pence"`
	DayOfMonth  int    `bson:"day_of_month" json:"day_of_month"` // 1–28
	StartMonth  string `bson:"start_month" json:"start_month"`   // YYYY-MM
	EndMonth    string `bson:"end_month,omitempty" json:"end_month,omitempty"`
	Active      bool   `bson:"active" json:"active"`
	// LastGenerated is the last YYYY-MM a charge was generated for (the
	// scheduler's idempotency cursor).
	LastGenerated string `bson:"last_generated,omitempty" json:"last_generated,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// ── Requests ─────────────────────────────────────────────────────────────────

type ChargeRequest struct {
	ChildID     string `json:"child_id"`
	Description string `json:"description" validate:"required"`
	AmountPence int64  `json:"amount_pence" validate:"required"`
	DueDate     string `json:"due_date"    validate:"required"` // YYYY-MM-DD
	FirstPayment bool  `json:"first_payment"`
}

type FirstPaymentRequest struct {
	ChildID          string `json:"child_id" validate:"required"`
	DepositPence     int64  `json:"deposit_pence"`
	FirstMonthPence  int64  `json:"first_month_pence"`
	DueDate          string `json:"due_date" validate:"required"`
}

type ScheduleRequest struct {
	ChildID     string `json:"child_id"     validate:"required"`
	AmountPence int64  `json:"amount_pence" validate:"required"`
	DayOfMonth  int    `json:"day_of_month" validate:"required"`
	StartMonth  string `json:"start_month"  validate:"required"` // YYYY-MM
	EndMonth    string `json:"end_month"`
}

type ManualPaymentRequest struct {
	AmountPence int64               `json:"amount_pence" validate:"required"`
	Note        string              `json:"note"`
	Allocations []PaymentAllocation `json:"allocations"`
}

// ── Communication log (reminders & finance messages) ─────────────────────────

// CommunicationLog records every finance reminder/message sent to a family —
// the audit trail behind the reminder scheduler. Key dedupes scheduled sends
// (e.g. "upcoming-7:<charge>"), so a sweep can run repeatedly without
// re-sending.
type CommunicationLog struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrgID    string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	FamilyID string             `bson:"family_id" json:"family_id"`
	ChargeID string             `bson:"charge_id,omitempty" json:"charge_id,omitempty"`

	Kind    string `bson:"kind" json:"kind"` // reminder_upcoming | reminder_due | reminder_overdue | dd_incomplete | manual_reminder
	Key     string `bson:"key,omitempty" json:"key,omitempty"`
	Subject string `bson:"subject" json:"subject"`
	Body    string `bson:"body" json:"body"`

	SentAt time.Time `bson:"sent_at" json:"sent_at"`
}
