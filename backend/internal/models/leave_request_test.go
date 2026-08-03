package models

import "testing"

func TestCountWeekdays(t *testing.T) {
	cases := []struct {
		name, start, end string
		want             int
	}{
		{"single weekday", "2026-08-03", "2026-08-03", 1},              // Mon
		{"single weekend day", "2026-08-01", "2026-08-01", 0},          // Sat
		{"full week Mon-Fri", "2026-08-03", "2026-08-07", 5},           // Mon–Fri
		{"week incl weekend", "2026-08-03", "2026-08-09", 5},           // Mon–Sun → 5 weekdays
		{"two weeks", "2026-08-03", "2026-08-14", 10},                  // 2× Mon–Fri
		{"weekend only", "2026-08-08", "2026-08-09", 0},                // Sat+Sun
		{"reversed range", "2026-08-07", "2026-08-03", 0},              // end before start
		{"invalid date", "not-a-date", "2026-08-07", 0},               // unparseable
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := CountWeekdays(c.start, c.end); got != c.want {
				t.Errorf("CountWeekdays(%q,%q) = %d, want %d", c.start, c.end, got, c.want)
			}
			if n := len(Weekdays(c.start, c.end)); n != c.want {
				t.Errorf("len(Weekdays(%q,%q)) = %d, want %d", c.start, c.end, n, c.want)
			}
		})
	}
}

func TestWeekdaysExcludesWeekends(t *testing.T) {
	days := Weekdays("2026-08-03", "2026-08-09") // Mon–Sun
	if len(days) != 5 {
		t.Fatalf("got %d weekdays, want 5: %v", len(days), days)
	}
	// The Saturday (08-08) and Sunday (08-09) must not appear.
	for _, d := range days {
		if d == "2026-08-08" || d == "2026-08-09" {
			t.Errorf("weekend date %s should be excluded", d)
		}
	}
}

func TestLeaveTypeToAttendanceStatus(t *testing.T) {
	if LeaveTypeToAttendanceStatus(LeaveTypeAnnual) != StaffAttLeave {
		t.Errorf("annual leave should map to the 'leave' attendance status")
	}
	if LeaveTypeToAttendanceStatus(LeaveTypeMaternity) != StaffAttMaternity {
		t.Errorf("maternity should map to the 'maternity' attendance status")
	}
	if !IsValidLeaveType(LeaveTypeUnpaid) || IsValidLeaveType("bogus") {
		t.Errorf("IsValidLeaveType mismatch")
	}
}
