package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
)

// FeeConfigHandler exposes the fee/funding rules to the public fee calculator.
// Read-only and pinned to the default tenant by middleware.
type FeeConfigHandler struct {
	svc service.FeeConfigService
}

func NewFeeConfigHandler(svc service.FeeConfigService) *FeeConfigHandler {
	return &FeeConfigHandler{svc: svc}
}

// Bundle returns { branches: {slug: {...rates}}, meta } for the default tenant.
func (h *FeeConfigHandler) Bundle(w http.ResponseWriter, r *http.Request) {
	bundle, err := h.svc.Bundle(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch fee config")
		return
	}
	response.OK(w, bundle)
}
