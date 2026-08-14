package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/go-chi/chi/v5"
)

// ChildProfilePDFHandler streams the full child profile as a PDF. Branch-scoped
// like every other child read; the SEND section is included only when the
// CALLER holds send.manage — the document never carries data the requester
// couldn't see on screen.
type ChildProfilePDFHandler struct {
	svc      service.ChildProfilePDFService
	children service.ChildService
}

func NewChildProfilePDFHandler(svc service.ChildProfilePDFService, children service.ChildService) *ChildProfilePDFHandler {
	return &ChildProfilePDFHandler{svc: svc, children: children}
}

func (h *ChildProfilePDFHandler) Download(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	child, err := h.children.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	if !inScope(r, child.BranchSlug) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	role, _ := caller(r)
	orgID, _ := repository.OrgFromContext(r.Context())
	includeSend := models.HasPermission(orgID, role, models.PermSendManage)
	data, name, err := h.svc.Build(r.Context(), id, includeSend)
	if err != nil {
		response.InternalError(w, "failed to build the profile PDF")
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	_, _ = w.Write(data)
}
