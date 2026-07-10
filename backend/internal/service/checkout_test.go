package service

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Partial fakes (embed the interface; only override what CreateSession uses) ──

type fakeCheckoutOrderRepo struct {
	repository.OrderRepository
	created *models.Order
}

func (f *fakeCheckoutOrderRepo) Create(_ context.Context, o models.Order) (*models.Order, error) {
	o.ID = primitive.NewObjectID()
	f.created = &o
	return &o, nil
}
func (f *fakeCheckoutOrderRepo) MarkPaid(context.Context, string, string, string) error { return nil }
func (f *fakeCheckoutOrderRepo) UpdateStatus(context.Context, string, string) error     { return nil }
func (f *fakeCheckoutOrderRepo) AttachStripeSession(context.Context, string, string) error {
	return nil
}

type fakeCartRepo struct {
	repository.CartRepository
	cart *models.Cart
}

func (f *fakeCartRepo) FindByUserID(context.Context, string) (*models.Cart, error) {
	return f.cart, nil
}
func (f *fakeCartRepo) ClearByUserID(context.Context, string) error { return nil }

type fakeProductRepo struct {
	repository.ProductRepository
	product *models.Product
}

func (f *fakeProductRepo) FindByID(context.Context, string) (*models.Product, error) {
	return f.product, nil
}
func (f *fakeProductRepo) DecrementStock(context.Context, string, int) error { return nil }

type fakeBranchRepo struct {
	repository.BranchRepository
	branches map[string]*models.Branch
}

func (f *fakeBranchRepo) FindBySlug(_ context.Context, slug string) (*models.Branch, error) {
	if b, ok := f.branches[slug]; ok {
		return b, nil
	}
	return nil, errors.New("branch not found")
}

func newTestCheckout() (*fakeCheckoutOrderRepo, CheckoutService) {
	pid := primitive.NewObjectID()
	orderRepo := &fakeCheckoutOrderRepo{}
	cartRepo := &fakeCartRepo{cart: &models.Cart{Items: []models.CartItem{{ProductID: pid, Qty: 2, Size: "3-4y"}}}}
	productRepo := &fakeProductRepo{product: &models.Product{ID: pid, Name: "Wooden Blocks", Price: 1500, IsActive: true, StockQty: 10}}
	branchRepo := &fakeBranchRepo{branches: map[string]*models.Branch{
		"harrow": {Slug: "harrow", Name: "Harrow", Contact: models.BranchContact{Email: "harrow@bluenest.uk"}},
	}}
	// stripeSecret "" → local path (no live Stripe call), so we test order capture.
	return orderRepo, NewCheckoutService(orderRepo, cartRepo, productRepo, branchRepo, "", "test")
}

func baseInput() CreateCheckoutSessionInput {
	return CreateCheckoutSessionInput{
		UserID:        primitive.NewObjectID().Hex(),
		CustomerName:  "Jane Smith",
		CustomerEmail: "jane@example.com",
		CustomerPhone: "07123456789",
		SuccessURL:    "https://x/success",
		CancelURL:     "https://x/cancel",
	}
}

func TestCreateSession_RequiredFields(t *testing.T) {
	cases := map[string]func(*CreateCheckoutSessionInput){
		"missing name":  func(i *CreateCheckoutSessionInput) { i.CustomerName = "" },
		"missing email": func(i *CreateCheckoutSessionInput) { i.CustomerEmail = "" },
		"missing phone": func(i *CreateCheckoutSessionInput) { i.CustomerPhone = "" },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			_, svc := newTestCheckout()
			in := baseInput()
			mutate(&in)
			if _, err := svc.CreateSession(context.Background(), in); err == nil {
				t.Fatalf("expected validation error for %s", name)
			}
		})
	}
}

func TestCreateSession_InvalidBranch(t *testing.T) {
	_, svc := newTestCheckout()
	in := baseInput()
	in.BranchSlug = "nonexistent"
	if _, err := svc.CreateSession(context.Background(), in); err == nil {
		t.Fatal("expected error for invalid branch")
	}
}

func TestCreateSession_CapturesSnapshotAndBranch(t *testing.T) {
	orderRepo, svc := newTestCheckout()
	in := baseInput()
	in.BranchSlug = "harrow"
	in.ChildRef = "Toddler Room — Ava"

	if _, err := svc.CreateSession(context.Background(), in); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	o := orderRepo.created
	if o == nil {
		t.Fatal("order was not created before Stripe")
	}
	if o.CustomerName != "Jane Smith" || o.CustomerEmail != "jane@example.com" || o.CustomerPhone != "07123456789" {
		t.Errorf("customer snapshot not captured: %+v", o)
	}
	if o.BranchSlug != "harrow" || o.BranchName != "Harrow" {
		t.Errorf("branch not resolved: slug=%q name=%q", o.BranchSlug, o.BranchName)
	}
	if o.ChildRef != "Toddler Room — Ava" {
		t.Errorf("child ref not captured: %q", o.ChildRef)
	}
	if o.Status != models.OrderPending && o.Status != models.OrderPaid {
		t.Errorf("unexpected status %q", o.Status)
	}
	// 2 blocks @ £15 = £30 → free shipping.
	if o.TotalAmount != 3000 {
		t.Errorf("total = %d, want 3000", o.TotalAmount)
	}
}

func TestCreateSession_BranchNotApplicable(t *testing.T) {
	orderRepo, svc := newTestCheckout()
	in := baseInput() // no branch
	if _, err := svc.CreateSession(context.Background(), in); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	o := orderRepo.created
	if o.BranchSlug != models.BranchNotApplicable {
		t.Errorf("branch slug = %q, want %q", o.BranchSlug, models.BranchNotApplicable)
	}
	if !strings.EqualFold(o.BranchName, "Not applicable") {
		t.Errorf("branch name = %q, want 'Not applicable'", o.BranchName)
	}
	if o.BranchIsApplicable() {
		t.Error("BranchIsApplicable should be false for N/A")
	}
}
