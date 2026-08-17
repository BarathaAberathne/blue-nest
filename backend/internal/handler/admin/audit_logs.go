package admin

import (
	"net/http"
	"strconv"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
)

type AdminAuditLogHandler struct {
	svc service.AuditService
}

func NewAdminAuditLogHandler(svc service.AuditService) *AdminAuditLogHandler {
	return &AdminAuditLogHandler{svc: svc}
}

// List returns recent audit entries, optionally filtered by actor email,
// entity type, or action. Visible to all management roles (AdminOnly).
func (h *AdminAuditLogHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := models.AuditLogFilter{
		ActorEmail: q.Get("actor"),
		EntityType: q.Get("entity_type"),
		Action:     q.Get("action"),
	}
	if l := q.Get("limit"); l != "" {
		if n, err := strconv.ParseInt(l, 10, 64); err == nil {
			filter.Limit = n
		}
	}
	if sk := q.Get("skip"); sk != "" {
		if n, err := strconv.ParseInt(sk, 10, 64); err == nil && n > 0 {
			filter.Skip = n
		}
	}

	logs, err := h.svc.List(r.Context(), filter)
	if err != nil {
		response.InternalError(w, "failed to fetch audit logs")
		return
	}
	response.OK(w, logs)
}
