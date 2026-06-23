package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminOrderRequestHandler serves the management view of staff supply requests:
// the aggregated list to place real orders from, plus the status workflow.
type AdminOrderRequestHandler struct {
	svc   service.OrderRequestService
	audit service.AuditService
}

func NewAdminOrderRequestHandler(svc service.OrderRequestService, audit service.AuditService) *AdminOrderRequestHandler {
	return &AdminOrderRequestHandler{svc: svc, audit: audit}
}

func (h *AdminOrderRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	requests, err := h.svc.ListAll(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch order requests")
		return
	}
	response.OK(w, requests)
}

func (h *AdminOrderRequestHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	req, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "request not found")
		return
	}
	response.OK(w, req)
}

func (h *AdminOrderRequestHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil || body.Status == "" {
		response.BadRequest(w, "status is required")
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), id, body.Status); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update_status", "order_request", id,
		"Set order request status to "+body.Status, map[string]interface{}{"status": body.Status})
	response.OK(w, map[string]string{"status": body.Status})
}
