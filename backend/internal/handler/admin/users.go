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
	auth service.AuthService
}

func NewAdminUserHandler(auth service.AuthService) *AdminUserHandler {
	return &AdminUserHandler{auth: auth}
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

	updated, err := h.auth.UpdateUser(r.Context(), id, req)
	if err != nil {
		response.InternalError(w, err.Error())
		return
	}

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

	response.OK(w, map[string]string{"message": "password updated"})
}
