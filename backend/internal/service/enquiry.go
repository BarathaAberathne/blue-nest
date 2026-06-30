package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EnquiryService interface {
	Submit(ctx context.Context, req models.EnquiryRequest) (*models.Enquiry, error)
	ListAll(ctx context.Context) ([]models.Enquiry, error)
	List(ctx context.Context, f models.EnquiryFilter) ([]models.Enquiry, error)
	GetByID(ctx context.Context, id string) (*models.Enquiry, error)
	ChangeStatus(ctx context.Context, id, status string, actor models.EnquiryActor) error
	AddNote(ctx context.Context, id, note string, actor models.EnquiryActor) (*models.EnquiryNote, error)
	UpdateFollowUp(ctx context.Context, id string, req models.EnquiryFollowUpRequest, actor models.EnquiryActor) error
	Assign(ctx context.Context, id string, req models.EnquiryAssignRequest, actor models.EnquiryActor) error
	Register(ctx context.Context, id string, req models.EnquiryRegisterRequest, actor models.EnquiryActor) error
	LogReply(ctx context.Context, id string, actor models.EnquiryActor) error
	Stats(ctx context.Context) (*models.EnquiryStats, error)
}

type enquiryService struct {
	repo    repository.EnquiryRepository
	mailer  *email.Mailer
	adminTo string
}

func NewEnquiryService(repo repository.EnquiryRepository, mailer *email.Mailer, adminTo string) EnquiryService {
	return &enquiryService{repo: repo, mailer: mailer, adminTo: adminTo}
}

func (s *enquiryService) Submit(ctx context.Context, req models.EnquiryRequest) (*models.Enquiry, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("name is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, errors.New("email is required")
	}
	if strings.TrimSpace(req.Branch) == "" {
		return nil, errors.New("branch is required")
	}
	if strings.TrimSpace(req.EnquiryType) == "" {
		return nil, errors.New("enquiry type is required")
	}
	if !req.Consent {
		return nil, errors.New("consent is required")
	}

	enquiry := &models.Enquiry{
		Name:        req.Name,
		Email:       req.Email,
		Phone:       req.Phone,
		Branch:      req.Branch,
		ChildAge:    req.ChildAge,
		EnquiryType: req.EnquiryType,
		Message:     req.Message,
		FeeQuote:    req.FeeQuote,
		Application: req.Application,
		Source:      req.Source,
		Status:      models.EnquiryStatusNew,
		Priority:    models.EnquiryPriorityMedium,
		Notes:       []models.EnquiryNote{},
		ActivityLog: []models.EnquiryActivity{},
	}

	if err := s.repo.Create(ctx, enquiry); err != nil {
		return nil, fmt.Errorf("save enquiry: %w", err)
	}

	// Send emails asynchronously so they don't delay the HTTP response.
	go func() {
		if recipients := email.Recipients(s.adminTo); len(recipients) > 0 {
			// Reply-To = the parent's email so a manager can reply directly to them.
			if err := s.mailer.SendWithReplyTo(recipients, req.Email, adminNotificationSubject(req), adminNotificationHTML(req)); err != nil {
				slog.Error("failed to send admin notification email", "error", err)
			}
		}
		if req.Email != "" {
			if err := s.mailer.Send([]string{req.Email}, userConfirmationSubject(), userConfirmationHTML(req)); err != nil {
				slog.Error("failed to send user confirmation email", "error", err)
			}
		}
	}()

	return enquiry, nil
}

func (s *enquiryService) ListAll(ctx context.Context) ([]models.Enquiry, error) {
	return s.List(ctx, models.EnquiryFilter{})
}

func (s *enquiryService) List(ctx context.Context, f models.EnquiryFilter) ([]models.Enquiry, error) {
	enquiries, err := s.repo.Find(ctx, f)
	if err != nil {
		return nil, err
	}
	for i := range enquiries {
		normalize(&enquiries[i])
	}
	return enquiries, nil
}

func (s *enquiryService) GetByID(ctx context.Context, id string) (*models.Enquiry, error) {
	e, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	normalize(e)
	return e, nil
}

// normalize migrates legacy/missing fields so old records render safely without
// a destructive migration: legacy status mapping, default priority, and
// non-nil slices for the JSON timeline.
func normalize(e *models.Enquiry) {
	if e == nil {
		return
	}
	e.Status = models.NormalizeStatus(e.Status)
	if e.Priority == "" {
		e.Priority = models.EnquiryPriorityMedium
	}
	if e.Notes == nil {
		e.Notes = []models.EnquiryNote{}
	}
	if e.ActivityLog == nil {
		e.ActivityLog = []models.EnquiryActivity{}
	}
}

func (s *enquiryService) ChangeStatus(ctx context.Context, id, status string, actor models.EnquiryActor) error {
	if !models.IsValidEnquiryStatus(status) {
		return errors.New("invalid status")
	}
	current, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	from := models.NormalizeStatus(current.Status)
	if from == status {
		return nil // no-op; avoid noise in the activity log
	}
	// Guard the "registered" status: it must carry an expected start date, so
	// it can only be reached via Register (the Registration tab) — never set
	// blindly from the status dropdown. Already-registered enquiries with a
	// start date can re-affirm the status freely.
	if status == models.EnquiryStatusRegistered &&
		(current.Registration == nil || current.Registration.ExpectedStartDate == nil) {
		return errors.New("set an expected start date in the Registration tab to register")
	}
	act := newActivity(models.EnquiryActivityStatusChange, actor,
		fmt.Sprintf("Status changed from %s to %s", statusLabel(from), statusLabel(status)))
	act.FromStatus = from
	act.ToStatus = status
	if status == models.EnquiryStatusRegistered {
		act.Type = models.EnquiryActivityRegistered
	}
	return s.repo.ChangeStatus(ctx, id, status, act)
}

func (s *enquiryService) AddNote(ctx context.Context, id, note string, actor models.EnquiryActor) (*models.EnquiryNote, error) {
	note = strings.TrimSpace(note)
	if note == "" {
		return nil, errors.New("note cannot be empty")
	}
	n := models.EnquiryNote{
		ID:         primitive.NewObjectID().Hex(),
		Note:       note,
		AuthorID:   actor.ID,
		AuthorName: actor.Name,
		CreatedAt:  time.Now(),
	}
	act := newActivity(models.EnquiryActivityNoteAdded, actor, "Added an internal note")
	if err := s.repo.AddNote(ctx, id, n, act); err != nil {
		return nil, err
	}
	return &n, nil
}

func (s *enquiryService) UpdateFollowUp(ctx context.Context, id string, req models.EnquiryFollowUpRequest, actor models.EnquiryActor) error {
	if req.Priority == "" {
		req.Priority = models.EnquiryPriorityMedium
	}
	if !models.IsValidPriority(req.Priority) {
		return errors.New("invalid priority")
	}
	msg := "Updated follow-up details"
	if req.FollowUpDate != nil {
		msg = fmt.Sprintf("Set follow-up for %s (%s priority)", req.FollowUpDate.Format("2 Jan 2006"), req.Priority)
	}
	act := newActivity(models.EnquiryActivityFollowUp, actor, msg)
	return s.repo.UpdateFollowUp(ctx, id, req, act)
}

func (s *enquiryService) Assign(ctx context.Context, id string, req models.EnquiryAssignRequest, actor models.EnquiryActor) error {
	msg := "Unassigned the enquiry"
	if strings.TrimSpace(req.AssignedToName) != "" {
		msg = "Assigned to " + req.AssignedToName
	}
	act := newActivity(models.EnquiryActivityAssigned, actor, msg)
	return s.repo.Assign(ctx, id, req.AssignedTo, req.AssignedToName, act)
}

func (s *enquiryService) Register(ctx context.Context, id string, req models.EnquiryRegisterRequest, actor models.EnquiryActor) error {
	if req.ExpectedStartDate == nil {
		return errors.New("expected start date is required to register")
	}
	regDate := req.RegistrationDate
	if regDate == nil {
		now := time.Now()
		regDate = &now
	}
	reg := models.EnquiryRegistration{
		IsRegistered:      true,
		RegistrationDate:  regDate,
		ExpectedStartDate: req.ExpectedStartDate,
		ChildAgeGroup:     req.ChildAgeGroup,
		RoomAllocation:    req.RoomAllocation,
		FundingType:       req.FundingType,
	}
	act := newActivity(models.EnquiryActivityRegistered, actor,
		fmt.Sprintf("Registered — expected start %s", req.ExpectedStartDate.Format("2 Jan 2006")))
	act.FromStatus = ""
	act.ToStatus = models.EnquiryStatusRegistered
	return s.repo.Register(ctx, id, reg, act)
}

func (s *enquiryService) LogReply(ctx context.Context, id string, actor models.EnquiryActor) error {
	act := newActivity(models.EnquiryActivityEmailReply, actor, "Replied by email")
	return s.repo.LogActivity(ctx, id, act)
}

// newActivity builds a timestamped activity entry attributed to the actor.
func newActivity(typ string, actor models.EnquiryActor, msg string) models.EnquiryActivity {
	return models.EnquiryActivity{
		ID:         primitive.NewObjectID().Hex(),
		Type:       typ,
		Message:    msg,
		AuthorID:   actor.ID,
		AuthorName: actor.Name,
		CreatedAt:  time.Now(),
	}
}

// statusLabel renders a status constant as a human label for activity messages.
func statusLabel(s string) string {
	switch s {
	case models.EnquiryStatusNew:
		return "New"
	case models.EnquiryStatusContacted:
		return "Contacted"
	case models.EnquiryStatusAwaitingReply:
		return "Awaiting reply"
	case models.EnquiryStatusBookedVisit:
		return "Booked visit"
	case models.EnquiryStatusVisitCompleted:
		return "Visit completed"
	case models.EnquiryStatusRegistered:
		return "Registered"
	case models.EnquiryStatusCancelled:
		return "Cancelled"
	case models.EnquiryStatusLost:
		return "Lost"
	case models.EnquiryStatusSpam:
		return "Spam / invalid"
	default:
		return s
	}
}

// ── Dashboard stats ──────────────────────────────────────────────────────────

// statusRank maps a status to its funnel stage (0 New … 4 Registered). Off-funnel
// terminal states (cancelled/lost/spam) rank 0 — their historical stage is read
// from the activity log instead.
func statusRank(s string) int {
	switch s {
	case models.EnquiryStatusContacted, models.EnquiryStatusAwaitingReply:
		return 1
	case models.EnquiryStatusBookedVisit:
		return 2
	case models.EnquiryStatusVisitCompleted:
		return 3
	case models.EnquiryStatusRegistered:
		return 4
	default:
		return 0
	}
}

// firstResponseAt returns the time of the first staff response (a reply email or
// a move to contacted/awaiting-reply) recorded in the activity log.
func firstResponseAt(e *models.Enquiry) (time.Time, bool) {
	var earliest time.Time
	found := false
	for _, a := range e.ActivityLog {
		isResponse := a.Type == models.EnquiryActivityEmailReply ||
			a.ToStatus == models.EnquiryStatusContacted ||
			a.ToStatus == models.EnquiryStatusAwaitingReply
		if !isResponse {
			continue
		}
		if !found || a.CreatedAt.Before(earliest) {
			earliest = a.CreatedAt
			found = true
		}
	}
	return earliest, found
}

func (s *enquiryService) Stats(ctx context.Context) (*models.EnquiryStats, error) {
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	stats := &models.EnquiryStats{Total: len(all)}
	byBranch := map[string]int{}
	byStatus := map[string]int{}
	byType := map[string]int{}
	regByBranch := map[string]int{}
	monthly := map[string]int{}

	type branchAgg struct{ total, booked, registered, lost, overdue int }
	branchCmp := map[string]*branchAgg{}

	funnel := make([]int, 5) // reached counts per stage
	var respSum time.Duration
	var respCount, qualified int

	for i := range all {
		e := &all[i]
		st := models.NormalizeStatus(e.Status)

		byStatus[st]++
		// Key branch aggregations by the display label so inconsistent raw
		// values ("harrow" vs "Harrow") merge into one branch.
		branchLabel := formatBranch(strings.TrimSpace(e.Branch))
		if branchLabel != "" {
			byBranch[branchLabel]++
		}
		if e.EnquiryType != "" {
			byType[e.EnquiryType]++
		}
		if !e.CreatedAt.Before(monthStart) {
			stats.TotalThisMonth++
		}
		monthly[e.CreatedAt.Format("2006-01")]++

		isRegistered := st == models.EnquiryStatusRegistered || (e.Registration != nil && e.Registration.IsRegistered)
		isLostCancelled := st == models.EnquiryStatusCancelled || st == models.EnquiryStatusLost
		isSpam := st == models.EnquiryStatusSpam

		if !isSpam {
			qualified++
		}
		switch st {
		case models.EnquiryStatusNew:
			stats.New++
		case models.EnquiryStatusContacted, models.EnquiryStatusAwaitingReply:
			stats.Contacted++
		}
		if isRegistered {
			stats.Registrations++
			if branchLabel != "" {
				regByBranch[branchLabel]++
			}
		}
		if isLostCancelled {
			stats.LostCancelled++
		}

		overdue := e.FollowUpDate != nil && e.FollowUpDate.Before(now) && !isRegistered && !isLostCancelled && !isSpam
		if overdue {
			stats.OverdueFollowUps++
		}

		// Highest funnel stage ever reached (current status or historical).
		maxRank := statusRank(st)
		for _, a := range e.ActivityLog {
			if r := statusRank(a.ToStatus); r > maxRank {
				maxRank = r
			}
		}
		if !isSpam {
			for stage := 0; stage <= maxRank && stage < len(funnel); stage++ {
				funnel[stage]++
			}
		}

		if rt, ok := firstResponseAt(e); ok {
			respSum += rt.Sub(e.CreatedAt)
			respCount++
		}

		if branchLabel != "" {
			c := branchCmp[branchLabel]
			if c == nil {
				c = &branchAgg{}
				branchCmp[branchLabel] = c
			}
			c.total++
			if maxRank >= 2 {
				c.booked++
			}
			if isRegistered {
				c.registered++
			}
			if isLostCancelled {
				c.lost++
			}
			if overdue {
				c.overdue++
			}
		}
	}

	stats.BookedVisits = funnel[2]
	if qualified > 0 {
		stats.ConversionRate = round1(float64(stats.Registrations) / float64(qualified) * 100)
		stats.VisitBookingRate = round1(float64(funnel[2]) / float64(qualified) * 100)
	}
	if respCount > 0 {
		stats.AvgResponseHours = round1(respSum.Hours() / float64(respCount))
		stats.HasResponseData = true
	}

	identity := func(s string) string { return s }
	stats.ByBranch = pointsSorted(byBranch, identity)
	stats.ByType = pointsSorted(byType, identity)
	stats.RegistrationsByBranch = pointsSorted(regByBranch, identity)
	stats.ByStatus = orderedStatusPoints(byStatus)
	stats.MonthlyTrend = monthlyTrend(monthly, now, 6)
	stats.Funnel = []models.EnquiryStatPoint{
		{Label: "New", Value: funnel[0]},
		{Label: "Contacted", Value: funnel[1]},
		{Label: "Booked visit", Value: funnel[2]},
		{Label: "Visit completed", Value: funnel[3]},
		{Label: "Registered", Value: funnel[4]},
	}

	for branch, c := range branchCmp {
		conv := 0.0
		if c.total > 0 {
			conv = round1(float64(c.registered) / float64(c.total) * 100)
		}
		stats.BranchComparison = append(stats.BranchComparison, models.EnquiryBranchStat{
			Branch:           branch,
			Total:            c.total,
			BookedVisits:     c.booked,
			Registered:       c.registered,
			LostCancelled:    c.lost,
			ConversionRate:   conv,
			OverdueFollowUps: c.overdue,
		})
	}
	sort.Slice(stats.BranchComparison, func(i, j int) bool {
		return stats.BranchComparison[i].Total > stats.BranchComparison[j].Total
	})

	return stats, nil
}

func round1(f float64) float64 {
	return float64(int(f*10+0.5)) / 10
}

// pointsSorted converts a count map into chart points sorted by value desc,
// applying labelFn to each key for display.
func pointsSorted(m map[string]int, labelFn func(string) string) []models.EnquiryStatPoint {
	points := make([]models.EnquiryStatPoint, 0, len(m))
	for k, v := range m {
		points = append(points, models.EnquiryStatPoint{Label: labelFn(k), Value: v})
	}
	sort.Slice(points, func(i, j int) bool {
		if points[i].Value != points[j].Value {
			return points[i].Value > points[j].Value
		}
		return points[i].Label < points[j].Label
	})
	return points
}

// orderedStatusPoints renders status counts in the canonical workflow order.
func orderedStatusPoints(m map[string]int) []models.EnquiryStatPoint {
	points := make([]models.EnquiryStatPoint, 0, len(models.EnquiryStatuses))
	for _, st := range models.EnquiryStatuses {
		points = append(points, models.EnquiryStatPoint{Label: statusLabel(st), Value: m[st]})
	}
	return points
}

// monthlyTrend returns the last n months (including the current one), oldest
// first, labelled "Jan", "Feb" …
func monthlyTrend(m map[string]int, now time.Time, n int) []models.EnquiryStatPoint {
	points := make([]models.EnquiryStatPoint, 0, n)
	for i := n - 1; i >= 0; i-- {
		month := now.AddDate(0, -i, 0)
		key := month.Format("2006-01")
		points = append(points, models.EnquiryStatPoint{Label: month.Format("Jan"), Value: m[key]})
	}
	return points
}

// ── Email templates ───────────────────────────────────────────────────────────

// formatBranch turns a stored branch value ("harrow", "borehamwood",
// "pinner-green") into a human display label for emails ("Harrow",
// "Borehamwood", "Pinner Green"). Display-only — the stored enquiry.Branch slug
// is left unchanged so admin filtering/matching still works.
func formatBranch(b string) string {
	parts := strings.FieldsFunc(b, func(r rune) bool { return r == ' ' || r == '-' || r == '_' })
	for i, p := range parts {
		parts[i] = strings.ToUpper(p[:1]) + strings.ToLower(p[1:])
	}
	return strings.Join(parts, " ")
}

func feeQuoteHTML(q *models.FeeQuote) string {
	if q == nil {
		return ""
	}
	fmtGBP := func(v float64) string { return fmt.Sprintf("£%.2f", v) }
	row := func(label, value string) string {
		if value == "" {
			return ""
		}
		return fmt.Sprintf(
			`<tr>`+
				`<td style="padding:6px 12px;font-weight:600;color:#3a5c38;background:#f2f7f2;width:160px;border-bottom:1px solid #d8e8d8;">%s</td>`+
				`<td style="padding:6px 12px;color:#2a3c29;border-bottom:1px solid #d8e8d8;">%s</td>`+
				`</tr>`,
			label, value,
		)
	}

	rows := row("Branch", formatBranch(q.Branch)) +
		row("Age Group", q.AgeGroup) +
		row("Session", q.Session)
	if q.Days > 0 {
		rows += row("Days / Week", fmt.Sprintf("%d day(s)", q.Days))
	}
	if q.EarlyBird {
		rows += row("Early Bird", "Yes (before 8:00 am)")
	}
	if q.Funding != "" {
		rows += row("Gov. Funding", q.Funding+" hrs/wk")
	}
	if q.YearWeeks == 38 {
		rows += row("Year Basis", "Term-time only (38 weeks)")
	} else if q.YearWeeks == 52 {
		rows += row("Year Basis", "Full year (52 weeks)")
	}
	rows += row("Gross Weekly", fmtGBP(q.GrossWeekly))
	if q.Discount != "" {
		discountLabel := "Sibling Discount (10%)"
		if q.Discount == "staff" {
			discountLabel = "Staff Discount (50%)"
		}
		rows += row(discountLabel, "– "+fmtGBP(q.DiscountAmount))
	}
	if q.FundingOffset > 0 {
		rows += row("Funding Offset", "– "+fmtGBP(q.FundingOffset))
	}
	rows += row("Net Weekly", fmtGBP(q.NetWeekly))
	rows += row("Est. Monthly", fmtGBP(q.NetMonthly))

	return fmt.Sprintf(
		`<div style="margin-top:24px;">`+
			`<h2 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#3a5c38;text-transform:uppercase;letter-spacing:0.08em;">Fee Quote</h2>`+
			`<table style="width:100%%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #d8e8d8;">%s</table>`+
			`</div>`,
		rows,
	)
}

// applicationHTML renders a structured panel for an application-form
// submission, in the same visual style as feeQuoteHTML. Returns "" when
// req.Application is nil so non-application enquiries are unaffected.
func applicationHTML(a *models.Application) string {
	if a == nil {
		return ""
	}
	row := func(label, value string) string {
		if value == "" {
			return ""
		}
		return fmt.Sprintf(
			`<tr>`+
				`<td style="padding:6px 12px;font-weight:600;color:#3a5c38;background:#f2f7f2;width:160px;border-bottom:1px solid #d8e8d8;">%s</td>`+
				`<td style="padding:6px 12px;color:#2a3c29;border-bottom:1px solid #d8e8d8;">%s</td>`+
				`</tr>`,
			label, value,
		)
	}

	gender := ""
	if a.Child.Gender != nil {
		gender = *a.Child.Gender
	}

	rows := row("Child Name", a.Child.Name) +
		row("Child DOB", a.Child.Dob) +
		row("Child Gender", gender) +
		row("Branch", formatBranch(a.Branch)) +
		row("Parent Name", a.Parent.Name) +
		row("Parent Email", a.Parent.Email) +
		row("Parent Phone", a.Parent.Phone) +
		row("Settling-in Week", a.SettlingIn) +
		row("Join Waiting List", func() string {
			if a.WaitingList {
				return "Yes"
			}
			return "No"
		}())

	if len(a.Sessions) > 0 {
		var parts []string
		for _, s := range a.Sessions {
			label := s.Label
			if label == "" {
				label = s.Type
			}
			t := s.Time
			if t != "" {
				t = " (" + t + ")"
			}
			parts = append(parts, fmt.Sprintf("%s: %s%s", s.Day, label, t))
		}
		rows += row("Sessions Required", strings.Join(parts, "<br>"))
	}

	rows += row("Signature", "Captured digitally on submission")

	return fmt.Sprintf(
		`<div style="margin-top:24px;">`+
			`<h2 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#3a5c38;text-transform:uppercase;letter-spacing:0.08em;">Application Details</h2>`+
			`<table style="width:100%%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #d8e8d8;">%s</table>`+
			`</div>`,
		rows,
	)
}

func adminNotificationSubject(req models.EnquiryRequest) string {
	return fmt.Sprintf("New Enquiry: %s — %s", req.EnquiryType, req.Name)
}

func adminNotificationHTML(req models.EnquiryRequest) string {
	row := func(label, value string) string {
		if value == "" {
			return ""
		}
		return fmt.Sprintf(`<tr><td style="padding:6px 12px;font-weight:600;color:#5a4a42;background:#f8f1ec;width:140px;border-bottom:1px solid #f0e6df;">%s</td><td style="padding:6px 12px;color:#3a2e29;border-bottom:1px solid #f0e6df;">%s</td></tr>`, label, value)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf8f5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(90,74,66,0.10);">
    <div style="background:#fde8f0;padding:24px 32px;border-bottom:3px solid #f4aac8;">
      <!--[if mso]>
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:0;">
      <![endif]-->
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:0;">
            <img src="%s" alt="Blue Nest Montessori School" width="240" style="display:block;height:auto;border:0;outline:none;text-decoration:none;max-width:240px;margin:0 auto;" />
          </td>
        </tr>
      </table>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
      <h1 style="margin:12px 0 0;font-size:20px;color:#3a2e29;">New Enquiry Received</h1>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0e6df;">
        %s%s%s%s%s%s%s
      </table>
      %s
      %s
      %s
    </div>
    <div style="background:#fdf8f5;padding:16px 32px;text-align:center;font-size:12px;color:rgba(90,74,66,0.55);">
      Blue Nest Montessori School &mdash; manager@bluenest.uk
    </div>
  </div>
</body>
</html>`,
		email.LogoURL,
		row("Name", req.Name),
		row("Email", req.Email),
		row("Phone", req.Phone),
		row("Branch", formatBranch(req.Branch)),
		row("Child's Age", req.ChildAge),
		row("Enquiry Type", req.EnquiryType),
		row("Message", req.Message),
		func() string {
			if req.Message == "" {
				return ""
			}
			return fmt.Sprintf(`<p style="margin:20px 0 0;padding:16px;background:#f8f1ec;border-radius:8px;color:#3a2e29;font-size:14px;line-height:1.6;white-space:pre-line;">%s</p>`, req.Message)
		}(),
		feeQuoteHTML(req.FeeQuote),
		applicationHTML(req.Application),
	)
}

func userConfirmationSubject() string {
	return "Thank you for your enquiry — Blue Nest Montessori"
}

func userConfirmationHTML(req models.EnquiryRequest) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf8f5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(90,74,66,0.10);">
    <div style="background:#fde8f0;padding:24px 32px;border-bottom:3px solid #f4aac8;">
      <!--[if mso]>
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:0;">
      <![endif]-->
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:0;">
            <img src="%s" alt="Blue Nest Montessori School" width="240" style="display:block;height:auto;border:0;outline:none;text-decoration:none;max-width:240px;margin:0 auto;" />
          </td>
        </tr>
      </table>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#3a2e29;">Hi %s,</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#5a4a42;line-height:1.7;">
        Thank you for getting in touch with <strong>Blue Nest Montessori School</strong>.
        We've received your enquiry about <strong>%s</strong> at our <strong>%s</strong> branch
        and a member of our team will get back to you within <strong>one working day</strong>.
      </p>
      <div style="background:#f8f1ec;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:rgba(90,74,66,0.55);">Your enquiry summary</p>
        <p style="margin:0;font-size:14px;color:#3a2e29;"><strong>Type:</strong> %s</p>
        %s
      </div>
      %s
      %s
      <p style="margin:0 0 6px;font-size:14px;color:#5a4a42;">In the meantime, feel free to reach us directly:</p>
      <p style="margin:0;font-size:14px;color:#3a2e29;">
        📞 <a href="tel:02088615574" style="color:#3aada9;text-decoration:none;">020 8861 5574</a><br>
        ✉️ <a href="mailto:manager@bluenest.uk" style="color:#cf7d9c;text-decoration:none;">manager@bluenest.uk</a>
      </p>
    </div>
    <div style="background:#fdf8f5;padding:16px 32px;text-align:center;font-size:12px;color:rgba(90,74,66,0.55);">
      Blue Nest Montessori School &mdash; Harrow &bull; Pinner &bull; Borehamwood<br>
      Mon&ndash;Fri, 07:30&ndash;18:30
    </div>
  </div>
</body>
</html>`,
		email.LogoURL,
		req.Name,
		req.EnquiryType,
		formatBranch(req.Branch),
		req.EnquiryType,
		func() string {
			if req.Message == "" {
				return ""
			}
			return fmt.Sprintf(`<p style="margin:6px 0 0;font-size:14px;color:#3a2e29;white-space:pre-line;"><strong>Message:</strong> %s</p>`, req.Message)
		}(),
		// Fee quote block — reuses the same renderer the admin email uses so
		// the parent sees an identical breakdown (Branch / Age Group / Session
		// / Days / Gross & Net Weekly etc). feeQuoteHTML returns "" when
		// req.FeeQuote is nil, so non-quote enquiries are unaffected.
		feeQuoteHTML(req.FeeQuote),
		// Application block — same pattern. Renders only when the enquiry
		// is from /admission/application-form (req.Application != nil).
		applicationHTML(req.Application),
	)
}
