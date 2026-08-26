package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminUserHandler struct {
	auth  service.AuthService
	audit service.AuditService
}

func NewAdminUserHandler(auth service.AuthService, audit service.AuditService) *AdminUserHandler {
	return &AdminUserHandler{auth: auth, audit: audit}
}

func (h *AdminUserHandler) List(w http.ResponseWriter, r *http.Request) {
	users, err := h.auth.ListAllUsers(r.Context())
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}
	response.OK(w, users)
}

func (h *AdminUserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.AdminCreateUserRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	// Allow any role when creating via admin panel
	if req.Role == "" {
		req.Role = models.RoleCustomer
	}

	created, err := h.auth.CreateAdminUser(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	h.audit.Record(r, "create", "user", created.ID.Hex(),
		"Created user "+created.Email+" ("+string(created.Role)+")", nil)
	response.Created(w, created)
}

func (h *AdminUserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "missing user id")
		return
	}

	var req models.AdminUpdateUserRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	// Lockout guard: a super-admin can't demote their own account out of super_admin.
	if actorID, _ := r.Context().Value(middleware.UserIDKey).(string); actorID == id &&
		req.Role != "" && req.Role != models.RoleSuperAdmin {
		response.BadRequest(w, "you cannot change your own role")
		return
	}

	// Capture the previous role so the audit trail records role CHANGES with
	// their before value — "Updated user X" alone made drift untraceable.
	prevRole := ""
	if prev, err := h.auth.FindUserByID(r.Context(), id); err == nil && prev != nil {
		prevRole = string(prev.Role)
	}

	updated, err := h.auth.UpdateUser(r.Context(), id, req)
	if err != nil {
		// Same mapping as Create: service errors here are validation failures
		// ("invalid role", bad email) — a 500 misreported them as server faults.
		response.BadRequest(w, err.Error())
		return
	}

	summary := "Updated user " + updated.Email
	if prevRole != "" && prevRole != string(updated.Role) {
		summary += " (role " + prevRole + " → " + string(updated.Role) + ")"
	}
	h.audit.Record(r, "update", "user", id,
		summary, map[string]interface{}{"role": string(updated.Role), "previous_role": prevRole})
	response.OK(w, updated)
}

func (h *AdminUserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "missing user id")
		return
	}

	// Lockout guard: don't let a super-admin delete their own account.
	if actorID, _ := r.Context().Value(middleware.UserIDKey).(string); actorID == id {
		response.BadRequest(w, "you cannot delete your own account")
		return
	}

	if err := h.auth.DeleteUser(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}

	h.audit.Record(r, "delete", "user", id, "Deleted user", nil)
	response.OK(w, map[string]string{"message": "user deleted"})
}

func (h *AdminUserHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "missing user id")
		return
	}

	var req models.AdminResetPasswordRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	if err := h.auth.ResetPassword(r.Context(), id, req.Password); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	h.audit.Record(r, "reset_password", "user", id, "Reset user password", nil)
	response.OK(w, map[string]string{"message": "password updated"})
}
