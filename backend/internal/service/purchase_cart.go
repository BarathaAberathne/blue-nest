package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/platform/sourcing"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type PurchaseCartService interface {
	Generate(ctx context.Context, requestIDs []string, generatedBy string) ([]models.PurchaseCart, error)
	List(ctx context.Context) ([]models.PurchaseCart, error)
	GetByID(ctx context.Context, id string) (*models.PurchaseCart, error)
	Update(ctx context.Context, id string, req models.UpdateCartRequest) (*models.PurchaseCart, error)
	// Send emails the cart to the supplier, marks it ordered, and flips the covered
	// requests to "ordered". recipientOverride wins over the stored recipient.
	Send(ctx context.Context, id, recipientOverride string) (*models.PurchaseCart, error)
	// MarkExported records the browser extension's per-line fill results, marks the
	// cart ordered, and flips the covered requests to "ordered" (no email).
	MarkExported(ctx context.Context, id string, results []models.PurchaseCartExportResult, supplierOrderRef string) (*models.PurchaseCart, error)
	// UpdateFulfillment records the supplier order ref + expected delivery date on a
	// placed order, and propagates the expected date to the covered requests.
	UpdateFulfillment(ctx context.Context, id string, req models.UpdateFulfillmentRequest) (*models.PurchaseCart, error)
	// Receive records per-line goods-received quantities, sets the cart to
	// partially_received / received, and (when fully received) flips the covered
	// requests to "received" with a delivered timestamp.
	Receive(ctx context.Context, id string, items []models.ReceiveItem) (*models.PurchaseCart, error)
	// SetStatus applies a manual workflow transition (placed → tracking →
	// dispatched → completed / cancelled).
	SetStatus(ctx context.Context, id, status string) (*models.PurchaseCart, error)
}

type purchaseCartService struct {
	carts          repository.PurchaseCartRepository
	requests       repository.OrderRequestRepository
	catalogue      repository.CatalogueItemRepository
	engine         *sourcing.Engine
	mailer         *email.Mailer
	supplierEmails map[string]string // supplier -> default recipient
	counter        repository.CounterRepository
}

func NewPurchaseCartService(
	carts repository.PurchaseCartRepository,
	requests repository.OrderRequestRepository,
	catalogue repository.CatalogueItemRepository,
	engine *sourcing.Engine,
	mailer *email.Mailer,
	supplierEmails map[string]string,
	counter repository.CounterRepository,
) PurchaseCartService {
	return &purchaseCartService{
		carts:          carts,
		requests:       requests,
		catalogue:      catalogue,
		engine:         engine,
		mailer:         mailer,
		supplierEmails: supplierEmails,
		counter:        counter,
	}
}

// nextRef mints the next PO reference (best-effort).
func (s *purchaseCartService) nextRef(ctx context.Context) string {
	if s.counter == nil {
		return ""
	}
	year := time.Now().Year()
	seq, err := s.counter.Next(ctx, fmt.Sprintf("%s-%d", models.CounterPurchaseCart, year))
	if err != nil {
		return ""
	}
	return models.FormatRef("PO", year, seq)
}

// enrichFromRequests copies branch/classroom from the first source request and
// the highest priority across all source requests onto the generated cart.
func (s *purchaseCartService) enrichFromRequests(ctx context.Context, cart *models.PurchaseCart) {
	rank := map[string]int{models.PriorityLow: 1, models.PriorityNormal: 2, models.PriorityHigh: 3, models.PriorityUrgent: 4}
	bestPrio := ""
	for _, rid := range cart.SourceRequestIDs {
		req, err := s.requests.FindByID(ctx, rid)
		if err != nil || req == nil {
			continue
		}
		if cart.BranchSlug == "" {
			cart.BranchSlug = req.BranchSlug
			cart.Classroom = req.Classroom
		}
		if rank[req.Priority] > rank[bestPrio] {
			bestPrio = req.Priority
		}
	}
	if bestPrio != "" {
		cart.Priority = bestPrio
	}
}

// chosen is an item sourced to a single supplier offer before aggregation.
type chosen struct {
	supplier        string
	code            string
	name            string
	packSize        string
	catalogueItemID string
	unitPrice       int64
	qty             int
	matched         bool
	sourceRequestID string
}

func (s *purchaseCartService) Generate(ctx context.Context, requestIDs []string, generatedBy string) ([]models.PurchaseCart, error) {
	if len(requestIDs) == 0 {
		return nil, errors.New("select at least one request")
	}

	// Load the catalogue once and index it for fast lookups.
	catItems, err := s.catalogue.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	byID := make(map[string]models.CatalogueItem, len(catItems))
	byName := make(map[string]models.CatalogueItem, len(catItems))
	for _, it := range catItems {
		byID[it.ID.Hex()] = it
		byName[strings.ToLower(strings.TrimSpace(it.Name))] = it
	}

	var sourced []chosen
	for _, rid := range requestIDs {
		req, err := s.requests.FindByID(ctx, rid)
		if err != nil {
			continue // skip bad ids rather than aborting the whole batch
		}
		for _, line := range req.Items {
			sourced = append(sourced, s.sourceLine(ctx, line, rid, byID, byName))
		}
	}

	// Aggregate: group by (supplier, code|name) summing quantities.
	type key struct{ supplier, ident string }
	grouped := map[key]*models.PurchaseCartLine{}
	order := []key{} // preserve first-seen order
	for _, c := range sourced {
		ident := c.code
		if ident == "" {
			ident = strings.ToLower(c.name)
		}
		k := key{supplier: c.supplier, ident: ident}
		line, ok := grouped[k]
		if !ok {
			line = &models.PurchaseCartLine{
				CatalogueItemID: c.catalogueItemID,
				Name:            c.name,
				Code:            c.code,
				PackSize:        c.packSize,
				UnitPrice:       c.unitPrice,
				Matched:         c.matched,
			}
			grouped[k] = line
			order = append(order, k)
		}
		line.Qty += c.qty
		line.SourceRequestIDs = appendUnique(line.SourceRequestIDs, c.sourceRequestID)
	}

	// Split grouped lines into one cart per supplier.
	cartsBySupplier := map[string]*models.PurchaseCart{}
	supplierOrder := []string{}
	for _, k := range order {
		line := grouped[k]
		line.LineTotal = line.UnitPrice * int64(line.Qty)
		cart, ok := cartsBySupplier[k.supplier]
		if !ok {
			cart = &models.PurchaseCart{
				Supplier:       k.supplier,
				Status:         models.PurchaseCartDraft,
				RecipientEmail: s.supplierEmails[k.supplier],
				GeneratedBy:    generatedBy,
			}
			cartsBySupplier[k.supplier] = cart
			supplierOrder = append(supplierOrder, k.supplier)
		}
		cart.Lines = append(cart.Lines, *line)
		cart.Subtotal += line.LineTotal
		cart.SourceRequestIDs = appendUnique(cart.SourceRequestIDs, line.SourceRequestIDs...)
	}

	out := make([]models.PurchaseCart, 0, len(supplierOrder))
	for _, sup := range supplierOrder {
		cart := cartsBySupplier[sup]
		cart.Ref = s.nextRef(ctx)
		s.enrichFromRequests(ctx, cart)
		if err := s.carts.Create(ctx, cart); err != nil {
			return nil, err
		}
		out = append(out, *cart)
	}
	return out, nil
}

// SetStatus applies a manual workflow transition (placed → tracking → dispatched
// → completed / cancelled) from the board + stepper. Receiving still goes through
// Receive(); this covers the non-receipt transitions.
func (s *purchaseCartService) SetStatus(ctx context.Context, id, status string) (*models.PurchaseCart, error) {
	if !models.IsValidPurchaseCartStatus(status) {
		return nil, errors.New("invalid status")
	}
	if err := s.carts.SetStatus(ctx, id, status); err != nil {
		return nil, err
	}
	return s.carts.FindByID(ctx, id)
}

// sourceLine resolves a single request line to its best (cheapest) supplier offer.
func (s *purchaseCartService) sourceLine(
	ctx context.Context,
	line models.OrderRequestItem,
	requestID string,
	byID, byName map[string]models.CatalogueItem,
) chosen {
	name := strings.TrimSpace(line.ItemName)

	// 1) Resolve candidate offers from the catalogue cache.
	var item *models.CatalogueItem
	if line.CatalogueItemID != "" {
		if it, ok := byID[line.CatalogueItemID]; ok {
			item = &it
		}
	}
	if item == nil {
		if it, ok := byName[strings.ToLower(name)]; ok {
			item = &it
		}
	}

	// 2) If nothing cached and live search is enabled, search suppliers and cache.
	if item == nil && s.engine != nil && s.engine.Enabled() {
		if offers := s.engine.Search(ctx, name); len(offers) > 0 {
			cached := s.cacheOffers(ctx, name, offers)
			item = cached
		}
	}

	if item != nil && len(item.Offers) > 0 {
		best := cheapestOffer(item.Offers)
		return chosen{
			supplier:        best.Supplier,
			code:            best.Code,
			name:            item.Name,
			packSize:        best.PackSize,
			catalogueItemID: item.ID.Hex(),
			unitPrice:       best.Price,
			qty:             line.Qty,
			matched:         true,
			sourceRequestID: requestID,
		}
	}

	// 3) Unmatched — keep the requested supplier hint so the admin can fill the code.
	supplier := line.Supplier
	if supplier == "" {
		supplier = "Other"
	}
	return chosen{
		supplier:        supplier,
		name:            name,
		qty:             line.Qty,
		matched:         false,
		sourceRequestID: requestID,
	}
}

// cacheOffers upserts discovered offers into the catalogue and returns the item.
func (s *purchaseCartService) cacheOffers(ctx context.Context, name string, offers []sourcing.Offer) *models.CatalogueItem {
	modelOffers := make([]models.CatalogueOffer, 0, len(offers))
	now := time.Now()
	for _, o := range offers {
		ppu := o.PricePerUnit
		if ppu == 0 {
			ppu = o.Price
		}
		modelOffers = append(modelOffers, models.CatalogueOffer{
			Supplier:     o.Supplier,
			Code:         o.Code,
			PackSize:     o.PackSize,
			Price:        o.Price,
			PricePerUnit: ppu,
			SourceURL:    o.SourceURL,
			LastSeenAt:   now,
		})
	}
	item, err := s.catalogue.UpsertByName(ctx, models.CatalogueItem{
		Name:     name,
		Offers:   modelOffers,
		IsActive: true,
	})
	if err != nil {
		return nil
	}
	return item
}

func (s *purchaseCartService) List(ctx context.Context) ([]models.PurchaseCart, error) {
	return s.carts.FindAll(ctx)
}

func (s *purchaseCartService) GetByID(ctx context.Context, id string) (*models.PurchaseCart, error) {
	return s.carts.FindByID(ctx, id)
}

func (s *purchaseCartService) Update(ctx context.Context, id string, req models.UpdateCartRequest) (*models.PurchaseCart, error) {
	existing, err := s.carts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.IsPlaced() {
		return nil, errors.New("an order that has been placed cannot be edited")
	}
	existing.RecipientEmail = strings.TrimSpace(req.RecipientEmail)
	existing.Lines = req.Lines
	existing.Subtotal = 0
	for i := range existing.Lines {
		existing.Lines[i].LineTotal = existing.Lines[i].UnitPrice * int64(existing.Lines[i].Qty)
		existing.Subtotal += existing.Lines[i].LineTotal
	}
	return s.carts.Update(ctx, id, *existing)
}

func (s *purchaseCartService) Send(ctx context.Context, id, recipientOverride string) (*models.PurchaseCart, error) {
	cart, err := s.carts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if cart.IsPlaced() {
		return nil, errors.New("order already placed")
	}
	recipient := strings.TrimSpace(recipientOverride)
	if recipient == "" {
		recipient = strings.TrimSpace(cart.RecipientEmail)
	}
	if recipient == "" {
		return nil, errors.New("no recipient email set for this supplier")
	}

	subject := fmt.Sprintf("Blue Nest order — %s (%d items)", cart.Supplier, len(cart.Lines))
	html := renderCartHTML(cart)
	csv := renderCartCSV(cart)
	attachment := email.Attachment{
		Filename:    fmt.Sprintf("order-%s-%s.csv", strings.ToLower(cart.Supplier), time.Now().Format("2006-01-02")),
		Content:     []byte(csv),
		ContentType: "text/csv",
	}

	if err := s.mailer.SendWithAttachments([]string{recipient}, subject, html, []email.Attachment{attachment}); err != nil {
		_ = s.carts.MarkFailed(ctx, id, err.Error())
		return nil, fmt.Errorf("send order email: %w", err)
	}

	if err := s.carts.MarkSent(ctx, id, ""); err != nil {
		return nil, err
	}
	// Flip the covered requests to "ordered".
	for _, rid := range cart.SourceRequestIDs {
		_ = s.requests.UpdateStatus(ctx, rid, string(models.OrderRequestOrdered))
	}
	cart.RecipientEmail = recipient
	cart.Status = models.PurchaseCartOrdered
	now := time.Now()
	cart.SentAt = &now
	return cart, nil
}

func (s *purchaseCartService) MarkExported(ctx context.Context, id string, results []models.PurchaseCartExportResult, supplierOrderRef string) (*models.PurchaseCart, error) {
	cart, err := s.carts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.carts.MarkExported(ctx, id, results, supplierOrderRef); err != nil {
		return nil, err
	}
	// Flip the covered requests to "ordered" (same as Send, without the email).
	for _, rid := range cart.SourceRequestIDs {
		_ = s.requests.UpdateStatus(ctx, rid, string(models.OrderRequestOrdered))
	}
	cart.Status = models.PurchaseCartOrdered
	cart.ExportResults = results
	if supplierOrderRef != "" {
		cart.SupplierOrderRef = supplierOrderRef
	}
	now := time.Now()
	cart.SentAt = &now
	return cart, nil
}

// UpdateFulfillment sets the supplier order ref + expected delivery date on a
// placed order and propagates the expected date to the covered staff requests.
func (s *purchaseCartService) UpdateFulfillment(ctx context.Context, id string, req models.UpdateFulfillmentRequest) (*models.PurchaseCart, error) {
	cart, err := s.carts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !cart.IsPlaced() {
		return nil, errors.New("place the order before adding delivery details")
	}
	ref := strings.TrimSpace(req.SupplierOrderRef)
	tracking := strings.TrimSpace(req.TrackingNumber)
	if err := s.carts.SetFulfillment(ctx, id, ref, tracking, req.ExpectedDeliveryDate); err != nil {
		return nil, err
	}
	for _, rid := range cart.SourceRequestIDs {
		_ = s.requests.SetExpectedDelivery(ctx, rid, req.ExpectedDeliveryDate)
	}
	cart.SupplierOrderRef = ref
	if tracking != "" {
		cart.TrackingNumber = tracking
	}
	cart.ExpectedDeliveryDate = req.ExpectedDeliveryDate
	return cart, nil
}

// Receive records per-line goods-received quantities and advances the order to
// partially_received / received, flipping covered requests on full receipt.
func (s *purchaseCartService) Receive(ctx context.Context, id string, items []models.ReceiveItem) (*models.PurchaseCart, error) {
	cart, err := s.carts.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !cart.IsPlaced() {
		return nil, errors.New("place the order before receiving goods")
	}

	// Index received quantities by code (name fallback) for matching.
	byCode := map[string]int{}
	byName := map[string]int{}
	for _, it := range items {
		if c := strings.TrimSpace(it.Code); c != "" {
			byCode[c] = it.QtyReceived
		}
		if n := strings.ToLower(strings.TrimSpace(it.Name)); n != "" {
			byName[n] = it.QtyReceived
		}
	}

	allReceived := len(cart.Lines) > 0
	anyReceived := false
	for i := range cart.Lines {
		line := &cart.Lines[i]
		qty := line.QtyReceived
		if v, ok := byCode[strings.TrimSpace(line.Code)]; ok && line.Code != "" {
			qty = v
		} else if v, ok := byName[strings.ToLower(strings.TrimSpace(line.Name))]; ok {
			qty = v
		}
		if qty < 0 {
			qty = 0
		}
		if qty > line.Qty {
			qty = line.Qty
		}
		line.QtyReceived = qty
		if qty > 0 {
			anyReceived = true
		}
		if qty < line.Qty {
			allReceived = false
		}
	}

	status := models.PurchaseCartPartiallyReceived
	var deliveredAt *time.Time
	if allReceived {
		status = models.PurchaseCartReceived
		now := time.Now()
		deliveredAt = &now
	} else if !anyReceived {
		// Nothing received yet — keep it at "ordered".
		status = models.PurchaseCartOrdered
	}

	if err := s.carts.SetReceived(ctx, id, cart.Lines, status, deliveredAt); err != nil {
		return nil, err
	}
	if allReceived {
		for _, rid := range cart.SourceRequestIDs {
			_ = s.requests.UpdateStatus(ctx, rid, string(models.OrderRequestReceived))
			_ = s.requests.SetDelivered(ctx, rid, *deliveredAt)
		}
	}
	cart.Status = status
	cart.DeliveredAt = deliveredAt
	return cart, nil
}

func renderCartCSV(cart *models.PurchaseCart) string {
	var b strings.Builder
	b.WriteString("Code,Item,Pack,Qty,Unit Price (GBP),Line Total (GBP)\r\n")
	esc := func(s string) string { return `"` + strings.ReplaceAll(s, `"`, `""`) + `"` }
	for _, l := range cart.Lines {
		b.WriteString(strings.Join([]string{
			esc(l.Code),
			esc(l.Name),
			esc(l.PackSize),
			fmt.Sprintf("%d", l.Qty),
			fmt.Sprintf("%.2f", float64(l.UnitPrice)/100),
			fmt.Sprintf("%.2f", float64(l.LineTotal)/100),
		}, ","))
		b.WriteString("\r\n")
	}
	return b.String()
}

func renderCartHTML(cart *models.PurchaseCart) string {
	var rows strings.Builder
	for _, l := range cart.Lines {
		rows.WriteString(fmt.Sprintf(
			`<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">%s</td>`+
				`<td style="padding:6px 12px;border-bottom:1px solid #eee;">%s</td>`+
				`<td style="padding:6px 12px;border-bottom:1px solid #eee;">%s</td>`+
				`<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">%d</td>`+
				`<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">£%.2f</td></tr>`,
			l.Code, l.Name, l.PackSize, l.Qty, float64(l.LineTotal)/100,
		))
	}
	return fmt.Sprintf(`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#2a3c29;">
<h2 style="color:#3a5c38;">Blue Nest Montessori — %s order</h2>
<p>Please process the following order. A CSV copy is attached.</p>
<table style="border-collapse:collapse;width:100%%;font-size:14px;">
<thead><tr style="background:#f2f7f2;">
<th style="padding:6px 12px;text-align:left;">Code</th>
<th style="padding:6px 12px;text-align:left;">Item</th>
<th style="padding:6px 12px;text-align:left;">Pack</th>
<th style="padding:6px 12px;text-align:right;">Qty</th>
<th style="padding:6px 12px;text-align:right;">Line total</th>
</tr></thead><tbody>%s</tbody></table>
<p style="margin-top:16px;font-weight:600;">Order subtotal: £%.2f</p>
<p style="color:#888;font-size:12px;">Sent by the Blue Nest order creation tool.</p>
</body></html>`, cart.Supplier, rows.String(), float64(cart.Subtotal)/100)
}

// cheapestOffer returns the offer with the lowest price-per-unit (falling back to price).
func cheapestOffer(offers []models.CatalogueOffer) models.CatalogueOffer {
	sorted := make([]models.CatalogueOffer, len(offers))
	copy(sorted, offers)
	sort.SliceStable(sorted, func(i, j int) bool {
		return effectiveUnit(sorted[i]) < effectiveUnit(sorted[j])
	})
	return sorted[0]
}

func effectiveUnit(o models.CatalogueOffer) int64 {
	if o.PricePerUnit > 0 {
		return o.PricePerUnit
	}
	return o.Price
}

func appendUnique(list []string, vals ...string) []string {
	for _, v := range vals {
		if v == "" {
			continue
		}
		found := false
		for _, e := range list {
			if e == v {
				found = true
				break
			}
		}
		if !found {
			list = append(list, v)
		}
	}
	return list
}
