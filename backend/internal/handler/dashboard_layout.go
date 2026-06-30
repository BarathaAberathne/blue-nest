package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type DashboardLayoutHandler struct {
	svc service.DashboardLayoutService
}

func NewDashboardLayoutHandler(svc service.DashboardLayoutService) *DashboardLayoutHandler {
	return &DashboardLayoutHandler{svc: svc}
}

// Get returns the caller's saved dashboard layout. When none exists the response
// is an empty widget list, so the UI applies its defaults.
func (h *DashboardLayoutHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	layout, err := h.svc.Get(r.Context(), userID)
	if err != nil {
		response.InternalError(w, "failed to load layout")
		return
	}
	if layout == nil {
		response.OK(w, map[string]interface{}{"widgets": []models.DashboardWidget{}})
		return
	}
	response.OK(w, layout)
}

// Save upserts the caller's dashboard layout (order + hidden + size).
func (h *DashboardLayoutHandler) Save(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	var req models.SaveDashboardLayoutRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	layout, err := h.svc.Save(r.Context(), userID, req.Widgets)
	if err != nil {
		response.InternalError(w, "failed to save layout")
		return
	}
	response.OK(w, layout)
}
