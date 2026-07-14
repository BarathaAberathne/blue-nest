package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminDashboardProfileHandler struct {
	svc   service.DashboardProfileService
	audit service.AuditService
}

func NewAdminDashboardProfileHandler(svc service.DashboardProfileService, audit service.AuditService) *AdminDashboardProfileHandler {
	return &AdminDashboardProfileHandler{svc: svc, audit: audit}
}

// List returns every org dashboard profile plus the assignable-role list so the
// super-admin UI can build the profile editor.
func (h *AdminDashboardProfileHandler) List(w http.ResponseWriter, r *http.Request) {
	profiles, err := h.svc.List(r.Context())
	if err != nil {
		response.InternalError(w, "failed to load dashboard profiles")
		return
	}
	roles := make([]map[string]string, 0, len(models.ManagementRoles))
	for _, role := range models.ManagementRoles {
		roles = append(roles, map[string]string{"role": string(role), "label": models.RoleLabel(role)})
	}
	response.OK(w, map[string]interface{}{"profiles": profiles, "roles": roles})
}

func (h *AdminDashboardProfileHandler) Save(w http.ResponseWriter, r *http.Request) {
	var req models.SaveDashboardProfileRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	p, err := h.svc.Save(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "dashboard_profile", p.Slug, "Saved dashboard profile "+p.Name, nil)
	response.OK(w, p)
}

func (h *AdminDashboardProfileHandler) Delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if err := h.svc.Delete(r.Context(), slug); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "dashboard_profile", slug, "Deleted dashboard profile", nil)
	response.NoContent(w)
}
