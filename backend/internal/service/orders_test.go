package service

import (
	"context"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type fakeListOrderRepo struct {
	repository.OrderRepository
	orders []models.Order
}

func (f *fakeListOrderRepo) FindAll(context.Context) ([]models.Order, error) { return f.orders, nil }

func TestListAll_HidesUnpaidAndFailedDrafts(t *testing.T) {
	repo := &fakeListOrderRepo{orders: []models.Order{
		{Ref: "ORD-2026-000001", PaymentStatus: models.PaymentPaid},
		{PaymentStatus: models.PaymentUnpaid},   // pre-payment draft → hidden
		{PaymentStatus: models.PaymentFailed},   // failed attempt → hidden
		{PaymentStatus: models.PaymentRefunded}, // was paid, refunded → shown
		{Status: models.OrderPaid},              // legacy (no payment_status) → shown
	}}
	got, err := NewOrderService(repo).ListAll(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("ListAll returned %d orders, want 3 (paid + refunded + legacy)", len(got))
	}
	for _, o := range got {
		if o.PaymentStatus == models.PaymentUnpaid || o.PaymentStatus == models.PaymentFailed {
			t.Errorf("an unpaid/failed draft leaked into the admin list: %+v", o)
		}
	}
}
