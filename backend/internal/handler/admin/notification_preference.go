package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

// MeNotificationPrefsHandler serves a signed-in user's own notification email
// preferences (/me/notification-preferences).
type MeNotificationPrefsHandler struct {
	svc service.NotificationPreferenceService
}

func NewMeNotificationPrefsHandler(svc service.NotificationPreferenceService) *MeNotificationPrefsHandler {
	return &MeNotificationPrefsHandler{svc: svc}
}

func (h *MeNotificationPrefsHandler) Get(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.Get(r.Context(), actorID(r))
	if err != nil {
		response.InternalError(w, "failed to load preferences")
		return
	}
	response.OK(w, res)
}

func (h *MeNotificationPrefsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req models.NotificationPreferenceRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	res, err := h.svc.Set(r.Context(), actorID(r), req.MutedTypes)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, res)
}
