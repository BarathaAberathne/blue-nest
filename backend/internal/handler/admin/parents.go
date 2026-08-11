package admin

import (
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminParentHandler manages the canonical parent/guardian records, child
// links and portal invitations (permission parents.manage).
type AdminParentHandler struct {
	svc   service.ParentService
	audit service.AuditService
}

func NewAdminParentHandler(svc service.ParentService, audit service.AuditService) *AdminParentHandler {
	return &AdminParentHandler{svc: svc, audit: audit}
}

func (h *AdminParentHandler) List(w http.ResponseWriter, r *http.Request) {
	parents, err := h.svc.List(r.Context(), r.URL.Query().Get("q"))
	if err != nil {
		response.InternalError(w, "failed to fetch parents")
		return
	}
	response.OK(w, parents)
}

func (h *AdminParentHandler) Get(w http.ResponseWriter, r *http.Request) {
	p, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "parent not found")
		return
	}
	response.OK(w, p)
}

func (h *AdminParentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.ParentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	p, err := h.svc.Create(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "create", "parent", p.ID.Hex(), "Created parent "+p.FirstName+" "+p.LastName, nil)
	response.Created(w, p)
}

func (h *AdminParentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ParentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	p, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "parent", id, "Updated parent "+p.FirstName+" "+p.LastName, nil)
	response.OK(w, p)
}

func (h *AdminParentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "delete", "parent", id, "Deleted parent record", nil)
	response.NoContent(w)
}

// ── Relationships ─────────────────────────────────────────────────────────────

// ForChild lists a child's parents/guardians/contacts with flags.
func (h *AdminParentHandler) ForChild(w http.ResponseWriter, r *http.Request) {
	rels, err := h.svc.ForChild(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.InternalError(w, "failed to fetch the child's contacts")
		return
	}
	response.OK(w, rels)
}

// ForParent lists a parent's linked children.
func (h *AdminParentHandler) ForParent(w http.ResponseWriter, r *http.Request) {
	rels, err := h.svc.ForParent(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.InternalError(w, "failed to fetch the parent's children")
		return
	}
	response.OK(w, rels)
}

// LinkChild links an existing parent — or creates one inline — to the child.
func (h *AdminParentHandler) LinkChild(w http.ResponseWriter, r *http.Request) {
	var req models.LinkChildRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	req.ChildID = chi.URLParam(r, "id")
	rel, err := h.svc.LinkChild(r.Context(), req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "link_parent", "child", req.ChildID,
		"Linked "+rel.ParentName+" ("+rel.Relationship+") to "+rel.ChildName, nil)
	response.Created(w, rel)
}

func (h *AdminParentHandler) UpdateRelationship(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var flags models.RelationshipFlags
	if err := validator.DecodeJSON(r, &flags); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	rel, err := h.svc.UpdateRelationship(r.Context(), id, flags)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "child_parent_relationship", id,
		"Updated relationship for "+rel.ParentName+" ↔ "+rel.ChildName, nil)
	response.OK(w, rel)
}

func (h *AdminParentHandler) Unlink(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.Unlink(r.Context(), id); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "unlink_parent", "child_parent_relationship", id, "Removed a child-parent relationship", nil)
	response.NoContent(w)
}

// ── Portal access ─────────────────────────────────────────────────────────────

func (h *AdminParentHandler) Invite(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ParentInviteRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	link, err := h.svc.Invite(r.Context(), id, req.TemporaryDays)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "portal_invite", "parent", id, "Sent a parent portal invitation", nil)
	// The link embeds the one-time token; parent_id/token are returned
	// structured too so the manager UI (and the e2e suite) can hand them to
	// the activation endpoint without string-parsing the URL. Visible only to
	// parents.manage staff — the same audience the link itself serves.
	token := link[strings.LastIndex(link, "token=")+len("token="):]
	response.OK(w, map[string]string{"activation_link": link, "parent_id": id, "token": token})
}

// SetPortalState is the audited manager override (extend/activate/restrict/
// suspend/restore).
func (h *AdminParentHandler) SetPortalState(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		State         models.PortalAccessState `json:"state"`
		TemporaryDays int                      `json:"temporary_days"`
	}
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	p, err := h.svc.SetPortalState(r.Context(), id, req.State, req.TemporaryDays)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "portal_state", "parent", id,
		"Set portal access for "+p.FirstName+" "+p.LastName+" to "+string(p.PortalState), nil)
	response.OK(w, p)
}
