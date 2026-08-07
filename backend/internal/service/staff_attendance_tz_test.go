package service

import (
	"testing"
	"time"
)

// Regression lock for the staff-attendance timezone bug found in live E2E:
// manual correction times were parsed in the SERVER's zone (UTC in the
// container), so a manager entering 08:55 during BST saw 09:55 in the
// register. Wall-clock parsing and comparisons must use the org's timezone.
func TestParseClockOnDateUsesGivenLocation(t *testing.T) {
	london, err := time.LoadLocation("Europe/London")
	if err != nil {
		t.Fatalf("load location: %v", err)
	}
	got, err := parseClockOnDate(london, "2026-08-06", "08:55")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	// 08:55 BST == 07:55 UTC — the absolute instant must reflect the org's
	// wall clock, not the server's.
	if utc := got.UTC(); utc.Hour() != 7 || utc.Minute() != 55 {
		t.Fatalf("expected 07:55 UTC, got %s", utc.Format("15:04"))
	}
	if back := got.In(london).Format("15:04"); back != "08:55" {
		t.Fatalf("round-trip: expected 08:55, got %s", back)
	}
}

func TestLateMinutesRespectsInstantLocation(t *testing.T) {
	london, _ := time.LoadLocation("Europe/London")
	// 09:30 BST == 08:30 UTC. Converted into the org zone it is 30 minutes
	// late; naively read in UTC it would look on-time.
	instant := time.Date(2026, 8, 6, 8, 30, 0, 0, time.UTC)
	if isLate(instant) {
		t.Fatalf("08:30 UTC wall-clock must not read late in UTC")
	}
	orgLocal := instant.In(london)
	if !isLate(orgLocal) {
		t.Fatalf("09:30 org wall-clock must read late")
	}
	if m := lateMinutes(orgLocal); m != 30 {
		t.Fatalf("expected 30 late minutes, got %d", m)
	}
}

func TestMinsFromShiftTimeRespectsInstantLocation(t *testing.T) {
	london, _ := time.LoadLocation("Europe/London")
	// Shift ends 17:00; clock-out at 17:30 BST (16:30 UTC) = +30 overtime.
	out := time.Date(2026, 8, 6, 16, 30, 0, 0, time.UTC).In(london)
	d, ok := minsFromShiftTime(out, "17:00")
	if !ok || d != 30 {
		t.Fatalf("expected +30 overtime minutes, got %d (ok=%v)", d, ok)
	}
}
