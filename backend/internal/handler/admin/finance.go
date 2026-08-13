package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminFinanceHandler — family billing accounts, charges, payments, schedules
// and Direct Debit (permission finance.manage; adjustments finance.adjust).
type AdminFinanceHandler struct {
	svc   service.FinanceService
	audit service.AuditService
}

func NewAdminFinanceHandler(svc service.FinanceService, audit service.AuditService) *AdminFinanceHandler {
	return &AdminFinanceHandler{svc: svc, audit: audit}
}

func (h *AdminFinanceHandler) Families(w http.ResponseWriter, r *http.Request) {
	fams, err := h.svc.Families(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch families")
		return
	}
	response.OK(w, fams)
}

func (h *AdminFinanceHandler) Family(w http.ResponseWriter, r *http.Request) {
	view, err := h.svc.FamilyView(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, view)
}

// EnsureFamily creates (or joins) the family account for a child.
func (h *AdminFinanceHandler) EnsureFamily(w http.ResponseWriter, r *http.Request) {
	childID := chi.URLParam(r, "id")
	f, err := h.svc.EnsureFamily(r.Context(), childID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "family_ensure", "family", f.ID.Hex(), "Ensured family account "+f.Name+" for child", nil)
	response.OK(w, f)
}

func (h *AdminFinanceHandler) CreateCharge(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ChargeRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	c, err := h.svc.CreateCharge(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "charge_create", "family", id, "Raised charge "+c.Ref+" ("+c.Description+")", nil)
	response.Created(w, c)
}

func (h *AdminFinanceHandler) FirstPayment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.FirstPaymentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	charges, err := h.svc.CreateFirstPayment(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "first_payment", "family", id, "Raised first-payment charges (deposit + first month)", nil)
	response.Created(w, charges)
}

func (h *AdminFinanceHandler) CreateSchedule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ScheduleRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	s, err := h.svc.CreateSchedule(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "schedule_create", "family", id, "Created a monthly payment schedule", nil)
	response.Created(w, s)
}

// MarkMandate records an offline/paper Direct Debit mandate (finance.adjust).
func (h *AdminFinanceHandler) MarkMandate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Reference string `json:"reference"`
	}
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	f, err := h.svc.MarkMandateActive(r.Context(), id, req.Reference)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "mandate_manual", "family", id, "Recorded an offline Direct Debit mandate", nil)
	response.OK(w, f)
}

func (h *AdminFinanceHandler) Collect(w http.ResponseWriter, r *http.Request) {
	chargeID := chi.URLParam(r, "chargeId")
	c, err := h.svc.CollectCharge(r.Context(), chargeID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "charge_collect", "charge", chargeID, "Raised a Direct Debit collection for "+c.Ref, nil)
	response.OK(w, c)
}

func (h *AdminFinanceHandler) ManualPayment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ManualPaymentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	p, err := h.svc.RecordManualPayment(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "payment_manual", "family", id, "Recorded a manual payment", nil)
	response.Created(w, p)
}

func (h *AdminFinanceHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	kpis, err := h.svc.Dashboard(r.Context())
	if err != nil {
		response.InternalError(w, "failed to build the finance dashboard")
		return
	}
	response.OK(w, kpis)
}

// RunReminders triggers the reminder sweep for the caller's org on demand.
func (h *AdminFinanceHandler) RunReminders(w http.ResponseWriter, r *http.Request) {
	n, err := h.svc.RunReminderSweep(r.Context())
	if err != nil {
		response.InternalError(w, "reminder sweep failed")
		return
	}
	h.audit.Record(r, "reminders_run", "finance", "", "Ran the fee reminder sweep", map[string]any{"sent": n})
	response.OK(w, map[string]int{"sent": n})
}

// Remind sends a manual reminder for one charge.
func (h *AdminFinanceHandler) Remind(w http.ResponseWriter, r *http.Request) {
	chargeID := chi.URLParam(r, "chargeId")
	log, err := h.svc.SendChargeReminder(r.Context(), chargeID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "reminder_manual", "charge", chargeID, "Sent a manual payment reminder", nil)
	response.OK(w, log)
}

func (h *AdminFinanceHandler) Communications(w http.ResponseWriter, r *http.Request) {
	logs, err := h.svc.Communications(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.InternalError(w, "failed to fetch communications")
		return
	}
	response.OK(w, logs)
}
