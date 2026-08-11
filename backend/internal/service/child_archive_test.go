package service

import (
	"testing"
	"time"
)

// The archive action's leave date defaults to today and only accepts
// YYYY-MM-DD otherwise (the full archive flow — status flip + placements
// ended — is locked end-to-end by CHILDROOM-TC-ARCHIVE).
func TestNormalizeLeaveDate(t *testing.T) {
	got, err := normalizeLeaveDate("")
	if err != nil || got != time.Now().Format("2006-01-02") {
		t.Fatalf("empty must default to today, got %q err %v", got, err)
	}
	if got, err := normalizeLeaveDate("2026-07-31"); err != nil || got != "2026-07-31" {
		t.Fatalf("valid date must pass through, got %q err %v", got, err)
	}
	if _, err := normalizeLeaveDate("31/07/2026"); err == nil {
		t.Fatalf("non-ISO date must be rejected")
	}
	if _, err := normalizeLeaveDate("not-a-date"); err == nil {
		t.Fatalf("malformed date must be rejected")
	}
}
