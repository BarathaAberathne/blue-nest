package handler

import (
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type DashboardLayoutHandler struct {
	svc service.DashboardLayoutService
}

func NewDashboardLayoutHandler(svc service.DashboardLayoutService) *DashboardLayoutHandler {
	return &DashboardLayoutHandler{svc: svc}
}

// Get returns the caller's active dashboard layout. When none exists the response
// is an empty widget list, so the UI applies its defaults.
func (h *DashboardLayoutHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	layout, err := h.svc.Active(r.Context(), userID)
	if err != nil {
		response.InternalError(w, "failed to load layout")
		return
	}
	if layout == nil {
		response.OK(w, map[string]interface{}{"widgets": []models.DashboardWidget{}, "name": models.DefaultLayoutName})
		return
	}
	response.OK(w, layout)
}

// List returns every named layout the caller has saved (active first).
func (h *DashboardLayoutHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	layouts, err := h.svc.List(r.Context(), userID)
	if err != nil {
		response.InternalError(w, "failed to load layouts")
		return
	}
	if layouts == nil {
		layouts = []models.DashboardLayout{}
	}
	response.OK(w, map[string]interface{}{"layouts": layouts})
}

// Save upserts a named layout (order + hidden + size) and makes it active.
func (h *DashboardLayoutHandler) Save(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var req models.SaveDashboardLayoutRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	layout, err := h.svc.Save(r.Context(), userID, req.Name, req.Widgets)
	if err != nil {
		response.InternalError(w, "failed to save layout")
		return
	}
	response.OK(w, layout)
}

// Activate switches which named layout is active.
func (h *DashboardLayoutHandler) Activate(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var req models.ActivateLayoutRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		response.BadRequest(w, "a layout name is required")
		return
	}
	layout, err := h.svc.Activate(r.Context(), userID, req.Name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, layout)
}

// Delete removes a named layout and reports which layout is active afterwards.
func (h *DashboardLayoutHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	name := chi.URLParam(r, "name")
	active, err := h.svc.Delete(r.Context(), userID, name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, map[string]interface{}{"active": active})
}
