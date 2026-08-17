package admin

import (
	"net/http"
	"strconv"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminOrderHandler struct {
	svc   service.OrderService
	audit service.AuditService
}

func NewAdminOrderHandler(svc service.OrderService, audit service.AuditService) *AdminOrderHandler {
	return &AdminOrderHandler{svc: svc, audit: audit}
}

// List returns paid orders newest-first, paged via ?limit (default 200, cap
// 500) and ?skip — the list used to return the entire collection.
func (h *AdminOrderHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var limit, skip int64
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			limit = n
		}
	}
	if v := q.Get("skip"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
			skip = n
		}
	}
	orders, err := h.svc.ListAll(r.Context(), limit, skip)
	if err != nil {
		response.InternalError(w, "failed to fetch orders")
		return
	}
	response.OK(w, orders)
}

func (h *AdminOrderHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	order, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "order not found")
		return
	}
	response.OK(w, order)
}

func (h *AdminOrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if err := h.svc.UpdateStatus(r.Context(), id, body.Status); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "update_status", "order", id,
		"Set order status to "+body.Status, map[string]interface{}{"status": body.Status})
	response.OK(w, map[string]string{"message": "status updated"})
}
