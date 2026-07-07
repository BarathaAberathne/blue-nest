package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// ProcurementAnalytics is the server-side aggregation powering the procurement
// dashboard (Phase 3). Computing it on the backend keeps the heavy roll-ups off
// the client and lets future modules (finance, reporting) reuse the figures.
type ProcurementAnalytics struct {
	TotalRequests int `json:"total_requests"`
	TotalOrders   int `json:"total_orders"`
	// Spend is in pence, summed across placed (non-draft/cancelled) orders.
	TotalSpend          int64           `json:"total_spend"`
	PendingRequests     int             `json:"pending_requests"`
	OverdueOrders       int             `json:"overdue_orders"`
	RequestStatusCounts map[string]int  `json:"request_status_counts"`
	OrderStatusCounts   map[string]int  `json:"order_status_counts"`
	SpendBySupplier     []SupplierSpend `json:"spend_by_supplier"`
	SpendByBranch       []BranchSpend   `json:"spend_by_branch"`
	MonthlySpend        []MonthlySpend  `json:"monthly_spend"`
	TopItems            []ItemDemand    `json:"top_items"`
	AvgRequestToOrder   float64         `json:"avg_request_to_order_days"`
	AvgOrderToDelivery  float64         `json:"avg_order_to_delivery_days"`
}

type SupplierSpend struct {
	Supplier string `json:"supplier"`
	Spend    int64  `json:"spend"`
	Orders   int    `json:"orders"`
}

type BranchSpend struct {
	Branch string `json:"branch"`
	Spend  int64  `json:"spend"`
}

type MonthlySpend struct {
	Month string `json:"month"` // YYYY-MM
	Spend int64  `json:"spend"`
}

type ItemDemand struct {
	Name     string `json:"name"`
	Qty      int    `json:"qty"`
	Requests int    `json:"requests"`
}

type ProcurementAnalyticsService interface {
	Compute(ctx context.Context) (*ProcurementAnalytics, error)
}

type procurementAnalyticsService struct {
	requests repository.OrderRequestRepository
	carts    repository.PurchaseCartRepository
}

func NewProcurementAnalyticsService(requests repository.OrderRequestRepository, carts repository.PurchaseCartRepository) ProcurementAnalyticsService {
	return &procurementAnalyticsService{requests: requests, carts: carts}
}

// placedOrder reports whether a cart represents a real (placed) order that counts
// toward spend — anything past draft that wasn't cancelled/failed.
func placedOrder(status models.PurchaseCartStatus) bool {
	switch status {
	case models.PurchaseCartDraft, models.PurchaseCartCancelled, models.PurchaseCartFailed:
		return false
	}
	return true
}

func (s *procurementAnalyticsService) Compute(ctx context.Context) (*ProcurementAnalytics, error) {
	requests, err := s.requests.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	carts, err := s.carts.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	out := &ProcurementAnalytics{
		TotalRequests:       len(requests),
		TotalOrders:         len(carts),
		RequestStatusCounts: map[string]int{},
		OrderStatusCounts:   map[string]int{},
		SpendBySupplier:     []SupplierSpend{},
		SpendByBranch:       []BranchSpend{},
		MonthlySpend:        []MonthlySpend{},
		TopItems:            []ItemDemand{},
	}

	// ── Requests: status counts, item demand, pending tally ──────────────
	itemDemand := map[string]*ItemDemand{}
	for _, r := range requests {
		out.RequestStatusCounts[string(r.Status)]++
		if r.Status == models.OrderRequestPending {
			out.PendingRequests++
		}
		for _, it := range r.Items {
			key := strings.ToLower(strings.TrimSpace(it.ItemName))
			if key == "" {
				continue
			}
			d := itemDemand[key]
			if d == nil {
				d = &ItemDemand{Name: it.ItemName}
				itemDemand[key] = d
			}
			d.Qty += it.Qty
			d.Requests++
		}
	}
	for _, d := range itemDemand {
		out.TopItems = append(out.TopItems, *d)
	}
	sort.Slice(out.TopItems, func(i, j int) bool {
		if out.TopItems[i].Qty != out.TopItems[j].Qty {
			return out.TopItems[i].Qty > out.TopItems[j].Qty
		}
		return out.TopItems[i].Name < out.TopItems[j].Name
	})
	if len(out.TopItems) > 15 {
		out.TopItems = out.TopItems[:15]
	}

	// ── Orders: spend roll-ups + delivery timing ─────────────────────────
	supplierSpend := map[string]*SupplierSpend{}
	branchSpend := map[string]int64{}
	monthSpend := map[string]int64{}
	now := time.Now()
	var reqToOrderTotal, ordToDeliverTotal float64
	var reqToOrderN, ordToDeliverN int

	for _, c := range carts {
		out.OrderStatusCounts[string(c.Status)]++
		if !placedOrder(c.Status) {
			continue
		}
		// Prefer the actual amount paid (entered post-placement); fall back to the
		// catalogue-estimate subtotal.
		spend := c.Subtotal
		if c.OrderTotal > 0 {
			spend = c.OrderTotal
		}
		out.TotalSpend += spend

		sup := c.Supplier
		if sup == "" {
			sup = "Other"
		}
		ss := supplierSpend[sup]
		if ss == nil {
			ss = &SupplierSpend{Supplier: sup}
			supplierSpend[sup] = ss
		}
		ss.Spend += spend
		ss.Orders++

		if c.BranchSlug != "" {
			branchSpend[c.BranchSlug] += spend
		}
		month := c.CreatedAt.Format("2006-01")
		monthSpend[month] += spend

		// Overdue: placed, not yet fully received, expected date in the past.
		if c.ExpectedDeliveryDate != nil && c.Status != models.PurchaseCartReceived && c.Status != models.PurchaseCartCompleted {
			if c.ExpectedDeliveryDate.Before(now) {
				out.OverdueOrders++
			}
		}
		// Order → delivery timing.
		if c.SentAt != nil && c.DeliveredAt != nil {
			ordToDeliverTotal += c.DeliveredAt.Sub(*c.SentAt).Hours() / 24
			ordToDeliverN++
		}
	}

	for _, ss := range supplierSpend {
		out.SpendBySupplier = append(out.SpendBySupplier, *ss)
	}
	sort.Slice(out.SpendBySupplier, func(i, j int) bool {
		return out.SpendBySupplier[i].Spend > out.SpendBySupplier[j].Spend
	})
	for b, v := range branchSpend {
		out.SpendByBranch = append(out.SpendByBranch, BranchSpend{Branch: b, Spend: v})
	}
	sort.Slice(out.SpendByBranch, func(i, j int) bool {
		return out.SpendByBranch[i].Spend > out.SpendByBranch[j].Spend
	})
	for m, v := range monthSpend {
		out.MonthlySpend = append(out.MonthlySpend, MonthlySpend{Month: m, Spend: v})
	}
	sort.Slice(out.MonthlySpend, func(i, j int) bool {
		return out.MonthlySpend[i].Month < out.MonthlySpend[j].Month
	})

	// ── Request → order lead time: match covered requests to their cart ──
	reqByID := map[string]models.OrderRequest{}
	for _, r := range requests {
		reqByID[r.ID.Hex()] = r
	}
	for _, c := range carts {
		if !placedOrder(c.Status) || c.SentAt == nil {
			continue
		}
		for _, rid := range c.SourceRequestIDs {
			if r, ok := reqByID[rid]; ok {
				reqToOrderTotal += c.SentAt.Sub(r.CreatedAt).Hours() / 24
				reqToOrderN++
			}
		}
	}

	if reqToOrderN > 0 {
		out.AvgRequestToOrder = round1(reqToOrderTotal / float64(reqToOrderN))
	}
	if ordToDeliverN > 0 {
		out.AvgOrderToDelivery = round1(ordToDeliverTotal / float64(ordToDeliverN))
	}
	return out, nil
}
