// Package sourcing finds purchasable supplier offers for a requested item by
// searching suppliers in the background. It is the engine behind "best & cheapest"
// cart generation: each adapter knows how to query one supplier and return offers
// (code + price), and the engine fans out across the enabled adapters.
//
// Design notes:
//   - Adapters are best-effort: a failing/blocked supplier returns no offers
//     rather than an error that aborts the whole search.
//   - The catalogue (cache) is the primary, deterministic source of offers; live
//     adapters enrich it. This keeps cart generation working (and testable)
//     even when a supplier site is unreachable or its HTML changes.
package sourcing

import (
	"context"
	"log/slog"
)

// Offer is one supplier's purchasable offer for a search term.
type Offer struct {
	Supplier     string
	Code         string // Gompels SKU or Amazon ASIN
	Name         string
	PackSize     string
	Price        int64 // pence (pack price)
	PricePerUnit int64 // pence per single unit (best-effort; falls back to Price)
	SourceURL    string
}

// SupplierSearch is implemented by each supplier adapter.
type SupplierSearch interface {
	Supplier() string
	Search(ctx context.Context, term string) ([]Offer, error)
}

// Engine fans a search term out across the enabled adapters.
type Engine struct {
	adapters []SupplierSearch
}

func NewEngine(adapters ...SupplierSearch) *Engine {
	return &Engine{adapters: adapters}
}

// Search queries every adapter and returns all offers found. Adapter errors are
// logged and skipped — sourcing is best-effort by design.
func (e *Engine) Search(ctx context.Context, term string) []Offer {
	var all []Offer
	for _, a := range e.adapters {
		offers, err := a.Search(ctx, term)
		if err != nil {
			slog.Warn("supplier search failed", "supplier", a.Supplier(), "term", term, "error", err)
			continue
		}
		all = append(all, offers...)
	}
	return all
}

// Enabled reports whether any live adapters are configured.
func (e *Engine) Enabled() bool { return len(e.adapters) > 0 }
