package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminBranchHandler struct {
	svc      service.BranchService
	overview service.BranchOverviewService
	gbp      service.GBPService
	audit    service.AuditService
}

func NewAdminBranchHandler(svc service.BranchService, overview service.BranchOverviewService, gbp service.GBPService, audit service.AuditService) *AdminBranchHandler {
	return &AdminBranchHandler{svc: svc, overview: overview, gbp: gbp, audit: audit}
}

// caller resolves the authenticated user's role + branch scope from context.
func caller(r *http.Request) (models.Role, []string) {
	role, _ := r.Context().Value(middleware.UserRoleKey).(string)
	branches, _ := r.Context().Value(middleware.UserBranchesKey).([]string)
	return models.Role(role), branches
}

// List returns the full branch records the caller is scoped to.
func (h *AdminBranchHandler) List(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	all, err := h.svc.ListAdmin(r.Context(), r.URL.Query().Get("archived") == "true")
	if err != nil {
		response.InternalError(w, "failed to fetch branches")
		return
	}
	response.OK(w, policy.FilterBranches(role, scope, all))
}

// Overview returns the aggregated per-branch rollup rows, scoped to the caller.
func (h *AdminBranchHandler) Overview(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	all, err := h.svc.ListAdmin(r.Context(), false)
	if err != nil {
		response.InternalError(w, "failed to fetch branches")
		return
	}
	rows, err := h.overview.Overview(r.Context(), policy.FilterBranches(role, scope, all))
	if err != nil {
		response.InternalError(w, "failed to aggregate branches")
		return
	}
	response.OK(w, rows)
}

func (h *AdminBranchHandler) Get(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	slug := chi.URLParam(r, "slug")
	if !policy.CanScope(role, scope, slug) {
		response.Forbidden(w, "branch not in your scope")
		return
	}
	b, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		response.NotFound(w, "branch not found")
		return
	}
	response.OK(w, b)
}

func (h *AdminBranchHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	slug := chi.URLParam(r, "slug")
	if !policy.CanScope(role, scope, slug) {
		response.Forbidden(w, "branch not in your scope")
		return
	}
	b, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		response.NotFound(w, "branch not found")
		return
	}
	dash, err := h.overview.Dashboard(r.Context(), b)
	if err != nil {
		response.InternalError(w, "failed to build dashboard")
		return
	}
	response.OK(w, dash)
}

func (h *AdminBranchHandler) Reviews(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	slug := chi.URLParam(r, "slug")
	if !policy.CanScope(role, scope, slug) {
		response.Forbidden(w, "branch not in your scope")
		return
	}
	analytics, err := h.gbp.BranchReviews(r.Context(), slug)
	if err != nil {
		response.InternalError(w, "failed to load reviews")
		return
	}
	response.OK(w, analytics)
}

func (h *AdminBranchHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.BranchRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "branch", created.Slug, "Created branch "+created.Name, nil)
	response.Created(w, created)
}

func (h *AdminBranchHandler) Update(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	slug := chi.URLParam(r, "slug")
	if !policy.CanManageBranch(callerOrg(r), role, scope, slug) {
		response.Forbidden(w, "you cannot edit this branch")
		return
	}
	var req models.BranchRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), slug, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "branch", slug, "Updated branch "+updated.Name, nil)
	response.OK(w, updated)
}

func (h *AdminBranchHandler) SetManagers(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var req models.BranchManagers
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.SetManagers(r.Context(), slug, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "assign", "branch", slug, "Updated leadership for "+updated.Name, nil)
	response.OK(w, updated)
}

func (h *AdminBranchHandler) Archive(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	archived := r.URL.Query().Get("restore") != "true"
	if err := h.svc.Archive(r.Context(), slug, archived); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	action := "archive"
	if !archived {
		action = "restore"
	}
	h.audit.Record(r, action, "branch", slug, action+" branch", nil)
	response.NoContent(w)
}
