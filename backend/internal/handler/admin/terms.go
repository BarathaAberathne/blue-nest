package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminTermHandler struct {
	svc   service.TermService
	audit service.AuditService
}

func NewAdminTermHandler(svc service.TermService, audit service.AuditService) *AdminTermHandler {
	return &AdminTermHandler{svc: svc, audit: audit}
}

func (h *AdminTermHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context(), r.URL.Query().Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to fetch terms")
		return
	}
	response.OK(w, items)
}

func (h *AdminTermHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "term not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminTermHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.TermRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "term", created.ID.Hex(), "Added term "+created.Name, nil)
	response.Created(w, created)
}

func (h *AdminTermHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.TermRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "term", id, "Updated term "+updated.Name, nil)
	response.OK(w, updated)
}

func (h *AdminTermHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "term", id, "Deleted term", nil)
	response.NoContent(w)
}
