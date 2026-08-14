package service

import (
	"os"
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

func TestLocalUploadPath(t *testing.T) {
	// Non-upload URLs and traversal attempts never resolve.
	for _, u := range []string{"", "https://evil.example/x.jpg", "/uploads/../secrets.txt", "/uploads/x.svg"} {
		if got := localUploadPath(u); got != "" {
			t.Errorf("localUploadPath(%q) = %q, want empty", u, got)
		}
	}
	// A real file under uploads/ resolves by basename only.
	if err := os.MkdirAll("uploads", 0o755); err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll("uploads")
	if err := os.WriteFile("uploads/test-photo.jpg", []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if got := localUploadPath("/uploads/test-photo.jpg"); got != "uploads/test-photo.jpg" {
		t.Errorf("resolve = %q", got)
	}
	if got := localUploadPath("https://api.bluenest.uk/uploads/sub/../test-photo.jpg"); got != "uploads/test-photo.jpg" {
		t.Errorf("basename resolve = %q", got)
	}
}
