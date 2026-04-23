package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

type CartHandler struct {
	svc service.CartService
}

func NewCartHandler(svc service.CartService) *CartHandler {
	return &CartHandler{svc: svc}
}

func (h *CartHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	cart, err := h.svc.GetByUserID(r.Context(), userID)
	if err != nil {
		response.NotFound(w, "cart not found")
		return
	}
	response.OK(w, cart)
}

func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{"message": "add item – not yet implemented"})
}

func (h *CartHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "id")
	response.OK(w, map[string]string{"message": "update item – not yet implemented"})
}

func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "id")
	response.NoContent(w)
}
