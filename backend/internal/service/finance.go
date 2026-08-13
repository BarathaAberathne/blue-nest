package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/stripe/stripe-go/v76"
	stripecheckout "github.com/stripe/stripe-go/v76/checkout/session"
	stripecustomer "github.com/stripe/stripe-go/v76/customer"
	stripepaymentintent "github.com/stripe/stripe-go/v76/paymentintent"
)

// FinanceService is the internal financial model: family billing accounts,
// charges (invoices), payments with allocations, schedules and the Stripe
// Bacs Direct Debit lifecycle. Balances are DERIVED (charges − allocated
// payments) — never stored.
type FinanceService interface {
	// EnsureFamily finds (or builds) the child's family from the canonical
	// billing-contact relationships; siblings sharing a parent join the same
	// family automatically.
	EnsureFamily(ctx context.Context, childID string) (*models.Family, error)
	Families(ctx context.Context) ([]models.Family, error)
	FamilyView(ctx context.Context, familyID string) (map[string]any, error)
	FamilyForParent(ctx context.Context, parentID string) (*models.Family, error)

	CreateCharge(ctx context.Context, familyID string, req models.ChargeRequest) (*models.Charge, error)
	// CreateFirstPayment creates the onboarding-gating charges (deposit +
	// first month, per the approved policy).
	CreateFirstPayment(ctx context.Context, familyID string, req models.FirstPaymentRequest) ([]models.Charge, error)
	CreateSchedule(ctx context.Context, familyID string, req models.ScheduleRequest) (*models.PaymentSchedule, error)
	// GenerateDueCharges materialises schedule charges for the current month
	// (idempotent per schedule+month) — called by the scheduler.
	GenerateDueCharges(ctx context.Context) (int, error)

	// Direct Debit via Stripe (Checkout in setup mode, bacs_debit). Returns
	// the hosted setup URL for the parent.
	SetupDirectDebit(ctx context.Context, familyID, successURL, cancelURL string) (string, error)
	// MarkMandateActive records an offline (paper) mandate — audited manager
	// action; also the localhost test path.
	MarkMandateActive(ctx context.Context, familyID, reference string) (*models.Family, error)
	// CollectCharge raises an off-session Bacs PaymentIntent for a charge.
	CollectCharge(ctx context.Context, chargeID string) (*models.Charge, error)
	RecordManualPayment(ctx context.Context, familyID string, req models.ManualPaymentRequest) (*models.Payment, error)

	// MarkEventProcessed inserts the Stripe event id; false = duplicate
	// delivery (already handled) — the webhook idempotency guard.
	MarkEventProcessed(ctx context.Context, eventID string) bool
	// Stripe webhook entries (guarded by MarkEventProcessed in the handler).
	OnSetupCompleted(ctx context.Context, customerID, paymentMethodID, mandateID string) error
	OnPaymentIntent(ctx context.Context, intentID string, status models.PaymentStatus, failureNote string) error

	// FinanceCompleteForChild: mandate active AND every first-payment charge
	// of the child's family paid — the onboarding gate.
	FinanceCompleteForChild(ctx context.Context, childID string) bool
	Dashboard(ctx context.Context) (map[string]any, error)

	// RunReminderSweep generates schedule charges, refreshes overdue statuses
	// and sends the scheduled fee reminders (upcoming 7/3/0 days, overdue
	// 3/7/14 days, weekly DD-incomplete nudges). Idempotent per rule via the
	// communication-log dedup key; ctx must be org-scoped (the scheduler
	// iterates orgs).
	RunReminderSweep(ctx context.Context) (int, error)
	// SendChargeReminder sends a manual reminder for one charge right now.
	SendChargeReminder(ctx context.Context, chargeID string) (*models.CommunicationLog, error)
	Communications(ctx context.Context, familyID string) ([]models.CommunicationLog, error)
}

type financeService struct {
	repo     repository.FinanceRepository
	rels     repository.ChildParentRepository
	parents  repository.ParentRepository
	children repository.ChildRepository
	counters repository.CounterRepository
	users    repository.UserRepository
	notifs   NotificationService
	emailTpl EmailTemplateService
	stripeOn bool
}

func NewFinanceService(repo repository.FinanceRepository, rels repository.ChildParentRepository, parents repository.ParentRepository, children repository.ChildRepository, counters repository.CounterRepository, users repository.UserRepository, notifs NotificationService, emailTpl EmailTemplateService, stripeConfigured bool) FinanceService {
	return &financeService{repo: repo, rels: rels, parents: parents, children: children, counters: counters, users: users, notifs: notifs, emailTpl: emailTpl, stripeOn: stripeConfigured}
}

// notifyFamily sends a finance notification to the family's billing parent
// (their portal user) and, when includeFinance is set, every user holding
// finance.manage. Best-effort — finance actions never fail on notification
// problems.
// notifyFamily notifies the billing parent (with a PARENT-facing link) and,
// when includeFinance is set, finance-manage staff (with the staff link the
// caller supplied in n.Link). Parents must never receive /admin URLs.
func (s *financeService) notifyFamily(ctx context.Context, f *models.Family, includeFinance bool, n models.Notification) {
	if s.notifs == nil || f == nil {
		return
	}
	n.EntityType = "family"
	n.EntityID = f.ID.Hex()

	if p, err := s.parents.FindByID(ctx, f.BillingParentID); err == nil && p != nil && p.UserID != "" {
		parentNotif := n
		parentNotif.Link = "/portal/payments"
		_ = s.notifs.NotifyMany(ctx, []string{p.UserID}, parentNotif)
	}
	if includeFinance && s.users != nil {
		orgID, _ := repository.OrgFromContext(ctx)
		var staff []string
		if users, err := s.users.FindAll(ctx); err == nil {
			for _, u := range users {
				if models.HasPermission(orgID, u.Role, models.PermFinanceManage) {
					staff = append(staff, u.ID.Hex())
				}
			}
		}
		_ = s.notifs.NotifyMany(ctx, staff, n)
	}
}

func (s *financeService) ref(ctx context.Context, counter, prefix string) string {
	if s.counters == nil {
		return ""
	}
	year := time.Now().Year()
	if seq, err := s.counters.Next(ctx, counter+"-"+strconv.Itoa(year)); err == nil {
		return models.FormatRef(prefix, year, seq)
	}
	return ""
}

// ── Families ─────────────────────────────────────────────────────────────────

func (s *financeService) EnsureFamily(ctx context.Context, childID string) (*models.Family, error) {
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return nil, errors.New("child not found")
	}
	if f, err := s.repo.FamilyByChild(ctx, childID); err == nil {
		return f, nil
	}
	rels, err := s.rels.FindByChild(ctx, childID)
	if err != nil || len(rels) == 0 {
		return nil, errors.New("link a parent to the child before creating the family account")
	}
	// A sibling's parent may already own a family — join it.
	for _, r := range rels {
		if f, err := s.repo.FamilyByParent(ctx, r.ParentID); err == nil {
			f.ChildIDs = appendUnique(f.ChildIDs, childID)
			for _, rr := range rels {
				f.ParentIDs = appendUnique(f.ParentIDs, rr.ParentID)
			}
			return s.repo.FamilyUpdate(ctx, f.ID.Hex(), *f)
		}
	}
	// New family: billing contact preferred, else the first parent.
	billing := rels[0]
	for _, r := range rels {
		if r.BillingContact {
			billing = r
			break
		}
	}
	name := child.LastName + " Family"
	if p, err := s.parents.FindByID(ctx, billing.ParentID); err == nil && p != nil && p.LastName != "" {
		name = p.LastName + " Family"
	}
	f := &models.Family{
		Name: name, BillingParentID: billing.ParentID, ChildIDs: []string{childID},
		Ref: s.ref(ctx, models.CounterFamily, models.RefPrefixFamily),
	}
	for _, r := range rels {
		f.ParentIDs = appendUnique(f.ParentIDs, r.ParentID)
	}
	if err := s.repo.FamilyCreate(ctx, f); err != nil {
		return nil, err
	}
	return f, nil
}

func (s *financeService) Families(ctx context.Context) ([]models.Family, error) {
	fams, err := s.repo.FamiliesAll(ctx)
	if err != nil {
		return nil, err
	}
	for i := range fams {
		fams[i].BalancePence = s.balance(ctx, fams[i].ID.Hex())
		if p, err := s.parents.FindByID(ctx, fams[i].BillingParentID); err == nil && p != nil {
			fams[i].BillingParentName = strings.TrimSpace(p.FirstName + " " + p.LastName)
		}
	}
	return fams, nil
}

// balance = outstanding charges (amount − paid) across non-cancelled charges.
func (s *financeService) balance(ctx context.Context, familyID string) int64 {
	charges, err := s.repo.ChargesByFamily(ctx, familyID)
	if err != nil {
		return 0
	}
	var out int64
	for _, c := range charges {
		if c.Status == models.ChargeCancelled || c.Status == models.ChargeWrittenOff || c.Status == models.ChargeDraft {
			continue
		}
		out += c.AmountPence - c.PaidPence
	}
	return out
}

func (s *financeService) FamilyView(ctx context.Context, familyID string) (map[string]any, error) {
	f, err := s.repo.FamilyByID(ctx, familyID)
	if err != nil {
		return nil, errors.New("family not found")
	}
	f.BalancePence = s.balance(ctx, familyID)
	if p, err := s.parents.FindByID(ctx, f.BillingParentID); err == nil && p != nil {
		f.BillingParentName = strings.TrimSpace(p.FirstName + " " + p.LastName)
	}
	charges, _ := s.repo.ChargesByFamily(ctx, familyID)
	s.refreshOverdue(ctx, charges)
	for i := range charges {
		if charges[i].ChildID != "" {
			if c, err := s.children.FindByID(ctx, charges[i].ChildID); err == nil && c != nil {
				charges[i].ChildName = strings.TrimSpace(c.FirstName + " " + c.LastName)
			}
		}
	}
	payments, _ := s.repo.PaymentsByFamily(ctx, familyID)
	schedules, _ := s.repo.SchedulesByFamily(ctx, familyID)

	// Next payment = the earliest unpaid, non-terminal charge.
	var next *models.Charge
	for i := range charges {
		c := charges[i]
		if c.Status == models.ChargeUpcoming || c.Status == models.ChargeDue || c.Status == models.ChargeOverdue || c.Status == models.ChargePartiallyPaid || c.Status == models.ChargeFailed {
			next = &charges[i]
			break
		}
	}
	return map[string]any{
		"family": f, "charges": charges, "payments": payments, "schedules": schedules,
		"next_payment": next,
	}, nil
}

func (s *financeService) FamilyForParent(ctx context.Context, parentID string) (*models.Family, error) {
	f, err := s.repo.FamilyByParent(ctx, parentID)
	if err != nil {
		return nil, errors.New("no family account yet")
	}
	return f, nil
}

// refreshOverdue lazily flips upcoming/due → due/overdue by date (derivation
// on read; the scheduler also sweeps).
func (s *financeService) refreshOverdue(ctx context.Context, charges []models.Charge) {
	today := time.Now().Format("2006-01-02")
	for i := range charges {
		c := &charges[i]
		var want models.ChargeStatus
		switch c.Status {
		case models.ChargeUpcoming:
			if c.DueDate <= today {
				want = models.ChargeDue
			}
		case models.ChargeDue, models.ChargeFailed:
			if c.DueDate < today {
				want = models.ChargeOverdue
			}
		}
		if want != "" {
			c.Status = want
			if updated, err := s.repo.ChargeUpdate(ctx, c.ID.Hex(), *c); err == nil {
				charges[i] = *updated
			}
		}
	}
}

// ── Charges & schedules ──────────────────────────────────────────────────────

func (s *financeService) CreateCharge(ctx context.Context, familyID string, req models.ChargeRequest) (*models.Charge, error) {
	f, err := s.repo.FamilyByID(ctx, familyID)
	if err != nil {
		return nil, errors.New("family not found")
	}
	if req.AmountPence <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if _, err := time.Parse("2006-01-02", req.DueDate); err != nil {
		return nil, errors.New("due_date must be YYYY-MM-DD")
	}
	if req.ChildID != "" && !contains(f.ChildIDs, req.ChildID) {
		return nil, errors.New("that child is not part of this family")
	}
	status := models.ChargeUpcoming
	if req.DueDate <= time.Now().Format("2006-01-02") {
		status = models.ChargeDue
	}
	c := &models.Charge{
		FamilyID: familyID, ChildID: req.ChildID, Description: strings.TrimSpace(req.Description),
		AmountPence: req.AmountPence, DueDate: req.DueDate, Status: status,
		FirstPayment: req.FirstPayment,
		Ref:          s.ref(ctx, models.CounterCharge, "INV"),
	}
	if err := s.repo.ChargeCreate(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *financeService) CreateFirstPayment(ctx context.Context, familyID string, req models.FirstPaymentRequest) ([]models.Charge, error) {
	if req.DepositPence <= 0 && req.FirstMonthPence <= 0 {
		return nil, errors.New("a deposit and/or first month amount is required")
	}
	out := []models.Charge{}
	if req.DepositPence > 0 {
		c, err := s.CreateCharge(ctx, familyID, models.ChargeRequest{
			ChildID: req.ChildID, Description: "Deposit", AmountPence: req.DepositPence,
			DueDate: req.DueDate, FirstPayment: true,
		})
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	if req.FirstMonthPence > 0 {
		c, err := s.CreateCharge(ctx, familyID, models.ChargeRequest{
			ChildID: req.ChildID, Description: "First month's fees", AmountPence: req.FirstMonthPence,
			DueDate: req.DueDate, FirstPayment: true,
		})
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, nil
}

func (s *financeService) CreateSchedule(ctx context.Context, familyID string, req models.ScheduleRequest) (*models.PaymentSchedule, error) {
	f, err := s.repo.FamilyByID(ctx, familyID)
	if err != nil {
		return nil, errors.New("family not found")
	}
	if !contains(f.ChildIDs, req.ChildID) {
		return nil, errors.New("that child is not part of this family")
	}
	if req.DayOfMonth < 1 || req.DayOfMonth > 28 {
		return nil, errors.New("day_of_month must be 1-28")
	}
	if _, err := time.Parse("2006-01", req.StartMonth); err != nil {
		return nil, errors.New("start_month must be YYYY-MM")
	}
	sched := &models.PaymentSchedule{
		FamilyID: familyID, ChildID: req.ChildID, AmountPence: req.AmountPence,
		DayOfMonth: req.DayOfMonth, StartMonth: req.StartMonth, EndMonth: req.EndMonth, Active: true,
	}
	if err := s.repo.ScheduleCreate(ctx, sched); err != nil {
		return nil, err
	}
	return sched, nil
}

func (s *financeService) GenerateDueCharges(ctx context.Context) (int, error) {
	scheds, err := s.repo.SchedulesActive(ctx)
	if err != nil {
		return 0, err
	}
	month := time.Now().Format("2006-01")
	created := 0
	for _, sc := range scheds {
		if sc.StartMonth > month || (sc.EndMonth != "" && sc.EndMonth < month) || sc.LastGenerated >= month {
			continue
		}
		due := fmt.Sprintf("%s-%02d", month, sc.DayOfMonth)
		if _, err := s.CreateCharge(ctx, sc.FamilyID, models.ChargeRequest{
			ChildID: sc.ChildID, Description: "Monthly fees " + month, AmountPence: sc.AmountPence, DueDate: due,
		}); err != nil {
			continue
		}
		sc.LastGenerated = month
		_, _ = s.repo.ScheduleUpdate(ctx, sc.ID.Hex(), sc)
		created++
	}
	return created, nil
}

// ── Direct Debit (Stripe Bacs) ───────────────────────────────────────────────

func (s *financeService) ensureCustomer(ctx context.Context, f *models.Family) (string, error) {
	if f.StripeCustomerID != "" {
		return f.StripeCustomerID, nil
	}
	p, err := s.parents.FindByID(ctx, f.BillingParentID)
	if err != nil || p == nil || p.Email == "" {
		return "", errors.New("the billing parent needs an email address first")
	}
	params := &stripe.CustomerParams{
		Email: stripe.String(p.Email),
		Name:  stripe.String(strings.TrimSpace(p.FirstName + " " + p.LastName)),
	}
	params.AddMetadata("family_id", f.ID.Hex())
	cus, err := stripecustomer.New(params)
	if err != nil {
		return "", err
	}
	f.StripeCustomerID = cus.ID
	if _, err := s.repo.FamilyUpdate(ctx, f.ID.Hex(), *f); err != nil {
		return "", err
	}
	return cus.ID, nil
}

func (s *financeService) SetupDirectDebit(ctx context.Context, familyID, successURL, cancelURL string) (string, error) {
	if !s.stripeOn {
		return "", errors.New("online Direct Debit is not configured — record a paper mandate instead")
	}
	f, err := s.repo.FamilyByID(ctx, familyID)
	if err != nil {
		return "", errors.New("family not found")
	}
	cusID, err := s.ensureCustomer(ctx, f)
	if err != nil {
		return "", err
	}
	params := &stripe.CheckoutSessionParams{
		Mode:               stripe.String(string(stripe.CheckoutSessionModeSetup)),
		Customer:           stripe.String(cusID),
		PaymentMethodTypes: stripe.StringSlice([]string{"bacs_debit"}),
		SuccessURL:         stripe.String(successURL),
		CancelURL:          stripe.String(cancelURL),
	}
	params.AddMetadata("family_id", familyID)
	sess, err := stripecheckout.New(params)
	if err != nil {
		return "", err
	}
	f.DDSetupSessionID = sess.ID
	f.MandateStatus = models.MandatePending
	if _, err := s.repo.FamilyUpdate(ctx, familyID, *f); err != nil {
		return "", err
	}
	return sess.URL, nil
}

func (s *financeService) MarkMandateActive(ctx context.Context, familyID, reference string) (*models.Family, error) {
	f, err := s.repo.FamilyByID(ctx, familyID)
	if err != nil {
		return nil, errors.New("family not found")
	}
	f.MandateStatus = models.MandateActive
	if reference != "" {
		f.StripeMandateID = reference // offline mandate reference
	}
	updated, err := s.repo.FamilyUpdate(ctx, familyID, *f)
	if err != nil {
		return nil, err
	}
	s.notifyFamily(ctx, updated, true, models.Notification{
		Type:  models.NotifDDActive,
		Title: "Direct Debit active",
		Body:  "A Direct Debit mandate for " + updated.Name + " is now active.",
		Link:  "/admin/finance/" + updated.ID.Hex(),
	})
	return updated, nil
}

func (s *financeService) CollectCharge(ctx context.Context, chargeID string) (*models.Charge, error) {
	c, err := s.repo.ChargeByID(ctx, chargeID)
	if err != nil {
		return nil, errors.New("charge not found")
	}
	f, err := s.repo.FamilyByID(ctx, c.FamilyID)
	if err != nil {
		return nil, errors.New("family not found")
	}
	if !s.stripeOn {
		return nil, errors.New("online collection is not configured — record a manual payment instead")
	}
	if f.MandateStatus != models.MandateActive || f.StripePaymentMethodID == "" {
		return nil, errors.New("the family's Direct Debit mandate is not active")
	}
	remaining := c.AmountPence - c.PaidPence
	if remaining <= 0 {
		return nil, errors.New("this charge is already settled")
	}
	params := &stripe.PaymentIntentParams{
		Amount:             stripe.Int64(remaining),
		Currency:           stripe.String("gbp"),
		Customer:           stripe.String(f.StripeCustomerID),
		PaymentMethod:      stripe.String(f.StripePaymentMethodID),
		PaymentMethodTypes: stripe.StringSlice([]string{"bacs_debit"}),
		OffSession:         stripe.Bool(true),
		Confirm:            stripe.Bool(true),
	}
	params.AddMetadata("family_id", c.FamilyID)
	params.AddMetadata("charge_id", chargeID)
	pi, err := stripepaymentintent.New(params)
	if err != nil {
		return nil, err
	}
	c.StripePaymentIntentID = pi.ID
	c.Status = models.ChargeProcessing
	updated, err := s.repo.ChargeUpdate(ctx, chargeID, *c)
	if err != nil {
		return nil, err
	}
	_ = s.repo.PaymentCreate(ctx, &models.Payment{
		FamilyID: c.FamilyID, AmountPence: remaining, Method: "bacs_debit",
		Status: models.PaymentProcessing, StripePaymentIntentID: pi.ID,
		Allocations: []models.PaymentAllocation{{ChargeID: chargeID, AmountPence: remaining}},
	})
	return updated, nil
}

func (s *financeService) RecordManualPayment(ctx context.Context, familyID string, req models.ManualPaymentRequest) (*models.Payment, error) {
	if req.AmountPence <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if _, err := s.repo.FamilyByID(ctx, familyID); err != nil {
		return nil, errors.New("family not found")
	}
	p := &models.Payment{
		FamilyID: familyID, AmountPence: req.AmountPence, Method: "manual",
		Status: models.PaymentSucceeded, FailureNote: "", Allocations: req.Allocations,
	}
	// Unallocated manual payments auto-allocate oldest-first.
	if len(p.Allocations) == 0 {
		p.Allocations = s.autoAllocate(ctx, familyID, req.AmountPence)
	}
	if err := s.repo.PaymentCreate(ctx, p); err != nil {
		return nil, err
	}
	s.applyAllocations(ctx, p.Allocations)
	if f, err := s.repo.FamilyByID(ctx, familyID); err == nil {
		s.notifyFamily(ctx, f, false, models.Notification{
			Type:  models.NotifPaymentReceived,
			Title: "Payment received",
			Body:  "We received a payment of £" + fmt.Sprintf("%.2f", float64(req.AmountPence)/100) + " — thank you.",
			Link:  "/portal",
		})
	}
	return p, nil
}

func (s *financeService) autoAllocate(ctx context.Context, familyID string, amount int64) []models.PaymentAllocation {
	charges, err := s.repo.ChargesByFamily(ctx, familyID)
	if err != nil {
		return nil
	}
	out := []models.PaymentAllocation{}
	for _, c := range charges {
		if amount <= 0 {
			break
		}
		if c.Status == models.ChargePaid || c.Status == models.ChargeCancelled || c.Status == models.ChargeWrittenOff || c.Status == models.ChargeDraft {
			continue
		}
		remaining := c.AmountPence - c.PaidPence
		if remaining <= 0 {
			continue
		}
		take := remaining
		if amount < take {
			take = amount
		}
		out = append(out, models.PaymentAllocation{ChargeID: c.ID.Hex(), AmountPence: take})
		amount -= take
	}
	return out
}

// applyAllocations settles charges from successful payment allocations.
func (s *financeService) applyAllocations(ctx context.Context, allocs []models.PaymentAllocation) {
	now := time.Now()
	for _, a := range allocs {
		c, err := s.repo.ChargeByID(ctx, a.ChargeID)
		if err != nil {
			continue
		}
		c.PaidPence += a.AmountPence
		if c.PaidPence >= c.AmountPence {
			c.Status = models.ChargePaid
			c.PaidAt = &now
		} else {
			c.Status = models.ChargePartiallyPaid
		}
		_, _ = s.repo.ChargeUpdate(ctx, a.ChargeID, *c)
	}
}

// ── Webhook entries ──────────────────────────────────────────────────────────

func (s *financeService) MarkEventProcessed(ctx context.Context, eventID string) bool {
	fresh, err := s.repo.MarkEventProcessed(ctx, eventID)
	return err == nil && fresh
}

func (s *financeService) OnSetupCompleted(ctx context.Context, customerID, paymentMethodID, mandateID string) error {
	f, err := s.repo.FamilyByCustomer(ctx, customerID)
	if err != nil {
		return errors.New("no family for Stripe customer " + customerID)
	}
	f.StripePaymentMethodID = paymentMethodID
	f.StripeMandateID = mandateID
	f.MandateStatus = models.MandateActive
	updated, err := s.repo.FamilyUpdate(ctx, f.ID.Hex(), *f)
	if err != nil {
		return err
	}
	s.notifyFamily(ctx, updated, true, models.Notification{
		Type:  models.NotifDDActive,
		Title: "Direct Debit active",
		Body:  "The Direct Debit mandate for " + updated.Name + " is now active.",
		Link:  "/admin/finance/" + updated.ID.Hex(),
	})
	return nil
}

func (s *financeService) OnPaymentIntent(ctx context.Context, intentID string, status models.PaymentStatus, failureNote string) error {
	p, err := s.repo.PaymentByIntent(ctx, intentID)
	if err != nil {
		return nil // not a finance intent (e.g. a store checkout) — ignore
	}
	if p.Status == status {
		return nil
	}
	p.Status = status
	p.FailureNote = failureNote
	if _, err := s.repo.PaymentUpdate(ctx, p.ID.Hex(), *p); err != nil {
		return err
	}
	switch status {
	case models.PaymentSucceeded:
		s.applyAllocations(ctx, p.Allocations)
		if f, err := s.repo.FamilyByID(ctx, p.FamilyID); err == nil {
			s.notifyFamily(ctx, f, false, models.Notification{
				Type:  models.NotifPaymentReceived,
				Title: "Payment received",
				Body:  "Your Direct Debit payment of £" + fmt.Sprintf("%.2f", float64(p.AmountPence)/100) + " was collected — thank you.",
				Link:  "/portal",
			})
		}
	case models.PaymentFailed:
		for _, a := range p.Allocations {
			if c, err := s.repo.ChargeByID(ctx, a.ChargeID); err == nil && c.Status == models.ChargeProcessing {
				c.Status = models.ChargeFailed
				_, _ = s.repo.ChargeUpdate(ctx, a.ChargeID, *c)
			}
		}
		if f, err := s.repo.FamilyByID(ctx, p.FamilyID); err == nil {
			s.notifyFamily(ctx, f, true, models.Notification{
				Type:  models.NotifPaymentFailed,
				Title: "Payment failed",
				Body:  "A Direct Debit payment of £" + fmt.Sprintf("%.2f", float64(p.AmountPence)/100) + " for " + f.Name + " failed" + failureSuffix(failureNote),
				Link:  "/admin/finance/" + f.ID.Hex(),
			})
		}
	}
	return nil
}

func failureSuffix(note string) string {
	if note == "" {
		return "."
	}
	return ": " + note
}

// ── Onboarding gate + dashboard ──────────────────────────────────────────────

func (s *financeService) FinanceCompleteForChild(ctx context.Context, childID string) bool {
	f, err := s.repo.FamilyByChild(ctx, childID)
	if err != nil {
		return false
	}
	if f.MandateStatus != models.MandateActive {
		return false
	}
	charges, err := s.repo.ChargesByFamily(ctx, f.ID.Hex())
	if err != nil {
		return false
	}
	sawFirst := false
	for _, c := range charges {
		if !c.FirstPayment {
			continue
		}
		sawFirst = true
		if c.Status != models.ChargePaid {
			return false
		}
	}
	return sawFirst
}

func (s *financeService) Dashboard(ctx context.Context) (map[string]any, error) {
	charges, err := s.repo.ChargesAll(ctx)
	if err != nil {
		return nil, err
	}
	s.refreshOverdue(ctx, charges)
	fams, _ := s.repo.FamiliesAll(ctx)
	today := time.Now()
	weekEnd := today.AddDate(0, 0, 7).Format("2006-01-02")
	month := today.Format("2006-01")
	var outstanding, dueThisWeek, overdue, failed, expectedMonth, collectedMonth int64
	var overdueCount, failedCount int
	for _, c := range charges {
		rem := c.AmountPence - c.PaidPence
		switch c.Status {
		case models.ChargeCancelled, models.ChargeWrittenOff, models.ChargeDraft:
			continue
		case models.ChargeOverdue:
			overdue += rem
			overdueCount++
		case models.ChargeFailed:
			failed += rem
			failedCount++
		}
		if rem > 0 {
			outstanding += rem
			if c.DueDate <= weekEnd {
				dueThisWeek += rem
			}
		}
		if strings.HasPrefix(c.DueDate, month) {
			expectedMonth += c.AmountPence
			collectedMonth += c.PaidPence
		}
	}
	noDD := 0
	for _, f := range fams {
		if f.MandateStatus != models.MandateActive {
			noDD++
		}
	}
	return map[string]any{
		"outstanding_pence":     outstanding,
		"due_this_week_pence":   dueThisWeek,
		"overdue_pence":         overdue,
		"overdue_count":         overdueCount,
		"failed_pence":          failed,
		"failed_count":          failedCount,
		"expected_month_pence":  expectedMonth,
		"collected_month_pence": collectedMonth,
		"families_total":        len(fams),
		"families_without_dd":   noDD,
	}, nil
}

// ── Reminders (scheduler + manual) ───────────────────────────────────────────

// Reminder offsets in days relative to the due date (negative = before due).
var upcomingReminderDays = []int{7, 3, 0}
var overdueReminderDays = []int{3, 7, 14}

func formatPence(p int64) string {
	return fmt.Sprintf("£%.2f", float64(p)/100)
}

// reminderCopy resolves the reminder subject/body — the org's customised
// payment_reminder email template when one exists, else the built-in copy.
func (s *financeService) reminderCopy(ctx context.Context, f *models.Family, c *models.Charge) (string, string) {
	parentName := "there"
	if s.parents != nil {
		if p, err := s.parents.FindByID(ctx, f.BillingParentID); err == nil && p != nil && p.FirstName != "" {
			parentName = p.FirstName
		}
	}
	vars := map[string]string{
		"parent_name": parentName,
		"family_name": f.Name,
		"description": c.Description,
		"amount_due":  formatPence(c.AmountPence - c.PaidPence),
		"due_date":    c.DueDate,
	}
	if s.emailTpl != nil {
		if subject, body, ok := s.emailTpl.Render(ctx, models.EmailTplPaymentReminder, vars); ok {
			return subject, body
		}
	}
	info := models.EmailTemplateInfoFor(models.EmailTplPaymentReminder)
	subject, body := info.DefaultSubject, info.DefaultBody
	for k, v := range vars {
		subject = strings.ReplaceAll(subject, "{{"+k+"}}", v)
		body = strings.ReplaceAll(body, "{{"+k+"}}", v)
	}
	return subject, body
}

// sendReminder notifies the billing parent (in-app + email via the
// notification module, honouring their preferences) and writes the
// communication-log row. key dedupes scheduled sends; manual sends pass "".
func (s *financeService) sendReminder(ctx context.Context, f *models.Family, c *models.Charge, kind, key string) (*models.CommunicationLog, error) {
	if key != "" && s.repo.CommLogExists(ctx, key) {
		return nil, nil
	}
	subject, body := s.reminderCopy(ctx, f, c)
	s.notifyFamily(ctx, f, false, models.Notification{
		Type:  models.NotifPaymentReminder,
		Title: subject,
		Body:  body,
		Link:  "/portal",
	})
	log := &models.CommunicationLog{
		FamilyID: f.ID.Hex(), ChargeID: c.ID.Hex(), Kind: kind, Key: key,
		Subject: subject, Body: body,
	}
	if err := s.repo.CommLogCreate(ctx, log); err != nil {
		return nil, err
	}
	return log, nil
}

func (s *financeService) RunReminderSweep(ctx context.Context) (int, error) {
	_, _ = s.GenerateDueCharges(ctx)
	charges, err := s.repo.ChargesAll(ctx)
	if err != nil {
		return 0, err
	}
	s.refreshOverdue(ctx, charges)
	today := time.Now().Truncate(24 * time.Hour)
	sent := 0
	famCache := map[string]*models.Family{}
	family := func(id string) *models.Family {
		if f, ok := famCache[id]; ok {
			return f
		}
		f, err := s.repo.FamilyByID(ctx, id)
		if err != nil {
			famCache[id] = nil
			return nil
		}
		famCache[id] = f
		return f
	}

	for i := range charges {
		c := &charges[i]
		switch c.Status {
		case models.ChargeUpcoming, models.ChargeDue, models.ChargeOverdue, models.ChargePartiallyPaid, models.ChargeFailed:
		default:
			continue
		}
		due, err := time.Parse("2006-01-02", c.DueDate)
		if err != nil {
			continue
		}
		delta := int(due.Sub(today).Hours() / 24) // >0 upcoming, <0 overdue
		var kind, key string
		switch {
		case delta > 0:
			for _, d := range upcomingReminderDays {
				if delta == d {
					kind, key = "reminder_upcoming", fmt.Sprintf("upcoming-%d:%s", d, c.ID.Hex())
				}
			}
		case delta == 0:
			kind, key = "reminder_due", "due-0:"+c.ID.Hex()
		default:
			for _, d := range overdueReminderDays {
				if -delta == d {
					kind, key = "reminder_overdue", fmt.Sprintf("overdue-%d:%s", d, c.ID.Hex())
				}
			}
		}
		if kind == "" {
			continue
		}
		f := family(c.FamilyID)
		if f == nil {
			continue
		}
		if log, err := s.sendReminder(ctx, f, c, kind, key); err == nil && log != nil {
			sent++
		}
	}

	// Weekly DD-incomplete nudge for families with outstanding charges but no
	// active mandate.
	year, week := time.Now().ISOWeek()
	fams, _ := s.repo.FamiliesAll(ctx)
	for i := range fams {
		f := &fams[i]
		if f.MandateStatus == models.MandateActive {
			continue
		}
		if s.balance(ctx, f.ID.Hex()) <= 0 {
			continue
		}
		key := fmt.Sprintf("dd:%s:%d-%02d", f.ID.Hex(), year, week)
		if s.repo.CommLogExists(ctx, key) {
			continue
		}
		body := "Your Direct Debit for " + f.Name + " has not been set up yet. Please sign in to the parent portal to complete it, or contact the nursery for a paper mandate."
		s.notifyFamily(ctx, f, false, models.Notification{
			Type:  models.NotifDDIncomplete,
			Title: "Direct Debit setup needed",
			Body:  body,
			Link:  "/portal",
		})
		if err := s.repo.CommLogCreate(ctx, &models.CommunicationLog{
			FamilyID: f.ID.Hex(), Kind: "dd_incomplete", Key: key,
			Subject: "Direct Debit setup needed", Body: body,
		}); err == nil {
			sent++
		}
	}
	return sent, nil
}

func (s *financeService) SendChargeReminder(ctx context.Context, chargeID string) (*models.CommunicationLog, error) {
	c, err := s.repo.ChargeByID(ctx, chargeID)
	if err != nil {
		return nil, errors.New("charge not found")
	}
	if c.AmountPence-c.PaidPence <= 0 || c.Status == models.ChargeCancelled || c.Status == models.ChargeWrittenOff {
		return nil, errors.New("this charge has nothing outstanding")
	}
	f, err := s.repo.FamilyByID(ctx, c.FamilyID)
	if err != nil {
		return nil, errors.New("family not found")
	}
	log, err := s.sendReminder(ctx, f, c, "manual_reminder", "")
	if err != nil {
		return nil, err
	}
	return log, nil
}

func (s *financeService) Communications(ctx context.Context, familyID string) ([]models.CommunicationLog, error) {
	return s.repo.CommLogsByFamily(ctx, familyID)
}
