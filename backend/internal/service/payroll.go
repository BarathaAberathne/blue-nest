package service

import (
	"context"
	"errors"
	"sort"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// PayrollService is the Phase-D worked-hours roll-up: one batched pass over
// the staff-attendance register for a period (typically a month), producing a
// per-staff payroll row + totals. Day classification is EXACTLY the register's
// own (models.IsWorking / the per-status leave taxonomy PeriodSummary uses) so
// payroll can never disagree with the attendance hub about what a day was.
type PayrollService interface {
	// Summary aggregates [from, to] inclusive, optionally branch-scoped.
	// Every currently-employed staff member of the scope appears (zero rows
	// included — payroll must see everyone), plus anyone who has records in
	// the period but has since left.
	Summary(ctx context.Context, from, to, branch string) (*models.PayrollSummary, error)
}

type payrollService struct {
	att   repository.StaffAttendanceRepository
	staff repository.StaffRepository
}

func NewPayrollService(att repository.StaffAttendanceRepository, staff repository.StaffRepository) PayrollService {
	return &payrollService{att: att, staff: staff}
}

func (s *payrollService) Summary(ctx context.Context, from, to, branch string) (*models.PayrollSummary, error) {
	if from == "" || to == "" {
		return nil, errors.New("from and to dates are required")
	}
	if to < from {
		return nil, errors.New("to must be on or after from")
	}
	recs, err := s.att.FindByRange(ctx, from, to, branch)
	if err != nil {
		return nil, err
	}
	staff, err := s.staff.FindAll(ctx, repository.StaffFilter{Branch: branch})
	if err != nil {
		return nil, err
	}

	rows := map[string]*models.PayrollRow{}
	rowFor := func(staffID string) *models.PayrollRow {
		if r, ok := rows[staffID]; ok {
			return r
		}
		r := &models.PayrollRow{StaffID: staffID}
		rows[staffID] = r
		return r
	}

	// Every currently-employed staff member appears, even with no records.
	for _, st := range staff {
		if st.Status == models.StaffInactive {
			continue // leavers only appear if they have records in the period
		}
		r := rowFor(st.ID.Hex())
		fillIdentity(r, st)
	}

	for _, rec := range recs {
		r := rowFor(rec.StaffID)
		if r.StaffName == "" {
			r.StaffName = rec.StaffName
			r.BranchSlug = rec.BranchSlug
		}
		tallyPayroll(r, rec)
	}

	// Identity for leavers who only exist via records.
	byID := map[string]models.Staff{}
	for _, st := range staff {
		byID[st.ID.Hex()] = st
	}
	for id, r := range rows {
		if st, ok := byID[id]; ok && r.Ref == "" {
			fillIdentity(r, st)
		}
	}

	out := &models.PayrollSummary{From: from, To: to, Branch: branch, Rows: make([]models.PayrollRow, 0, len(rows))}
	for _, r := range rows {
		out.Rows = append(out.Rows, *r)
	}
	sort.Slice(out.Rows, func(i, j int) bool {
		return strings.ToLower(out.Rows[i].StaffName) < strings.ToLower(out.Rows[j].StaffName)
	})
	out.Totals = totalPayroll(out.Rows)
	return out, nil
}

func fillIdentity(r *models.PayrollRow, st models.Staff) {
	r.Ref = st.Ref
	r.StaffName = strings.TrimSpace(st.FirstName + " " + st.LastName)
	r.BranchSlug = st.BranchSlug
	r.JobTitle = st.JobTitle
	r.StaffType = st.StaffType
	r.ContractHours = st.ContractHours
}

// tallyPayroll classifies one register record onto a payroll row — the same
// switch PeriodSummary uses, extended with the minute-level payroll fields.
func tallyPayroll(r *models.PayrollRow, rec models.StaffAttendanceRecord) {
	switch {
	case rec.IsWorking():
		r.WorkedDays++
		r.WorkedMinutes += rec.WorkedMinutes
		r.BreakMinutes += rec.BreakMinutes
		r.OvertimeMinutes += rec.OvertimeMinutes
		r.EarlyDepartureMinutes += rec.EarlyDepartureMinutes
		if rec.LateArrival {
			r.LateCount++
			r.LateMinutes += rec.LateMinutes
		}
		if rec.MissingClockOut {
			r.MissingClockOuts++
		}
	case rec.Status == models.StaffAttSick:
		r.SickDays++
	case rec.Status == models.StaffAttDependantSick:
		r.DependantSickDays++
	case rec.Status == models.StaffAttLeave:
		r.AnnualLeaveDays++
	case rec.Status == models.StaffAttUnpaidLeave:
		r.UnpaidLeaveDays++
	case rec.Status == models.StaffAttMaternity:
		r.MaternityDays++
	case models.IsAway(rec.Status): // training / meeting / remote
		r.TrainingDays++
	case rec.Status == models.StaffAttAbsent:
		r.AbsentDays++
	}
	if len(rec.Corrections) > 0 {
		r.CorrectedDays++
	}
}

func totalPayroll(rows []models.PayrollRow) models.PayrollRow {
	t := models.PayrollRow{StaffName: "Total"}
	for _, r := range rows {
		t.WorkedDays += r.WorkedDays
		t.WorkedMinutes += r.WorkedMinutes
		t.BreakMinutes += r.BreakMinutes
		t.OvertimeMinutes += r.OvertimeMinutes
		t.EarlyDepartureMinutes += r.EarlyDepartureMinutes
		t.LateCount += r.LateCount
		t.LateMinutes += r.LateMinutes
		t.AnnualLeaveDays += r.AnnualLeaveDays
		t.SickDays += r.SickDays
		t.DependantSickDays += r.DependantSickDays
		t.UnpaidLeaveDays += r.UnpaidLeaveDays
		t.MaternityDays += r.MaternityDays
		t.TrainingDays += r.TrainingDays
		t.AbsentDays += r.AbsentDays
		t.MissingClockOuts += r.MissingClockOuts
		t.CorrectedDays += r.CorrectedDays
	}
	return t
}
