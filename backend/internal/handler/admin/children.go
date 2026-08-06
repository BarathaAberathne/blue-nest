package admin

import (
	"net/http"
	"strconv"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/export"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminChildHandler struct {
	svc   service.ChildService
	audit service.AuditService
}

func NewAdminChildHandler(svc service.ChildService, audit service.AuditService) *AdminChildHandler {
	return &AdminChildHandler{svc: svc, audit: audit}
}

func (h *AdminChildHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, q.Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	filter := repository.ChildFilter{
		Branch: branch,
		Room:   q.Get("room"),
		Status: q.Get("status"),
		Q:      q.Get("q"),
	}
	items, err := h.svc.List(r.Context(), filter)
	if err != nil {
		response.InternalError(w, "failed to fetch children")
		return
	}
	response.OK(w, items)
}

// Export streams the filtered children roster as CSV (same branch scoping as List).
func (h *AdminChildHandler) Export(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, q.Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	items, err := h.svc.List(r.Context(), repository.ChildFilter{Branch: branch, Room: q.Get("room"), Status: q.Get("status"), Q: q.Get("q")})
	if err != nil {
		response.InternalError(w, "failed to fetch children")
		return
	}
	out := make([][]string, 0, len(items))
	for _, c := range items {
		out = append(out, []string{
			c.Ref, c.FirstName, c.LastName, c.DOB, c.Gender, c.BranchSlug, c.RoomName,
			string(c.Status), c.FundingType, c.KeyPersonName, c.StartDate,
		})
	}
	export.Write(w, r, "children",
		[]string{"Ref", "First name", "Last name", "DOB", "Gender", "Branch", "Room", "Status", "Funding", "Key person", "Start date"},
		out)
}

func (h *AdminChildHandler) Stats(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	stats, err := h.svc.Stats(r.Context(), branch)
	if err != nil {
		response.InternalError(w, "failed to compute stats")
		return
	}
	response.OK(w, stats)
}

func (h *AdminChildHandler) CapacityForecast(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	weeks, _ := strconv.Atoi(r.URL.Query().Get("weeks"))
	forecast, err := h.svc.CapacityForecast(r.Context(), branch, weeks)
	if err != nil {
		response.InternalError(w, "failed to compute capacity forecast")
		return
	}
	response.OK(w, forecast)
}

func (h *AdminChildHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	if !inScope(r, item.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	response.OK(w, item)
}

func (h *AdminChildHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.ChildRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if !inScope(r, req.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "child", created.ID.Hex(), "Registered child "+created.FirstName+" "+created.LastName, nil)
	response.Created(w, created)
}

func (h *AdminChildHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ChildRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
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
	h.audit.Record(r, "update", "child", id, "Updated child "+updated.FirstName+" "+updated.LastName, nil)
	response.OK(w, updated)
}

// SetKeyPerson assigns (or clears) a child's key person.
func (h *AdminChildHandler) SetKeyPerson(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	child, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	if !inScope(r, child.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	var req models.ChildKeyPersonRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.SetKeyPerson(r.Context(), id, req.StaffID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	summary := "Cleared key person for " + updated.FirstName + " " + updated.LastName
	if updated.KeyPersonID != "" {
		summary = "Set " + updated.KeyPersonName + " as key person for " + updated.FirstName + " " + updated.LastName
	}
	h.audit.Record(r, "key_person", "child", id, summary, nil)
	response.OK(w, updated)
}

// KeyChildren lists the children a staff member (URL id) is key person for,
// filtered to the caller's branch scope.
func (h *AdminChildHandler) KeyChildren(w http.ResponseWriter, r *http.Request) {
	staffID := chi.URLParam(r, "id")
	kids, err := h.svc.KeyChildren(r.Context(), staffID)
	if err != nil {
		response.InternalError(w, "failed to load key children")
		return
	}
	role, scope := caller(r)
	allowed := policy.AllowedOrNil(role, scope)
	out := make([]models.Child, 0, len(kids))
	for _, c := range kids {
		if policy.InAllowed(allowed, c.BranchSlug) {
			out = append(out, c)
		}
	}
	response.OK(w, out)
}

func (h *AdminChildHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
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
	h.audit.Record(r, "delete", "child", id, "Removed child", nil)
	response.NoContent(w)
}
