package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminBranchTemplateHandler manages reusable branch-setup templates (branches.manage).
type AdminBranchTemplateHandler struct {
	svc   service.BranchTemplateService
	audit service.AuditService
}

func NewAdminBranchTemplateHandler(svc service.BranchTemplateService, audit service.AuditService) *AdminBranchTemplateHandler {
	return &AdminBranchTemplateHandler{svc: svc, audit: audit}
}

func (h *AdminBranchTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch templates")
		return
	}
	response.OK(w, items)
}

func (h *AdminBranchTemplateHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "template not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminBranchTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.BranchTemplateRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	t, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "branch_template", t.ID.Hex(), "Created branch template "+t.Name, nil)
	response.Created(w, t)
}

func (h *AdminBranchTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.BranchTemplateRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	t, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "branch_template", id, "Updated branch template "+t.Name, nil)
	response.OK(w, t)
}

func (h *AdminBranchTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "branch_template", id, "Deleted branch template", nil)
	response.NoContent(w)
}

// Apply creates the template's rooms on ?branch=<slug> (body: {"branch_slug": ...}).
func (h *AdminBranchTemplateHandler) Apply(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		BranchSlug string `json:"branch_slug"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	res, err := h.svc.Apply(r.Context(), id, body.BranchSlug)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "apply", "branch_template", id, "Applied template to "+res.BranchSlug, map[string]any{"rooms_created": res.RoomsCreated})
	response.OK(w, res)
}

// CreateFromBranch captures a branch's rooms into a new template.
func (h *AdminBranchTemplateHandler) CreateFromBranch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		BranchSlug  string `json:"branch_slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	t, err := h.svc.CreateFromBranch(r.Context(), body.BranchSlug, body.Name, body.Description)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "branch_template", t.ID.Hex(), "Captured template "+t.Name+" from "+body.BranchSlug, nil)
	response.Created(w, t)
}
