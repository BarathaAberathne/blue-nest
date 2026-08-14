package admin

import (
	"fmt"
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/export"
	"github.com/blue-nest-montessori/api/pkg/response"
)

// AdminPayrollHandler serves the Phase-D worked-hours roll-up: the per-staff
// payroll summary for a period, and its CSV/Excel export. Branch-scoped like
// every other staff read (a scoped manager only ever rolls up their branch).
type AdminPayrollHandler struct {
	svc service.PayrollService
}

func NewAdminPayrollHandler(svc service.PayrollService) *AdminPayrollHandler {
	return &AdminPayrollHandler{svc: svc}
}

func (h *AdminPayrollHandler) summary(w http.ResponseWriter, r *http.Request) (*models.PayrollSummary, bool) {
	q := r.URL.Query()
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, q.Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return nil, false
	}
	sum, err := h.svc.Summary(r.Context(), q.Get("from"), q.Get("to"), branch)
	if err != nil {
		response.BadRequest(w, err.Error())
		return nil, false
	}
	return sum, true
}

// Summary serves GET /admin/payroll?from&to[&branch].
func (h *AdminPayrollHandler) Summary(w http.ResponseWriter, r *http.Request) {
	sum, ok := h.summary(w, r)
	if !ok {
		return
	}
	response.OK(w, sum)
}

// Export serves GET /admin/payroll/export — same scope/filters as Summary,
// dispatched to CSV (default) or Excel via ?format=.
func (h *AdminPayrollHandler) Export(w http.ResponseWriter, r *http.Request) {
	sum, ok := h.summary(w, r)
	if !ok {
		return
	}
	hm := func(mins int) string { return fmt.Sprintf("%d:%02d", mins/60, mins%60) }
	rows := make([][]string, 0, len(sum.Rows)+1)
	for _, p := range append(sum.Rows, sum.Totals) {
		rows = append(rows, []string{
			p.Ref, p.StaffName, p.BranchSlug, p.JobTitle, string(p.StaffType),
			fmt.Sprintf("%g", p.ContractHours),
			export.Int(p.WorkedDays), hm(p.WorkedMinutes), hm(p.BreakMinutes),
			hm(p.OvertimeMinutes), hm(p.EarlyDepartureMinutes),
			export.Int(p.LateCount), hm(p.LateMinutes),
			export.Int(p.AnnualLeaveDays), export.Int(p.SickDays), export.Int(p.DependantSickDays),
			export.Int(p.UnpaidLeaveDays), export.Int(p.MaternityDays), export.Int(p.TrainingDays),
			export.Int(p.AbsentDays),
			export.Int(p.MissingClockOuts), export.Int(p.CorrectedDays),
		})
	}
	export.Write(w, r, "payroll-"+sum.From+"-to-"+sum.To,
		[]string{"Ref", "Staff", "Branch", "Role", "Type", "Contract hrs/wk",
			"Days worked", "Hours worked", "Breaks", "Overtime", "Early departure",
			"Lates", "Late time",
			"Annual leave", "Sick", "Dependant sick", "Unpaid leave", "Maternity", "Training/meeting",
			"Unauthorised absent", "Missing clock-outs", "Corrected days"},
		rows)
}
