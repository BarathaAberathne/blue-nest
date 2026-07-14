package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
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
	filter := repository.StaffFilter{
		Branch: q.Get("branch"),
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

func (h *AdminStaffHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "staff not found")
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
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "staff", id, "Updated staff "+updated.FirstName+" "+updated.LastName, nil)
	response.OK(w, updated)
}

func (h *AdminStaffHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "staff", id, "Removed staff", nil)
	response.NoContent(w)
}
