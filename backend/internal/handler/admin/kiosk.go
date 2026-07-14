package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminKioskHandler struct {
	svc   service.KioskService
	audit service.AuditService
}

func NewAdminKioskHandler(svc service.KioskService, audit service.AuditService) *AdminKioskHandler {
	return &AdminKioskHandler{svc: svc, audit: audit}
}

func actorID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.UserIDKey).(string)
	return id
}

// CreateDevice registers an entrance tablet and returns its token ONCE (never
// retrievable again). The tablet stores the token; the admin only ever sees the
// last-4 hint afterwards.
func (h *AdminKioskHandler) CreateDevice(w http.ResponseWriter, r *http.Request) {
	var req models.KioskDeviceRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	device, token, err := h.svc.CreateDevice(r.Context(), req, actorID(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "kiosk_device", device.ID.Hex(), "Registered kiosk "+device.Name, map[string]interface{}{"branch": device.BranchSlug})
	response.Created(w, map[string]interface{}{"device": device, "token": token})
}

func (h *AdminKioskHandler) ListDevices(w http.ResponseWriter, r *http.Request) {
	devices, err := h.svc.ListDevices(r.Context(), r.URL.Query().Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to load devices")
		return
	}
	if devices == nil {
		devices = []models.KioskDevice{}
	}
	response.OK(w, devices)
}

func (h *AdminKioskHandler) SetActive(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Active bool `json:"active"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if err := h.svc.SetDeviceActive(r.Context(), id, body.Active); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	state := "deactivated"
	if body.Active {
		state = "activated"
	}
	h.audit.Record(r, "update", "kiosk_device", id, "Kiosk "+state, nil)
	response.OK(w, map[string]bool{"active": body.Active})
}

func (h *AdminKioskHandler) DeleteDevice(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteDevice(r.Context(), id); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "kiosk_device", id, "Removed kiosk device", nil)
	response.NoContent(w)
}

// SetStaffPIN sets or clears a staff member's kiosk PIN (empty clears it).
func (h *AdminKioskHandler) SetStaffPIN(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		PIN string `json:"pin"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if err := h.svc.SetStaffPIN(r.Context(), id, body.PIN); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	action := "Set kiosk PIN"
	if body.PIN == "" {
		action = "Cleared kiosk PIN"
	}
	h.audit.Record(r, "update", "staff", id, action, nil)
	response.OK(w, map[string]bool{"has_pin": body.PIN != ""})
}
