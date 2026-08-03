package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// LeaveRequestService drives the staff leave/holiday workflow: a staff member
// applies, a DIFFERENT manager (four-eyes) approves or declines, and on approval
// the booked weekdays are written to the attendance register.
type LeaveRequestService interface {
	Apply(ctx context.Context, in models.LeaveRequestCreate, actorUserID, actorName string) (*models.LeaveRequest, error)
	ListMine(ctx context.Context, actorUserID string) ([]models.LeaveRequest, error)
	List(ctx context.Context, f models.LeaveRequestFilter) ([]models.LeaveRequest, error)
	Cancel(ctx context.Context, id, actorUserID string) (*models.LeaveRequest, error)
	Approve(ctx context.Context, id, actorUserID, actorName string) (*models.LeaveRequest, error)
	Decline(ctx context.Context, id, reason, actorUserID, actorName string) (*models.LeaveRequest, error)
}

type leaveRequestService struct {
	repo       repository.LeaveRequestRepository
	staff      repository.StaffRepository
	users      repository.UserRepository
	attendance StaffAttendanceService
	notifs     NotificationService
}

func NewLeaveRequestService(
	repo repository.LeaveRequestRepository,
	staff repository.StaffRepository,
	users repository.UserRepository,
	attendance StaffAttendanceService,
	notifs NotificationService,
) LeaveRequestService {
	return &leaveRequestService{repo: repo, staff: staff, users: users, attendance: attendance, notifs: notifs}
}

// staffForUser resolves the Staff record linked to a login user (Staff.UserID).
func (s *leaveRequestService) staffForUser(ctx context.Context, userID string) *models.Staff {
	all, err := s.staff.FindAll(ctx, repository.StaffFilter{})
	if err != nil {
		return nil
	}
	for i := range all {
		if all[i].UserID == userID {
			return &all[i]
		}
	}
	return nil
}

// approversFor returns the user ids that can approve leave for `branch` (holders
// of leave.approve, scoped to the branch or org-wide).
func (s *leaveRequestService) approversFor(ctx context.Context, branch string) []string {
	orgID, _ := repository.OrgFromContext(ctx)
	users, err := s.users.FindAll(ctx)
	if err != nil {
		return nil
	}
	var ids []string
	for _, u := range users {
		if !models.HasPermission(orgID, u.Role, models.PermLeaveApprove) {
			continue
		}
		if len(u.BranchSlugs) == 0 || contains(u.BranchSlugs, branch) {
			ids = append(ids, u.ID.Hex())
		}
	}
	return ids
}

func (s *leaveRequestService) Apply(ctx context.Context, in models.LeaveRequestCreate, actorUserID, actorName string) (*models.LeaveRequest, error) {
	t := strings.TrimSpace(in.Type)
	if t == "" {
		t = models.LeaveTypeAnnual
	}
	if !models.IsValidLeaveType(t) {
		return nil, errors.New("invalid leave type")
	}
	days := models.CountWeekdays(in.StartDate, in.EndDate)
	if days == 0 {
		return nil, errors.New("select a valid date range with at least one working day (end on or after start)")
	}

	// Resolve the staff member: an explicit staff_id (manager filing for someone),
	// else the caller's own linked staff record (self-service).
	var st *models.Staff
	if strings.TrimSpace(in.StaffID) != "" {
		st, _ = s.staff.FindByID(ctx, in.StaffID)
	} else {
		st = s.staffForUser(ctx, actorUserID)
	}
	if st == nil {
		return nil, errors.New("no staff record is linked to your account — ask an admin to link your login before requesting leave")
	}

	lr := &models.LeaveRequest{
		StaffID:       st.ID.Hex(),
		StaffName:     strings.TrimSpace(st.FirstName + " " + st.LastName),
		BranchSlug:    st.BranchSlug,
		Type:          t,
		StartDate:     in.StartDate,
		EndDate:       in.EndDate,
		Days:          days,
		Reason:        strings.TrimSpace(in.Reason),
		Status:        models.LeavePending,
		RequestedByID: actorUserID,
	}
	if err := s.repo.Create(ctx, lr); err != nil {
		return nil, err
	}

	// Notify approvers (best-effort), excluding the applicant.
	var recipients []string
	for _, id := range s.approversFor(ctx, st.BranchSlug) {
		if id != actorUserID {
			recipients = append(recipients, id)
		}
	}
	_ = s.notifs.NotifyMany(ctx, recipients, models.Notification{
		Type:       models.NotifLeaveRequested,
		Title:      "Leave request to review",
		Body:       lr.StaffName + " · " + leaveTypeLabel(t) + " · " + lr.StartDate + " → " + lr.EndDate,
		Link:       "/admin/leave",
		EntityType: "leave_request",
		EntityID:   lr.ID.Hex(),
	})
	return lr, nil
}

func (s *leaveRequestService) ListMine(ctx context.Context, actorUserID string) ([]models.LeaveRequest, error) {
	st := s.staffForUser(ctx, actorUserID)
	if st == nil {
		return []models.LeaveRequest{}, nil
	}
	return s.repo.FindByStaffID(ctx, st.ID.Hex())
}

func (s *leaveRequestService) List(ctx context.Context, f models.LeaveRequestFilter) ([]models.LeaveRequest, error) {
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]models.LeaveRequest, 0, len(all))
	for _, lr := range all {
		if f.Branch != "" && lr.BranchSlug != f.Branch {
			continue
		}
		if f.Status != "" && string(lr.Status) != f.Status {
			continue
		}
		if f.StaffID != "" && lr.StaffID != f.StaffID {
			continue
		}
		out = append(out, lr)
	}
	return out, nil
}

func (s *leaveRequestService) Cancel(ctx context.Context, id, actorUserID string) (*models.LeaveRequest, error) {
	lr, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if lr.RequestedByID != actorUserID {
		return nil, errors.New("you can only cancel your own leave request")
	}
	if lr.Status != models.LeavePending {
		return nil, errors.New("only a pending request can be cancelled")
	}
	lr.Status = models.LeaveCancelled
	if err := s.repo.Update(ctx, lr); err != nil {
		return nil, err
	}
	return lr, nil
}

func (s *leaveRequestService) Approve(ctx context.Context, id, actorUserID, actorName string) (*models.LeaveRequest, error) {
	lr, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if lr.Status != models.LeavePending {
		return nil, errors.New("only a pending request can be approved")
	}
	if lr.RequestedByID == actorUserID {
		return nil, errors.New("you cannot approve your own leave request")
	}
	now := time.Now()
	lr.Status = models.LeaveApproved
	lr.ReviewedByID = actorUserID
	lr.ReviewedBy = actorName
	lr.ReviewedAt = &now
	if err := s.repo.Update(ctx, lr); err != nil {
		return nil, err
	}

	// Write the booked weekdays onto the attendance register (best-effort — a
	// failed day never blocks the approval; managers can re-mark if needed).
	status := models.LeaveTypeToAttendanceStatus(lr.Type)
	for _, d := range models.Weekdays(lr.StartDate, lr.EndDate) {
		_, _ = s.attendance.Mark(ctx, models.StaffAttendanceMarkRequest{
			StaffID: lr.StaffID, Date: d, Status: status, Notes: "Approved leave",
		}, actorUserID, nil)
	}

	if lr.RequestedByID != "" {
		_ = s.notifs.NotifyMany(ctx, []string{lr.RequestedByID}, models.Notification{
			Type:       models.NotifLeaveApproved,
			Title:      "Leave approved",
			Body:       leaveTypeLabel(lr.Type) + " · " + lr.StartDate + " → " + lr.EndDate + " approved by " + actorName,
			Link:       "/admin/my-leave",
			EntityType: "leave_request",
			EntityID:   lr.ID.Hex(),
		})
	}
	return lr, nil
}

func (s *leaveRequestService) Decline(ctx context.Context, id, reason, actorUserID, actorName string) (*models.LeaveRequest, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, errors.New("a reason is required to decline a leave request")
	}
	lr, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if lr.Status != models.LeavePending {
		return nil, errors.New("only a pending request can be declined")
	}
	if lr.RequestedByID == actorUserID {
		return nil, errors.New("you cannot decline your own leave request")
	}
	now := time.Now()
	lr.Status = models.LeaveDeclined
	lr.ReviewedByID = actorUserID
	lr.ReviewedBy = actorName
	lr.ReviewedAt = &now
	lr.DeclineReason = reason
	if err := s.repo.Update(ctx, lr); err != nil {
		return nil, err
	}
	if lr.RequestedByID != "" {
		_ = s.notifs.NotifyMany(ctx, []string{lr.RequestedByID}, models.Notification{
			Type:       models.NotifLeaveDeclined,
			Title:      "Leave declined",
			Body:       leaveTypeLabel(lr.Type) + " · " + lr.StartDate + " → " + lr.EndDate + " declined: " + reason,
			Link:       "/admin/my-leave",
			EntityType: "leave_request",
			EntityID:   lr.ID.Hex(),
		})
	}
	return lr, nil
}

func leaveTypeLabel(t string) string {
	switch t {
	case models.LeaveTypeAnnual:
		return "Annual leave"
	case models.LeaveTypeUnpaid:
		return "Unpaid leave"
	case models.LeaveTypeMaternity:
		return "Maternity / paternity"
	case models.LeaveTypeDependantSick:
		return "Dependant sick leave"
	case models.LeaveTypeSick:
		return "Sick leave"
	default:
		return t
	}
}
