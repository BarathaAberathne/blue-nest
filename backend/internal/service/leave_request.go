package service

import (
	"context"
	"errors"
	"fmt"
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
	// BalancesForUser returns the caller's per-type leave balances (keyed by
	// leave type; empty if the user has no linked staff record).
	BalancesForUser(ctx context.Context, actorUserID string) (map[string]models.LeaveBalance, error)
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
	if userID == "" {
		return nil
	}
	st, err := s.staff.FindByUserID(ctx, userID)
	if err != nil {
		return nil
	}
	return st
}

// approversFor returns the user ids that can approve leave for `branch` (holders
// of leave.approve, scoped to the branch or org-wide).
func (s *leaveRequestService) approversFor(ctx context.Context, branch string) []string {
	return usersWithPermission(ctx, s.users, models.PermLeaveApprove, branch)
}

// allowanceForType returns the annual allowance for a leave type and whether it
// is capped for this staff member: annual leave is always capped (org default
// when unset); sick leave only when a paid-sick allowance is configured; the
// other types (unpaid/maternity/dependant) are uncapped.
func (s *leaveRequestService) allowanceForType(st *models.Staff, t string) (allowance int, capped bool) {
	switch t {
	case models.LeaveTypeAnnual:
		a := models.DefaultAnnualLeaveDays
		if st.AnnualLeaveDays > 0 {
			a = st.AnnualLeaveDays
		}
		return a, true
	case models.LeaveTypeSick:
		if st.SickLeaveDays > 0 {
			return st.SickLeaveDays, true
		}
		return 0, false
	default:
		return 0, false
	}
}

// balanceForType computes a staff member's position for one capped leave type in
// the leave year containing today.
func (s *leaveRequestService) balanceForType(ctx context.Context, st *models.Staff, t string) (*models.LeaveBalance, error) {
	allowance, capped := s.allowanceForType(st, t)
	yearStart, yearEnd, year := models.LeaveYearContains(time.Now())
	reqs, err := s.repo.FindByStaffID(ctx, st.ID.Hex())
	if err != nil {
		return nil, err
	}
	taken, pending := 0, 0
	for _, r := range reqs {
		if r.Type != t || r.StartDate < yearStart || r.StartDate > yearEnd { // bucket by start date
			continue
		}
		switch r.Status {
		case models.LeaveApproved:
			taken += r.Days
		case models.LeavePending:
			pending += r.Days
		}
	}
	remaining := allowance - taken - pending
	if remaining < 0 {
		remaining = 0
	}
	return &models.LeaveBalance{Type: t, Capped: capped, Year: year, Allowance: allowance, Taken: taken, Pending: pending, Remaining: remaining}, nil
}

// balancesForStaff returns one balance per leave type (keyed by type). Capped
// types (annual, and sick when an allowance is set) show remaining vs allowance;
// the rest are uncapped and report usage (taken/pending) only.
func (s *leaveRequestService) balancesForStaff(ctx context.Context, st *models.Staff) (map[string]models.LeaveBalance, error) {
	out := map[string]models.LeaveBalance{}
	for _, t := range models.LeaveTypes {
		b, err := s.balanceForType(ctx, st, t)
		if err != nil {
			return nil, err
		}
		out[t] = *b
	}
	return out, nil
}

func (s *leaveRequestService) BalancesForUser(ctx context.Context, actorUserID string) (map[string]models.LeaveBalance, error) {
	st := s.staffForUser(ctx, actorUserID)
	if st == nil {
		return map[string]models.LeaveBalance{}, nil
	}
	return s.balancesForStaff(ctx, st)
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
		return nil, errors.New("no staff record is linked to your account - ask an admin to link your login before requesting leave")
	}

	// Reject a request that overlaps the staff member's own existing open leave
	// (pending or approved) - no double-booking the same dates.
	if existing, err := s.repo.FindByStaffID(ctx, st.ID.Hex()); err == nil {
		for _, e := range existing {
			if e.Status != models.LeavePending && e.Status != models.LeaveApproved {
				continue
			}
			if in.StartDate <= e.EndDate && e.StartDate <= in.EndDate {
				return nil, fmt.Errorf("this overlaps existing %s leave (%s → %s) already booked for this person", string(e.Status), e.StartDate, e.EndDate)
			}
		}
	}

	// Capped leave types (annual, and sick when a paid-sick allowance is set)
	// are limited to the remaining allowance; other types are uncapped.
	if allowance, capped := s.allowanceForType(st, t); capped {
		bal, err := s.balanceForType(ctx, st, t)
		if err != nil {
			return nil, err
		}
		if days > bal.Remaining {
			return nil, fmt.Errorf("this request (%d days) exceeds the remaining %s allowance (%d of %d days left)", days, leaveTypeLabel(t), bal.Remaining, allowance)
		}
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
	// Coverage/clash signal: count OTHER staff at the same branch whose
	// approved/pending leave overlaps each request's dates (computed over the
	// full set before filtering so the count is accurate).
	overlaps := func(lr models.LeaveRequest) int {
		n := 0
		for _, o := range all {
			if o.ID == lr.ID || o.StaffID == lr.StaffID || o.BranchSlug != lr.BranchSlug {
				continue
			}
			if o.Status != models.LeavePending && o.Status != models.LeaveApproved {
				continue
			}
			if lr.StartDate <= o.EndDate && o.StartDate <= lr.EndDate { // ranges overlap
				n++
			}
		}
		return n
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
		lr.Overlaps = overlaps(lr)
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

	// Write the booked weekdays onto the attendance register (best-effort - a
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
			Link:       "/admin/profile?tab=leave",
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
			Link:       "/admin/profile?tab=leave",
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
