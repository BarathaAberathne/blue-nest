package service

import (
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
)

// TestTallyPayroll locks the day classification: identical to the register's
// own semantics (IsWorking + the per-status leave taxonomy) with the payroll
// minute fields on top. Payroll must never disagree with the attendance hub
// about what a day was.
func TestTallyPayroll(t *testing.T) {
	r := &models.PayrollRow{}

	// A worked day with overtime, a late arrival and a break.
	tallyPayroll(r, models.StaffAttendanceRecord{
		Status: models.StaffAttPresent, WorkedMinutes: 480, BreakMinutes: 45,
		OvertimeMinutes: 30, LateArrival: true, LateMinutes: 12,
	})
	// A worked day that never clocked out (data-quality flag).
	tallyPayroll(r, models.StaffAttendanceRecord{
		Status: models.StaffAttPresent, MissingClockOut: true,
	})
	// One of each leave kind + a training day + an unauthorised absence.
	for _, s := range []models.StaffAttendanceStatus{
		models.StaffAttLeave, models.StaffAttSick, models.StaffAttDependantSick,
		models.StaffAttUnpaidLeave, models.StaffAttMaternity,
		models.StaffAttTraining, models.StaffAttAbsent,
	} {
		tallyPayroll(r, models.StaffAttendanceRecord{Status: s})
	}
	// A corrected day (manager backfill) still classifies by its status.
	tallyPayroll(r, models.StaffAttendanceRecord{
		Status: models.StaffAttSick,
		Corrections: []models.AttendanceCorrection{{Field: "status"}},
	})

	checks := []struct {
		name string
		got  int
		want int
	}{
		{"WorkedDays", r.WorkedDays, 2},
		{"WorkedMinutes", r.WorkedMinutes, 480},
		{"BreakMinutes", r.BreakMinutes, 45},
		{"OvertimeMinutes", r.OvertimeMinutes, 30},
		{"LateCount", r.LateCount, 1},
		{"LateMinutes", r.LateMinutes, 12},
		{"MissingClockOuts", r.MissingClockOuts, 1},
		{"AnnualLeaveDays", r.AnnualLeaveDays, 1},
		{"SickDays", r.SickDays, 2},
		{"DependantSickDays", r.DependantSickDays, 1},
		{"UnpaidLeaveDays", r.UnpaidLeaveDays, 1},
		{"MaternityDays", r.MaternityDays, 1},
		{"TrainingDays", r.TrainingDays, 1},
		{"AbsentDays", r.AbsentDays, 1},
		{"CorrectedDays", r.CorrectedDays, 1},
	}
	for _, c := range checks {
		if c.got != c.want {
			t.Errorf("%s = %d, want %d", c.name, c.got, c.want)
		}
	}
}

func TestTotalPayroll(t *testing.T) {
	rows := []models.PayrollRow{
		{WorkedDays: 20, WorkedMinutes: 9600, AnnualLeaveDays: 2, LateCount: 1, MissingClockOuts: 1},
		{WorkedDays: 18, WorkedMinutes: 8100, SickDays: 3, OvertimeMinutes: 90},
	}
	tot := totalPayroll(rows)
	if tot.StaffName != "Total" {
		t.Errorf("totals name = %q", tot.StaffName)
	}
	if tot.WorkedDays != 38 || tot.WorkedMinutes != 17700 || tot.AnnualLeaveDays != 2 ||
		tot.SickDays != 3 || tot.OvertimeMinutes != 90 || tot.LateCount != 1 || tot.MissingClockOuts != 1 {
		t.Errorf("totals wrong: %+v", tot)
	}
}
