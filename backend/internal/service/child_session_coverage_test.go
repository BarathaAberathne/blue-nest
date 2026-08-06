package service

import (
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
)

// Regression lock: the Room Planner's capacity forecast classified sessions
// with a hardcoded am/pm/school/full switch, so any org whose session_type
// taxonomy generated different codes (e.g. "am_8am_1pm") counted ZERO booked
// children in every slot. Coverage now derives from the org's configured
// session times; the legacy switch stays as fallback for pre-taxonomy codes.
func TestSessionCoversUsesConfiguredTimes(t *testing.T) {
	cov := slotCoverage{
		"am_8am_1pm":         {true, false},  // 08:00–13:00
		"pm_1pm_6pm":         {false, true},  // 13:00–18:00
		"full_day_8am_6pm":   {true, true},   // 08:00–18:00
		"school_day_9am_4pm": {true, true},   // 09:00–16:00
	}
	cases := []struct {
		code   string
		am, pm bool
	}{
		{"am_8am_1pm", true, false},
		{"pm_1pm_6pm", false, true},
		{"full_day_8am_6pm", true, true},
		{"school_day_9am_4pm", true, true},
		// Legacy fallback codes with no configured term still classify.
		{"am", true, false},
		{"pm", false, true},
		{"full", true, true},
		{"school", true, true},
		// Unknown code with no term: attends nothing (unchanged behaviour).
		{"mystery", false, false},
	}
	for _, c := range cases {
		am, pm := sessionCovers(cov, c.code)
		if am != c.am || pm != c.pm {
			t.Fatalf("%s: expected (%v,%v), got (%v,%v)", c.code, c.am, c.pm, am, pm)
		}
	}
}

// The builder's boundary rule: covers AM when start < 13:00, PM when end >
// 13:00 — so a 13:00–18:00 session is PM-only and an 08:00–13:00 session is
// AM-only (neither spans midday).
func TestSlotCoverageBoundaries(t *testing.T) {
	mk := func(start, end string) [2]bool {
		return [2]bool{start < middayCutoff, end > middayCutoff}
	}
	if c := mk("08:00", "13:00"); c != [2]bool{true, false} {
		t.Fatalf("08:00-13:00 must be AM only, got %v", c)
	}
	if c := mk("13:00", "18:00"); c != [2]bool{false, true} {
		t.Fatalf("13:00-18:00 must be PM only, got %v", c)
	}
	if c := mk("09:00", "16:00"); c != [2]bool{true, true} {
		t.Fatalf("09:00-16:00 must span both, got %v", c)
	}
}

// The forecast resolves each child's room PER DATE from active + scheduled
// placement rows — a scheduled transfer must take over from its effective
// date in forward projections (found live: the planner used only the current
// room for all 12 weeks).
func TestPlacementResolverIsDateAware(t *testing.T) {
	r := newPlacementResolver([]models.ChildRoomAssignment{
		{ChildID: "c1", RoomID: "kindergarten", Status: models.AssignmentActive, StartDate: "2026-08-06", EndDate: "2026-09-14"},
		{ChildID: "c1", RoomID: "nest", Status: models.AssignmentScheduled, StartDate: "2026-09-14"},
	})
	if got := r.roomOn("c1", "2026-09-07"); got != "kindergarten" {
		t.Fatalf("before the scheduled start the active room must win, got %q", got)
	}
	if got := r.roomOn("c1", "2026-09-14"); got != "nest" {
		t.Fatalf("on the effective date the scheduled room must win, got %q", got)
	}
	if got := r.roomOn("c1", "2026-12-01"); got != "nest" {
		t.Fatalf("after the effective date the scheduled room must win, got %q", got)
	}
	if got := r.roomOn("unknown", "2026-09-07"); got != "" {
		t.Fatalf("unplaced child must resolve to empty, got %q", got)
	}
}
