package admin

import (
	"net/http"
	"strconv"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminDailyRecordHandler struct {
	svc   service.DailyRecordService
	audit service.AuditService
}

func NewAdminDailyRecordHandler(svc service.DailyRecordService, audit service.AuditService) *AdminDailyRecordHandler {
	return &AdminDailyRecordHandler{svc: svc, audit: audit}
}

func (h *AdminDailyRecordHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, q.Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	limit, _ := strconv.ParseInt(q.Get("limit"), 10, 64)
	filter := repository.DailyRecordFilter{
		Type:     q.Get("type"),
		ChildID:  q.Get("child"),
		Branch:   branch,
		Status:   q.Get("status"),
		Approval: q.Get("approval"), // approved | pending | rejected | "" (any)
		Date:     q.Get("date"),
		Since:    q.Get("since"),
		Q:        q.Get("q"),
		Limit:    limit,
	}
	items, err := h.svc.List(r.Context(), filter)
	if err != nil {
		response.InternalError(w, "failed to fetch records")
		return
	}
	response.OK(w, items)
}

func (h *AdminDailyRecordHandler) Stats(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	stats, err := h.svc.Stats(r.Context(), r.URL.Query().Get("date"), branch)
	if err != nil {
		response.InternalError(w, "failed to compute stats")
		return
	}
	response.OK(w, stats)
}

func (h *AdminDailyRecordHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "record not found")
		return
	}
	if !inScope(r, item.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	response.OK(w, item)
}

func (h *AdminDailyRecordHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.DailyRecordRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if !inScope(r, req.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	a := actor(r)
	created, err := h.svc.Create(r.Context(), req, a.ID, a.Name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "submit", "daily_record", created.ID.Hex(), "Submitted "+string(created.Type)+" for approval: "+created.Title, nil)
	response.Created(w, created)
}

// Approve signs off a submitted log (four-eyes — the service rejects
// self-approval). Gated by daily_logs.approve.
func (h *AdminDailyRecordHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "record not found")
		return
	}
	if !inScope(r, existing.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	a := actor(r)
	updated, err := h.svc.Approve(r.Context(), id, a.ID, a.Name)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "approve", "daily_record", id, "Approved "+string(updated.Type)+": "+updated.Title, nil)
	response.OK(w, updated)
}

// Reject sends a submitted log back with a required reason.
func (h *AdminDailyRecordHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "record not found")
		return
	}
	if !inScope(r, existing.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	var body models.DailyRejectRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	a := actor(r)
	updated, err := h.svc.Reject(r.Context(), id, a.ID, a.Name, body.Reason)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "reject", "daily_record", id, "Rejected "+string(updated.Type)+": "+updated.Title, map[string]any{"reason": body.Reason})
	response.OK(w, updated)
}

func (h *AdminDailyRecordHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.DailyRecordRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "record not found")
		return
	}
	if !inScope(r, existing.BranchSlug) || !inScope(r, req.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "daily_record", id, "Updated "+string(updated.Type)+": "+updated.Title, nil)
	response.OK(w, updated)
}

func (h *AdminDailyRecordHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status models.DailyRecordStatus `json:"status"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "record not found")
		return
	}
	if !inScope(r, existing.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	updated, err := h.svc.SetStatus(r.Context(), id, body.Status)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "status", "daily_record", id, "Set "+string(updated.Type)+" → "+string(updated.Status), nil)
	response.OK(w, updated)
}

func (h *AdminDailyRecordHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "record not found")
		return
	}
	if !inScope(r, existing.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "daily_record", id, "Deleted record", nil)
	response.NoContent(w)
}
