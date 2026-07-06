package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminCatalogueHandler struct {
	svc   service.CatalogueService
	audit service.AuditService
}

func NewAdminCatalogueHandler(svc service.CatalogueService, audit service.AuditService) *AdminCatalogueHandler {
	return &AdminCatalogueHandler{svc: svc, audit: audit}
}

func (h *AdminCatalogueHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch catalogue")
		return
	}
	response.OK(w, items)
}

func (h *AdminCatalogueHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "catalogue item not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminCatalogueHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CatalogueItemRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "catalogue_item", created.ID.Hex(),
		"Created catalogue item "+created.Name, nil)
	response.Created(w, created)
}

func (h *AdminCatalogueHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.CatalogueItemRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "catalogue_item", id,
		"Updated catalogue item "+updated.Name, nil)
	response.OK(w, updated)
}

// Learn persists a confirmed Gompels code for a product name (the admin
// accepting a search auto-pick), so the item becomes a reliable code next time.
func (h *AdminCatalogueHandler) Learn(w http.ResponseWriter, r *http.Request) {
	var req models.LearnCatalogueRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	item, err := h.svc.Learn(r.Context(), req.Name, req.Code, req.Price)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "learn", "catalogue_item", item.ID.Hex(),
		"Saved Gompels code "+req.Code+" for "+item.Name, nil)
	response.OK(w, item)
}

func (h *AdminCatalogueHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "catalogue_item", id, "Deleted catalogue item", nil)
	response.NoContent(w)
}
