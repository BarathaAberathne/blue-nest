package handler

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

// KioskHandler serves the isolated entrance-tablet API. Every route is gated by
// the device-token middleware, which puts the KioskSession (device + branch) in
// context — so the tablet can only search staff + clock in/out within its own
// branch, nothing else.
type KioskHandler struct {
	svc service.KioskService
}

func NewKioskHandler(svc service.KioskService) *KioskHandler {
	return &KioskHandler{svc: svc}
}

// Session echoes the authenticated device's session so the tablet can render its
// header (branch name, device name). Auth already happened in middleware.
func (h *KioskHandler) Session(w http.ResponseWriter, r *http.Request) {
	sess := middleware.KioskSession(r)
	if sess == nil {
		response.Unauthorized(w, "unrecognised device")
		return
	}
	response.OK(w, sess)
}

// Search returns staff at the device's branch matching the query, with today's
// clock state so the tablet shows Clock In vs Clock Out.
func (h *KioskHandler) Search(w http.ResponseWriter, r *http.Request) {
	sess := middleware.KioskSession(r)
	results, err := h.svc.SearchStaff(r.Context(), sess.BranchSlug, r.URL.Query().Get("q"))
	if err != nil {
		response.InternalError(w, "search failed")
		return
	}
	response.OK(w, results)
}

func (h *KioskHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	h.clock(w, r, true)
}

func (h *KioskHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	h.clock(w, r, false)
}

func (h *KioskHandler) clock(w http.ResponseWriter, r *http.Request, in bool) {
	sess := middleware.KioskSession(r)
	var req models.KioskClockRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	cc := service.ClockContext{
		Source:   models.AttSourceKiosk,
		DeviceID: sess.DeviceID,
		IP:       middleware.ClientIP(r),
	}
	var (
		rec *models.StaffAttendanceRecord
		err error
	)
	if in {
		rec, err = h.svc.ClockIn(r.Context(), sess.BranchSlug, req.StaffID, req.PIN, cc)
	} else {
		rec, err = h.svc.ClockOut(r.Context(), sess.BranchSlug, req.StaffID, req.PIN, cc)
	}
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, rec)
}
