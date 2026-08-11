package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminFeeConfigHandler manages the per-branch fee/funding rules (branches.manage).
type AdminFeeConfigHandler struct {
	svc   service.FeeConfigService
	audit service.AuditService
}

func NewAdminFeeConfigHandler(svc service.FeeConfigService, audit service.AuditService) *AdminFeeConfigHandler {
	return &AdminFeeConfigHandler{svc: svc, audit: audit}
}

// List returns the full bundle (all branch rates + meta) for the management editor.
func (h *AdminFeeConfigHandler) List(w http.ResponseWriter, r *http.Request) {
	bundle, err := h.svc.Bundle(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch fee config")
		return
	}
	response.OK(w, bundle)
}

// UpdateBranch upserts one branch's rates.
func (h *AdminFeeConfigHandler) UpdateBranch(w http.ResponseWriter, r *http.Request) {
	branch := chi.URLParam(r, "branch")
	if branch == "" {
		response.BadRequest(w, "branch is required")
		return
	}
	var req models.FeeConfigRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	cfg, err := h.svc.UpsertBranch(r.Context(), branch, req)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "fee_config", branch, "Updated fee rules for "+branch, nil)
	response.OK(w, cfg)
}

// Delete prunes a branch's fee-config document. Works for any slug — including
// orphans whose branch was archived/deleted — so leftover docs can be cleaned.
func (h *AdminFeeConfigHandler) Delete(w http.ResponseWriter, r *http.Request) {
	branch := chi.URLParam(r, "branch")
	if branch == "" {
		response.BadRequest(w, "branch is required")
		return
	}
	removed, err := h.svc.DeleteBranch(r.Context(), branch)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if !removed {
		response.NotFound(w, "no fee config for branch "+branch)
		return
	}
	h.audit.Record(r, "delete", "fee_config", branch, "Deleted fee rules for "+branch, nil)
	response.NoContent(w)
}

// UpdateMeta upserts the org-wide ancillary pricing + disclaimer.
func (h *AdminFeeConfigHandler) UpdateMeta(w http.ResponseWriter, r *http.Request) {
	var meta models.FeeMeta
	if err := validator.DecodeJSON(r, &meta); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	cfg, err := h.svc.UpsertMeta(r.Context(), meta)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update", "fee_config", "meta", "Updated fee meta", nil)
	response.OK(w, cfg)
}
