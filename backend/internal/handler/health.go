package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/pkg/response"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler { return &HealthHandler{} }

func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{
		"status":  "ok",
		"service": "blue-nest-montessori-api",
	})
}
