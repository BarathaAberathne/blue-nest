package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminTaxonomyHandler struct {
	svc   service.TaxonomyService
	audit service.AuditService
}

func NewAdminTaxonomyHandler(svc service.TaxonomyService, audit service.AuditService) *AdminTaxonomyHandler {
	return &AdminTaxonomyHandler{svc: svc, audit: audit}
}

// List returns terms for the given ?category. With ?branch=<slug> it is a
// picker query (active terms for that branch + org-wide defaults); without a
// branch it is the management view (every term in the category, all branches).
func (h *AdminTaxonomyHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	category := q.Get("category")
	branch := q.Get("branch")
	var (
		items []models.TaxonomyTerm
		err   error
	)
	if branch != "" {
		items, err = h.svc.List(r.Context(), category, branch)
	} else {
		items, err = h.svc.ListAll(r.Context(), category)
	}
	if err != nil {
		response.InternalError(w, "failed to fetch lists")
		return
	}
	response.OK(w, items)
}

func (h *AdminTaxonomyHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "term not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminTaxonomyHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.TaxonomyRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "taxonomy_term", created.ID.Hex(), "Added "+created.Category+" list option "+created.Label, nil)
	response.Created(w, created)
}

func (h *AdminTaxonomyHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.TaxonomyRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "taxonomy_term", id, "Updated list option "+updated.Label, nil)
	response.OK(w, updated)
}

func (h *AdminTaxonomyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "taxonomy_term", id, "Deleted list option", nil)
	response.NoContent(w)
}
