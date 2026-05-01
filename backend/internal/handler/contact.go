package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type ContactHandler struct {
	svc service.EnquiryService
}

func NewContactHandler(svc service.EnquiryService) *ContactHandler {
	return &ContactHandler{svc: svc}
}

func (h *ContactHandler) Submit(w http.ResponseWriter, r *http.Request) {
	var req models.EnquiryRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	enquiry, err := h.svc.Submit(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	response.Created(w, enquiry)
}
