package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminRoleHandler struct {
	svc   service.RoleService
	audit service.AuditService
}

func NewAdminRoleHandler(svc service.RoleService, audit service.AuditService) *AdminRoleHandler {
	return &AdminRoleHandler{svc: svc, audit: audit}
}

// List returns every role definition plus the permission catalogue + categories
// so the frontend can render the grouped Permission Builder.
func (h *AdminRoleHandler) List(w http.ResponseWriter, r *http.Request) {
	roles, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to load roles")
		return
	}
	response.OK(w, map[string]interface{}{
		"roles":      roles,
		"catalogue":  models.PermissionCatalogue,
		"categories": models.PermissionCategories,
	})
}

// Assignable returns the minimal {name,label,is_custom} list of roles a login
// can be given — the SINGLE source every role picker (users page, staff-form
// login section) renders from, so custom Permission-Builder roles appear
// everywhere without hardcoded lists. platform_super_admin (cross-tenant) is
// never offered. Sits under staff.manage (not SuperAdminOnly) because the
// staff form's login section needs it; it leaks no permission payloads.
func (h *AdminRoleHandler) Assignable(w http.ResponseWriter, r *http.Request) {
	roles, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to load roles")
		return
	}
	type row struct {
		Name     models.Role `json:"name"`
		Label    string      `json:"label"`
		IsCustom bool        `json:"is_custom"`
	}
	out := make([]row, 0, len(roles))
	for _, rd := range roles {
		if rd.Name == models.RolePlatformSuperAdmin {
			continue
		}
		out = append(out, row{Name: rd.Name, Label: rd.Label, IsCustom: rd.IsCustom})
	}
	response.OK(w, out)
}

func (h *AdminRoleHandler) UpdatePermissions(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	var body struct {
		Permissions []models.Permission `json:"permissions"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	def, err := h.svc.UpdatePermissions(r.Context(), name, body.Permissions)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "role", name, "Updated permissions for "+def.Label, nil)
	response.OK(w, def)
}

func (h *AdminRoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string              `json:"name"`
		Label       string              `json:"label"`
		Permissions []models.Permission `json:"permissions"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	def, err := h.svc.CreateCustom(r.Context(), body.Name, body.Label, body.Permissions)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "role", string(def.Name), "Created custom role "+def.Label, nil)
	response.Created(w, def)
}

func (h *AdminRoleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	if err := h.svc.Delete(r.Context(), name); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "role", name, "Deleted custom role", nil)
	response.NoContent(w)
}
