package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminStaffHandler struct {
	svc   service.StaffService
	audit service.AuditService
}

func NewAdminStaffHandler(svc service.StaffService, audit service.AuditService) *AdminStaffHandler {
	return &AdminStaffHandler{svc: svc, audit: audit}
}

func (h *AdminStaffHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, q.Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	filter := repository.StaffFilter{
		Branch: branch,
		Status: q.Get("status"),
		Type:   q.Get("type"),
		Q:      q.Get("q"),
	}
	items, err := h.svc.List(r.Context(), filter)
	if err != nil {
		response.InternalError(w, "failed to fetch staff")
		return
	}
	response.OK(w, items)
}

// inScope reports whether the caller may act on a record in the given branch.
func inScope(r *http.Request, branch string) bool {
	role, scope := caller(r)
	return policy.CanScope(role, scope, branch)
}

func (h *AdminStaffHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "staff not found")
		return
	}
	if !inScope(r, item.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	response.OK(w, item)
}

func (h *AdminStaffHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.StaffRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if !inScope(r, req.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "staff", created.ID.Hex(), "Added staff "+created.FirstName+" "+created.LastName, nil)
	response.Created(w, created)
}

func (h *AdminStaffHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.StaffRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	// Guard both the existing record's branch and the requested target branch.
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "staff not found")
		return
	}
	if !inScope(r, existing.BranchSlug) || !inScope(r, req.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "staff", id, "Updated staff "+updated.FirstName+" "+updated.LastName, nil)
	response.OK(w, updated)
}

// AttendanceSummary aggregates a staff member's attendance over a date range
// (?from=&to=, default last 12 months) for the staff-profile Absence card.
func (h *AdminStaffHandler) AttendanceSummary(w http.ResponseWriter, r *http.Request, attendance service.StaffAttendanceService) {
	id := chi.URLParam(r, "id")
	staff, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "staff not found")
		return
	}
	if !inScope(r, staff.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	q := r.URL.Query()
	from, to := q.Get("from"), q.Get("to")
	sum, err := attendance.PeriodSummary(r.Context(), id, from, to)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, sum)
}

func (h *AdminStaffHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "staff not found")
		return
	}
	if !inScope(r, existing.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "staff", id, "Removed staff", nil)
	response.NoContent(w)
}
