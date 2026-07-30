package admin

import (
	"errors"
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// Room-allocation endpoints. Both "directions" (room profile ↔ staff/child
// profile) call the SAME service methods — no duplicated allocation logic in
// a second controller path (docs/rooms/room-allocation-design.md).

// auditDetails standardises the details map for allocation audit entries and
// attaches the caller's correlation id when one was sent.
func auditDetails(r *http.Request, kv map[string]interface{}) map[string]interface{} {
	if kv == nil {
		kv = map[string]interface{}{}
	}
	if cid := r.Header.Get("X-Correlation-Id"); cid != "" {
		kv["correlation_id"] = cid
	}
	return kv
}

// respondAssignmentErr maps service errors onto the right HTTP status:
// scope violations are 403, everything else is a 400 caller mistake.
func respondAssignmentErr(w http.ResponseWriter, err error) {
	if errors.Is(err, service.ErrOutsideScope) {
		response.Forbidden(w, err.Error())
		return
	}
	response.BadRequest(w, err.Error())
}

// ── Staff room assignments ────────────────────────────────────────────────────

type AdminStaffRoomAssignmentHandler struct {
	svc   service.StaffRoomAssignmentService
	audit service.AuditService
}

func NewAdminStaffRoomAssignmentHandler(svc service.StaffRoomAssignmentService, audit service.AuditService) *AdminStaffRoomAssignmentHandler {
	return &AdminStaffRoomAssignmentHandler{svc: svc, audit: audit}
}

func (h *AdminStaffRoomAssignmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.StaffRoomAssignmentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	created, err := h.svc.Assign(r.Context(), req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		respondAssignmentErr(w, err)
		return
	}
	h.audit.Record(r, "allocate_staff", "staff_room_assignment", created.ID.Hex(),
		"Allocated "+created.StaffName+" to room "+created.RoomName,
		auditDetails(r, map[string]interface{}{
			"staff_id": created.StaffID, "room_id": created.RoomID,
			"branch": created.BranchSlug, "is_primary": created.IsPrimary,
			"start_date": created.StartDate,
		}))
	response.Created(w, created)
}

func (h *AdminStaffRoomAssignmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.StaffRoomAssignmentUpdate
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	updated, err := h.svc.Update(r.Context(), id, req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		respondAssignmentErr(w, err)
		return
	}
	action, summary := "update_staff_allocation", "Updated room allocation for "+updated.StaffName
	if req.End {
		action, summary = "end_staff_allocation", "Ended "+updated.StaffName+"'s allocation to room "+updated.RoomName
	} else if req.IsPrimary != nil && *req.IsPrimary {
		action, summary = "set_primary_room", "Set "+updated.RoomName+" as "+updated.StaffName+"'s primary room"
	}
	h.audit.Record(r, action, "staff_room_assignment", id, summary,
		auditDetails(r, map[string]interface{}{
			"staff_id": updated.StaffID, "room_id": updated.RoomID,
			"branch": updated.BranchSlug, "status": string(updated.Status),
			"end_date": updated.EndDate, "is_primary": updated.IsPrimary,
		}))
	response.OK(w, updated)
}

// ListForStaff serves GET /admin/staff/{id}/room-assignments.
func (h *AdminStaffRoomAssignmentHandler) ListForStaff(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	includeHistory := r.URL.Query().Get("include") == "history"
	list, err := h.svc.ListForStaff(r.Context(), chi.URLParam(r, "id"), includeHistory, policy.AllowedOrNil(role, scope))
	if err != nil {
		if errors.Is(err, service.ErrOutsideScope) {
			response.NotFound(w, "staff member not found") // don't leak cross-branch existence
			return
		}
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, list)
}

// ListForRoom serves GET /admin/rooms/{id}/staff.
func (h *AdminStaffRoomAssignmentHandler) ListForRoom(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	includeHistory := r.URL.Query().Get("include") == "history"
	list, err := h.svc.ListForRoom(r.Context(), chi.URLParam(r, "id"), includeHistory, policy.AllowedOrNil(role, scope))
	if err != nil {
		if errors.Is(err, service.ErrOutsideScope) {
			response.NotFound(w, "room not found")
			return
		}
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, list)
}

// ── Child room assignments ────────────────────────────────────────────────────

type AdminChildRoomAssignmentHandler struct {
	svc   service.ChildRoomAssignmentService
	audit service.AuditService
}

func NewAdminChildRoomAssignmentHandler(svc service.ChildRoomAssignmentService, audit service.AuditService) *AdminChildRoomAssignmentHandler {
	return &AdminChildRoomAssignmentHandler{svc: svc, audit: audit}
}

// auditOverrides writes one dedicated audit entry per applied override
// (capacity_override / age_override) alongside the main allocation entry.
func (h *AdminChildRoomAssignmentHandler) auditOverrides(r *http.Request, a *models.ChildRoomAssignment) {
	for _, o := range a.AppliedOverrides {
		h.audit.Record(r, o, "child_room_assignment", a.ID.Hex(),
			"Authorised override while placing "+a.ChildName+" in "+a.RoomName+": "+a.OverrideReason,
			auditDetails(r, map[string]interface{}{
				"child_id": a.ChildID, "room_id": a.RoomID,
				"branch": a.BranchSlug, "reason": a.OverrideReason,
			}))
	}
}

func (h *AdminChildRoomAssignmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.ChildRoomAssignmentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	created, err := h.svc.Assign(r.Context(), req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		respondAssignmentErr(w, err)
		return
	}
	h.audit.Record(r, "allocate_child", "child_room_assignment", created.ID.Hex(),
		"Allocated "+created.ChildName+" to room "+created.RoomName,
		auditDetails(r, map[string]interface{}{
			"child_id": created.ChildID, "room_id": created.RoomID,
			"branch": created.BranchSlug, "start_date": created.StartDate,
			"status": string(created.Status),
		}))
	h.auditOverrides(r, created)
	response.Created(w, created)
}

// Transfer serves POST /admin/children/{id}/transfer-room.
func (h *AdminChildRoomAssignmentHandler) Transfer(w http.ResponseWriter, r *http.Request) {
	childID := chi.URLParam(r, "id")
	var req models.ChildTransferRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	created, err := h.svc.Transfer(r.Context(), childID, req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		respondAssignmentErr(w, err)
		return
	}
	h.audit.Record(r, "transfer_child", "child_room_assignment", created.ID.Hex(),
		"Transferred "+created.ChildName+" to room "+created.RoomName+" — "+created.TransferReason,
		auditDetails(r, map[string]interface{}{
			"child_id": created.ChildID, "room_id": created.RoomID,
			"branch": created.BranchSlug, "effective_date": created.StartDate,
			"reason": created.TransferReason, "status": string(created.Status),
		}))
	h.auditOverrides(r, created)
	response.OK(w, created)
}

// End serves PATCH /admin/child-room-assignments/{id}.
func (h *AdminChildRoomAssignmentHandler) End(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ChildRoomAssignmentUpdate
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	role, scope := caller(r)
	updated, err := h.svc.End(r.Context(), id, req, actorID(r), policy.AllowedOrNil(role, scope))
	if err != nil {
		respondAssignmentErr(w, err)
		return
	}
	h.audit.Record(r, "end_child_allocation", "child_room_assignment", id,
		"Ended "+updated.ChildName+"'s placement in room "+updated.RoomName,
		auditDetails(r, map[string]interface{}{
			"child_id": updated.ChildID, "room_id": updated.RoomID,
			"branch": updated.BranchSlug, "end_date": updated.EndDate,
		}))
	response.OK(w, updated)
}

// ListForChild serves GET /admin/children/{id}/room-assignments.
func (h *AdminChildRoomAssignmentHandler) ListForChild(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	list, err := h.svc.ListForChild(r.Context(), chi.URLParam(r, "id"), policy.AllowedOrNil(role, scope))
	if err != nil {
		if errors.Is(err, service.ErrOutsideScope) {
			response.NotFound(w, "child not found")
			return
		}
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, list)
}

// ListForRoom serves GET /admin/rooms/{id}/children.
func (h *AdminChildRoomAssignmentHandler) ListForRoom(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	includeHistory := r.URL.Query().Get("include") == "history"
	list, err := h.svc.ListForRoom(r.Context(), chi.URLParam(r, "id"), includeHistory, policy.AllowedOrNil(role, scope))
	if err != nil {
		if errors.Is(err, service.ErrOutsideScope) {
			response.NotFound(w, "room not found")
			return
		}
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, list)
}

// Capacity serves GET /admin/rooms/{id}/capacity.
func (h *AdminChildRoomAssignmentHandler) Capacity(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	sum, err := h.svc.CapacitySummary(r.Context(), chi.URLParam(r, "id"), policy.AllowedOrNil(role, scope))
	if err != nil {
		if errors.Is(err, service.ErrOutsideScope) {
			response.NotFound(w, "room not found")
			return
		}
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, sum)
}

// CapacityByBranch serves GET /admin/rooms/capacity?branch=. Branch-scoped
// callers are pinned to one of their branches, same as the rooms list.
func (h *AdminChildRoomAssignmentHandler) CapacityByBranch(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	list, err := h.svc.CapacityByBranch(r.Context(), branch)
	if err != nil {
		response.InternalError(w, "failed to compute room capacity")
		return
	}
	response.OK(w, list)
}
