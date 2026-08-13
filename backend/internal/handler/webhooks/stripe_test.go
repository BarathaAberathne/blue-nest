package webhooks

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	stripe "github.com/stripe/stripe-go/v76"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Fakes (embed interfaces; override only what the webhook uses) ──────────────

type fakeOrderRepo struct {
	repository.OrderRepository
	order *models.Order
	flags map[string]bool
}

func (f *fakeOrderRepo) mark(field string) bool {
	if f.flags[field] {
		return false
	}
	f.flags[field] = true
	return true
}

func (f *fakeOrderRepo) FindByID(context.Context, string) (*models.Order, error) { return f.order, nil }
func (f *fakeOrderRepo) MarkPaid(_ context.Context, _, sess, pi string) error {
	f.order.Status = models.OrderPaid
	f.order.PaymentStatus = models.PaymentPaid
	f.order.StripeSessionID = sess
	f.order.PaymentIntentID = pi
	now := time.Now()
	f.order.PaidAt = &now
	return nil
}
func (f *fakeOrderRepo) MarkPaymentFailed(context.Context, string) error {
	f.order.Status = models.OrderCancelled
	f.order.PaymentStatus = models.PaymentFailed
	return nil
}
func (f *fakeOrderRepo) SaveStripeDetails(_ context.Context, _ string, d repository.StripeDetails) error {
	if d.CustomerEmail != "" {
		f.order.CustomerEmail = d.CustomerEmail
	}
	if d.CustomerName != "" {
		f.order.CustomerName = d.CustomerName
	}
	if d.CustomerPhone != "" {
		f.order.CustomerPhone = d.CustomerPhone
	}
	if d.StripeCustomerID != "" {
		f.order.StripeCustomerID = d.StripeCustomerID
	}
	if d.Shipping.HasContent() {
		f.order.ShippingAddress = d.Shipping
	}
	if d.Billing.HasContent() {
		f.order.BillingAddress = d.Billing
	}
	return nil
}
func (f *fakeOrderRepo) TryMarkConfirmationEmailSent(context.Context, string) (bool, error) {
	return f.mark("customer"), nil
}
func (f *fakeOrderRepo) TryMarkAdminEmailSent(context.Context, string) (bool, error) {
	return f.mark("admin"), nil
}
func (f *fakeOrderRepo) TryMarkBranchEmailSent(context.Context, string) (bool, error) {
	return f.mark("branch"), nil
}
func (f *fakeOrderRepo) TryMarkBAEmailSent(context.Context, string) (bool, error) {
	return f.mark("ba"), nil
}
func (f *fakeOrderRepo) TryMarkStockAdjusted(context.Context, string) (bool, error) {
	return f.mark("stock"), nil
}

type fakeProductRepo struct {
	repository.ProductRepository
	decrements int
}

func (f *fakeProductRepo) DecrementStock(context.Context, string, int) error {
	f.decrements++
	return nil
}

type fakeBranchRepo struct {
	repository.BranchRepository
}

func (f *fakeBranchRepo) FindBySlug(_ context.Context, slug string) (*models.Branch, error) {
	if slug == "harrow" {
		return &models.Branch{Slug: "harrow", Name: "Harrow", Contact: models.BranchContact{Email: "harrow@bluenest.uk"}}, nil
	}
	return nil, fmt.Errorf("not found")
}

type fakeSender struct {
	sends   int
	replies int
}

func (f *fakeSender) Send([]string, string, string) error                    { f.sends++; return nil }
func (f *fakeSender) SendWithReplyTo([]string, string, string, string) error { f.replies++; return nil }

// ── Helpers ──────────────────────────────────────────────────────────────────

func newHarness(branchSlug string) (*StripeWebhookHandler, *fakeOrderRepo, *fakeProductRepo, *fakeSender) {
	oid := primitive.NewObjectID()
	orderRepo := &fakeOrderRepo{
		flags: map[string]bool{},
		order: &models.Order{
			ID: oid, Status: models.OrderPending, PaymentStatus: models.PaymentUnpaid,
			BranchSlug: branchSlug, BranchName: "Harrow", TotalAmount: 3000,
			Items: []models.OrderItem{{ProductID: primitive.NewObjectID(), Qty: 2}},
		},
	}
	prodRepo := &fakeProductRepo{}
	sender := &fakeSender{}
	h := NewStripeWebhookHandler("whsec_test", orderRepo, prodRepo, &fakeBranchRepo{}, sender, "admin@bluenest.uk", "ba@bluenest.uk", nil)
	return h, orderRepo, prodRepo, sender
}

func sessionEvent(orderID string, paid bool) stripe.Event {
	ps := "unpaid"
	if paid {
		ps = "paid"
	}
	raw := fmt.Sprintf(`{"id":"cs_test_1","payment_status":%q,"payment_intent":"pi_1","customer":"cus_1",`+
		`"customer_email":"jane@example.com",`+
		`"customer_details":{"email":"jane@example.com","name":"Jane Smith","phone":"07123456789",`+
		`"address":{"line1":"1 Billing St","city":"London","state":"Greater London","postal_code":"E1 1AA","country":"GB"}},`+
		`"collected_information":{"shipping_details":{"name":"Jane Smith",`+
		`"address":{"line1":"2 Delivery Rd","city":"London","postal_code":"E2 2BB","country":"GB"}}},`+
		`"metadata":{"order_id":%q}}`, ps, orderID)
	return stripe.Event{Type: stripe.EventTypeCheckoutSessionCompleted, Data: &stripe.EventData{Raw: json.RawMessage(raw)}}
}

// ── Tests ────────────────────────────────────────────────────────────────────

func TestHandle_InvalidSignature(t *testing.T) {
	h, _, _, _ := newHarness("harrow")
	req := httptest.NewRequest("POST", "/webhooks/stripe", strings.NewReader(`{"type":"checkout.session.completed"}`))
	req.Header.Set("Stripe-Signature", "t=1,v1=deadbeef")
	w := httptest.NewRecorder()
	h.Handle(w, req)
	if w.Code != 400 {
		t.Fatalf("bad signature: got status %d, want 400", w.Code)
	}
}

func TestCheckoutCompleted_PaidFinalizesAndEmails(t *testing.T) {
	h, orderRepo, prodRepo, sender := newHarness("harrow")
	h.handleCheckoutCompleted(context.Background(), sessionEvent(orderRepo.order.ID.Hex(), true))

	o := orderRepo.order
	if o.Status != models.OrderPaid || o.PaymentStatus != models.PaymentPaid {
		t.Errorf("order not marked paid: status=%q payment=%q", o.Status, o.PaymentStatus)
	}
	if o.CustomerName != "Jane Smith" || o.CustomerPhone != "07123456789" {
		t.Errorf("customer details not reconciled: %+v", o)
	}
	if o.BillingAddress.Line1 != "1 Billing St" || o.BillingAddress.County != "Greater London" {
		t.Errorf("billing not reconciled: %+v", o.BillingAddress)
	}
	if o.ShippingAddress.Line1 != "2 Delivery Rd" {
		t.Errorf("shipping not reconciled: %+v", o.ShippingAddress)
	}
	if prodRepo.decrements != 1 {
		t.Errorf("stock decrements = %d, want 1", prodRepo.decrements)
	}
	// customer=1 Send; admin+branch+BA=3 SendWithReplyTo.
	if sender.sends != 1 || sender.replies != 3 {
		t.Errorf("emails: sends=%d replies=%d, want 1 and 3", sender.sends, sender.replies)
	}
}

func TestCheckoutCompleted_Idempotent(t *testing.T) {
	h, orderRepo, prodRepo, sender := newHarness("harrow")
	ev := sessionEvent(orderRepo.order.ID.Hex(), true)
	h.handleCheckoutCompleted(context.Background(), ev)
	h.handleCheckoutCompleted(context.Background(), ev) // duplicate delivery

	if prodRepo.decrements != 1 {
		t.Errorf("stock decremented %d times across retries, want 1", prodRepo.decrements)
	}
	if sender.sends != 1 || sender.replies != 3 {
		t.Errorf("duplicate emails sent: sends=%d replies=%d, want 1 and 3", sender.sends, sender.replies)
	}
}

func TestCheckoutCompleted_UnpaidDoesNotFinalize(t *testing.T) {
	h, orderRepo, prodRepo, sender := newHarness("harrow")
	h.handleCheckoutCompleted(context.Background(), sessionEvent(orderRepo.order.ID.Hex(), false))

	if orderRepo.order.Status == models.OrderPaid {
		t.Error("unpaid session should not mark order paid")
	}
	if prodRepo.decrements != 0 || sender.sends != 0 || sender.replies != 0 {
		t.Errorf("unpaid session finalised: decr=%d sends=%d replies=%d", prodRepo.decrements, sender.sends, sender.replies)
	}
	// Details are still captured for the pending order.
	if orderRepo.order.CustomerEmail != "jane@example.com" {
		t.Error("customer details should be saved even before payment")
	}
}

func TestCheckoutCompleted_NoBranchSkipsBranchEmail(t *testing.T) {
	h, orderRepo, _, sender := newHarness(models.BranchNotApplicable)
	h.handleCheckoutCompleted(context.Background(), sessionEvent(orderRepo.order.ID.Hex(), true))
	// customer=1 Send; admin+BA=2 SendWithReplyTo (no branch manager).
	if sender.sends != 1 || sender.replies != 2 {
		t.Errorf("N/A branch: sends=%d replies=%d, want 1 and 2", sender.sends, sender.replies)
	}
}

func TestFailOrder_IgnoresAlreadyPaid(t *testing.T) {
	h, orderRepo, _, _ := newHarness("harrow")
	orderRepo.order.Status = models.OrderPaid
	orderRepo.order.PaymentStatus = models.PaymentPaid
	h.failOrder(context.Background(), orderRepo.order.ID.Hex())
	if orderRepo.order.Status != models.OrderPaid {
		t.Error("failOrder must not demote an already-paid order")
	}
}
