package webhooks

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/pkg/response"
	stripe "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/webhook"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StripeWebhookHandler struct {
	webhookSecret string
	orders        repository.OrderRepository
	products      repository.ProductRepository
	mailer        *email.Mailer
	adminTo       string
}

func NewStripeWebhookHandler(
	secret string,
	orders repository.OrderRepository,
	products repository.ProductRepository,
	mailer *email.Mailer,
	adminTo string,
) *StripeWebhookHandler {
	return &StripeWebhookHandler{
		webhookSecret: secret,
		orders:        orders,
		products:      products,
		mailer:        mailer,
		adminTo:       adminTo,
	}
}

func (h *StripeWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	const maxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		response.BadRequest(w, "failed to read body")
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	// IgnoreAPIVersionMismatch: Stripe account uses a newer API version than stripe-go v76.
	// HMAC signature is still fully verified; only the version compatibility check is skipped.
	event, err := webhook.ConstructEventWithOptions(body, sig, h.webhookSecret,
		webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true},
	)
	if err != nil {
		slog.Error("stripe webhook: signature verification failed",
			"err", err,
			"body_len", len(body),
			"sig_present", sig != "",
			"secret_len", len(h.webhookSecret),
		)
		response.BadRequest(w, "invalid stripe signature")
		return
	}

	slog.Info("stripe webhook received", "type", event.Type)

	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted:
		h.handleCheckoutCompleted(r, event)
	case stripe.EventTypePaymentIntentPaymentFailed:
		h.handlePaymentFailed(r, event)
	}

	response.OK(w, map[string]string{"received": "true"})
}

func (h *StripeWebhookHandler) handleCheckoutCompleted(r *http.Request, event stripe.Event) {
	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		slog.Error("stripe webhook: unmarshal session", "err", err)
		return
	}

	orderID := session.Metadata["order_id"]
	if orderID == "" {
		slog.Warn("stripe webhook: no order_id in metadata")
		return
	}
	if _, err := primitive.ObjectIDFromHex(orderID); err != nil {
		slog.Error("stripe webhook: invalid order_id", "order_id", orderID, "err", err)
		return
	}

	ctx := r.Context()

	// Extract Stripe IDs — PaymentIntent is a pointer on CheckoutSession.
	paymentIntentID := ""
	if session.PaymentIntent != nil {
		paymentIntentID = session.PaymentIntent.ID
	}

	// Mark the order paid (idempotent — repeated calls are safe).
	if err := h.orders.MarkPaid(ctx, orderID, session.ID, paymentIntentID); err != nil {
		slog.Error("stripe webhook: MarkPaid", "order_id", orderID, "err", err)
	} else {
		slog.Info("stripe webhook: order marked paid", "order_id", orderID, "stripe_session", session.ID)
	}

	// Parse email and shipping from raw bytes — SDK struct deserialization is unreliable
	// with Stripe API versions newer than stripe-go v76 targets (2023-10-16).
	// In API version 2026-04-22.dahlia, shipping moved from top-level `shipping_details`
	// into `collected_information.shipping_details`. We try both to stay forward-compatible.
	type shippingBlock struct {
		Name    string `json:"name"`
		Address struct {
			Line1      string `json:"line1"`
			Line2      string `json:"line2"`
			City       string `json:"city"`
			PostalCode string `json:"postal_code"`
			Country    string `json:"country"`
		} `json:"address"`
	}
	var rawSession struct {
		CustomerEmail   string `json:"customer_email"`
		CustomerDetails struct {
			Email string `json:"email"`
		} `json:"customer_details"`
		// New location (2026-04-22.dahlia+)
		CollectedInformation struct {
			ShippingDetails *shippingBlock `json:"shipping_details"`
		} `json:"collected_information"`
		// Legacy location (pre-2026)
		ShippingDetails *shippingBlock    `json:"shipping_details"`
		Metadata        map[string]string `json:"metadata"`
	}
	_ = json.Unmarshal(event.Data.Raw, &rawSession)

	// Three-level email fallback: customer_details.email > customer_email > metadata
	customerEmail := rawSession.CustomerDetails.Email
	if customerEmail == "" {
		customerEmail = rawSession.CustomerEmail
	}
	if customerEmail == "" {
		customerEmail = rawSession.Metadata["customer_email"]
	}

	// Extract shipping — prefer new location, fall back to legacy field
	sd := rawSession.CollectedInformation.ShippingDetails
	if sd == nil {
		sd = rawSession.ShippingDetails
	}
	var shippingAddr models.ShippingAddress
	if sd != nil {
		shippingAddr = models.ShippingAddress{
			Name:       sd.Name,
			Line1:      sd.Address.Line1,
			Line2:      sd.Address.Line2,
			City:       sd.Address.City,
			PostalCode: sd.Address.PostalCode,
			Country:    sd.Address.Country,
		}
	}

	slog.Info("stripe webhook: extracted fields",
		"order_id", orderID,
		"customer_email", customerEmail,
		"shipping_line1", shippingAddr.Line1,
	)

	if err := h.orders.UpdateShipping(ctx, orderID, shippingAddr, customerEmail); err != nil {
		slog.Error("stripe webhook: UpdateShipping", "order_id", orderID, "err", err)
	}

	order, err := h.orders.FindByID(ctx, orderID)
	if err != nil {
		slog.Error("stripe webhook: FindByID", "order_id", orderID, "err", err)
		return
	}

	// Decrement stock.
	for _, item := range order.Items {
		if err := h.products.DecrementStock(ctx, item.ProductID.Hex(), item.Qty); err != nil {
			slog.Error("stripe webhook: DecrementStock", "product_id", item.ProductID.Hex(), "err", err)
		}
	}

	// ── Customer confirmation email (idempotent) ──────────────────────────────
	if customerEmail != "" {
		shouldSend, err := h.orders.TryMarkConfirmationEmailSent(ctx, orderID)
		if err != nil {
			slog.Error("stripe webhook: TryMarkConfirmationEmailSent", "order_id", orderID, "err", err)
		}
		if shouldSend {
			if err := h.mailer.Send(
				[]string{customerEmail},
				"Blue Nest Montessori — Order Confirmation",
				buildOrderConfirmationEmail(orderID, customerEmail, shippingAddr, order.Items, order.TotalAmount),
			); err != nil {
				slog.Error("stripe webhook: send customer email", "to", customerEmail, "err", err)
			} else {
				slog.Info("stripe webhook: customer confirmation email sent", "to", customerEmail)
			}
		} else {
			slog.Info("stripe webhook: customer email already sent (skipping)", "order_id", orderID)
		}
	}

	// ── Admin notification email (idempotent) ─────────────────────────────────
	if h.adminTo != "" {
		shouldSend, err := h.orders.TryMarkAdminEmailSent(ctx, orderID)
		if err != nil {
			slog.Error("stripe webhook: TryMarkAdminEmailSent", "order_id", orderID, "err", err)
		}
		if shouldSend {
			if err := h.mailer.Send(
				[]string{h.adminTo},
				"New Paid Store Order — Blue Nest Montessori",
				buildAdminOrderEmail(orderID, session.ID, paymentIntentID, customerEmail, shippingAddr, order.Items, order.TotalAmount),
			); err != nil {
				slog.Error("stripe webhook: send admin email", "to", h.adminTo, "err", err)
			} else {
				slog.Info("stripe webhook: admin notification email sent", "to", h.adminTo)
			}
		} else {
			slog.Info("stripe webhook: admin email already sent (skipping)", "order_id", orderID)
		}
	}
}

func (h *StripeWebhookHandler) handlePaymentFailed(r *http.Request, event stripe.Event) {
	var pi stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
		slog.Error("stripe webhook: unmarshal payment intent", "err", err)
		return
	}
	orderID := pi.Metadata["order_id"]
	if orderID == "" {
		return
	}
	if _, err := primitive.ObjectIDFromHex(orderID); err != nil {
		return
	}
	ctx := r.Context()
	if err := h.orders.UpdateStatus(ctx, orderID, string(models.OrderCancelled)); err != nil {
		slog.Error("stripe webhook: UpdateStatus cancelled", "order_id", orderID, "err", err)
	} else {
		slog.Info("stripe webhook: order cancelled (payment failed)", "order_id", orderID)
	}
	order, err := h.orders.FindByID(ctx, orderID)
	if err != nil {
		return
	}
	for _, item := range order.Items {
		if err := h.products.IncrementStock(ctx, item.ProductID.Hex(), item.Qty); err != nil {
			slog.Error("stripe webhook: IncrementStock", "product_id", item.ProductID.Hex(), "err", err)
		}
	}
}

// ── Email helpers ─────────────────────────────────────────────────────────────

func fmtAddressLines(addr models.ShippingAddress) string {
	lines := []string{}
	if addr.Name != "" {
		lines = append(lines, addr.Name)
	}
	if addr.Line1 != "" {
		lines = append(lines, addr.Line1)
	}
	if addr.Line2 != "" {
		lines = append(lines, addr.Line2)
	}
	if addr.City != "" {
		lines = append(lines, addr.City)
	}
	if addr.PostalCode != "" {
		lines = append(lines, addr.PostalCode)
	}
	if addr.Country != "" {
		lines = append(lines, addr.Country)
	}
	out := ""
	for _, l := range lines {
		out += l + "<br>"
	}
	return out
}

func buildOrderConfirmationEmail(orderID, customerEmail string, addr models.ShippingAddress, items []models.OrderItem, totalPence int64) string {
	rows := ""
	for _, item := range items {
		name := item.Name
		if item.Size != "" {
			name += " (" + item.Size + ")"
		}
		rows += fmt.Sprintf(
			`<tr>`+
				`<td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;">%s</td>`+
				`<td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e8e8e8;">%d</td>`+
				`<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e8e8;">£%.2f</td>`+
				`<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e8e8;font-weight:600;">£%.2f</td>`+
				`</tr>`,
			name, item.Qty, float64(item.Price)/100, float64(item.Price)*float64(item.Qty)/100,
		)
	}

	addrBlock := ""
	if addr.Line1 != "" {
		addrBlock = fmt.Sprintf(`
	<div style="margin-top:24px;padding:16px 20px;background:#f7faf7;border-radius:10px;border:1px solid #d4e8d4;">
	  <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#5a7a58;">Delivery Address</p>
	  <address style="font-style:normal;font-size:14px;color:#2a3c29;line-height:1.8;">%s</address>
	</div>`, fmtAddressLines(addr))
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5faf5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(58,173,169,0.10);">
    <div style="background:#3aada9;padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">Order Confirmed!</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Thank you for shopping with Blue Nest Montessori</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 4px;font-size:13px;color:#888;">Order Reference</p>
      <p style="margin:0 0 24px;font-size:15px;font-weight:700;color:#2a3c29;font-family:monospace;">%s</p>

      <table style="width:100%%;border-collapse:collapse;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f5faf5;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Unit</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Total</th>
          </tr>
        </thead>
        <tbody>%s</tbody>
        <tfoot>
          <tr style="background:#f5faf5;">
            <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#2a3c29;">Order Total</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#3aada9;font-size:16px;">£%.2f</td>
          </tr>
        </tfoot>
      </table>

      %s

      <p style="margin:24px 0 0;font-size:14px;color:#5a7a58;line-height:1.7;">
        Your order is being prepared and we'll be in touch with a dispatch update soon.
      </p>
      <p style="margin:12px 0 0;font-size:13px;color:#888;">
        Questions? Reply to this email or contact us at
        <a href="mailto:manager@bluenest.uk" style="color:#3aada9;text-decoration:none;">manager@bluenest.uk</a>.
      </p>
    </div>
    <div style="background:#f5faf5;padding:16px 32px;text-align:center;font-size:12px;color:#aaa;">
      Blue Nest Montessori School &mdash; Harrow &bull; Pinner &bull; Borehamwood
    </div>
  </div>
</body>
</html>`, orderID, rows, float64(totalPence)/100, addrBlock)
}

func buildAdminOrderEmail(orderID, stripeSessionID, paymentIntentID, customerEmail string, addr models.ShippingAddress, items []models.OrderItem, totalPence int64) string {
	rows := ""
	for _, item := range items {
		name := item.Name
		if item.Size != "" {
			name += " (" + item.Size + ")"
		}
		rows += fmt.Sprintf(
			`<tr>`+
				`<td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;">%s</td>`+
				`<td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e8e8e8;">%d</td>`+
				`<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e8e8;">£%.2f</td>`+
				`<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e8e8;font-weight:600;">£%.2f</td>`+
				`</tr>`,
			name, item.Qty, float64(item.Price)/100, float64(item.Price)*float64(item.Qty)/100,
		)
	}

	addrBlock := ""
	if addr.Line1 != "" {
		addrBlock = fmt.Sprintf(`
    <div style="margin-bottom:20px;padding:14px 18px;background:#f7faf7;border-radius:8px;border:1px solid #d4e8d4;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#5a7a58;">Delivery Address</p>
      <address style="font-style:normal;font-size:13px;color:#2a3c29;line-height:1.7;">%s</address>
    </div>`, fmtAddressLines(addr))
	}

	metaRow := func(label, value string) string {
		if value == "" {
			return ""
		}
		return fmt.Sprintf(
			`<tr><td style="padding:6px 12px;font-weight:600;color:#555;background:#f9f9f9;width:180px;border-bottom:1px solid #eee;">%s</td>`+
				`<td style="padding:6px 12px;color:#222;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">%s</td></tr>`,
			label, value,
		)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <div style="background:#2a3c29;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;color:#ffffff;">New Paid Store Order</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Blue Nest Montessori — action required</p>
    </div>
    <div style="padding:24px 32px;">

      <table style="width:100%%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        %s%s%s%s%s
      </table>

      %s

      <table style="width:100%%;border-collapse:collapse;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Unit</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;">Line Total</th>
          </tr>
        </thead>
        <tbody>%s</tbody>
        <tfoot>
          <tr style="background:#f5f5f5;">
            <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#333;">Total Paid</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#2a3c29;font-size:16px;">£%.2f</td>
          </tr>
        </tfoot>
      </table>

    </div>
    <div style="background:#f9f9f9;padding:14px 32px;text-align:center;font-size:12px;color:#aaa;">
      Blue Nest Montessori admin notification — do not reply
    </div>
  </div>
</body>
</html>`,
		metaRow("Order Reference", orderID),
		metaRow("Customer Email", customerEmail),
		metaRow("Payment Status", "PAID"),
		metaRow("Stripe Session ID", stripeSessionID),
		metaRow("Payment Intent ID", paymentIntentID),
		addrBlock,
		rows,
		float64(totalPence)/100,
	)
}
