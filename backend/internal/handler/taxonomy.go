package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
)

// TaxonomyHandler exposes the configurable lists to unauthenticated surfaces
// (the public application form needs the session-type slots). Read-only, and
// pinned to the default tenant by middleware; returns active terms only.
type TaxonomyHandler struct {
	svc service.TaxonomyService
}

func NewTaxonomyHandler(svc service.TaxonomyService) *TaxonomyHandler {
	return &TaxonomyHandler{svc: svc}
}

// List returns active terms for ?category (+ optional ?branch, else org-wide
// defaults). Used by the public application form's session picker.
func (h *TaxonomyHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.svc.List(r.Context(), q.Get("category"), q.Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to fetch lists")
		return
	}
	response.OK(w, items)
}
