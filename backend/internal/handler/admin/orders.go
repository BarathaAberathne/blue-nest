package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminOrderHandler struct {
	svc service.OrderService
}

func NewAdminOrderHandler(svc service.OrderService) *AdminOrderHandler {
	return &AdminOrderHandler{svc: svc}
}

func (h *AdminOrderHandler) List(w http.ResponseWriter, r *http.Request) {
	orders, err := h.svc.ListAll(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
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
	response.OK(w, map[string]string{"message": "status updated"})
}
