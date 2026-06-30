package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// fakeEnquiryRepo is an in-memory EnquiryRepository for service-level tests.
var _ repository.EnquiryRepository = (*fakeEnquiryRepo)(nil)

type fakeEnquiryRepo struct {
	all           []models.Enquiry
	byID          map[string]*models.Enquiry
	changedStatus string
	lastActivity  *models.EnquiryActivity
	lastNote      *models.EnquiryNote
	lastReg       *models.EnquiryRegistration
}

func (f *fakeEnquiryRepo) Create(_ context.Context, e *models.Enquiry) error {
	f.all = append(f.all, *e)
	return nil
}
func (f *fakeEnquiryRepo) FindAll(_ context.Context) ([]models.Enquiry, error) { return f.all, nil }
func (f *fakeEnquiryRepo) Find(_ context.Context, _ models.EnquiryFilter) ([]models.Enquiry, error) {
	return f.all, nil
}
func (f *fakeEnquiryRepo) Count(_ context.Context, _ models.EnquiryFilter) (int64, error) {
	return int64(len(f.all)), nil
}
func (f *fakeEnquiryRepo) FindByID(_ context.Context, id string) (*models.Enquiry, error) {
	if e, ok := f.byID[id]; ok {
		return e, nil
	}
	return nil, errors.New("not found")
}
func (f *fakeEnquiryRepo) ChangeStatus(_ context.Context, _, status string, act models.EnquiryActivity) error {
	f.changedStatus = status
	a := act
	f.lastActivity = &a
	return nil
}
func (f *fakeEnquiryRepo) AddNote(_ context.Context, _ string, note models.EnquiryNote, act models.EnquiryActivity) error {
	n, a := note, act
	f.lastNote, f.lastActivity = &n, &a
	return nil
}
func (f *fakeEnquiryRepo) UpdateFollowUp(_ context.Context, _ string, _ models.EnquiryFollowUpRequest, act models.EnquiryActivity) error {
	a := act
	f.lastActivity = &a
	return nil
}
func (f *fakeEnquiryRepo) Assign(_ context.Context, _, _, _ string, act models.EnquiryActivity) error {
	a := act
	f.lastActivity = &a
	return nil
}
func (f *fakeEnquiryRepo) Register(_ context.Context, _ string, reg models.EnquiryRegistration, act models.EnquiryActivity) error {
	r, a := reg, act
	f.lastReg, f.lastActivity = &r, &a
	return nil
}
func (f *fakeEnquiryRepo) LogActivity(_ context.Context, _ string, act models.EnquiryActivity) error {
	a := act
	f.lastActivity = &a
	return nil
}

func newTestEnquirySvc(repo repository.EnquiryRepository) EnquiryService {
	return NewEnquiryService(repo, nil, "admin@bluenest.uk")
}

func TestChangeStatusValidationAndActivity(t *testing.T) {
	ctx := context.Background()
	actor := models.EnquiryActor{ID: "u1", Name: "admin@bluenest.uk"}
	base := &models.Enquiry{ID: primitive.NewObjectID(), Status: models.EnquiryStatusNew}
	repo := &fakeEnquiryRepo{byID: map[string]*models.Enquiry{"1": base}}
	svc := newTestEnquirySvc(repo)

	if err := svc.ChangeStatus(ctx, "1", "bogus", actor); err == nil {
		t.Error("expected error for invalid status")
	}
	if err := svc.ChangeStatus(ctx, "1", models.EnquiryStatusRegistered, actor); err == nil {
		t.Error("expected guard error registering without an expected start date")
	}
	if err := svc.ChangeStatus(ctx, "1", models.EnquiryStatusContacted, actor); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.changedStatus != models.EnquiryStatusContacted {
		t.Errorf("changedStatus = %q, want contacted", repo.changedStatus)
	}
	if repo.lastActivity == nil || repo.lastActivity.FromStatus != "new" || repo.lastActivity.ToStatus != "contacted" {
		t.Errorf("activity from/to not set correctly: %+v", repo.lastActivity)
	}
}

func TestChangeStatusRegisteredAllowedWithStartDate(t *testing.T) {
	start := time.Now()
	base := &models.Enquiry{
		ID:           primitive.NewObjectID(),
		Status:       models.EnquiryStatusVisitCompleted,
		Registration: &models.EnquiryRegistration{ExpectedStartDate: &start},
	}
	repo := &fakeEnquiryRepo{byID: map[string]*models.Enquiry{"1": base}}
	svc := newTestEnquirySvc(repo)
	if err := svc.ChangeStatus(context.Background(), "1", models.EnquiryStatusRegistered, models.EnquiryActor{}); err != nil {
		t.Fatalf("expected no error when a start date exists, got %v", err)
	}
	if repo.changedStatus != models.EnquiryStatusRegistered {
		t.Errorf("changedStatus = %q, want registered", repo.changedStatus)
	}
}

func TestChangeStatusNoOpSkipsRepo(t *testing.T) {
	base := &models.Enquiry{Status: models.EnquiryStatusContacted}
	repo := &fakeEnquiryRepo{byID: map[string]*models.Enquiry{"1": base}}
	svc := newTestEnquirySvc(repo)
	if err := svc.ChangeStatus(context.Background(), "1", models.EnquiryStatusContacted, models.EnquiryActor{}); err != nil {
		t.Fatal(err)
	}
	if repo.changedStatus != "" {
		t.Errorf("no-op transition should not call repo; got %q", repo.changedStatus)
	}
}

func TestAddNoteValidation(t *testing.T) {
	repo := &fakeEnquiryRepo{byID: map[string]*models.Enquiry{}}
	svc := newTestEnquirySvc(repo)
	if _, err := svc.AddNote(context.Background(), "1", "   ", models.EnquiryActor{}); err == nil {
		t.Error("expected error for empty note")
	}
	n, err := svc.AddNote(context.Background(), "1", "  called parent  ", models.EnquiryActor{ID: "u", Name: "Sam"})
	if err != nil {
		t.Fatal(err)
	}
	if n.Note != "called parent" {
		t.Errorf("note should be trimmed, got %q", n.Note)
	}
	if repo.lastNote == nil || repo.lastNote.AuthorName != "Sam" {
		t.Error("note not persisted with author attribution")
	}
}

func TestRegisterRequiresStartDate(t *testing.T) {
	repo := &fakeEnquiryRepo{}
	svc := newTestEnquirySvc(repo)
	if err := svc.Register(context.Background(), "1", models.EnquiryRegisterRequest{}, models.EnquiryActor{}); err == nil {
		t.Error("expected error when expected_start_date is missing")
	}
	start := time.Now()
	if err := svc.Register(context.Background(), "1", models.EnquiryRegisterRequest{ExpectedStartDate: &start}, models.EnquiryActor{}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.lastReg == nil || !repo.lastReg.IsRegistered {
		t.Error("registration should be persisted with is_registered=true")
	}
}

func TestGetByIDNormalizesLegacyRecord(t *testing.T) {
	base := &models.Enquiry{Status: "responded"} // legacy status, nil slices, no priority
	repo := &fakeEnquiryRepo{byID: map[string]*models.Enquiry{"1": base}}
	svc := newTestEnquirySvc(repo)
	got, err := svc.GetByID(context.Background(), "1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != models.EnquiryStatusContacted {
		t.Errorf("legacy 'responded' should normalize to contacted, got %q", got.Status)
	}
	if got.Priority != models.EnquiryPriorityMedium {
		t.Errorf("default priority should be medium, got %q", got.Priority)
	}
	if got.Notes == nil || got.ActivityLog == nil {
		t.Error("notes and activity_log should be non-nil after normalization")
	}
}

func TestStatsComputation(t *testing.T) {
	now := time.Now()
	past := now.Add(-48 * time.Hour)
	contacted := func(delta time.Duration) models.EnquiryActivity {
		return models.EnquiryActivity{Type: models.EnquiryActivityStatusChange, ToStatus: models.EnquiryStatusContacted, CreatedAt: now.Add(delta)}
	}
	booked := models.EnquiryActivity{Type: models.EnquiryActivityStatusChange, ToStatus: models.EnquiryStatusBookedVisit, CreatedAt: now.Add(3 * time.Hour)}
	mk := func(branch, status string, acts []models.EnquiryActivity, reg *models.EnquiryRegistration, follow *time.Time) models.Enquiry {
		return models.Enquiry{
			ID:           primitive.NewObjectID(),
			Branch:       branch,
			EnquiryType:  "General enquiry",
			Status:       status,
			CreatedAt:    now,
			ActivityLog:  acts,
			Registration: reg,
			FollowUpDate: follow,
		}
	}

	repo := &fakeEnquiryRepo{all: []models.Enquiry{
		// registered (also reached contacted) — branch lowercase
		mk("harrow", models.EnquiryStatusRegistered, []models.EnquiryActivity{contacted(2 * time.Hour)}, &models.EnquiryRegistration{IsRegistered: true}, &past),
		// booked visit, open + overdue follow-up — branch Title-case (must merge with "harrow")
		mk("Harrow", models.EnquiryStatusBookedVisit, []models.EnquiryActivity{contacted(1 * time.Hour), booked}, nil, &past),
		mk("borehamwood", models.EnquiryStatusNew, nil, nil, nil),
		mk("", models.EnquiryStatusSpam, nil, nil, nil), // spam + no branch
		mk("pinner", models.EnquiryStatusLost, nil, nil, nil),
	}}
	svc := newTestEnquirySvc(repo)

	st, err := svc.Stats(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	checks := map[string]struct{ got, want int }{
		"total":          {st.Total, 5},
		"new":            {st.New, 1},
		"registrations":  {st.Registrations, 1},
		"lost_cancelled": {st.LostCancelled, 1},
		"booked_visits":  {st.BookedVisits, 2},
		"overdue":        {st.OverdueFollowUps, 1}, // only the open booked one; registered is excluded
		"this_month":     {st.TotalThisMonth, 5},
	}
	for name, c := range checks {
		if c.got != c.want {
			t.Errorf("%s = %d, want %d", name, c.got, c.want)
		}
	}

	if st.ConversionRate != 25 { // 1 registered / 4 qualified (spam excluded)
		t.Errorf("conversion_rate = %v, want 25", st.ConversionRate)
	}
	if st.VisitBookingRate != 50 { // 2 booked / 4 qualified
		t.Errorf("visit_booking_rate = %v, want 50", st.VisitBookingRate)
	}
	if !st.HasResponseData || st.AvgResponseHours != 1.5 { // (2h + 1h) / 2
		t.Errorf("avg_response_hours = %v (has=%v), want 1.5/true", st.AvgResponseHours, st.HasResponseData)
	}

	// Branch dedup: "harrow" and "Harrow" merge to a single "Harrow" with value 2.
	branchSeen := map[string]int{}
	for _, p := range st.ByBranch {
		branchSeen[p.Label]++
		if p.Label == "Harrow" && p.Value != 2 {
			t.Errorf("Harrow by_branch value = %d, want 2", p.Value)
		}
	}
	if branchSeen["Harrow"] != 1 {
		t.Errorf("Harrow should appear once in by_branch, got %d entries", branchSeen["Harrow"])
	}

	// Funnel reached-counts: New, Contacted, Booked, Visit completed, Registered.
	if len(st.Funnel) != 5 {
		t.Fatalf("funnel length = %d, want 5", len(st.Funnel))
	}
	wantFunnel := []int{4, 2, 2, 1, 1}
	for i, w := range wantFunnel {
		if st.Funnel[i].Value != w {
			t.Errorf("funnel[%d] (%s) = %d, want %d", i, st.Funnel[i].Label, st.Funnel[i].Value, w)
		}
	}

	if len(st.MonthlyTrend) != 6 {
		t.Errorf("monthly_trend length = %d, want 6", len(st.MonthlyTrend))
	}

	bcSeen := map[string]int{}
	for _, b := range st.BranchComparison {
		bcSeen[b.Branch]++
	}
	if bcSeen["Harrow"] != 1 {
		t.Errorf("branch_comparison has duplicate Harrow rows: %d", bcSeen["Harrow"])
	}
}
