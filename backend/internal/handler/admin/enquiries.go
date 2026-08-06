package admin

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/service"
	"github.com/blue-nest-montessori/api/pkg/export"
	"github.com/blue-nest-montessori/api/pkg/response"
	"github.com/blue-nest-montessori/api/pkg/validator"
	"github.com/go-chi/chi/v5"
)

type AdminEnquiryHandler struct {
	svc      service.EnquiryService
	auth     service.AuthService
	audit    service.AuditService
	children service.ChildService
}

func NewAdminEnquiryHandler(svc service.EnquiryService, auth service.AuthService, audit service.AuditService, children service.ChildService) *AdminEnquiryHandler {
	return &AdminEnquiryHandler{svc: svc, auth: auth, audit: audit, children: children}
}

// actor pulls the authenticated staff identity off the request for note/activity
// attribution. The email doubles as the display name (the JWT carries no name).
func actor(r *http.Request) models.EnquiryActor {
	ctx := r.Context()
	id, _ := ctx.Value(middleware.UserIDKey).(string)
	name, _ := ctx.Value(middleware.UserEmailKey).(string)
	return models.EnquiryActor{ID: id, Name: name}
}

func parseDateParam(v string) *time.Time {
	if v == "" {
		return nil
	}
	if t, err := time.Parse("2006-01-02", v); err == nil {
		return &t
	}
	if t, err := time.Parse(time.RFC3339, v); err == nil {
		return &t
	}
	return nil
}

// parseEnquiryFilter reads the standard list query params (branch/type/status/
// assigned_to/from/to/sort/dir/limit/skip) into an EnquiryFilter. Shared by the
// array List and the paginated ListPaged so they filter identically.
func parseEnquiryFilter(r *http.Request) models.EnquiryFilter {
	q := r.URL.Query()
	f := models.EnquiryFilter{
		Branch:     q.Get("branch"),
		Type:       q.Get("type"),
		Status:     q.Get("status"),
		AssignedTo: q.Get("assigned_to"),
		From:       parseDateParam(q.Get("from")),
		To:         parseDateParam(q.Get("to")),
	}
	switch q.Get("sort") {
	case "name":
		f.SortBy = "name"
	case "branch":
		f.SortBy = "branch"
	case "type":
		f.SortBy = "enquiry_type"
	case "status":
		f.SortBy = "status"
	case "assigned_to":
		f.SortBy = "assigned_to"
	case "follow_up_date":
		f.SortBy = "follow_up_date"
	default:
		f.SortBy = "created_at"
	}
	if q.Get("dir") == "asc" {
		f.SortDir = 1
	} else {
		f.SortDir = -1
	}
	if v, err := strconv.ParseInt(q.Get("limit"), 10, 64); err == nil && v > 0 {
		f.Limit = v
	}
	if v, err := strconv.ParseInt(q.Get("skip"), 10, 64); err == nil && v > 0 {
		f.Skip = v
	}
	return f
}

// List returns enquiries. With no query params it returns every enquiry (the
// pipeline / follow-up views filter client-side); query params enable
// server-side filtering and sorting. The paginated table view uses ListPaged.
func (h *AdminEnquiryHandler) List(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	f := parseEnquiryFilter(r)
	f.Branch = branch
	enquiries, err := h.svc.List(r.Context(), f)
	if err != nil {
		response.InternalError(w, "failed to fetch enquiries")
		return
	}
	response.OK(w, enquiries)
}

// Export streams the filtered enquiries as CSV (same branch scoping + filters as List).
func (h *AdminEnquiryHandler) Export(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	f := parseEnquiryFilter(r)
	f.Branch = branch
	enquiries, err := h.svc.List(r.Context(), f)
	if err != nil {
		response.InternalError(w, "failed to fetch enquiries")
		return
	}
	out := make([][]string, 0, len(enquiries))
	for _, e := range enquiries {
		created := ""
		if !e.CreatedAt.IsZero() {
			created = e.CreatedAt.Format("2006-01-02")
		}
		followUp := ""
		if e.FollowUpDate != nil {
			followUp = e.FollowUpDate.Format("2006-01-02")
		}
		out = append(out, []string{
			created, e.Name, e.Email, e.Phone, e.Branch, e.ChildAge, e.EnquiryType,
			models.NormalizeStatus(e.Status), e.Source, e.AssignedToName, e.Priority, followUp,
		})
	}
	export.Write(w, r, "enquiries",
		[]string{"Created", "Name", "Email", "Phone", "Branch", "Child age", "Type", "Status", "Source", "Assigned to", "Priority", "Follow-up"},
		out)
}

// ListPaged returns one page of enquiries plus the total matching the filter,
// backing the table view's pagination (default page size 25).
func (h *AdminEnquiryHandler) ListPaged(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	f := parseEnquiryFilter(r)
	f.Branch = branch
	if f.Limit <= 0 {
		f.Limit = 25
	}
	items, total, err := h.svc.ListPaged(r.Context(), f)
	if err != nil {
		response.InternalError(w, "failed to fetch enquiries")
		return
	}
	response.OK(w, models.EnquiryPage{Items: items, Total: total, Limit: f.Limit, Skip: f.Skip})
}

// Tasks returns grouped admissions work needing attention — the dashboard
// "Today's tasks" panel and the admin notification bell.
func (h *AdminEnquiryHandler) Tasks(w http.ResponseWriter, r *http.Request) {
	role, scope := caller(r)
	branch, ok := policy.EffectiveBranch(role, scope, r.URL.Query().Get("branch"))
	if !ok {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	tasks, err := h.svc.Tasks(r.Context(), branch)
	if err != nil {
		response.InternalError(w, "failed to load admissions tasks")
		return
	}
	response.OK(w, tasks)
}

// Bulk applies one action (assign / status / priority / note) to many enquiries
// at once, reusing the single-record mutations so each still writes an activity
// entry. Audited once for the whole operation.
func (h *AdminEnquiryHandler) Bulk(w http.ResponseWriter, r *http.Request) {
	var body models.EnquiryBulkRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}
	// A bulk action only carries IDs, so each must be resolved to its branch
	// before we know it's in scope — out-of-scope ids are dropped and reported
	// as failures rather than silently applied.
	var failed []models.EnquiryBulkFailure
	allowedIDs := body.IDs[:0]
	for _, id := range body.IDs {
		enquiry, err := h.svc.GetByID(r.Context(), id)
		if err != nil {
			failed = append(failed, models.EnquiryBulkFailure{ID: id, Error: "not found"})
			continue
		}
		if !inScope(r, enquiry.Branch) {
			failed = append(failed, models.EnquiryBulkFailure{ID: id, Error: "outside your branch scope"})
			continue
		}
		allowedIDs = append(allowedIDs, id)
	}
	body.IDs = allowedIDs
	res := &models.EnquiryBulkResult{}
	if len(body.IDs) > 0 {
		var err error
		res, err = h.svc.BulkUpdate(r.Context(), body, actor(r))
		if err != nil {
			response.BadRequest(w, err.Error())
			return
		}
	}
	res.Failed = append(res.Failed, failed...)
	h.audit.Record(r, "bulk_"+body.Action, "enquiry", "",
		fmt.Sprintf("Bulk %s on %d enquiries", body.Action, len(body.IDs)),
		map[string]interface{}{"ids": body.IDs, "count": len(body.IDs)})
	response.OK(w, res)
}

func (h *AdminEnquiryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	enquiry, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "enquiry not found")
		return
	}
	if !inScope(r, enquiry.Branch) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	response.OK(w, enquiry)
}

// Stats returns the admissions KPI / chart payload for the inquiry dashboard.
func (h *AdminEnquiryHandler) Stats(w http.ResponseWriter, r *http.Request) {
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

type assigneeView struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// Assignees lists staff/management users that an enquiry can be assigned to.
func (h *AdminEnquiryHandler) Assignees(w http.ResponseWriter, r *http.Request) {
	users, err := h.auth.ListAllUsers(r.Context())
	if err != nil {
		response.InternalError(w, "failed to fetch users")
		return
	}
	out := make([]assigneeView, 0, len(users))
	for _, u := range users {
		if u.Role == models.RoleCustomer {
			continue
		}
		name := strings.TrimSpace(u.FirstName + " " + u.LastName)
		if name == "" {
			name = u.Email
		}
		out = append(out, assigneeView{ID: u.ID.Hex(), Name: name, Email: u.Email, Role: string(u.Role)})
	}
	response.OK(w, out)
}

// Create logs an enquiry received off-website (phone, walk-in, referral…).
func (h *AdminEnquiryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.AdminEnquiryCreateRequest
	if err := validator.DecodeJSON(r, &req); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if !inScope(r, req.Branch) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	enquiry, created, err := h.svc.CreateManual(r.Context(), req, actor(r))
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	if !created {
		// A duplicate was merged into an existing enquiry, not a new one —
		// 200 (the existing resource), and an accurate audit label.
		h.audit.Record(r, "merge_duplicate", "enquiry", enquiry.ID.Hex(),
			"Merged a duplicate submission into the enquiry from "+enquiry.Name, map[string]interface{}{"source": enquiry.Source})
		response.OK(w, enquiry)
		return
	}
	h.audit.Record(r, "create", "enquiry", enquiry.ID.Hex(),
		"Logged enquiry from "+enquiry.Name, map[string]interface{}{"source": enquiry.Source})
	response.Created(w, enquiry)
}

func (h *AdminEnquiryHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body struct {
		Status string `json:"status"`
	}
	if err := validator.DecodeJSON(r, &body); err != nil || body.Status == "" {
		response.BadRequest(w, "status is required")
		return
	}
	if !models.IsValidEnquiryStatus(body.Status) {
		response.BadRequest(w, "invalid status")
		return
	}
	if !h.enquiryInScope(w, r, id) {
		return
	}

	if err := h.svc.ChangeStatus(r.Context(), id, body.Status, actor(r)); err != nil {
		// ChangeStatus errors here are validation (e.g. the registered guard),
		// so surface the message to the caller rather than a generic 500.
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update_status", "enquiry", id,
		"Set enquiry status to "+body.Status, map[string]interface{}{"status": body.Status})
	h.respondUpdated(w, r, id)
}

func (h *AdminEnquiryHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body models.EnquiryNoteRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}
	if !h.enquiryInScope(w, r, id) {
		return
	}
	if _, err := h.svc.AddNote(r.Context(), id, body.Note, actor(r)); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "add_note", "enquiry", id, "Added a note to the enquiry", nil)
	h.respondUpdated(w, r, id)
}

func (h *AdminEnquiryHandler) UpdateFollowUp(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body models.EnquiryFollowUpRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}
	if !h.enquiryInScope(w, r, id) {
		return
	}
	if err := h.svc.UpdateFollowUp(r.Context(), id, body, actor(r)); err != nil {
		response.BadRequest(w, err.Error())
		return
	}
	h.audit.Record(r, "update_follow_up", "enquiry", id, "Updated enquiry follow-up", nil)
	h.respondUpdated(w, r, id)
}

func (h *AdminEnquiryHandler) Assign(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body models.EnquiryAssignRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}
	if !h.enquiryInScope(w, r, id) {
		return
	}
	if err := h.svc.Assign(r.Context(), id, body, actor(r)); err != nil {
		response.InternalError(w, "failed to assign enquiry")
		return
	}
	summary := "Unassigned the enquiry"
	if body.AssignedToName != "" {
		summary = "Assigned enquiry to " + body.AssignedToName
	}
	h.audit.Record(r, "assign", "enquiry", id, summary, nil)
	h.respondUpdated(w, r, id)
}

// mapFundingType interprets the registration panel's free-text funding field
// (e.g. "15 hours funding") into the Child record's funding enum.
func mapFundingType(freeText string) string {
	t := strings.ToLower(freeText)
	switch {
	case strings.Contains(t, "30"):
		return models.Funding30h
	case strings.Contains(t, "15"):
		return models.Funding15h
	default:
		return models.FundingNone
	}
}

func (h *AdminEnquiryHandler) Register(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var body models.EnquiryRegisterRequest
	if err := validator.DecodeJSON(r, &body); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}
	enquiry, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "enquiry not found")
		return
	}
	if !inScope(r, enquiry.Branch) {
		response.Forbidden(w, "outside your branch scope")
		return
	}
	if err := h.svc.Register(r.Context(), id, body, actor(r)); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	// Registering an enquiry is meant to bring the child into the system, not
	// just flip the enquiry's own status — so once the essentials (name + DOB)
	// are given, actually create (or, on a retry, idempotently reuse) the Child
	// record, seeded with the parent as the first guardian.
	summary := "Marked enquiry as registered"
	if strings.TrimSpace(body.ChildFirstName) != "" && strings.TrimSpace(body.ChildLastName) != "" && strings.TrimSpace(body.ChildDOB) != "" {
		childReq := models.ChildRequest{
			FirstName:   body.ChildFirstName,
			LastName:    body.ChildLastName,
			DOB:         body.ChildDOB,
			Gender:      body.ChildGender,
			BranchSlug:  enquiry.Branch,
			FundingType: mapFundingType(body.FundingType),
			Guardians: []models.Guardian{{
				Name: enquiry.Name, Email: enquiry.Email, Phone: enquiry.Phone, Primary: true,
			}},
		}
		if body.ExpectedStartDate != nil {
			childReq.StartDate = body.ExpectedStartDate.Format("2006-01-02")
		}
		if _, err := h.children.EnsureFromEnquiry(r.Context(), id, childReq); err != nil {
			response.InternalError(w, "registered the enquiry but failed to create the child record: "+err.Error())
			return
		}
		summary = "Registered enquiry and added " + body.ChildFirstName + " " + body.ChildLastName + " to Children"
	}
	h.audit.Record(r, "register", "enquiry", id, summary, nil)
	h.respondUpdated(w, r, id)
}

// LogReply records that the admin replied to the enquiry by email (the email
// itself is composed in the user's mail client via a mailto link).
func (h *AdminEnquiryHandler) LogReply(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !h.enquiryInScope(w, r, id) {
		return
	}
	if err := h.svc.LogReply(r.Context(), id, actor(r)); err != nil {
		response.InternalError(w, "failed to log reply")
		return
	}
	h.audit.Record(r, "email_reply", "enquiry", id, "Replied to the enquiry by email", nil)
	h.respondUpdated(w, r, id)
}

// enquiryInScope fetches the enquiry and verifies it's within the caller's
// branch scope, writing the 404/403 response itself. Callers should return
// immediately when it reports false.
func (h *AdminEnquiryHandler) enquiryInScope(w http.ResponseWriter, r *http.Request, id string) bool {
	enquiry, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.NotFound(w, "enquiry not found")
		return false
	}
	if !inScope(r, enquiry.Branch) {
		response.Forbidden(w, "outside your branch scope")
		return false
	}
	return true
}

// respondUpdated re-fetches the enquiry so the client receives fresh, normalized
// state (including the new activity entry) after a mutation.
func (h *AdminEnquiryHandler) respondUpdated(w http.ResponseWriter, r *http.Request, id string) {
	enquiry, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		response.OK(w, map[string]string{"id": id})
		return
	}
	response.OK(w, enquiry)
}
