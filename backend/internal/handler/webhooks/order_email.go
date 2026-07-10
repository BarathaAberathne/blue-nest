package webhooks

import (
	"fmt"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
)

func money(pence int64) string { return fmt.Sprintf("£%.2f", float64(pence)/100) }

func orderRef(o *models.Order) string {
	if o.Ref != "" {
		return o.Ref
	}
	return o.ID.Hex()
}

// addressHTML renders an address block, or "" when there's nothing to show.
func addressHTML(a models.ShippingAddress) string {
	parts := []string{}
	for _, l := range []string{a.Name, a.Line1, a.Line2, a.City, a.County, a.PostalCode, a.Country} {
		if strings.TrimSpace(l) != "" {
			parts = append(parts, l)
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "<br>")
}

func itemRowsHTML(items []models.OrderItem) string {
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
				`<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e8e8;">%s</td>`+
				`<td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e8e8e8;font-weight:600;">%s</td>`+
				`</tr>`,
			name, item.Qty, money(item.Price), money(item.Price*int64(item.Qty)),
		)
	}
	return rows
}

func itemsTableHTML(items []models.OrderItem, total int64) string {
	return fmt.Sprintf(`<table style="width:100%%;border-collapse:collapse;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
    <thead><tr style="background:#f5faf5;">
      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;">Item</th>
      <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;text-transform:uppercase;">Qty</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;">Unit</th>
      <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;">Total</th>
    </tr></thead>
    <tbody>%s</tbody>
    <tfoot><tr style="background:#f5faf5;">
      <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:#2a3c29;">Order Total</td>
      <td style="padding:12px;text-align:right;font-weight:700;color:#3aada9;font-size:16px;">%s</td>
    </tr></tfoot>
  </table>`, itemRowsHTML(items), money(total))
}

func infoCard(title, bodyHTML string) string {
	if strings.TrimSpace(bodyHTML) == "" {
		return ""
	}
	return fmt.Sprintf(`<div style="margin-top:20px;padding:14px 18px;background:#f7faf7;border-radius:10px;border:1px solid #d4e8d4;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#5a7a58;">%s</p>
    <div style="font-size:13px;color:#2a3c29;line-height:1.7;">%s</div>
  </div>`, title, bodyHTML)
}

func shell(headerBg, heading, sub, inner string) string {
	return fmt.Sprintf(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5faf5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(58,173,169,0.10);">
    <div style="background:#fff;padding:20px 32px;border-bottom:1px solid #e8f5f4;text-align:center;">
      <img src="%s" alt="Blue Nest Montessori School" width="240" style="display:block;height:auto;max-width:240px;margin:0 auto;border:0;" />
    </div>
    <div style="background:%s;padding:26px 32px;">
      <h1 style="margin:0;font-size:21px;color:#fff;font-weight:700;">%s</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">%s</p>
    </div>
    <div style="padding:26px 32px;">%s</div>
    <div style="background:#f5faf5;padding:16px 32px;text-align:center;font-size:12px;color:#aaa;">
      Blue Nest Montessori School &mdash; Harrow &bull; Pinner &bull; Borehamwood
    </div>
  </div>
</body></html>`, email.LogoURL, headerBg, heading, sub, inner)
}

// buildCustomerOrderEmail — customer-facing; contains NO Stripe identifiers.
func buildCustomerOrderEmail(o *models.Order) string {
	branchLine := ""
	if o.BranchIsApplicable() {
		branchLine = fmt.Sprintf(`<p style="margin:0 0 4px;font-size:13px;color:#888;">Nursery</p>
      <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#2a3c29;">%s</p>`, o.BranchName)
	}
	inner := fmt.Sprintf(`
      <p style="margin:0 0 4px;font-size:13px;color:#888;">Order Reference</p>
      <p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#2a3c29;font-family:monospace;">%s</p>
      %s
      %s
      %s
      <p style="margin:22px 0 0;font-size:14px;color:#5a7a58;line-height:1.7;">Your order is being prepared and we'll be in touch with a dispatch update soon.</p>
      <p style="margin:12px 0 0;font-size:13px;color:#888;">Questions? Reply to this email or contact us at
        <a href="mailto:manager@bluenest.uk" style="color:#3aada9;text-decoration:none;">manager@bluenest.uk</a>.</p>`,
		orderRef(o), branchLine, itemsTableHTML(o.Items, o.TotalAmount),
		infoCard("Delivery Address", addressHTML(o.ShippingAddress)),
	)
	return shell("#3aada9", "Order Confirmed!", "Thank you for shopping with Blue Nest Montessori", inner)
}

// buildInternalOrderEmail — full internal detail incl. Stripe identifiers.
func buildInternalOrderEmail(o *models.Order, heading string) string {
	row := func(label, value string) string {
		if strings.TrimSpace(value) == "" {
			value = "Not recorded"
		}
		return fmt.Sprintf(
			`<tr><td style="padding:6px 12px;font-weight:600;color:#555;background:#f9f9f9;width:170px;border-bottom:1px solid #eee;">%s</td>`+
				`<td style="padding:6px 12px;color:#222;border-bottom:1px solid #eee;">%s</td></tr>`, label, value)
	}
	branch := o.BranchName
	if !o.BranchIsApplicable() {
		branch = "Not applicable"
	}
	details := row("Order Reference", orderRef(o)) +
		row("Customer", o.CustomerName) +
		row("Email", o.CustomerEmail) +
		row("Telephone", o.CustomerPhone) +
		row("Nursery", branch) +
		row("Child / Reference", o.ChildRef) +
		row("Payment Status", strings.ToUpper(string(o.PaymentStatus))) +
		row("Stripe Session", o.StripeSessionID) +
		row("Payment Intent", o.PaymentIntentID)

	inner := fmt.Sprintf(`
      <table style="width:100%%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden;margin-bottom:20px;">%s</table>
      %s
      %s
      %s`,
		details,
		infoCard("Delivery Address", addressHTML(o.ShippingAddress)),
		infoCard("Billing Address", addressHTML(o.BillingAddress)),
		itemsTableHTML(o.Items, o.TotalAmount),
	)
	return shell("#2a3c29", heading, "Blue Nest Montessori — internal notification", inner)
}
