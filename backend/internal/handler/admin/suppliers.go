package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminSupplierHandler struct {
	svc   service.SupplierService
	audit service.AuditService
}

func NewAdminSupplierHandler(svc service.SupplierService, audit service.AuditService) *AdminSupplierHandler {
	return &AdminSupplierHandler{svc: svc, audit: audit}
}

func (h *AdminSupplierHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch suppliers")
		return
	}
	response.OK(w, items)
}

func (h *AdminSupplierHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "supplier not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminSupplierHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.SupplierRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "supplier", created.ID.Hex(), "Created supplier "+created.Name, nil)
	response.Created(w, created)
}

func (h *AdminSupplierHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.SupplierRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "supplier", id, "Updated supplier "+updated.Name, nil)
	response.OK(w, updated)
}

func (h *AdminSupplierHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "supplier", id, "Deleted supplier", nil)
	response.NoContent(w)
}
