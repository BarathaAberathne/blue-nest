package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminOrganisationHandler manages tenants. Gated by PlatformOnly — only the
// SaaS operator (platform_super_admin) can list/create/edit organisations.
type AdminOrganisationHandler struct {
	svc   service.OrganisationService
	audit service.AuditService
}

func NewAdminOrganisationHandler(svc service.OrganisationService, audit service.AuditService) *AdminOrganisationHandler {
	return &AdminOrganisationHandler{svc: svc, audit: audit}
}

func (h *AdminOrganisationHandler) List(w http.ResponseWriter, r *http.Request) {
	orgs, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to load organisations")
		return
	}
	response.OK(w, orgs)
}

func (h *AdminOrganisationHandler) Get(w http.ResponseWriter, r *http.Request) {
	org, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "organisation not found")
		return
	}
	response.OK(w, org)
}

func (h *AdminOrganisationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.OrganisationRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	org, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "organisation", org.ID.Hex(), "Created organisation "+org.Name, nil)
	response.Created(w, org)
}

func (h *AdminOrganisationHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.OrganisationRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	org, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "organisation", id, "Updated organisation "+org.Name, nil)
	response.OK(w, org)
}
