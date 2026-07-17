package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderStatus string

const (
	OrderPending    OrderStatus = "pending"
	OrderPaid       OrderStatus = "paid"
	OrderProcessing OrderStatus = "processing"
	OrderShipped    OrderStatus = "shipped"
	OrderDelivered  OrderStatus = "delivered"
	OrderCancelled  OrderStatus = "cancelled"
)

// Order-level payment states. These extend the shared PaymentStatus type
// declared in payment.go (which also has PaymentFailed / PaymentRefunded). An
// order tracks payment independently of fulfilment Status (paid ≠ shipped).
const (
	PaymentUnpaid PaymentStatus = "unpaid"
	PaymentPaid   PaymentStatus = "paid"
)

// BranchNotApplicable is the sentinel branch slug for store orders that aren't
// tied to a nursery. Kept explicit so "no branch" is a deliberate value, not a
// missing field.
const BranchNotApplicable = "n/a"

type OrderItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Name      string             `bson:"name"       json:"name"`
	Price     int64              `bson:"price"      json:"price"` // unit price, pence (snapshot at purchase)
	Qty       int                `bson:"qty"        json:"qty"`
	Size      string             `bson:"size,omitempty" json:"size,omitempty"`
	// VAT is the per-line VAT in pence at purchase time (0 for zero-rated items,
	// which most children's products are). Snapshot for record-keeping.
	VAT int64 `bson:"vat,omitempty" json:"vat,omitempty"`
}

// ShippingAddress is used for both the delivery address and (as BillingAddress)
// the billing address. County was added later, hence omitempty.
type ShippingAddress struct {
	Name       string `bson:"name"        json:"name,omitempty"`
	Line1      string `bson:"line1"       json:"line1"`
	Line2      string `bson:"line2"       json:"line2,omitempty"`
	City       string `bson:"city"        json:"city"`
	County     string `bson:"county,omitempty"      json:"county,omitempty"`
	PostalCode string `bson:"postal_code" json:"postal_code"`
	Country    string `bson:"country"     json:"country"`
	Phone      string `bson:"phone,omitempty"       json:"phone,omitempty"`
}

// HasContent reports whether an address carries any real data (used by the UI /
// emails to decide whether to render it).
func (a ShippingAddress) HasContent() bool {
	return a.Line1 != "" || a.City != "" || a.PostalCode != ""
}

type Order struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	OrgID       string             `bson:"org_id,omitempty" json:"org_id,omitempty"`
	Ref         string             `bson:"ref,omitempty"    json:"ref,omitempty"` // human ref e.g. ORD-2026-000042
	UserID      primitive.ObjectID `bson:"user_id"          json:"user_id"`
	Items       []OrderItem        `bson:"items"            json:"items"`
	Status      OrderStatus        `bson:"status"           json:"status"`
	TotalAmount int64              `bson:"total_amount"     json:"total_amount"`
	Currency    string             `bson:"currency"         json:"currency"`

	// ── Customer snapshot (captured at checkout; preserved even if the account
	//    or its details change later) ──────────────────────────────────────────
	CustomerName  string `bson:"customer_name,omitempty"  json:"customer_name,omitempty"`
	CustomerEmail string `bson:"customer_email,omitempty" json:"customer_email,omitempty"`
	CustomerPhone string `bson:"customer_phone,omitempty" json:"customer_phone,omitempty"`

	// ── Nursery (optional; BranchSlug == "" or "n/a" means Not applicable) ──────
	BranchSlug string `bson:"branch_slug,omitempty" json:"branch_slug,omitempty"`
	BranchName string `bson:"branch_name,omitempty" json:"branch_name,omitempty"`
	ChildRef   string `bson:"child_ref,omitempty"   json:"child_ref,omitempty"` // optional child name / reference

	// ── Addresses ───────────────────────────────────────────────────────────────
	// ShippingAddress = delivery address (from Stripe shipping collection).
	ShippingAddress ShippingAddress `bson:"shipping_address" json:"shipping_address"`
	// BillingAddress = the address Stripe verified against the payment method.
	BillingAddress ShippingAddress `bson:"billing_address,omitempty" json:"billing_address,omitempty"`

	// ── Payment ─────────────────────────────────────────────────────────────────
	PaymentStatus    PaymentStatus `bson:"payment_status,omitempty"    json:"payment_status,omitempty"`
	StripeCustomerID string        `bson:"stripe_customer_id,omitempty" json:"stripe_customer_id,omitempty"`
	StripeSessionID  string        `bson:"stripe_session_id,omitempty"  json:"stripe_session_id,omitempty"`
	PaymentIntentID  string        `bson:"payment_intent_id,omitempty"  json:"payment_intent_id,omitempty"`
	// PaidAt is set by the Stripe webhook — do not set from the frontend.
	PaidAt *time.Time `bson:"paid_at,omitempty" json:"paid_at,omitempty"`

	// ── Email notification idempotency flags (one per recipient class) ──────────
	ConfirmationEmailSentAt *time.Time `bson:"confirmation_email_sent_at,omitempty" json:"confirmation_email_sent_at,omitempty"` // customer
	AdminEmailSentAt        *time.Time `bson:"admin_email_sent_at,omitempty"        json:"admin_email_sent_at,omitempty"`        // internal admin
	BranchEmailSentAt       *time.Time `bson:"branch_email_sent_at,omitempty"       json:"branch_email_sent_at,omitempty"`       // branch manager
	BAEmailSentAt           *time.Time `bson:"ba_email_sent_at,omitempty"           json:"ba_email_sent_at,omitempty"`           // BA recipient
	EmailError              string     `bson:"email_error,omitempty"                json:"email_error,omitempty"`
	// StockAdjustedAt guards stock decrement against duplicate webhook deliveries.
	StockAdjustedAt *time.Time `bson:"stock_adjusted_at,omitempty" json:"stock_adjusted_at,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// BranchIsApplicable reports whether a real nursery branch is attached (vs the
// explicit "Not applicable" sentinel or an empty value).
func (o *Order) BranchIsApplicable() bool {
	return o.BranchSlug != "" && o.BranchSlug != BranchNotApplicable
}
