package models

import "fmt"

// Counter names for the human-readable reference sequences. Year-scoped so the
// running number resets each year (SR-2026-000001, SR-2027-000001, …).
const (
	CounterOrderRequest = "order_request"
	CounterPurchaseCart = "purchase_cart"
)

// FormatRef builds a zero-padded reference, e.g. FormatRef("SR", 2026, 45) →
// "SR-2026-000045".
func FormatRef(prefix string, year int, seq int64) string {
	return fmt.Sprintf("%s-%d-%06d", prefix, year, seq)
}
