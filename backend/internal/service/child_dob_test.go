package service

import (
	"testing"
	"time"
)

// Regression lock: registration/child forms accepted a DOB in the future (a
// child born tomorrow) — caught in the live-UI E2E pass. The rule lives in
// dobNotInFuture, shared by child Create/Update/EnsureFromEnquiry and
// enquiry Register.
func TestDOBNotInFuture(t *testing.T) {
	if err := dobNotInFuture(""); err != nil {
		t.Fatalf("empty DOB must be allowed (optional field): %v", err)
	}
	if err := dobNotInFuture("2020-05-01"); err != nil {
		t.Fatalf("past DOB must be allowed: %v", err)
	}
	future := time.Now().AddDate(0, 0, 2).Format("2006-01-02")
	if err := dobNotInFuture(future); err == nil {
		t.Fatalf("future DOB %s must be rejected", future)
	}
	if err := dobNotInFuture("not-a-date"); err == nil {
		t.Fatalf("malformed DOB must be rejected")
	}
}
