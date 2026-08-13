package admin

import (
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/export"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminLeaveHandler serves both the staff self-service leave endpoints
// (apply / my requests / cancel) and the management review endpoints
// (list / approve / decline).
type AdminLeaveHandler struct {
	svc   service.LeaveRequestService
	audit service.AuditService
}

func NewAdminLeaveHandler(svc service.LeaveRequestService, audit service.AuditService) *AdminLeaveHandler {
	return &AdminLeaveHandler{svc: svc, audit: audit}
}

// ── Staff self-service ────────────────────────────────────────────────────────

// Mine returns the caller's own leave requests.
func (h *AdminLeaveHandler) Mine(w http.ResponseWriter, r *http.Request) {
	list, err := h.svc.ListMine(r.Context(), actorID(r))
	if err != nil {
		response.InternalError(w, "failed to load leave requests")
		return
	}
	response.OK(w, list)
}

// Apply submits a new leave request for the CALLER only (self-service route).
// Filing for another staff member goes through ApplyFor, which sits behind
// leave.approve — honouring staff_id here would let any staff member file (and
// consume) leave in a colleague's name.
func (h *AdminLeaveHandler) Apply(w http.ResponseWriter, r *http.Request) {
	var req models.LeaveRequestCreate
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if strings.TrimSpace(req.StaffID) != "" {
		response.Forbidden(w, "filing leave for another staff member requires leave approval permission")
		return
	}
	h.apply(w, r, req)
}

// ApplyFor lets a manager (leave.approve) file a request for a staff member
// (staff_id in the body). Four-eyes still applies: it stays pending until a
// DIFFERENT manager approves it.
func (h *AdminLeaveHandler) ApplyFor(w http.ResponseWriter, r *http.Request) {
	var req models.LeaveRequestCreate
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.apply(w, r, req)
}

func (h *AdminLeaveHandler) apply(w http.ResponseWriter, r *http.Request, req models.LeaveRequestCreate) {
	a := actor(r)
	lr, err := h.svc.Apply(r.Context(), req, a.ID, a.Name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "apply", "leave_request", lr.ID.Hex(),
		"Applied for "+string(lr.Type)+" leave "+lr.StartDate+" → "+lr.EndDate, nil)
	response.Created(w, lr)
}

// Balance returns the caller's per-type leave balances (keyed by leave type;
// empty if their login isn't linked to a staff record yet).
func (h *AdminLeaveHandler) Balance(w http.ResponseWriter, r *http.Request) {
	balances, err := h.svc.BalancesForUser(r.Context(), actorID(r))
	if err != nil {
		response.InternalError(w, "failed to load leave balance")
		return
	}
	response.OK(w, balances)
}

// Cancel withdraws the caller's own pending request.
func (h *AdminLeaveHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	lr, err := h.svc.Cancel(r.Context(), id, actorID(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "cancel", "leave_request", id, "Cancelled leave request", nil)
	response.OK(w, lr)
}

// ── Management review ─────────────────────────────────────────────────────────

// List returns leave requests for management, branch-scoped to the caller.
func (h *AdminLeaveHandler) List(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	list, err := h.svc.List(r.Context(), models.LeaveRequestFilter{
		Branch:  branch,
		Status:  r.URL.Query().Get("status"),
		StaffID: r.URL.Query().Get("staff_id"),
	})
	if err != nil {
		response.InternalError(w, "failed to load leave requests")
		return
	}
	response.OK(w, list)
}

// Export streams the filtered leave requests as CSV (same branch scoping as List).
func (h *AdminLeaveHandler) Export(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	list, err := h.svc.List(r.Context(), models.LeaveRequestFilter{
		Branch: branch, Status: r.URL.Query().Get("status"), StaffID: r.URL.Query().Get("staff_id"),
	})
	if err != nil {
		response.InternalError(w, "failed to load leave requests")
		return
	}
	out := make([][]string, 0, len(list))
	for _, l := range list {
		out = append(out, []string{
			l.StaffName, l.BranchSlug, string(l.Type), l.StartDate, l.EndDate,
			export.Int(l.Days), string(l.Status), l.Reason, l.ReviewedBy, l.DeclineReason,
		})
	}
	export.Write(w, r, "leave-requests",
		[]string{"Staff", "Branch", "Type", "Start", "End", "Days", "Status", "Reason", "Reviewed by", "Decline reason"},
		out)
}

// Approve marks a pending request approved (four-eyes: a different reviewer).
func (h *AdminLeaveHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	a := actor(r)
	lr, err := h.svc.Approve(r.Context(), id, a.ID, a.Name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "approve", "leave_request", id,
		"Approved "+lr.StaffName+"'s leave "+lr.StartDate+" → "+lr.EndDate, nil)
	response.OK(w, lr)
}

// Decline rejects a pending request with a reason.
func (h *AdminLeaveHandler) Decline(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body models.LeaveDeclineRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	a := actor(r)
	lr, err := h.svc.Decline(r.Context(), id, body.Reason, a.ID, a.Name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "decline", "leave_request", id,
		"Declined "+lr.StaffName+"'s leave: "+body.Reason, nil)
	response.OK(w, lr)
}
