package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

// MeHandler serves the signed-in user's own self-service profile hub: their
// staff record (view + limited self-edit), attendance history and personal rota.
type MeHandler struct {
	svc   service.MeService
	audit service.AuditService
}

func NewMeHandler(svc service.MeService, audit service.AuditService) *MeHandler {
	return &MeHandler{svc: svc, audit: audit}
}

// Profile returns the caller's own staff record.
func (h *MeHandler) Profile(w http.ResponseWriter, r *http.Request) {
	st, err := h.svc.Profile(r.Context(), actorID(r))
	if err != nil {
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, st)
}

// UpdateProfile applies the self-editable subset (contact details, next-of-kin,
// certifications).
func (h *MeHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req models.MeProfileUpdate
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	st, err := h.svc.UpdateProfile(r.Context(), actorID(r), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "me_profile", st.ID.Hex(), "Updated own profile", nil)
	response.OK(w, st)
}

// Attendance returns the caller's attendance records + summary for a range.
func (h *MeHandler) Attendance(w http.ResponseWriter, r *http.Request) {
	recs, summary, err := h.svc.Attendance(r.Context(), actorID(r), r.URL.Query().Get("from"), r.URL.Query().Get("to"))
	if err != nil {
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, map[string]interface{}{"records": recs, "summary": summary})
}

// Rota returns the caller's own shifts for a range.
func (h *MeHandler) Rota(w http.ResponseWriter, r *http.Request) {
	shifts, err := h.svc.Rota(r.Context(), actorID(r), r.URL.Query().Get("from"), r.URL.Query().Get("to"))
	if err != nil {
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, shifts)
}
