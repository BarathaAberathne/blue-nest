package admin

import (
	"net/http"
	"strconv"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

type AdminNotificationHandler struct {
	svc service.NotificationService
}

func NewAdminNotificationHandler(svc service.NotificationService) *AdminNotificationHandler {
	return &AdminNotificationHandler{svc: svc}
}

func meID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.UserIDKey).(string)
	return id
}

// List returns the caller's own recent notifications (+ unread count).
func (h *AdminNotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := meID(r)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	if limit == 0 {
		limit = 30
	}
	items, err := h.svc.ListMine(r.Context(), uid, limit)
	if err != nil {
		response.InternalError(w, "failed to fetch notifications")
		return
	}
	unread, _ := h.svc.CountUnread(r.Context(), uid)
	response.OK(w, map[string]any{"items": items, "unread": unread})
}

func (h *AdminNotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.MarkRead(r.Context(), chi.URLParam(r, "id"), meID(r)); err != nil {
		response.InternalError(w, "failed to mark read")
		return
	}
	response.NoContent(w)
}

func (h *AdminNotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.MarkAllRead(r.Context(), meID(r)); err != nil {
		response.InternalError(w, "failed to mark read")
		return
	}
	response.NoContent(w)
}
