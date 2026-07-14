package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type AdminAttendanceHandler struct {
	svc   service.AttendanceService
	audit service.AuditService
}

func NewAdminAttendanceHandler(svc service.AttendanceService, audit service.AuditService) *AdminAttendanceHandler {
	return &AdminAttendanceHandler{svc: svc, audit: audit}
}

// attendanceActor returns the signed-in user's email for check-in/out attribution.
func attendanceActor(r *http.Request) string {
	email, _ := r.Context().Value(middleware.UserEmailKey).(string)
	return email
}

// Register lists the day's register (one row per active child).
func (h *AdminAttendanceHandler) Register(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	rows, err := h.svc.Register(r.Context(), q.Get("date"), q.Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to build register")
		return
	}
	response.OK(w, rows)
}

func (h *AdminAttendanceHandler) Today(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	stats, err := h.svc.TodayStats(r.Context(), q.Get("date"), q.Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to compute attendance stats")
		return
	}
	response.OK(w, stats)
}

func (h *AdminAttendanceHandler) CheckIn(w http.ResponseWriter, r *http.Request) {
	var req models.CheckInRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rec, err := h.svc.CheckIn(r.Context(), req, attendanceActor(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "check_in", "attendance", rec.ChildID, "Checked in "+rec.ChildName, nil)
	response.OK(w, rec)
}

func (h *AdminAttendanceHandler) CheckOut(w http.ResponseWriter, r *http.Request) {
	var req models.CheckOutRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rec, err := h.svc.CheckOut(r.Context(), req, attendanceActor(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "check_out", "attendance", rec.ChildID, "Checked out "+rec.ChildName, nil)
	response.OK(w, rec)
}

func (h *AdminAttendanceHandler) Mark(w http.ResponseWriter, r *http.Request) {
	var req models.AttendanceMarkRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rec, err := h.svc.Mark(r.Context(), req, attendanceActor(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "mark", "attendance", rec.ChildID, "Marked "+rec.ChildName+" "+string(rec.Status), nil)
	response.OK(w, rec)
}
