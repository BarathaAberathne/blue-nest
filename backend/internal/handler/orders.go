package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

type OrderHandler struct {
	svc service.OrderService
}

func NewOrderHandler(svc service.OrderService) *OrderHandler {
	return &OrderHandler{svc: svc}
}

func (h *OrderHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	orders, err := h.svc.ListByUser(r.Context(), userID)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, orders)
}

func (h *OrderHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	id := chi.URLParam(r, "id")
	order, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "order not found")
		return
	}
	if order.UserID.Hex() != userID {
		response.Forbidden(w, "not allowed to access this order")
		return
	}
	response.OK(w, order)
}
