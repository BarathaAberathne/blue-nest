package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
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
	var req models.AddCartItemRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	cart, err := h.svc.AddItem(r.Context(), userID, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, cart)
}

func (h *CartHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	var req models.UpdateCartItemRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	productID := chi.URLParam(r, "id")
	size := r.URL.Query().Get("size")
	cart, err := h.svc.UpdateItem(r.Context(), userID, productID, size, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, cart)
}

func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	productID := chi.URLParam(r, "id")
	size := r.URL.Query().Get("size")
	cart, err := h.svc.RemoveItem(r.Context(), userID, productID, size)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, cart)
}
