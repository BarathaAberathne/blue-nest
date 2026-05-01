package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type CommentHandler struct {
	svc service.CommentService
}

func NewCommentHandler(svc service.CommentService) *CommentHandler {
	return &CommentHandler{svc: svc}
}

func (h *CommentHandler) List(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	comments, err := h.svc.ListComments(r.Context(), slug)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, comments)
}

func (h *CommentHandler) Add(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var req models.CommentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	comment, err := h.svc.AddComment(r.Context(), slug, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.Created(w, comment)
}
