package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/config"
	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type AuthHandler struct {
	svc  service.AuthService
	orgs service.OrganisationService
}

func NewAuthHandler(svc service.AuthService, orgs service.OrganisationService, _ *config.Config) *AuthHandler {
	return &AuthHandler{svc: svc, orgs: orgs}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	res, err := h.svc.Register(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.Created(w, res)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	res, err := h.svc.Login(r.Context(), req)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}
	response.OK(w, res)
}

func (h *AuthHandler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	res, err := h.svc.AdminLogin(r.Context(), req)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}

	response.OK(w, res)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{"message": "logged out"})
}

// Me returns the caller's identity + resolved permission set (from the JWT
// context), so the admin UI can gate navigation and pages by capability rather
// than hard-coding role lists. Available to any authenticated user.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	id, _ := r.Context().Value(middleware.UserIDKey).(string)
	role, _ := r.Context().Value(middleware.UserRoleKey).(string)
	email, _ := r.Context().Value(middleware.UserEmailKey).(string)
	perms := models.PermissionsFor(models.Role(role))
	if perms == nil {
		perms = []models.Permission{}
	}
	out := map[string]interface{}{
		"id":          id,
		"email":       email,
		"role":        role,
		"permissions": perms,
	}
	// Include the caller's organisation (branding + feature flags) so the client
	// can render tenant branding and gate features from the same /auth/me call.
	if orgID, _ := r.Context().Value(middleware.UserOrgKey).(string); orgID != "" && h.orgs != nil {
		if org, err := h.orgs.GetByID(r.Context(), orgID); err == nil && org != nil {
			features := org.Settings.Features
			if features == nil {
				features = []string{}
			}
			out["org"] = map[string]interface{}{
				"id": org.ID.Hex(), "slug": org.Slug, "name": org.Name,
				"branding": org.Branding, "features": features,
			}
		}
	}
	response.OK(w, out)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req models.RefreshRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	res, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}
	response.OK(w, res)
}
