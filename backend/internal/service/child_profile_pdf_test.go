package service

import (
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
)

func TestAnswerText(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, ""},
		{true, "Yes"},
		{false, "No"},
		{"yes", "Yes"},
		{"No ", "No"},
		{"12 QA Lane", "12 QA Lane"},
		{[]any{"nuts", "dairy"}, "nuts, dairy"},
		{3, "3"},
	}
	for _, c := range cases {
		if got := answerText(c.in); got != c.want {
			t.Errorf("answerText(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestHumanKey(t *testing.T) {
	if got := humanKey("gp_name"); got != "Gp name" {
		t.Errorf("humanKey = %q", got)
	}
	if got := humanKey(""); got != "" {
		t.Errorf("humanKey empty = %q", got)
	}
}

func TestAgeOn(t *testing.T) {
	now := time.Date(2026, 8, 14, 0, 0, 0, 0, time.UTC)
	if got := ageOn("2024-02-10", now); got != "2y 6m" {
		t.Errorf("ageOn = %q, want 2y 6m", got)
	}
	if got := ageOn("not-a-date", now); got != "" {
		t.Errorf("ageOn invalid = %q", got)
	}
	// A DOB in the future must not render a negative age.
	if got := ageOn("2027-01-01", now); got != "" {
		t.Errorf("ageOn future = %q", got)
	}
}

func TestRelFlags(t *testing.T) {
	r := models.ChildParentRelationship{ParentalResponsibility: true, EmergencyContact: true, AuthorisedCollection: true}
	want := "parental responsibility · emergency contact · authorised to collect"
	if got := relFlags(r); got != want {
		t.Errorf("relFlags = %q, want %q", got, want)
	}
	if got := relFlags(models.ChildParentRelationship{}); got != "" {
		t.Errorf("relFlags empty = %q", got)
	}
}
