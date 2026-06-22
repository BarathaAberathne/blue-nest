package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminEnquiryHandler struct {
	svc   service.EnquiryService
	audit service.AuditService
}

func NewAdminEnquiryHandler(svc service.EnquiryService, audit service.AuditService) *AdminEnquiryHandler {
	return &AdminEnquiryHandler{svc: svc, audit: audit}
}

func (h *AdminEnquiryHandler) List(w http.ResponseWriter, r *http.Request) {
	enquiries, err := h.svc.ListAll(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch enquiries")
		return
	}
	response.OK(w, enquiries)
}

func (h *AdminEnquiryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	enquiry, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "enquiry not found")
		return
	}
	response.OK(w, enquiry)
}

func (h *AdminEnquiryHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body struct {
		Status string `json:"status"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil || body.Status == "" {
		response.BadRequest(w, "status is required")
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), id, body.Status); err != nil {
		response.InternalError(w, "failed to update status")
		return
	}
	h.audit.Record(r, "update_status", "enquiry", id,
		"Set enquiry status to "+body.Status, map[string]interface{}{"status": body.Status})
	response.OK(w, map[string]string{"status": body.Status})
}
