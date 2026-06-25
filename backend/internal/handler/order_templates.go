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

// OrderTemplateHandler serves shared "standing order" templates (staff + management).
type OrderTemplateHandler struct {
	svc service.OrderTemplateService
}

func NewOrderTemplateHandler(svc service.OrderTemplateService) *OrderTemplateHandler {
	return &OrderTemplateHandler{svc: svc}
}

func (h *OrderTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	templates, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch templates")
		return
	}
	response.OK(w, templates)
}

func (h *OrderTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	userName, _ := r.Context().Value(middleware.UserEmailKey).(string)

	var req models.CreateOrderTemplateRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), userID, userName, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.Created(w, created)
}

func (h *OrderTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, "failed to delete template")
		return
	}
	response.OK(w, map[string]string{"message": "template deleted"})
}
