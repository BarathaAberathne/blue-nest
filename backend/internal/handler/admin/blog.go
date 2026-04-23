package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminBlogHandler struct {
	svc service.BlogService
}

func NewAdminBlogHandler(svc service.BlogService) *AdminBlogHandler {
	return &AdminBlogHandler{svc: svc}
}

func (h *AdminBlogHandler) List(w http.ResponseWriter, r *http.Request) {
	posts, err := h.svc.ListAll(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, posts)
}

func (h *AdminBlogHandler) Create(w http.ResponseWriter, r *http.Request) {
	var post models.BlogPost
	if err := validator.DecodeJSON(r, &post); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), post)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.Created(w, created)
}

func (h *AdminBlogHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var post models.BlogPost
	if err := validator.DecodeJSON(r, &post); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, post)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, updated)
}
