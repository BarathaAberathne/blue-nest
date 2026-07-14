package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type AdminStaffAttendanceHandler struct {
	svc   service.StaffAttendanceService
	audit service.AuditService
}

func NewAdminStaffAttendanceHandler(svc service.StaffAttendanceService, audit service.AuditService) *AdminStaffAttendanceHandler {
	return &AdminStaffAttendanceHandler{svc: svc, audit: audit}
}

func (h *AdminStaffAttendanceHandler) Register(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	rows, err := h.svc.Register(r.Context(), q.Get("date"), q.Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to build staff register")
		return
	}
	response.OK(w, rows)
}

func (h *AdminStaffAttendanceHandler) Today(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	stats, err := h.svc.TodayStats(r.Context(), q.Get("date"), q.Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to compute staff stats")
		return
	}
	response.OK(w, stats)
}

func (h *AdminStaffAttendanceHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	var req models.StaffClockInRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rec, err := h.svc.ClockIn(r.Context(), req, service.ClockContext{Source: models.AttSourceManual, ActorID: attendanceActor(r)})
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "clock_in", "staff_attendance", rec.StaffID, "Clocked in "+rec.StaffName, nil)
	response.OK(w, rec)
}

func (h *AdminStaffAttendanceHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	var req models.StaffClockOutRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rec, err := h.svc.ClockOut(r.Context(), req, service.ClockContext{Source: models.AttSourceManual, ActorID: attendanceActor(r)})
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "clock_out", "staff_attendance", rec.StaffID, "Clocked out "+rec.StaffName, nil)
	response.OK(w, rec)
}

func (h *AdminStaffAttendanceHandler) Mark(w http.ResponseWriter, r *http.Request) {
	var req models.StaffAttendanceMarkRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rec, err := h.svc.Mark(r.Context(), req, attendanceActor(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "mark", "staff_attendance", rec.StaffID, "Marked "+rec.StaffName+" "+string(rec.Status), nil)
	response.OK(w, rec)
}
