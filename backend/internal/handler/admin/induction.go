package admin

import (
	"net/http"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// AdminInductionHandler serves the child induction form, consents and the
// derived onboarding view for managers (permission children.manage).
type AdminInductionHandler struct {
	svc        service.InductionService
	onboarding service.OnboardingService
	audit      service.AuditService
}

func NewAdminInductionHandler(svc service.InductionService, onboarding service.OnboardingService, audit service.AuditService) *AdminInductionHandler {
	return &AdminInductionHandler{svc: svc, onboarding: onboarding, audit: audit}
}

func (h *AdminInductionHandler) Get(w http.ResponseWriter, r *http.Request) {
	ind, err := h.svc.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, err.Error())
		return
	}
	response.OK(w, map[string]any{"induction": ind, "sections": models.InductionSections, "consent_catalogue": models.ConsentCatalogue})
}

func (h *AdminInductionHandler) SaveSection(w http.ResponseWriter, r *http.Request) {
	childID, key := chi.URLParam(r, "id"), chi.URLParam(r, "key")
	var req models.SectionSaveRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	ind, err := h.svc.SaveSection(r.Context(), childID, key, req, actorID(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "induction_save", "child", childID, "Saved induction section "+key, nil)
	response.OK(w, ind)
}

func (h *AdminInductionHandler) Submit(w http.ResponseWriter, r *http.Request) {
	childID := chi.URLParam(r, "id")
	ind, err := h.svc.Submit(r.Context(), childID, actorID(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "induction_submit", "child", childID, "Submitted the induction for review", nil)
	response.OK(w, ind)
}

func (h *AdminInductionHandler) Review(w http.ResponseWriter, r *http.Request) {
	childID := chi.URLParam(r, "id")
	var req struct {
		Note string `json:"note"`
	}
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	ind, err := h.svc.Review(r.Context(), childID, actorID(r), req.Note)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "induction_review", "child", childID, "Signed off the induction", nil)
	response.OK(w, ind)
}

func (h *AdminInductionHandler) Consents(w http.ResponseWriter, r *http.Request) {
	rows, err := h.svc.Consents(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.InternalError(w, "failed to fetch consents")
		return
	}
	response.OK(w, map[string]any{"consents": rows, "latest": service.LatestConsents(rows), "catalogue": models.ConsentCatalogue})
}

// RecordConsent lets STAFF record a consent captured on paper (the signatory
// name is the parent's typed/printed name from the form).
func (h *AdminInductionHandler) RecordConsent(w http.ResponseWriter, r *http.Request) {
	childID := chi.URLParam(r, "id")
	var req models.ConsentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	c, err := h.svc.RecordConsent(r.Context(), childID, req, "", actorID(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "consent", "child", childID, "Recorded consent '"+req.Key+"' (granted: "+boolWord(req.Granted)+")", nil)
	response.Created(w, c)
}

func (h *AdminInductionHandler) Onboarding(w http.ResponseWriter, r *http.Request) {
	v, err := h.onboarding.ForChild(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	response.OK(w, v)
}

// Board is the manager onboarding dashboard (branch-scoped via policy).
func (h *AdminInductionHandler) Board(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	rows, err := h.onboarding.Board(r.Context(), branch)
	if err != nil {
		response.InternalError(w, "failed to build the onboarding board")
		return
	}
	response.OK(w, rows)
}

func boolWord(b bool) string {
	if b {
		return "yes"
	}
	return "no"
}
