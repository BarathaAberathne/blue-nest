package service

import (
	"context"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// ── Profile completeness + onboarding status (derived, never stored) ─────────
//
// Completeness is a WEIGHTED category model (not a naive field count); the
// onboarding status is derived from the same inputs. Both recompute on read,
// so they can never drift from reality. Weights follow the approved plan and
// become org-configurable when finance policy settings land (P5/P6).

type CompletenessCategory struct {
	Key     string   `json:"key"`
	Label   string   `json:"label"`
	Weight  int      `json:"weight"`  // out of 100 across all categories
	Percent int      `json:"percent"` // 0–100 within the category
	Missing []string `json:"missing,omitempty"`
}

type OnboardingView struct {
	ChildID    string                 `json:"child_id"`
	ChildName  string                 `json:"child_name,omitempty"`
	BranchSlug string                 `json:"branch_slug,omitempty"`
	Percent    int                    `json:"percent"`
	Status     string                 `json:"status"`
	Categories []CompletenessCategory `json:"categories"`
	Induction  models.InductionStatus `json:"induction_status"`
}

// Onboarding statuses (derived).
const (
	OnbRegistrationStarted  = "registration_started"
	OnbInductionRequired    = "induction_required"
	OnbInductionInProgress  = "induction_in_progress"
	OnbAwaitingReview       = "awaiting_review"
	OnbFinanceSetupRequired = "finance_setup_required"
	OnbReadyToStart         = "ready_to_start"
	OnbActive               = "active"
	OnbWithdrawn            = "withdrawn"
)

var defaultWeights = map[string]int{
	"child_info": 20, "parents": 15, "emergency_contacts": 10,
	"medical": 15, "consents": 10, "induction": 15, "finance": 15,
}

// onboardingInputs carries everything the pure calculator needs — assembled
// by the service, computed by computeOnboarding (unit-testable without Mongo).
type onboardingInputs struct {
	Child     models.Child
	Induction *models.ChildInduction
	Rels      []models.ChildParentRelationship
	Consents  []models.Consent
	// FinanceComplete is wired in by the finance module (P5); nil = module
	// not yet reporting → finance requirements outstanding.
	FinanceComplete *bool
}

func computeOnboarding(in onboardingInputs) OnboardingView {
	v := OnboardingView{
		ChildID:    in.Child.ID.Hex(),
		ChildName:  strings.TrimSpace(in.Child.FirstName + " " + in.Child.LastName),
		BranchSlug: in.Child.BranchSlug,
		Induction:  models.InductionNotStarted,
	}
	if in.Induction != nil {
		v.Induction = in.Induction.Status
	}

	// ── child_info ──
	ci := CompletenessCategory{Key: "child_info", Label: "Child information", Weight: defaultWeights["child_info"]}
	fields := []struct {
		ok      bool
		missing string
	}{
		{in.Child.DOB != "", "Date of birth"},
		{in.Child.Gender != "", "Gender"},
		{in.Child.StartDate != "", "Start date"},
		{in.Child.Address != "", "Home address"},
	}
	done := 0
	for _, f := range fields {
		if f.ok {
			done++
		} else {
			ci.Missing = append(ci.Missing, f.missing)
		}
	}
	ci.Percent = done * 100 / len(fields)

	// ── parents ──
	pa := CompletenessCategory{Key: "parents", Label: "Parent / guardian information", Weight: defaultWeights["parents"]}
	hasPR := false
	for _, r := range in.Rels {
		if r.ParentalResponsibility {
			hasPR = true
			break
		}
	}
	switch {
	case len(in.Rels) == 0:
		pa.Missing = append(pa.Missing, "Link at least one parent or guardian")
	case !hasPR:
		pa.Percent = 50
		pa.Missing = append(pa.Missing, "Mark who holds parental responsibility")
	default:
		pa.Percent = 100
	}

	// ── emergency_contacts ──
	ec := CompletenessCategory{Key: "emergency_contacts", Label: "Emergency contacts", Weight: defaultWeights["emergency_contacts"]}
	emergencies := 0
	for _, r := range in.Rels {
		if r.EmergencyContact {
			emergencies++
		}
	}
	switch {
	case emergencies >= 2:
		ec.Percent = 100
	case emergencies == 1:
		ec.Percent = 50
		ec.Missing = append(ec.Missing, "Add a second emergency contact")
	default:
		ec.Missing = append(ec.Missing, "Add an emergency contact")
	}

	// ── medical (health + allergies sections of the induction) ──
	me := CompletenessCategory{Key: "medical", Label: "Medical, allergy & dietary", Weight: defaultWeights["medical"]}
	sec := func(key string) bool {
		if in.Induction == nil {
			return false
		}
		s, ok := in.Induction.Sections[key]
		return ok && s.Complete
	}
	half := 0
	if sec("health") {
		half++
	} else {
		me.Missing = append(me.Missing, "Complete the health & immunisations section")
	}
	if sec("allergies_dietary") {
		half++
	} else {
		me.Missing = append(me.Missing, "Confirm allergy & dietary information")
	}
	me.Percent = half * 50

	// ── consents ──
	co := CompletenessCategory{Key: "consents", Label: "Permissions & consents", Weight: defaultWeights["consents"]}
	latest := LatestConsents(in.Consents)
	requiredTotal, decided := 0, 0
	for _, def := range models.ConsentCatalogue {
		if !def.Required {
			continue
		}
		requiredTotal++
		if _, ok := latest[def.Key]; ok {
			decided++
		} else {
			co.Missing = append(co.Missing, "Sign: "+def.Label)
		}
	}
	if requiredTotal > 0 {
		co.Percent = decided * 100 / requiredTotal
	}

	// ── induction (required sections) ──
	ind := CompletenessCategory{Key: "induction", Label: "Induction form", Weight: defaultWeights["induction"]}
	reqTotal, reqDone := 0, 0
	for _, def := range models.InductionSections {
		if !def.Required {
			continue
		}
		reqTotal++
		if sec(def.Key) {
			reqDone++
		}
	}
	if reqTotal > 0 {
		ind.Percent = reqDone * 100 / reqTotal
	}
	if ind.Percent < 100 {
		ind.Missing = append(ind.Missing, "Complete the remaining induction sections")
	}

	// ── finance ──
	fi := CompletenessCategory{Key: "finance", Label: "Finance setup", Weight: defaultWeights["finance"]}
	if in.FinanceComplete != nil && *in.FinanceComplete {
		fi.Percent = 100
	} else {
		fi.Missing = append(fi.Missing, "Set up Direct Debit", "Complete the first payment")
	}

	v.Categories = []CompletenessCategory{ci, pa, ec, me, co, ind, fi}
	total := 0
	for _, c := range v.Categories {
		total += c.Weight * c.Percent
	}
	v.Percent = total / 100

	// ── derived onboarding status ──
	switch {
	case in.Child.Status == models.ChildLeft:
		v.Status = OnbWithdrawn
	case in.Child.Status == models.ChildWaitlist:
		v.Status = OnbRegistrationStarted
	case v.Induction == models.InductionNotStarted:
		v.Status = OnbInductionRequired
	case v.Induction == models.InductionInProgress:
		v.Status = OnbInductionInProgress
	case v.Induction == models.InductionSubmitted:
		v.Status = OnbAwaitingReview
	case fi.Percent < 100:
		v.Status = OnbFinanceSetupRequired
	case ci.Percent < 100 || pa.Percent < 100 || ec.Percent == 0 || co.Percent < 100:
		v.Status = OnbReadyToStart // reviewed + finance done; minor gaps flagged in categories
	default:
		v.Status = OnbActive
	}
	return v
}

// OnboardingService assembles the inputs and serves the derived view (single
// child + the manager board).
type OnboardingService interface {
	ForChild(ctx context.Context, childID string) (*OnboardingView, error)
	// Board lists every non-left child (optionally branch-filtered) with
	// completeness + status — the manager onboarding dashboard.
	Board(ctx context.Context, branch string) ([]OnboardingView, error)
}

type onboardingService struct {
	children   repository.ChildRepository
	inductions repository.InductionRepository
	rels       repository.ChildParentRepository
	consents   repository.ConsentRepository
	// finance reports the DD + first-payment gate (nil-safe for unit tests).
	finance FinanceService
}

func NewOnboardingService(children repository.ChildRepository, inductions repository.InductionRepository, rels repository.ChildParentRepository, consents repository.ConsentRepository, finance FinanceService) OnboardingService {
	return &onboardingService{children: children, inductions: inductions, rels: rels, consents: consents, finance: finance}
}

func (s *onboardingService) ForChild(ctx context.Context, childID string) (*OnboardingView, error) {
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return nil, err
	}
	in := onboardingInputs{Child: *child}
	if ind, err := s.inductions.FindByChild(ctx, childID); err == nil {
		in.Induction = ind
	}
	in.Rels, _ = s.rels.FindByChild(ctx, childID)
	in.Consents, _ = s.consents.FindByChild(ctx, childID)
	if s.finance != nil {
		fc := s.finance.FinanceCompleteForChild(ctx, childID)
		in.FinanceComplete = &fc
	}
	v := computeOnboarding(in)
	return &v, nil
}

func (s *onboardingService) Board(ctx context.Context, branch string) ([]OnboardingView, error) {
	kids, err := s.children.FindAll(ctx, repository.ChildFilter{Branch: branch})
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(kids))
	for _, k := range kids {
		if k.Status != models.ChildLeft {
			ids = append(ids, k.ID.Hex())
		}
	}
	inds, _ := s.inductions.FindByChildren(ctx, ids)
	indBy := map[string]*models.ChildInduction{}
	for i := range inds {
		indBy[inds[i].ChildID] = &inds[i]
	}
	cons, _ := s.consents.FindByChildren(ctx, ids)
	consBy := map[string][]models.Consent{}
	for _, c := range cons {
		consBy[c.ChildID] = append(consBy[c.ChildID], c)
	}
	out := make([]OnboardingView, 0, len(ids))
	for _, k := range kids {
		if k.Status == models.ChildLeft {
			continue
		}
		id := k.ID.Hex()
		rels, _ := s.rels.FindByChild(ctx, id)
		bi := onboardingInputs{Child: k, Induction: indBy[id], Rels: rels, Consents: consBy[id]}
		if s.finance != nil {
			fc := s.finance.FinanceCompleteForChild(ctx, id)
			bi.FinanceComplete = &fc
		}
		out = append(out, computeOnboarding(bi))
	}
	return out, nil
}
