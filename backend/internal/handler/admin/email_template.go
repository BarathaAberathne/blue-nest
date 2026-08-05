package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminEmailTemplateHandler manages per-org transactional-email copy (branches.manage).
type AdminEmailTemplateHandler struct {
	svc   service.EmailTemplateService
	audit service.AuditService
}

func NewAdminEmailTemplateHandler(svc service.EmailTemplateService, audit service.AuditService) *AdminEmailTemplateHandler {
	return &AdminEmailTemplateHandler{svc: svc, audit: audit}
}

// List returns the catalogue with each template's current effective copy.
func (h *AdminEmailTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch email templates")
		return
	}
	response.OK(w, items)
}

// Update customises one template's subject + body.
func (h *AdminEmailTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	var req models.EmailTemplateRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	t, err := h.svc.Upsert(r.Context(), key, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "email_template", key, "Updated email template "+key, nil)
	response.OK(w, t)
}

// Delete reverts a template to the built-in default.
func (h *AdminEmailTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	if err := h.svc.Delete(r.Context(), key); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "email_template", key, "Reverted email template "+key+" to default", nil)
	response.NoContent(w)
}
