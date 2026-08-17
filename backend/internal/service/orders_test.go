package service

import (
	"context"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type fakeListOrderRepo struct {
	repository.OrderRepository
	orders            []models.Order
	gotLimit, gotSkip int64
}

func (f *fakeListOrderRepo) FindAll(_ context.Context, limit, skip int64) ([]models.Order, error) {
	f.gotLimit, f.gotSkip = limit, skip
	return f.orders, nil
}

// The draft-hiding rule (unpaid/failed hidden, legacy no-payment_status shown)
// moved from an in-memory filter here into the repository QUERY ($nin — which
// passes documents missing the field, i.e. exactly the legacy rule) so that
// server-side pagination pages over exactly the rows the admin sees. The
// observable behaviour is locked end-to-end by SUI-STORE-001; this unit test
// locks what remains the service's job: forwarding the page window untouched.
func TestListAll_ForwardsPageWindowToRepo(t *testing.T) {
	repo := &fakeListOrderRepo{orders: []models.Order{{Ref: "ORD-2026-000001", PaymentStatus: models.PaymentPaid}}}
	got, err := NewOrderService(repo).ListAll(context.Background(), 200, 400)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("ListAll returned %d orders, want 1", len(got))
	}
	if repo.gotLimit != 200 || repo.gotSkip != 400 {
		t.Fatalf("page window not forwarded: repo saw limit=%d skip=%d, want 200/400", repo.gotLimit, repo.gotSkip)
	}
}
