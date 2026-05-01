package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type CheckoutHandler struct {
	svc service.CheckoutService
}

func NewCheckoutHandler(svc service.CheckoutService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc}
}

func (h *CheckoutHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req service.CreateCheckoutSessionInput
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	req.UserID = userID

	session, err := h.svc.CreateSession(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	response.OK(w, session)
}
