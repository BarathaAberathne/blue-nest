package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

type BranchHandler struct {
	svc service.BranchService
}

func NewBranchHandler(svc service.BranchService) *BranchHandler {
	return &BranchHandler{svc: svc}
}

func (h *BranchHandler) List(w http.ResponseWriter, r *http.Request) {
	branches, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, branches)
}

func (h *BranchHandler) Get(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	branch, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		response.NotFound(w, "branch not found")
		return
	}
	response.OK(w, branch)
}
