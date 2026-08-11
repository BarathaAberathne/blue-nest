package service

import (
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func completeSections(keys ...string) map[string]models.InductionSection {
	out := map[string]models.InductionSection{}
	for _, k := range keys {
		out[k] = models.InductionSection{Complete: true, UpdatedAt: time.Now()}
	}
	return out
}

func allRequiredSectionKeys() []string {
	keys := []string{}
	for _, d := range models.InductionSections {
		if d.Required {
			keys = append(keys, d.Key)
		}
	}
	return keys
}

func allRequiredConsents() []models.Consent {
	rows := []models.Consent{}
	for _, d := range models.ConsentCatalogue {
		if d.Required {
			rows = append(rows, models.Consent{Key: d.Key, Granted: true, SignatureName: "Test Parent"})
		}
	}
	return rows
}

func fullChild() models.Child {
	return models.Child{
		ID: primitive.NewObjectID(), FirstName: "Amelia", LastName: "Smith",
		DOB: "2023-01-01", Gender: "female", StartDate: "2026-09-01",
		Address: "1 Test Way", Status: models.ChildActive, BranchSlug: "harrow",
	}
}

// A brand-new registered child: induction required, low completeness, finance
// outstanding — and the categories name what's missing.
func TestOnboardingNewChild(t *testing.T) {
	v := computeOnboarding(onboardingInputs{Child: models.Child{
		ID: primitive.NewObjectID(), Status: models.ChildActive, DOB: "2023-01-01",
	}})
	if v.Status != OnbInductionRequired {
		t.Fatalf("status = %s, want %s", v.Status, OnbInductionRequired)
	}
	if v.Percent >= 30 {
		t.Fatalf("a bare child should score low, got %d%%", v.Percent)
	}
	found := false
	for _, c := range v.Categories {
		if c.Key == "parents" && len(c.Missing) > 0 {
			found = true
		}
	}
	if !found {
		t.Fatalf("missing-parents guidance not present")
	}
}

// Everything complete except finance → finance_setup_required at 85%
// (finance carries weight 15 until the module reports complete).
func TestOnboardingFinanceGates(t *testing.T) {
	now := time.Now()
	in := onboardingInputs{
		Child: fullChild(),
		Induction: &models.ChildInduction{
			Status: models.InductionReviewed, Sections: completeSections(allRequiredSectionKeys()...),
			ReviewedAt: &now,
		},
		Rels: []models.ChildParentRelationship{
			{ParentalResponsibility: true, EmergencyContact: true, PrimaryContact: true},
			{EmergencyContact: true},
		},
		Consents: allRequiredConsents(),
	}
	v := computeOnboarding(in)
	if v.Status != OnbFinanceSetupRequired {
		t.Fatalf("status = %s, want %s", v.Status, OnbFinanceSetupRequired)
	}
	if v.Percent != 85 {
		t.Fatalf("percent = %d, want 85 (everything except finance weight 15)", v.Percent)
	}

	// Finance complete → active at 100%.
	yes := true
	in.FinanceComplete = &yes
	v = computeOnboarding(in)
	if v.Status != OnbActive || v.Percent != 100 {
		t.Fatalf("status/percent = %s/%d, want active/100", v.Status, v.Percent)
	}
}

// One emergency contact scores half the category and asks for a second;
// submitted induction shows awaiting_review.
func TestOnboardingPartials(t *testing.T) {
	now := time.Now()
	in := onboardingInputs{
		Child: fullChild(),
		Induction: &models.ChildInduction{
			Status: models.InductionSubmitted, SubmittedAt: &now,
			Sections: completeSections("health"),
		},
		Rels: []models.ChildParentRelationship{{ParentalResponsibility: true, EmergencyContact: true}},
	}
	v := computeOnboarding(in)
	if v.Status != OnbAwaitingReview {
		t.Fatalf("status = %s, want %s", v.Status, OnbAwaitingReview)
	}
	for _, c := range v.Categories {
		if c.Key == "emergency_contacts" {
			if c.Percent != 50 {
				t.Fatalf("emergency percent = %d, want 50", c.Percent)
			}
			if len(c.Missing) == 0 || c.Missing[0] != "Add a second emergency contact" {
				t.Fatalf("second-contact guidance missing, got %v", c.Missing)
			}
		}
		if c.Key == "medical" && c.Percent != 50 {
			t.Fatalf("medical percent = %d, want 50 (health done, allergies not)", c.Percent)
		}
	}
}

// A left child is withdrawn regardless of everything else.
func TestOnboardingWithdrawn(t *testing.T) {
	c := fullChild()
	c.Status = models.ChildLeft
	if v := computeOnboarding(onboardingInputs{Child: c}); v.Status != OnbWithdrawn {
		t.Fatalf("status = %s, want %s", v.Status, OnbWithdrawn)
	}
}

// Weights must always sum to 100 — a config drift here silently skews every
// percentage in the product.
func TestOnboardingWeightsSum(t *testing.T) {
	sum := 0
	for _, w := range defaultWeights {
		sum += w
	}
	if sum != 100 {
		t.Fatalf("weights sum to %d, want 100", sum)
	}
}
