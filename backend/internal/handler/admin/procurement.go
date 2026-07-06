package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
)

type AdminProcurementHandler struct {
	analytics service.ProcurementAnalyticsService
}

func NewAdminProcurementHandler(analytics service.ProcurementAnalyticsService) *AdminProcurementHandler {
	return &AdminProcurementHandler{analytics: analytics}
}

// Analytics returns the server-side procurement roll-up (spend by supplier/branch,
// monthly spend, item demand, lead times, status breakdowns).
func (h *AdminProcurementHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	data, err := h.analytics.Compute(r.Context())
	if err != nil {
		response.InternalError(w, "failed to compute analytics")
		return
	}
	response.OK(w, data)
}
