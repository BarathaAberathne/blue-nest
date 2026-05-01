package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

type BlogHandler struct {
	svc service.BlogService
}

func NewBlogHandler(svc service.BlogService) *BlogHandler {
	return &BlogHandler{svc: svc}
}

func (h *BlogHandler) ListPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := h.svc.ListPublished(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, posts)
}

func (h *BlogHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	post, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		response.NotFound(w, "post not found")
		return
	}
	response.OK(w, post)
}

func (h *BlogHandler) LikePost(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	count, err := h.svc.LikePost(r.Context(), slug)
	if err != nil {
		response.NotFound(w, "post not found")
		return
	}
	response.OK(w, map[string]int64{"like_count": count})
}
