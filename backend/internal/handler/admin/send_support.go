package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminSendSupportHandler — sensitive SEND/additional-support profiles and the
// branch SEND overview (permission send.manage). Branch scoping mirrors the
// child handlers: the caller must be in scope for the child's branch, and the
// overview pins branch-scoped callers to their own branch.
type AdminSendSupportHandler struct {
	svc      service.SendSupportService
	children service.ChildService
	audit    service.AuditService
}

func NewAdminSendSupportHandler(svc service.SendSupportService, children service.ChildService, audit service.AuditService) *AdminSendSupportHandler {
	return &AdminSendSupportHandler{svc: svc, children: children, audit: audit}
}

// scopedChild resolves the child and enforces branch scope (404/403 written).
func (h *AdminSendSupportHandler) scopedChild(w http.ResponseWriter, r *http.Request) (*models.Child, bool) {
	child, err := h.children.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "child not found")
		return nil, false
	}
	if !inScope(r, child.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return nil, false
	}
	return child, true
}

func (h *AdminSendSupportHandler) Get(w http.ResponseWriter, r *http.Request) {
	child, ok := h.scopedChild(w, r)
	if !ok {
		return
	}
	p, err := h.svc.Get(r.Context(), child.ID.Hex())
	if err != nil {
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, p) // null when no profile is recorded
}

func (h *AdminSendSupportHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	child, ok := h.scopedChild(w, r)
	if !ok {
		return
	}
	var req models.SendSupportRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	p, prev, err := h.svc.Upsert(r.Context(), child.ID.Hex(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "send_support_update", "child", child.ID.Hex(),
		"Updated SEND/additional-support profile for "+child.FirstName+" "+child.LastName,
		map[string]any{"previous_status": string(prev), "new_status": string(p.Status), "plan_status": string(p.PlanStatus)})
	response.OK(w, p)
}

// Overview — branch SEND view + KPIs. Branch-scoped callers are pinned to one
// of their own branches (the all-branches view stays org-wide-roles-only).
func (h *AdminSendSupportHandler) Overview(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	ov, err := h.svc.Overview(r.Context(), branch)
	if err != nil {
		response.InternalError(w, "failed to build the SEND overview")
		return
	}
	response.OK(w, ov)
}
