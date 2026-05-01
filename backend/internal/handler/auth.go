package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type AuthHandler struct {
	svc service.AuthService
}

func NewAuthHandler(svc service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
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

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{"message": "token refresh – not yet implemented"})
}
