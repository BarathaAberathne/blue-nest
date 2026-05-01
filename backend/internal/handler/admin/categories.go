package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminCategoryHandler struct {
	svc service.ProductService
}

func NewAdminCategoryHandler(svc service.ProductService) *AdminCategoryHandler {
	return &AdminCategoryHandler{svc: svc}
}

func (h *AdminCategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	categories, err := h.svc.ListCategories(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, categories)
}

func (h *AdminCategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var c models.Category
	if err := validator.DecodeJSON(r, &c); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	created, err := h.svc.CreateCategory(r.Context(), c)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.Created(w, created)
}

func (h *AdminCategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c models.Category
	if err := validator.DecodeJSON(r, &c); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	updated, err := h.svc.UpdateCategory(r.Context(), id, c)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, updated)
}

func (h *AdminCategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteCategory(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.NoContent(w)
}
