// Package integrations holds inbound webhooks from external automations — here,
// the Claude Google-Business-Profile monitoring job that POSTs a daily digest
// per branch. Authenticated by a shared secret (X-GBP-Secret), not a user JWT.
package integrations

import (
	"crypto/subtle"
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
)

type GBPHandler struct {
	svc    service.GBPService
	secret string
}

func NewGBPHandler(svc service.GBPService, secret string) *GBPHandler {
	return &GBPHandler{svc: svc, secret: secret}
}

// IngestDigest receives one branch's daily GBP digest from the automation.
func (h *GBPHandler) IngestDigest(w http.ResponseWriter, r *http.Request) {
	if h.secret == "" {
		response.InternalError(w, "gbp ingest not configured")
		return
	}
	got := r.Header.Get("X-GBP-Secret")
	if subtle.ConstantTimeCompare([]byte(got), []byte(h.secret)) != 1 {
		response.Unauthorized(w, "invalid ingest secret")
		return
	}
	var req models.GBPDigestRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if req.BranchSlug == "" {
		response.BadRequest(w, "branch_slug is required")
		return
	}
	if err := h.svc.IngestDigest(r.Context(), req); err != nil {
		response.InternalError(w, "failed to ingest digest")
		return
	}
	response.OK(w, map[string]string{"status": "ok", "branch": req.BranchSlug})
}
