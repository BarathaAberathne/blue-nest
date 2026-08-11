package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

// PortalHandler serves the parent portal. EVERY endpoint resolves the caller
// through ParentService.AuthorisedChildIDs (user → parent → portal-flagged
// children) — the server-side scope that makes changing an id in the URL
// useless (IDOR-proof by construction).
type PortalHandler struct {
	parents  service.ParentService
	children service.ChildService
}

func NewPortalHandler(parents service.ParentService, children service.ChildService) *PortalHandler {
	return &PortalHandler{parents: parents, children: children}
}

func (h *PortalHandler) scope(w http.ResponseWriter, r *http.Request) (*models.Parent, map[string]bool, bool) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	parent, ids, err := h.parents.AuthorisedChildIDs(r.Context(), uid)
	if err != nil {
		response.Forbidden(w, err.Error())
		return nil, nil, false
	}
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return parent, set, true
}

// Me returns the parent's own record + child relationships.
func (h *PortalHandler) Me(w http.ResponseWriter, r *http.Request) {
	parent, _, ok := h.scope(w, r)
	if !ok {
		return
	}
	rels, err := h.parents.ForParent(r.Context(), parent.ID.Hex())
	if err != nil {
		response.InternalError(w, "failed to load your family")
		return
	}
	response.OK(w, map[string]any{"parent": parent, "children": rels})
}

// Children returns the full child records the parent is authorised for.
func (h *PortalHandler) Children(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	out := make([]models.Child, 0, len(authorised))
	for id := range authorised {
		if c, err := h.children.GetByID(r.Context(), id); err == nil && c != nil {
			out = append(out, *c)
		}
	}
	response.OK(w, out)
}

// Child returns one authorised child — any other id is a 404 (not 403: the
// response must not confirm that a guessed id exists).
func (h *PortalHandler) Child(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	c, err := h.children.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	response.OK(w, c)
}
