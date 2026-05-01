package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type AdminUserHandler struct {
	auth service.AuthService
}

func NewAdminUserHandler(auth service.AuthService) *AdminUserHandler {
	return &AdminUserHandler{auth: auth}
}

func (h *AdminUserHandler) List(w http.ResponseWriter, r *http.Request) {
	users, err := h.auth.ListAdminUsers(r.Context())
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

	created, err := h.auth.CreateAdminUser(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	response.Created(w, created)
}
