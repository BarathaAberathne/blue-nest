package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
)

// CatalogueHandler serves the staff-facing read-only catalogue (the request
// picker). Mutations live on the admin handler.
type CatalogueHandler struct {
	svc service.CatalogueService
}

func NewCatalogueHandler(svc service.CatalogueService) *CatalogueHandler {
	return &CatalogueHandler{svc: svc}
}

func (h *CatalogueHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListActive(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch catalogue")
		return
	}
	response.OK(w, items)
}
