package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
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
	branch := r.URL.Query().Get("branch")
	week := r.URL.Query().Get("week")
	if branch == "" || week == "" {
		response.BadRequest(w, "branch and week are required")
		return
	}
	shifts, err := h.svc.ListWeek(r.Context(), branch, week)
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
	sh, err := h.svc.Assign(r.Context(), req, actorID(r))
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
	sh, err := h.svc.Update(r.Context(), id, req, actorID(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "shift", id, "Updated shift for "+sh.StaffName, nil)
	response.OK(w, sh)
}

func (h *AdminShiftHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "shift", id, "Removed shift", nil)
	response.NoContent(w)
}
