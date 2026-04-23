package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
)

type CheckoutHandler struct {
	svc service.CheckoutService
}

func NewCheckoutHandler(svc service.CheckoutService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc}
}

func (h *CheckoutHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{
		"message":    "Stripe checkout session – not yet implemented",
		"session_id": "cs_test_placeholder",
	})
}
