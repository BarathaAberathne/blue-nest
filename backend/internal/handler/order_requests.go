package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// OrderRequestHandler serves the staff-facing supply-request endpoints. Staff
// (and management) submit and track their own requests here.
type OrderRequestHandler struct {
	svc   service.OrderRequestService
	audit service.AuditService
}

func NewOrderRequestHandler(svc service.OrderRequestService, audit service.AuditService) *OrderRequestHandler {
	return &OrderRequestHandler{svc: svc, audit: audit}
}

func (h *OrderRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		response.Unauthorized(w, "authentication required")
		return
	}

	var req models.CreateOrderRequestRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	created, err := h.svc.Submit(r.Context(), userID, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.Created(w, created)
}

func (h *OrderRequestHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	if userID == "" {
		response.Unauthorized(w, "authentication required")
		return
	}
	requests, err := h.svc.ListMine(r.Context(), userID)
	if err != nil {
		response.InternalError(w, "failed to fetch your requests")
		return
	}
	response.OK(w, requests)
}

func (h *OrderRequestHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")

	req, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "request not found")
		return
	}
	// Own-only: a staff member may only read their own requests here. (Management
	// view everything through the admin endpoint.)
	if req.UserID.Hex() != userID {
		response.Forbidden(w, "not your request")
		return
	}
	response.OK(w, req)
}

// Cancel withdraws the caller's own pending request.
func (h *OrderRequestHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")

	cancelled, err := h.svc.Cancel(r.Context(), userID, id)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "cancel", "order_request", id, "Cancelled own supply request", nil)
	response.OK(w, cancelled)
}
