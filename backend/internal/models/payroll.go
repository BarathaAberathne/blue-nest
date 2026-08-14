package models

// ── Payroll roll-up (Phase D) ────────────────────────────────────────────────
//
// The monthly worked-hours summary per staff member, aggregated from the
// staff-attendance register — the authoritative payroll source. Day
// classification MUST match models.IsWorking / models.AwayCategory (the same
// primitives the attendance hub, staff stats and per-staff absence card use)
// so payroll never disagrees with the register on what a day was.

// PayrollRow is one staff member's period totals.
type PayrollRow struct {
	StaffID       string    `json:"staff_id"`
	Ref           string    `json:"ref,omitempty"`
	StaffName     string    `json:"staff_name"`
	BranchSlug    string    `json:"branch_slug"`
	JobTitle      string    `json:"job_title,omitempty"`
	StaffType     StaffType `json:"staff_type"`
	ContractHours float64   `json:"contract_hours"` // weekly contracted hours (context)

	WorkedDays    int `json:"worked_days"`
	WorkedMinutes int `json:"worked_minutes"`
	BreakMinutes  int `json:"break_minutes"`

	OvertimeMinutes       int `json:"overtime_minutes"`
	EarlyDepartureMinutes int `json:"early_departure_minutes"`
	LateCount             int `json:"late_count"`
	LateMinutes           int `json:"late_minutes"`

	// Leave taxonomy — days per kind (mirrors StaffAbsenceSummary/AwayCategory).
	AnnualLeaveDays   int `json:"annual_leave_days"`
	SickDays          int `json:"sick_days"`
	DependantSickDays int `json:"dependant_sick_days"`
	UnpaidLeaveDays   int `json:"unpaid_leave_days"`
	MaternityDays     int `json:"maternity_days"`
	TrainingDays      int `json:"training_days"` // training / meeting / remote — working-away
	AbsentDays        int `json:"absent_days"`   // UNAUTHORISED absence

	// Data-quality flags payroll must chase before paying.
	MissingClockOuts int `json:"missing_clock_outs"`
	CorrectedDays    int `json:"corrected_days"`
}

// PayrollSummary is the whole period: one row per staff member plus totals.
type PayrollSummary struct {
	From   string       `json:"from"` // YYYY-MM-DD inclusive
	To     string       `json:"to"`   // YYYY-MM-DD inclusive
	Branch string       `json:"branch,omitempty"`
	Rows   []PayrollRow `json:"rows"`
	Totals PayrollRow   `json:"totals"` // StaffName "Total"; identity fields empty
}
