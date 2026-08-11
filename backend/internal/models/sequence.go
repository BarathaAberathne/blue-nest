package models

import "fmt"

// Counter names for the human-readable reference sequences. Year-scoped so the
// running number resets each year (SR-2026-000001, SR-2027-000001, …).
const (
	CounterOrderRequest = "order_request"
	CounterPurchaseCart = "purchase_cart"
	CounterOrder        = "order"
	CounterChild        = "child"
	CounterStaff        = "staff"
	CounterDailyRecord  = "daily_record"
	CounterBranch       = "branch"
	CounterParent       = "parent"
	CounterFamily       = "family"
)

// Ref prefixes for each entity (human-readable ID = PREFIX-YEAR-NNNNNN).
const (
	RefPrefixOrderRequest = "SR"  // supply request
	RefPrefixPurchaseCart = "PO"  // purchase order
	RefPrefixOrder        = "ORD" // customer store order
	RefPrefixChild        = "CHD" // enrolled child
	RefPrefixStaff        = "STF" // staff member
	RefPrefixDailyRecord  = "LOG" // daily record (observation/incident/etc.)
	RefPrefixBranch       = "BR"  // branch / nursery location
	RefPrefixParent       = "PAR" // parent / guardian
	RefPrefixFamily       = "FAM" // family / billing account
)

// FormatRef builds a zero-padded reference, e.g. FormatRef("SR", 2026, 45) →
// "SR-2026-000045".
func FormatRef(prefix string, year int, seq int64) string {
	return fmt.Sprintf("%s-%d-%06d", prefix, year, seq)
}
