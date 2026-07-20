package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminShiftHandler struct {
	svc   service.ShiftService
	audit service.AuditService
}

func NewAdminShiftHandler(svc service.ShiftService, audit service.AuditService) *AdminShiftHandler {
	return &AdminShiftHandler{svc: svc, audit: audit}
}

// List returns the rota for a branch + week (?branch=&week=YYYY-MM-DD, Monday).
func (h *AdminShiftHandler) List(w http.ResponseWriter, r *http.Request) {
	reqBranch := r.URL.Query().Get("branch")
	week := r.URL.Query().Get("week")
	if reqBranch == "" || week == "" {
		response.BadRequest(w, "branch and week are required")
		return
	}
	role, scope := caller(r)
	if !policy.CanScope(role, scope, reqBranch) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	shifts, err := h.svc.ListWeek(r.Context(), reqBranch, week)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, shifts)
}

func (h *AdminShiftHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.ShiftRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	sh, err := h.svc.Assign(r.Context(), req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "shift", sh.ID.Hex(), "Rostered "+sh.StaffName+" on "+sh.Date, nil)
	response.Created(w, sh)
}

func (h *AdminShiftHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ShiftRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	sh, err := h.svc.Update(r.Context(), id, req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "shift", id, "Updated shift for "+sh.StaffName, nil)
	response.OK(w, sh)
}

func (h *AdminShiftHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	role, scope := caller(r)
	if err := h.svc.Delete(r.Context(), id, policy.AllowedOrNil(role, scope)); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "shift", id, "Removed shift", nil)
	response.NoContent(w)
}
