package webhooks

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/pkg/response"
	stripe "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MailSender is the subset of *email.Mailer the webhook needs (so it can be
// mocked in tests). *email.Mailer satisfies it.
type MailSender interface {
	Send(to []string, subject, htmlBody string) error
	SendWithReplyTo(to []string, replyTo, subject, htmlBody string) error
}

type StripeWebhookHandler struct {
	webhookSecret string
	orders        repository.OrderRepository
	products      repository.ProductRepository
	branches      repository.BranchRepository
	mailer        MailSender
	orderAdminTo  string
	orderBATo     string
	// finance handles Bacs Direct Debit + family payment events (nil-safe).
	finance service.FinanceService
}

func NewStripeWebhookHandler(
	secret string,
	orders repository.OrderRepository,
	products repository.ProductRepository,
	branches repository.BranchRepository,
	mailer MailSender,
	orderAdminTo string,
	orderBATo string,
	finance service.FinanceService,
) *StripeWebhookHandler {
	return &StripeWebhookHandler{
		webhookSecret: secret,
		orders:        orders,
		products:      products,
		branches:      branches,
		mailer:        mailer,
		orderAdminTo:  orderAdminTo,
		orderBATo:     orderBATo,
		finance:       finance,
	}
}

func (h *StripeWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	const maxBodyBytes = int64(131072)
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		response.BadRequest(w, "failed to read body")
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	// IgnoreAPIVersionMismatch: the Stripe account uses a newer API version than
	// stripe-go v76. The HMAC signature is still fully verified; only the version
	// compatibility check is skipped.
	event, err := webhook.ConstructEventWithOptions(body, sig, h.webhookSecret,
		webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true},
	)
	if err != nil {
		// Never log the raw body (it contains personal data) — only metadata.
		slog.Error("stripe webhook: signature verification failed",
			"err", err, "body_len", len(body), "sig_present", sig != "", "secret_len", len(h.webhookSecret))
		response.BadRequest(w, "invalid stripe signature")
		return
	}

	slog.Info("stripe webhook received", "type", event.Type)

	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted,
		"checkout.session.async_payment_succeeded":
		h.handleCheckoutCompleted(r.Context(), event)
	case "checkout.session.async_payment_failed":
		h.handleSessionFailed(r.Context(), event)
	case stripe.EventTypePaymentIntentPaymentFailed:
		h.handlePaymentIntentFailed(r.Context(), event)
		h.handleFinanceIntent(r.Context(), event, models.PaymentFailed)
	// ── Finance module (family billing / Bacs Direct Debit) ──────────────
	case "setup_intent.succeeded":
		h.handleFinanceSetup(r.Context(), event)
	case stripe.EventTypePaymentIntentSucceeded:
		h.handleFinanceIntent(r.Context(), event, models.PaymentSucceeded)
	case "payment_intent.processing":
		h.handleFinanceIntent(r.Context(), event, models.PaymentProcessing)
	case "charge.refunded":
		h.handleFinanceRefund(r.Context(), event)
	}

	// Always 200 so Stripe doesn't retry indefinitely — handlers are idempotent
	// and log their own failures.
	response.OK(w, map[string]string{"received": "true"})
}

// ── Raw session parsing ─────────────────────────────────────────────────────────
// SDK struct deserialization is unreliable across Stripe API versions newer than
// stripe-go v76 targets, so we parse the fields we need from the raw bytes.

type stripeAddr struct {
	Line1      string `json:"line1"`
	Line2      string `json:"line2"`
	City       string `json:"city"`
	State      string `json:"state"` // Stripe's "state" == UK county
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

type shippingBlock struct {
	Name    string     `json:"name"`
	Address stripeAddr `json:"address"`
}

type rawCheckoutSession struct {
	ID              string `json:"id"`
	CustomerEmail   string `json:"customer_email"`
	PaymentStatus   string `json:"payment_status"`
	Customer        string `json:"customer"`       // customer id (string when unexpanded / null)
	PaymentIntent   string `json:"payment_intent"` // pi id (string when unexpanded)
	CustomerDetails struct {
		Email   string     `json:"email"`
		Name    string     `json:"name"`
		Phone   string     `json:"phone"`
		Address stripeAddr `json:"address"` // billing address
	} `json:"customer_details"`
	// Shipping moved into collected_information in API 2026-04-22.dahlia; try both.
	CollectedInformation struct {
		ShippingDetails *shippingBlock `json:"shipping_details"`
	} `json:"collected_information"`
	ShippingDetails *shippingBlock    `json:"shipping_details"`
	Metadata        map[string]string `json:"metadata"`
}

func toAddr(name string, a stripeAddr) models.ShippingAddress {
	return models.ShippingAddress{
		Name: name, Line1: a.Line1, Line2: a.Line2, City: a.City,
		County: a.State, PostalCode: a.PostalCode, Country: a.Country,
	}
}

func (h *StripeWebhookHandler) handleCheckoutCompleted(ctx context.Context, event stripe.Event) {
	var rs rawCheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &rs); err != nil {
		slog.Error("stripe webhook: unmarshal session", "err", err)
		return
	}

	orderID := rs.Metadata["order_id"]
	if orderID == "" {
		slog.Warn("stripe webhook: no order_id in metadata")
		return
	}
	if _, err := primitive.ObjectIDFromHex(orderID); err != nil {
		slog.Error("stripe webhook: invalid order_id", "order_id", orderID)
		return
	}

	// Email: customer_details.email > customer_email > metadata.
	customerEmail := firstNonEmpty(rs.CustomerDetails.Email, rs.CustomerEmail, rs.Metadata["customer_email"])

	// Delivery address: new location first, then legacy.
	sd := rs.CollectedInformation.ShippingDetails
	if sd == nil {
		sd = rs.ShippingDetails
	}
	var shipping models.ShippingAddress
	if sd != nil {
		shipping = toAddr(sd.Name, sd.Address)
	}
	// Billing address + phone come from customer_details.
	billing := toAddr(rs.CustomerDetails.Name, rs.CustomerDetails.Address)
	billing.Phone = rs.CustomerDetails.Phone

	// Reconcile verified data onto the order (only non-empty fields overwrite).
	if err := h.orders.SaveStripeDetails(ctx, orderID, repository.StripeDetails{
		CustomerEmail:    customerEmail,
		CustomerName:     rs.CustomerDetails.Name,
		CustomerPhone:    rs.CustomerDetails.Phone,
		StripeCustomerID: rs.Customer,
		Shipping:         shipping,
		Billing:          billing,
	}); err != nil {
		slog.Error("stripe webhook: SaveStripeDetails", "order_id", orderID, "err", err)
	}

	// Only finalise (pay + emails) once payment is actually captured. Async
	// payment methods land here as "unpaid" and finalise later via
	// checkout.session.async_payment_succeeded.
	if !strings.EqualFold(rs.PaymentStatus, "paid") {
		slog.Info("stripe webhook: session completed but not yet paid — awaiting async", "order_id", orderID, "payment_status", rs.PaymentStatus)
		return
	}
	h.finalizePaid(ctx, orderID, rs.ID, rs.PaymentIntent)
}

// finalizePaid marks the order paid, decrements stock once, and fires the
// notification emails — all idempotent against duplicate webhook deliveries.
func (h *StripeWebhookHandler) finalizePaid(ctx context.Context, orderID, sessionID, paymentIntentID string) {
	if err := h.orders.MarkPaid(ctx, orderID, sessionID, paymentIntentID); err != nil {
		slog.Error("stripe webhook: MarkPaid", "order_id", orderID, "err", err)
	}

	order, err := h.orders.FindByID(ctx, orderID)
	if err != nil {
		slog.Error("stripe webhook: FindByID", "order_id", orderID, "err", err)
		return
	}

	// Decrement stock exactly once, even across webhook retries.
	if adjust, err := h.orders.TryMarkStockAdjusted(ctx, orderID); err != nil {
		slog.Error("stripe webhook: TryMarkStockAdjusted", "order_id", orderID, "err", err)
	} else if adjust {
		for _, item := range order.Items {
			if err := h.products.DecrementStock(ctx, item.ProductID.Hex(), item.Qty); err != nil {
				slog.Error("stripe webhook: DecrementStock", "product_id", item.ProductID.Hex(), "err", err)
			}
		}
	}

	h.sendOrderEmails(ctx, order)
}

// sendOrderEmails fans out to customer + admin + (branch manager) + BA, each
// guarded by its own idempotency flag so retries never double-send.
func (h *StripeWebhookHandler) sendOrderEmails(ctx context.Context, order *models.Order) {
	orderID := order.ID.Hex()

	// 1) Customer confirmation — no Stripe identifiers in the customer email.
	if order.CustomerEmail != "" {
		if send, _ := h.orders.TryMarkConfirmationEmailSent(ctx, orderID); send {
			if err := h.mailer.Send([]string{order.CustomerEmail},
				"Blue Nest Montessori — Order Confirmation", buildCustomerOrderEmail(order)); err != nil {
				slog.Error("stripe webhook: send customer email", "order_id", orderID, "err", err)
			}
		}
	}

	// 2) Internal admin — full detail (incl. Stripe IDs), reply-to = customer.
	if recips := email.Recipients(h.orderAdminTo); len(recips) > 0 {
		if send, _ := h.orders.TryMarkAdminEmailSent(ctx, orderID); send {
			if err := h.mailer.SendWithReplyTo(recips, order.CustomerEmail,
				"New Paid Store Order — Blue Nest Montessori", buildInternalOrderEmail(order, "New Paid Store Order")); err != nil {
				slog.Error("stripe webhook: send admin email", "order_id", orderID, "err", err)
			}
		}
	}

	// 3) Branch manager — only when a real nursery branch is attached.
	if order.BranchIsApplicable() {
		if to := h.branchManagerEmail(ctx, order.BranchSlug); to != "" {
			if send, _ := h.orders.TryMarkBranchEmailSent(ctx, orderID); send {
				if err := h.mailer.SendWithReplyTo([]string{to}, order.CustomerEmail,
					"New Store Order for "+order.BranchName+" — Blue Nest Montessori",
					buildInternalOrderEmail(order, "New Store Order — "+order.BranchName)); err != nil {
					slog.Error("stripe webhook: send branch email", "order_id", orderID, "err", err)
				}
			}
		}
	}

	// 4) BA recipient(s).
	if recips := email.Recipients(h.orderBATo); len(recips) > 0 {
		if send, _ := h.orders.TryMarkBAEmailSent(ctx, orderID); send {
			if err := h.mailer.SendWithReplyTo(recips, order.CustomerEmail,
				"New Paid Store Order — Blue Nest Montessori", buildInternalOrderEmail(order, "New Paid Store Order")); err != nil {
				slog.Error("stripe webhook: send BA email", "order_id", orderID, "err", err)
			}
		}
	}
}

// branchManagerEmail resolves a branch's manager email from the branch record's
// contact (no hard-coded staff addresses).
func (h *StripeWebhookHandler) branchManagerEmail(ctx context.Context, slug string) string {
	if h.branches == nil {
		return ""
	}
	branch, err := h.branches.FindBySlug(ctx, slug)
	if err != nil || branch == nil {
		slog.Warn("stripe webhook: branch lookup failed", "slug", slug)
		return ""
	}
	return strings.TrimSpace(branch.Contact.Email)
}

func (h *StripeWebhookHandler) handleSessionFailed(ctx context.Context, event stripe.Event) {
	var rs rawCheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &rs); err != nil {
		return
	}
	h.failOrder(ctx, rs.Metadata["order_id"])
}

func (h *StripeWebhookHandler) handlePaymentIntentFailed(ctx context.Context, event stripe.Event) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		return
	}
	h.failOrder(ctx, pi.Metadata["order_id"])
}

// failOrder flags a failed payment and restocks — but never demotes an order
// that has already been paid (guards against out-of-order failed events).
func (h *StripeWebhookHandler) failOrder(ctx context.Context, orderID string) {
	if orderID == "" {
		return
	}
	if _, err := primitive.ObjectIDFromHex(orderID); err != nil {
		return
	}
	order, err := h.orders.FindByID(ctx, orderID)
	if err != nil {
		return
	}
	if order.PaymentStatus == models.PaymentPaid || order.Status == models.OrderPaid {
		slog.Warn("stripe webhook: ignoring failed event for already-paid order", "order_id", orderID)
		return
	}
	if err := h.orders.MarkPaymentFailed(ctx, orderID); err != nil {
		slog.Error("stripe webhook: MarkPaymentFailed", "order_id", orderID, "err", err)
		return
	}
	slog.Info("stripe webhook: order marked payment-failed", "order_id", orderID)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// ── Finance module events (idempotent via MarkEventProcessed) ────────────────
// NOTE: like every public route this runs under the DEFAULT tenant — family
// billing webhooks currently resolve for the default org (multi-org follows
// the kiosk cross-org pattern later).

func (h *StripeWebhookHandler) handleFinanceSetup(ctx context.Context, event stripe.Event) {
	if h.finance == nil || !h.finance.MarkEventProcessed(ctx, event.ID) {
		return
	}
	var si struct {
		Customer      string `json:"customer"`
		PaymentMethod string `json:"payment_method"`
		Mandate       string `json:"mandate"`
	}
	if err := json.Unmarshal(event.Data.Raw, &si); err != nil || si.Customer == "" {
		return
	}
	if err := h.finance.OnSetupCompleted(ctx, si.Customer, si.PaymentMethod, si.Mandate); err != nil {
		slog.Error("stripe webhook: finance setup", "err", err)
	}
}

func (h *StripeWebhookHandler) handleFinanceIntent(ctx context.Context, event stripe.Event, status models.PaymentStatus) {
	if h.finance == nil || !h.finance.MarkEventProcessed(ctx, event.ID) {
		return
	}
	var pi struct {
		ID            string `json:"id"`
		LastPaymentError struct {
			Message string `json:"message"`
		} `json:"last_payment_error"`
	}
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil || pi.ID == "" {
		return
	}
	if err := h.finance.OnPaymentIntent(ctx, pi.ID, status, pi.LastPaymentError.Message); err != nil {
		slog.Error("stripe webhook: finance intent", "err", err)
	}
}

func (h *StripeWebhookHandler) handleFinanceRefund(ctx context.Context, event stripe.Event) {
	if h.finance == nil || !h.finance.MarkEventProcessed(ctx, event.ID) {
		return
	}
	var ch struct {
		PaymentIntent string `json:"payment_intent"`
	}
	if err := json.Unmarshal(event.Data.Raw, &ch); err != nil || ch.PaymentIntent == "" {
		return
	}
	if err := h.finance.OnPaymentIntent(ctx, ch.PaymentIntent, models.PaymentRefunded, "refunded"); err != nil {
		slog.Error("stripe webhook: finance refund", "err", err)
	}
}
