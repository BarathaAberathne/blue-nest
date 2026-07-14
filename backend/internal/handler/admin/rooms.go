package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminRoomHandler struct {
	svc   service.RoomService
	audit service.AuditService
}

func NewAdminRoomHandler(svc service.RoomService, audit service.AuditService) *AdminRoomHandler {
	return &AdminRoomHandler{svc: svc, audit: audit}
}

func (h *AdminRoomHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context(), r.URL.Query().Get("branch"))
	if err != nil {
		response.InternalError(w, "failed to fetch rooms")
		return
	}
	response.OK(w, items)
}

func (h *AdminRoomHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "room not found")
		return
	}
	response.OK(w, item)
}

func (h *AdminRoomHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.RoomRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	created, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "room", created.ID.Hex(), "Created room "+created.Name, nil)
	response.Created(w, created)
}

func (h *AdminRoomHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.RoomRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	updated, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "room", id, "Updated room "+updated.Name, nil)
	response.OK(w, updated)
}

func (h *AdminRoomHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.InternalError(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "room", id, "Deleted room", nil)
	response.NoContent(w)
}
