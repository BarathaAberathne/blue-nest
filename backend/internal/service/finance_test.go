package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// fakeFinanceRepo is an in-memory FinanceRepository for the pure business
// rules (allocation math, the onboarding finance gate, webhook transitions).
type fakeFinanceRepo struct {
	families map[string]*models.Family
	charges  map[string]*models.Charge
	payments map[string]*models.Payment
	events   map[string]bool
}

func newFakeFinanceRepo() *fakeFinanceRepo {
	return &fakeFinanceRepo{
		families: map[string]*models.Family{},
		charges:  map[string]*models.Charge{},
		payments: map[string]*models.Payment{},
		events:   map[string]bool{},
	}
}

func (f *fakeFinanceRepo) addFamily(fam *models.Family) *models.Family {
	if fam.ID.IsZero() {
		fam.ID = primitive.NewObjectID()
	}
	f.families[fam.ID.Hex()] = fam
	return fam
}

func (f *fakeFinanceRepo) addCharge(c *models.Charge) *models.Charge {
	if c.ID.IsZero() {
		c.ID = primitive.NewObjectID()
	}
	c.CreatedAt = time.Now()
	f.charges[c.ID.Hex()] = c
	return c
}

func (f *fakeFinanceRepo) FamilyByID(_ context.Context, id string) (*models.Family, error) {
	if fam, ok := f.families[id]; ok {
		cp := *fam
		return &cp, nil
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) FamilyByChild(_ context.Context, childID string) (*models.Family, error) {
	for _, fam := range f.families {
		for _, c := range fam.ChildIDs {
			if c == childID {
				cp := *fam
				return &cp, nil
			}
		}
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) FamilyByParent(_ context.Context, parentID string) (*models.Family, error) {
	for _, fam := range f.families {
		for _, p := range fam.ParentIDs {
			if p == parentID {
				cp := *fam
				return &cp, nil
			}
		}
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) FamilyByCustomer(_ context.Context, cusID string) (*models.Family, error) {
	for _, fam := range f.families {
		if fam.StripeCustomerID == cusID {
			cp := *fam
			return &cp, nil
		}
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) FamiliesAll(_ context.Context) ([]models.Family, error) {
	out := []models.Family{}
	for _, fam := range f.families {
		out = append(out, *fam)
	}
	return out, nil
}

func (f *fakeFinanceRepo) FamilyCreate(_ context.Context, fam *models.Family) error {
	f.addFamily(fam)
	return nil
}

func (f *fakeFinanceRepo) FamilyUpdate(_ context.Context, id string, fam models.Family) (*models.Family, error) {
	if _, ok := f.families[id]; !ok {
		return nil, errors.New("not found")
	}
	fam.ID, _ = primitive.ObjectIDFromHex(id)
	f.families[id] = &fam
	cp := fam
	return &cp, nil
}

func (f *fakeFinanceRepo) ChargeByID(_ context.Context, id string) (*models.Charge, error) {
	if c, ok := f.charges[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) ChargeByPaymentIntent(_ context.Context, piID string) (*models.Charge, error) {
	for _, c := range f.charges {
		if c.StripePaymentIntentID == piID {
			cp := *c
			return &cp, nil
		}
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) ChargesByFamily(_ context.Context, familyID string) ([]models.Charge, error) {
	out := []models.Charge{}
	for _, c := range f.charges {
		if c.FamilyID == familyID {
			out = append(out, *c)
		}
	}
	// oldest-first by due date, mirroring the Mongo sort the service relies on
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].DueDate < out[i].DueDate {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out, nil
}

func (f *fakeFinanceRepo) ChargesAll(_ context.Context) ([]models.Charge, error) {
	out := []models.Charge{}
	for _, c := range f.charges {
		out = append(out, *c)
	}
	return out, nil
}

func (f *fakeFinanceRepo) ChargeCreate(_ context.Context, c *models.Charge) error {
	f.addCharge(c)
	return nil
}

func (f *fakeFinanceRepo) ChargeUpdate(_ context.Context, id string, c models.Charge) (*models.Charge, error) {
	if _, ok := f.charges[id]; !ok {
		return nil, errors.New("not found")
	}
	c.ID, _ = primitive.ObjectIDFromHex(id)
	f.charges[id] = &c
	cp := c
	return &cp, nil
}

func (f *fakeFinanceRepo) PaymentsByFamily(_ context.Context, familyID string) ([]models.Payment, error) {
	out := []models.Payment{}
	for _, p := range f.payments {
		if p.FamilyID == familyID {
			out = append(out, *p)
		}
	}
	return out, nil
}

func (f *fakeFinanceRepo) PaymentByIntent(_ context.Context, piID string) (*models.Payment, error) {
	for _, p := range f.payments {
		if p.StripePaymentIntentID == piID {
			cp := *p
			return &cp, nil
		}
	}
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) PaymentCreate(_ context.Context, p *models.Payment) error {
	if p.ID.IsZero() {
		p.ID = primitive.NewObjectID()
	}
	f.payments[p.ID.Hex()] = p
	return nil
}

func (f *fakeFinanceRepo) PaymentUpdate(_ context.Context, id string, p models.Payment) (*models.Payment, error) {
	if _, ok := f.payments[id]; !ok {
		return nil, errors.New("not found")
	}
	p.ID, _ = primitive.ObjectIDFromHex(id)
	f.payments[id] = &p
	cp := p
	return &cp, nil
}

func (f *fakeFinanceRepo) SchedulesByFamily(_ context.Context, _ string) ([]models.PaymentSchedule, error) {
	return nil, nil
}
func (f *fakeFinanceRepo) SchedulesActive(_ context.Context) ([]models.PaymentSchedule, error) {
	return nil, nil
}
func (f *fakeFinanceRepo) ScheduleCreate(_ context.Context, _ *models.PaymentSchedule) error {
	return nil
}
func (f *fakeFinanceRepo) ScheduleUpdate(_ context.Context, _ string, _ models.PaymentSchedule) (*models.PaymentSchedule, error) {
	return nil, errors.New("not found")
}

func (f *fakeFinanceRepo) MarkEventProcessed(_ context.Context, eventID string) (bool, error) {
	if f.events[eventID] {
		return false, nil
	}
	f.events[eventID] = true
	return true, nil
}

func newTestFinance(repo *fakeFinanceRepo) *financeService {
	return &financeService{repo: repo, stripeOn: false}
}

// ── Allocation maths ─────────────────────────────────────────────────────────

func TestManualPaymentAutoAllocatesOldestFirst(t *testing.T) {
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "Test Family"})
	famID := fam.ID.Hex()
	c1 := repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 30000, DueDate: "2026-08-01", Status: models.ChargeDue})
	c2 := repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 50000, DueDate: "2026-09-01", Status: models.ChargeUpcoming})
	svc := newTestFinance(repo)

	// £400 against £300 + £500 → first fully paid, second partially.
	p, err := svc.RecordManualPayment(context.Background(), famID, models.ManualPaymentRequest{AmountPence: 40000})
	if err != nil {
		t.Fatalf("manual payment: %v", err)
	}
	if len(p.Allocations) != 2 {
		t.Fatalf("expected 2 allocations, got %d", len(p.Allocations))
	}
	if p.Allocations[0].ChargeID != c1.ID.Hex() || p.Allocations[0].AmountPence != 30000 {
		t.Errorf("first allocation should settle the oldest charge in full: %+v", p.Allocations[0])
	}
	if p.Allocations[1].ChargeID != c2.ID.Hex() || p.Allocations[1].AmountPence != 10000 {
		t.Errorf("second allocation should carry the remainder: %+v", p.Allocations[1])
	}
	if got := repo.charges[c1.ID.Hex()]; got.Status != models.ChargePaid || got.PaidAt == nil {
		t.Errorf("oldest charge should be paid with PaidAt set, got %s", got.Status)
	}
	if got := repo.charges[c2.ID.Hex()]; got.Status != models.ChargePartiallyPaid || got.PaidPence != 10000 {
		t.Errorf("second charge should be partially_paid with 10000 paid, got %s / %d", got.Status, got.PaidPence)
	}
}

func TestManualPaymentSkipsSettledAndCancelled(t *testing.T) {
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "Test Family"})
	famID := fam.ID.Hex()
	repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 10000, PaidPence: 10000, DueDate: "2026-07-01", Status: models.ChargePaid})
	repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 20000, DueDate: "2026-07-15", Status: models.ChargeCancelled})
	open := repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 15000, DueDate: "2026-08-01", Status: models.ChargeDue})
	svc := newTestFinance(repo)

	p, err := svc.RecordManualPayment(context.Background(), famID, models.ManualPaymentRequest{AmountPence: 15000})
	if err != nil {
		t.Fatalf("manual payment: %v", err)
	}
	if len(p.Allocations) != 1 || p.Allocations[0].ChargeID != open.ID.Hex() {
		t.Fatalf("payment must only allocate to the open charge: %+v", p.Allocations)
	}
	if got := repo.charges[open.ID.Hex()]; got.Status != models.ChargePaid {
		t.Errorf("open charge should be settled, got %s", got.Status)
	}
}

func TestBalanceDerivation(t *testing.T) {
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "Test Family"})
	famID := fam.ID.Hex()
	repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 30000, PaidPence: 10000, DueDate: "2026-08-01", Status: models.ChargePartiallyPaid})
	repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 50000, DueDate: "2026-09-01", Status: models.ChargeUpcoming})
	repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 99900, DueDate: "2026-09-02", Status: models.ChargeCancelled})
	svc := newTestFinance(repo)

	if got := svc.balance(context.Background(), famID); got != 70000 {
		t.Errorf("balance should exclude cancelled and subtract paid: want 70000, got %d", got)
	}
}

// ── Onboarding finance gate ──────────────────────────────────────────────────

func TestFinanceCompleteForChildGate(t *testing.T) {
	ctx := context.Background()
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "Gate Family", ChildIDs: []string{"child1"}})
	famID := fam.ID.Hex()
	svc := newTestFinance(repo)

	if svc.FinanceCompleteForChild(ctx, "child1") {
		t.Error("no mandate + no charges must not be complete")
	}

	fam.MandateStatus = models.MandateActive
	if svc.FinanceCompleteForChild(ctx, "child1") {
		t.Error("mandate alone (no first-payment charge) must not be complete")
	}

	dep := repo.addCharge(&models.Charge{FamilyID: famID, ChildID: "child1", AmountPence: 30000, DueDate: "2026-08-01", Status: models.ChargeDue, FirstPayment: true})
	if svc.FinanceCompleteForChild(ctx, "child1") {
		t.Error("unpaid first-payment charge must not be complete")
	}

	dep.Status = models.ChargePaid
	dep.PaidPence = 30000
	if !svc.FinanceCompleteForChild(ctx, "child1") {
		t.Error("active mandate + all first-payment charges paid should be complete")
	}

	fam.MandateStatus = models.MandatePending
	if svc.FinanceCompleteForChild(ctx, "child1") {
		t.Error("pending mandate must not be complete even with paid charges")
	}

	if svc.FinanceCompleteForChild(ctx, "no-such-child") {
		t.Error("a child with no family must not be complete")
	}
}

// ── Webhook transitions + idempotency ────────────────────────────────────────

func TestOnPaymentIntentTransitions(t *testing.T) {
	ctx := context.Background()
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "Webhook Family"})
	famID := fam.ID.Hex()
	c := repo.addCharge(&models.Charge{FamilyID: famID, AmountPence: 25000, DueDate: "2026-08-01", Status: models.ChargeProcessing, StripePaymentIntentID: "pi_1"})
	pay := &models.Payment{FamilyID: famID, AmountPence: 25000, Method: "bacs_debit", Status: models.PaymentProcessing,
		StripePaymentIntentID: "pi_1", Allocations: []models.PaymentAllocation{{ChargeID: c.ID.Hex(), AmountPence: 25000}}}
	_ = repo.PaymentCreate(ctx, pay)
	svc := newTestFinance(repo)

	// Failure first: processing charge flips to failed.
	if err := svc.OnPaymentIntent(ctx, "pi_1", models.PaymentFailed, "insufficient funds"); err != nil {
		t.Fatalf("failed transition: %v", err)
	}
	if got := repo.charges[c.ID.Hex()]; got.Status != models.ChargeFailed {
		t.Errorf("charge should be failed, got %s", got.Status)
	}
	if got := repo.payments[pay.ID.Hex()]; got.Status != models.PaymentFailed || got.FailureNote == "" {
		t.Errorf("payment should be failed with note, got %s", got.Status)
	}

	// Retry succeeds: allocations apply, charge settles.
	if err := svc.OnPaymentIntent(ctx, "pi_1", models.PaymentSucceeded, ""); err != nil {
		t.Fatalf("success transition: %v", err)
	}
	if got := repo.charges[c.ID.Hex()]; got.Status != models.ChargePaid || got.PaidPence != 25000 {
		t.Errorf("charge should be paid in full, got %s / %d", got.Status, got.PaidPence)
	}

	// Same-status redelivery is a no-op (no double allocation).
	if err := svc.OnPaymentIntent(ctx, "pi_1", models.PaymentSucceeded, ""); err != nil {
		t.Fatalf("redelivery: %v", err)
	}
	if got := repo.charges[c.ID.Hex()]; got.PaidPence != 25000 {
		t.Errorf("redelivery must not double-apply allocations: paid %d", got.PaidPence)
	}

	// Unknown intent (e.g. a store checkout) is silently ignored.
	if err := svc.OnPaymentIntent(ctx, "pi_unknown", models.PaymentSucceeded, ""); err != nil {
		t.Errorf("unknown intent should be ignored, got %v", err)
	}
}

func TestMarkEventProcessedIdempotency(t *testing.T) {
	repo := newFakeFinanceRepo()
	svc := newTestFinance(repo)
	if !svc.MarkEventProcessed(context.Background(), "evt_1") {
		t.Error("first delivery should be fresh")
	}
	if svc.MarkEventProcessed(context.Background(), "evt_1") {
		t.Error("duplicate delivery must be rejected")
	}
	if !svc.MarkEventProcessed(context.Background(), "evt_2") {
		t.Error("a different event should be fresh")
	}
}

// ── Charge creation rules ────────────────────────────────────────────────────

func TestCreateChargeRules(t *testing.T) {
	ctx := context.Background()
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "Rules Family", ChildIDs: []string{"childA"}})
	famID := fam.ID.Hex()
	svc := newTestFinance(repo)

	if _, err := svc.CreateCharge(ctx, famID, models.ChargeRequest{Description: "x", AmountPence: 0, DueDate: "2026-09-01"}); err == nil {
		t.Error("zero amount must be rejected")
	}
	if _, err := svc.CreateCharge(ctx, famID, models.ChargeRequest{Description: "x", AmountPence: 100, DueDate: "bad"}); err == nil {
		t.Error("bad due date must be rejected")
	}
	if _, err := svc.CreateCharge(ctx, famID, models.ChargeRequest{ChildID: "stranger", Description: "x", AmountPence: 100, DueDate: "2026-09-01"}); err == nil {
		t.Error("a child outside the family must be rejected")
	}

	past := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	c, err := svc.CreateCharge(ctx, famID, models.ChargeRequest{ChildID: "childA", Description: "Fees", AmountPence: 100, DueDate: past})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if c.Status != models.ChargeDue {
		t.Errorf("past-due charge should start due, got %s", c.Status)
	}

	future := time.Now().AddDate(0, 1, 0).Format("2006-01-02")
	c2, err := svc.CreateCharge(ctx, famID, models.ChargeRequest{ChildID: "childA", Description: "Fees", AmountPence: 100, DueDate: future})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if c2.Status != models.ChargeUpcoming {
		t.Errorf("future charge should start upcoming, got %s", c2.Status)
	}
}

func TestFirstPaymentCreatesGatingCharges(t *testing.T) {
	ctx := context.Background()
	repo := newFakeFinanceRepo()
	fam := repo.addFamily(&models.Family{Name: "FP Family", ChildIDs: []string{"childA"}})
	svc := newTestFinance(repo)

	if _, err := svc.CreateFirstPayment(ctx, fam.ID.Hex(), models.FirstPaymentRequest{ChildID: "childA", DueDate: "2026-09-01"}); err == nil {
		t.Error("first payment with no amounts must be rejected")
	}
	charges, err := svc.CreateFirstPayment(ctx, fam.ID.Hex(), models.FirstPaymentRequest{
		ChildID: "childA", DepositPence: 30000, FirstMonthPence: 120000, DueDate: "2026-09-01",
	})
	if err != nil {
		t.Fatalf("first payment: %v", err)
	}
	if len(charges) != 2 {
		t.Fatalf("expected deposit + first month, got %d charges", len(charges))
	}
	for _, c := range charges {
		if !c.FirstPayment {
			t.Errorf("charge %q must carry the first_payment flag", c.Description)
		}
	}
}
