package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminProductHandler struct {
	svc service.ProductService
}

func NewAdminProductHandler(svc service.ProductService) *AdminProductHandler {
	return &AdminProductHandler{svc: svc}
}

func (h *AdminProductHandler) List(w http.ResponseWriter, r *http.Request) {
	products, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, products)
}

func (h *AdminProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var p models.Product
	if err := validator.DecodeJSON(r, &p); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), p)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.Created(w, created)
}

func (h *AdminProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Product
	if err := validator.DecodeJSON(r, &p); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, p)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, updated)
}

func (h *AdminProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.NoContent(w)
}
