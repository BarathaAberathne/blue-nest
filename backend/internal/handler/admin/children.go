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

type AdminChildHandler struct {
	svc   service.ChildService
	audit service.AuditService
}

func NewAdminChildHandler(svc service.ChildService, audit service.AuditService) *AdminChildHandler {
	return &AdminChildHandler{svc: svc, audit: audit}
}

func (h *AdminChildHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.ChildFilter{
		Branch: q.Get("branch"),
		Room:   q.Get("room"),
		Status: q.Get("status"),
		Q:      q.Get("q"),
	}
	items, err := h.svc.List(r.Context(), filter)
	if err != nil {
		response.InternalError(w, "failed to fetch children")
		return
	}
	response.OK(w, items)
}

func (h *AdminChildHandler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		response.InternalError(w, "failed to compute stats")
		return
	}
	response.OK(w, stats)
}

func (h *AdminChildHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminChildHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.ChildRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "child", created.ID.Hex(), "Registered child "+created.FirstName+" "+created.LastName, nil)
	response.Created(w, created)
}

func (h *AdminChildHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ChildRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "child", id, "Updated child "+updated.FirstName+" "+updated.LastName, nil)
	response.OK(w, updated)
}

func (h *AdminChildHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "child", id, "Removed child", nil)
	response.NoContent(w)
}
