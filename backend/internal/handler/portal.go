package handler

import (
	"net/http"
	"time"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

// PortalHandler serves the parent portal. EVERY endpoint resolves the caller
// through ParentService.AuthorisedChildIDs (user → parent → portal-flagged
// children) — the server-side scope that makes changing an id in the URL
// useless (IDOR-proof by construction).
type PortalHandler struct {
	parents    service.ParentService
	children   service.ChildService
	induction  service.InductionService
	onboarding service.OnboardingService
	finance    service.FinanceService
	daily      service.DailyRecordService
	attendance service.AttendanceService
	frontend   string
}

func NewPortalHandler(parents service.ParentService, children service.ChildService, induction service.InductionService, onboarding service.OnboardingService, finance service.FinanceService, dailyRecords service.DailyRecordService, attendance service.AttendanceService, frontendURL string) *PortalHandler {
	return &PortalHandler{parents: parents, children: children, induction: induction, onboarding: onboarding, finance: finance, daily: dailyRecords, attendance: attendance, frontend: frontendURL}
}

func (h *PortalHandler) scope(w http.ResponseWriter, r *http.Request) (*models.Parent, map[string]bool, bool) {
	uid, _ := r.Context().Value(middleware.UserIDKey).(string)
	parent, ids, err := h.parents.AuthorisedChildIDs(r.Context(), uid)
	if err != nil {
		response.Forbidden(w, err.Error())
		return nil, nil, false
	}
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return parent, set, true
}

// scopeChild resolves the {id} child, enforcing that the caller is an
// authorised portal parent of that child (unauthorised → 404, never leaking
// whether the child exists).
func (h *PortalHandler) scopeChild(w http.ResponseWriter, r *http.Request) (*models.Parent, *models.Child, bool) {
	parent, authorised, ok := h.scope(w, r)
	if !ok {
		return nil, nil, false
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return nil, nil, false
	}
	child, err := h.children.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return nil, nil, false
	}
	return parent, child, true
}

// Me returns the parent's own record + child relationships.
func (h *PortalHandler) Me(w http.ResponseWriter, r *http.Request) {
	parent, _, ok := h.scope(w, r)
	if !ok {
		return
	}
	rels, err := h.parents.ForParent(r.Context(), parent.ID.Hex())
	if err != nil {
		response.InternalError(w, "failed to load your family")
		return
	}
	response.OK(w, map[string]any{"parent": parent, "children": rels})
}

// Children returns the full child records the parent is authorised for.
func (h *PortalHandler) Children(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	out := make([]models.Child, 0, len(authorised))
	for id := range authorised {
		if c, err := h.children.GetByID(r.Context(), id); err == nil && c != nil {
			out = append(out, *c)
		}
	}
	response.OK(w, out)
}

// Child returns one authorised child — any other id is a 404 (not 403: the
// response must not confirm that a guessed id exists).
func (h *PortalHandler) Child(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	c, err := h.children.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	response.OK(w, c)
}

// ── Induction, consents & onboarding (parent-facing) ─────────────────────────

func (h *PortalHandler) Induction(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	ind, err := h.induction.Get(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	// The legal_contact section is safeguarding-sensitive: parents complete
	// their own family details but never see manager-side safeguarding notes.
	response.OK(w, map[string]any{"induction": ind, "sections": models.InductionSections, "consent_catalogue": models.ConsentCatalogue})
}

func (h *PortalHandler) SaveInductionSection(w http.ResponseWriter, r *http.Request) {
	parent, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	var req models.SectionSaveRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	ind, err := h.induction.SaveSection(r.Context(), id, chi.URLParam(r, "key"), req, parent.UserID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, ind)
}

func (h *PortalHandler) SubmitInduction(w http.ResponseWriter, r *http.Request) {
	parent, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	ind, err := h.induction.Submit(r.Context(), id, parent.UserID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, ind)
}

func (h *PortalHandler) Consents(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	rows, err := h.induction.Consents(r.Context(), id)
	if err != nil {
		response.InternalError(w, "failed to fetch consents")
		return
	}
	response.OK(w, map[string]any{"consents": rows, "latest": service.LatestConsents(rows), "catalogue": models.ConsentCatalogue})
}

func (h *PortalHandler) RecordConsent(w http.ResponseWriter, r *http.Request) {
	parent, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	var req models.ConsentRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	c, err := h.induction.RecordConsent(r.Context(), id, req, parent.ID.Hex(), parent.UserID)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.Created(w, c)
}

func (h *PortalHandler) Onboarding(w http.ResponseWriter, r *http.Request) {
	_, authorised, ok := h.scope(w, r)
	if !ok {
		return
	}
	id := chi.URLParam(r, "id")
	if !authorised[id] {
		response.NotFound(w, "child not found")
		return
	}
	v, err := h.onboarding.ForChild(r.Context(), id)
	if err != nil {
		response.NotFound(w, "child not found")
		return
	}
	response.OK(w, v)
}

// ── Finance (parent-facing; only the caller's own family) ────────────────────

func (h *PortalHandler) Finance(w http.ResponseWriter, r *http.Request) {
	parent, _, ok := h.scope(w, r)
	if !ok {
		return
	}
	fam, err := h.finance.FamilyForParent(r.Context(), parent.ID.Hex())
	if err != nil {
		response.OK(w, map[string]any{"family": nil})
		return
	}
	view, err := h.finance.FamilyView(r.Context(), fam.ID.Hex())
	if err != nil {
		response.InternalError(w, "failed to load your account")
		return
	}
	response.OK(w, view)
}

// DirectDebitSetup returns the hosted Stripe Bacs setup URL for the caller's
// own family.
func (h *PortalHandler) DirectDebitSetup(w http.ResponseWriter, r *http.Request) {
	parent, _, ok := h.scope(w, r)
	if !ok {
		return
	}
	fam, err := h.finance.FamilyForParent(r.Context(), parent.ID.Hex())
	if err != nil {
		response.BadRequest(w, "no family billing account yet — please contact the nursery")
		return
	}
	url, err := h.finance.SetupDirectDebit(r.Context(), fam.ID.Hex(),
		h.frontend+"/portal?dd=success", h.frontend+"/portal?dd=cancelled")
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	response.OK(w, map[string]string{"setup_url": url})
}

// ── Attendance (parent view: own child, parent-safe fields only) ─────────────

// portalAttendanceRow is the parent-facing attendance projection — no staff
// names, no operational notes, no correction history.
type portalAttendanceRow struct {
	Date     string     `json:"date"`
	Status   string     `json:"status"`
	CheckIn  *time.Time `json:"check_in,omitempty"`
	CheckOut *time.Time `json:"check_out,omitempty"`
}

func (h *PortalHandler) ChildAttendance(w http.ResponseWriter, r *http.Request) {
	_, child, ok := h.scopeChild(w, r)
	if !ok {
		return
	}
	records, err := h.attendance.HistoryForChild(r.Context(), child.ID.Hex(), 60)
	if err != nil {
		response.InternalError(w, "failed to load attendance")
		return
	}
	out := make([]portalAttendanceRow, 0, len(records))
	for _, rec := range records {
		out = append(out, portalAttendanceRow{Date: rec.Date, Status: string(rec.Status), CheckIn: rec.CheckIn, CheckOut: rec.CheckOut})
	}
	response.OK(w, out)
}

// ── Daily updates (parent view: EXPLICITLY shared + approved records only) ───

func (h *PortalHandler) ChildDailyRecords(w http.ResponseWriter, r *http.Request) {
	_, child, ok := h.scopeChild(w, r)
	if !ok {
		return
	}
	records, err := h.daily.List(r.Context(), repository.DailyRecordFilter{ChildID: child.ID.Hex(), Limit: 200})
	if err != nil {
		response.InternalError(w, "failed to load daily updates")
		return
	}
	out := make([]models.DailyRecord, 0)
	for _, rec := range records {
		// The single visibility gate: explicitly shared AND approved. Internal
		// records never leave the backend, whatever the URL or ID used.
		if rec.ParentVisible() {
			out = append(out, rec.SanitizeForParent())
		}
	}
	response.OK(w, out)
}
