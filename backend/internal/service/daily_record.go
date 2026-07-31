package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
)

type DailyRecordService interface {
	List(ctx context.Context, f repository.DailyRecordFilter) ([]models.DailyRecord, error)
	GetByID(ctx context.Context, id string) (*models.DailyRecord, error)
	Create(ctx context.Context, req models.DailyRecordRequest, actorID, actorName string) (*models.DailyRecord, error)
	Update(ctx context.Context, id string, req models.DailyRecordRequest) (*models.DailyRecord, error)
	SetStatus(ctx context.Context, id string, status models.DailyRecordStatus) (*models.DailyRecord, error)
	// Approve/Reject are the four-eyes review gate — the actor must NOT be the
	// record's author (submitter). Reject requires a reason.
	Approve(ctx context.Context, id, actorID, actorName string) (*models.DailyRecord, error)
	Reject(ctx context.Context, id, actorID, actorName, reason string) (*models.DailyRecord, error)
	Delete(ctx context.Context, id string) error
	// Stats aggregates today's KPI tiles. Empty branch = org-wide (org-wide
	// roles); a branch-scoped caller passes their branch so counts never
	// include another branch's safeguarding/incident/medication data.
	Stats(ctx context.Context, date, branch string) (*models.DailyStats, error)
}

type dailyRecordService struct {
	repo     repository.DailyRecordRepository
	children repository.ChildRepository
	counters repository.CounterRepository
	// childRooms is the canonical child→room source used to default a daily
	// record's room when the request omits it.
	childRooms repository.ChildRoomAssignmentRepository
}

func NewDailyRecordService(repo repository.DailyRecordRepository, children repository.ChildRepository, counters repository.CounterRepository, childRooms repository.ChildRoomAssignmentRepository) DailyRecordService {
	return &dailyRecordService{repo: repo, children: children, counters: counters, childRooms: childRooms}
}

func (s *dailyRecordService) List(ctx context.Context, f repository.DailyRecordFilter) ([]models.DailyRecord, error) {
	return s.repo.FindAll(ctx, f)
}
func (s *dailyRecordService) GetByID(ctx context.Context, id string) (*models.DailyRecord, error) {
	return s.repo.FindByID(ctx, id)
}

// defaultStatus picks the initial lifecycle for a record type.
func defaultStatus(t models.DailyRecordType) models.DailyRecordStatus {
	switch t {
	case models.RecIncident, models.RecSafeguarding, models.RecMedication:
		return models.RecOpen
	default:
		return models.RecLogged
	}
}

func (s *dailyRecordService) apply(ctx context.Context, rec *models.DailyRecord, req models.DailyRecordRequest) error {
	rec.Type = req.Type
	rec.BranchSlug = strings.TrimSpace(req.BranchSlug)
	rec.RoomID = strings.TrimSpace(req.RoomID)
	rec.Title = strings.TrimSpace(req.Title)
	rec.Detail = strings.TrimSpace(req.Detail)
	rec.Severity = strings.TrimSpace(req.Severity)
	rec.EYFSAreas = req.EYFSAreas
	rec.NextSteps = strings.TrimSpace(req.NextSteps)
	rec.Medication = strings.TrimSpace(req.Medication)
	rec.Dose = strings.TrimSpace(req.Dose)
	rec.MealType = strings.TrimSpace(req.MealType)
	rec.Eaten = strings.TrimSpace(req.Eaten)
	rec.Menu = strings.TrimSpace(req.Menu)
	rec.ActionTaken = strings.TrimSpace(req.ActionTaken)
	rec.FirstAid = strings.TrimSpace(req.FirstAid)
	rec.ParentsNotified = strings.TrimSpace(req.ParentsNotified)
	rec.OtherNotes = strings.TrimSpace(req.OtherNotes)
	if req.Witnesses != nil {
		rec.Witnesses = req.Witnesses
	}
	if req.OtherStaff != nil {
		rec.OtherStaff = req.OtherStaff
	}
	if req.ReportedTo != nil {
		rec.ReportedTo = req.ReportedTo
	}
	rec.AdministeredBy = strings.TrimSpace(req.AdministeredBy)
	rec.AdminTime = strings.TrimSpace(req.AdminTime)
	rec.ParentConsent = req.ParentConsent
	if req.Attachments != nil {
		rec.Attachments = req.Attachments
	}
	if req.Date != "" {
		rec.Date = req.Date
	}
	if req.Status != "" {
		rec.Status = req.Status
	}
	// Resolve the child (denormalise name; inherit branch/room if not supplied).
	rec.ChildID = strings.TrimSpace(req.ChildID)
	if rec.ChildID != "" {
		if child, err := s.children.FindByID(ctx, rec.ChildID); err == nil && child != nil {
			rec.ChildName = strings.TrimSpace(child.FirstName + " " + child.LastName)
			if rec.BranchSlug == "" {
				rec.BranchSlug = child.BranchSlug
			}
			if rec.RoomID == "" && s.childRooms != nil {
				// Default to the child's current room from the canonical model.
				rec.RoomID = CurrentChildRooms(ctx, s.childRooms, child.BranchSlug)[rec.ChildID]
			}
		}
	}
	return nil
}

func (s *dailyRecordService) Create(ctx context.Context, req models.DailyRecordRequest, actorID, actorName string) (*models.DailyRecord, error) {
	if strings.TrimSpace(string(req.Type)) == "" {
		return nil, errors.New("record type is required")
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, errors.New("title is required")
	}
	rec := &models.DailyRecord{
		Date:   time.Now().Format("2006-01-02"),
		Status: defaultStatus(req.Type),
		// Four-eyes: every new log starts pending until a DIFFERENT approver
		// signs it off (see Approve). Author recorded for the self-approval guard.
		ApprovalStatus:  models.ApprovalPending,
		SubmittedBy:     actorID,
		SubmittedByName: actorName,
	}
	if err := s.apply(ctx, rec, req); err != nil {
		return nil, err
	}
	if rec.BranchSlug == "" {
		return nil, errors.New("branch is required")
	}
	if dup, err := s.recentDuplicate(ctx, rec); err != nil {
		return nil, err
	} else if dup != nil {
		return dup, nil
	}
	year := time.Now().Year()
	seq, err := s.counters.Next(ctx, models.CounterDailyRecord+"-"+strconv.Itoa(year))
	if err != nil {
		return nil, err
	}
	rec.Ref = models.FormatRef(models.RefPrefixDailyRecord, year, seq)
	if err := s.repo.Create(ctx, rec); err != nil {
		return nil, err
	}
	return rec, nil
}

// duplicateRecordWindow is a debounce, not a business rule: a child can
// legitimately have several meals/observations on the same day, but never
// two IDENTICAL submissions (same child, type, title, meal_type) seconds
// apart — that's a double-tap or a client retry, not two real events.
const duplicateRecordWindow = 5 * time.Second

// recentDuplicate returns an existing record matching rec on every
// content field, created within duplicateRecordWindow, or nil.
func (s *dailyRecordService) recentDuplicate(ctx context.Context, rec *models.DailyRecord) (*models.DailyRecord, error) {
	if rec.ChildID == "" {
		return nil, nil // nothing to key a duplicate check on
	}
	existing, err := s.repo.FindAll(ctx, repository.DailyRecordFilter{
		Type: string(rec.Type), ChildID: rec.ChildID, Branch: rec.BranchSlug, Date: rec.Date,
	})
	if err != nil {
		return nil, err
	}
	cutoff := time.Now().Add(-duplicateRecordWindow)
	for i := range existing {
		e := &existing[i]
		if e.CreatedAt.After(cutoff) && e.Title == rec.Title && e.MealType == rec.MealType {
			return e, nil
		}
	}
	return nil, nil
}

func (s *dailyRecordService) Update(ctx context.Context, id string, req models.DailyRecordRequest) (*models.DailyRecord, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.apply(ctx, existing, req); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, *existing)
}

func (s *dailyRecordService) SetStatus(ctx context.Context, id string, status models.DailyRecordStatus) (*models.DailyRecord, error) {
	if strings.TrimSpace(string(status)) == "" {
		return nil, errors.New("status is required")
	}
	return s.repo.UpdateStatus(ctx, id, status)
}

func (s *dailyRecordService) Approve(ctx context.Context, id, actorID, actorName string) (*models.DailyRecord, error) {
	rec, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if rec.ApprovalStatus == models.ApprovalApproved {
		return rec, nil // idempotent
	}
	// Four-eyes: an approver cannot sign off their own submission.
	if rec.SubmittedBy != "" && rec.SubmittedBy == actorID {
		return nil, errors.New("you cannot approve a log you submitted — it needs a second approver")
	}
	now := time.Now()
	return s.repo.SetApproval(ctx, id, bson.M{
		"approval_status":  models.ApprovalApproved,
		"approved_by":      actorID,
		"approved_by_name": actorName,
		"approved_at":      now,
		"rejection_reason": "",
	})
}

func (s *dailyRecordService) Reject(ctx context.Context, id, actorID, actorName, reason string) (*models.DailyRecord, error) {
	if strings.TrimSpace(reason) == "" {
		return nil, errors.New("a reason is required to reject a log")
	}
	rec, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if rec.SubmittedBy != "" && rec.SubmittedBy == actorID {
		return nil, errors.New("you cannot review a log you submitted")
	}
	now := time.Now()
	return s.repo.SetApproval(ctx, id, bson.M{
		"approval_status":  models.ApprovalRejected,
		"approved_by":      actorID,
		"approved_by_name": actorName,
		"approved_at":      now,
		"rejection_reason": strings.TrimSpace(reason),
	})
}

func (s *dailyRecordService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *dailyRecordService) Stats(ctx context.Context, date, branch string) (*models.DailyStats, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	weekAgo := time.Now().AddDate(0, 0, -7).Format("2006-01-02")

	count := func(f repository.DailyRecordFilter) int {
		f.Branch = branch
		// KPIs count only records that passed four-eyes approval (incl. legacy);
		// pending/rejected submissions are drafts, not the permanent record.
		f.Approval = models.ApprovalApproved
		n, err := s.repo.Count(ctx, f)
		if err != nil {
			return 0
		}
		return n
	}

	stats := &models.DailyStats{Date: date}
	stats.SafeguardingOpen = count(repository.DailyRecordFilter{Type: string(models.RecSafeguarding), Status: string(models.RecOpen)})
	stats.IncidentsToday = count(repository.DailyRecordFilter{Type: string(models.RecIncident), Date: date})
	stats.MedicationDue = count(repository.DailyRecordFilter{Type: string(models.RecMedication), Status: string(models.RecOpen), Date: date})
	stats.MealsServed = count(repository.DailyRecordFilter{Type: string(models.RecMeal), Date: date})
	stats.ObservationsWeek = count(repository.DailyRecordFilter{Type: string(models.RecObservation), Since: weekAgo})

	for _, t := range []models.DailyRecordType{models.RecObservation, models.RecIncident, models.RecSafeguarding, models.RecMedication, models.RecMeal} {
		stats.ByType = append(stats.ByType, models.LabelCount{Label: string(t), Count: count(repository.DailyRecordFilter{Type: string(t), Date: date})})
	}
	return stats, nil
}
