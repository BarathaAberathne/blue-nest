package service

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type AttendanceService interface {
	// Register returns one row per active child for the date, synthesising an
	// "expected" record for children not yet marked.
	Register(ctx context.Context, date, branch string) ([]models.AttendanceRecord, error)
	// CheckIn/CheckOut/Mark take allowed (the caller's branch scope, nil = org-wide)
	// so a branch-scoped manager can't touch another branch's child via a bare
	// child_id — the child's branch is only known after baseRecord resolves it.
	CheckIn(ctx context.Context, req models.CheckInRequest, actor string, allowed []string) (*models.AttendanceRecord, error)
	CheckOut(ctx context.Context, req models.CheckOutRequest, actor string, allowed []string) (*models.AttendanceRecord, error)
	Mark(ctx context.Context, req models.AttendanceMarkRequest, actor string, allowed []string) (*models.AttendanceRecord, error)
	TodayStats(ctx context.Context, date, branch string) (*models.AttendanceStats, error)
}

type attendanceService struct {
	repo     repository.AttendanceRepository
	children repository.ChildRepository
}

func NewAttendanceService(repo repository.AttendanceRepository, children repository.ChildRepository) AttendanceService {
	return &attendanceService{repo: repo, children: children}
}

func today() string { return time.Now().Format("2006-01-02") }

func (s *attendanceService) activeChildren(ctx context.Context, branch string) ([]models.Child, error) {
	return s.children.FindAll(ctx, repository.ChildFilter{Branch: branch, Status: string(models.ChildActive)})
}

func (s *attendanceService) Register(ctx context.Context, date, branch string) ([]models.AttendanceRecord, error) {
	if date == "" {
		date = today()
	}
	kids, err := s.activeChildren(ctx, branch)
	if err != nil {
		return nil, err
	}
	records, err := s.repo.FindByDate(ctx, date, branch)
	if err != nil {
		return nil, err
	}
	byChild := map[string]models.AttendanceRecord{}
	for _, r := range records {
		byChild[r.ChildID] = r
	}
	out := make([]models.AttendanceRecord, 0, len(kids))
	for _, c := range kids {
		id := c.ID.Hex()
		if rec, ok := byChild[id]; ok {
			out = append(out, rec)
			continue
		}
		out = append(out, models.AttendanceRecord{
			ChildID:    id,
			ChildName:  strings.TrimSpace(c.FirstName + " " + c.LastName),
			BranchSlug: c.BranchSlug,
			RoomID:     c.RoomID,
			Date:       date,
			Status:     models.AttExpected,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ChildName < out[j].ChildName })
	return out, nil
}

// baseRecord resolves a child and builds the record skeleton for a mutation,
// reusing any existing record for the date so we don't clobber prior fields.
func (s *attendanceService) baseRecord(ctx context.Context, childID, date string) (models.AttendanceRecord, error) {
	if strings.TrimSpace(childID) == "" {
		return models.AttendanceRecord{}, errors.New("child_id is required")
	}
	if date == "" {
		date = today()
	}
	if existing, err := s.repo.FindByChildDate(ctx, childID, date); err == nil && existing != nil {
		return *existing, nil
	}
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return models.AttendanceRecord{}, errors.New("child not found")
	}
	return models.AttendanceRecord{
		ChildID:    childID,
		ChildName:  strings.TrimSpace(child.FirstName + " " + child.LastName),
		BranchSlug: child.BranchSlug,
		RoomID:     child.RoomID,
		Date:       date,
	}, nil
}

func (s *attendanceService) CheckIn(ctx context.Context, req models.CheckInRequest, actor string, allowed []string) (*models.AttendanceRecord, error) {
	rec, err := s.baseRecord(ctx, req.ChildID, req.Date)
	if err != nil {
		return nil, err
	}
	if !branchAllowed(allowed, rec.BranchSlug) {
		return nil, errOutsideScope
	}
	now := time.Now()
	rec.Status = models.AttPresent
	rec.CheckIn = &now
	rec.CheckedInBy = actor
	if req.Notes != "" {
		rec.Notes = req.Notes
	}
	return s.repo.Upsert(ctx, rec)
}

func (s *attendanceService) CheckOut(ctx context.Context, req models.CheckOutRequest, actor string, allowed []string) (*models.AttendanceRecord, error) {
	rec, err := s.baseRecord(ctx, req.ChildID, req.Date)
	if err != nil {
		return nil, err
	}
	if !branchAllowed(allowed, rec.BranchSlug) {
		return nil, errOutsideScope
	}
	now := time.Now()
	rec.CheckOut = &now
	rec.CheckedOutBy = actor
	rec.LatePickup = req.LatePickup
	if rec.Status == models.AttExpected || rec.Status == "" {
		rec.Status = models.AttPresent
	}
	return s.repo.Upsert(ctx, rec)
}

func (s *attendanceService) Mark(ctx context.Context, req models.AttendanceMarkRequest, actor string, allowed []string) (*models.AttendanceRecord, error) {
	if strings.TrimSpace(string(req.Status)) == "" {
		return nil, errors.New("status is required")
	}
	rec, err := s.baseRecord(ctx, req.ChildID, req.Date)
	if err != nil {
		return nil, err
	}
	if !branchAllowed(allowed, rec.BranchSlug) {
		return nil, errOutsideScope
	}
	rec.Status = req.Status
	if req.Notes != "" {
		rec.Notes = req.Notes
	}
	// marking absent/holiday/sick clears any stray check-in
	if req.Status != models.AttPresent {
		rec.CheckIn = nil
		rec.CheckOut = nil
	}
	rec.CheckedInBy = actor
	return s.repo.Upsert(ctx, rec)
}

func (s *attendanceService) TodayStats(ctx context.Context, date, branch string) (*models.AttendanceStats, error) {
	// pinned tells us the caller asked for a specific day (register browsing);
	// otherwise we want "today, or the latest day that actually has a register".
	pinned := date != ""
	if date == "" {
		date = today()
	}
	kids, err := s.activeChildren(ctx, branch)
	if err != nil {
		return nil, err
	}
	records, err := s.repo.FindByDate(ctx, date, branch)
	if err != nil {
		return nil, err
	}
	// No register for today yet → fall back to the most recent day with data so
	// the dashboard KPI stays meaningful instead of collapsing to 0%.
	if !pinned && len(records) == 0 {
		if latest, lerr := s.repo.LatestDate(ctx, branch); lerr == nil && latest != "" && latest != date {
			date = latest
			if records, err = s.repo.FindByDate(ctx, date, branch); err != nil {
				return nil, err
			}
		}
	}

	stats := &models.AttendanceStats{Date: date}
	expectedByBranch := map[string]int{}
	branchOrder := make([]string, 0)
	seenBranch := map[string]bool{}
	for _, c := range kids {
		expectedByBranch[c.BranchSlug]++
		if !seenBranch[c.BranchSlug] {
			seenBranch[c.BranchSlug] = true
			branchOrder = append(branchOrder, c.BranchSlug)
		}
	}
	stats.Expected = len(kids)

	// Only count attendance for currently-active children (numerator ⊆ denominator)
	// and de-dupe per child, so stray/orphaned records can never push the rate
	// past 100%. Records for children not in the active roster are ignored.
	activeIDs := make(map[string]bool, len(kids))
	for _, c := range kids {
		activeIDs[c.ID.Hex()] = true
	}
	presentByBranch := map[string]int{}
	counted := map[string]bool{} // child ids already counted present
	for _, r := range records {
		if !activeIDs[r.ChildID] {
			continue
		}
		switch r.Status {
		case models.AttPresent:
			if !counted[r.ChildID] {
				counted[r.ChildID] = true
				stats.Present++
				presentByBranch[r.BranchSlug]++
			}
			if r.CheckIn != nil && r.CheckOut == nil {
				stats.CheckedIn++
			}
		case models.AttAbsent, models.AttSick, models.AttHoliday:
			stats.Absent++
		}
		if r.LatePickup {
			stats.LatePickups++
		}
	}
	stats.AttendanceRate = clamp100(percent(stats.Present, stats.Expected))

	sort.Strings(branchOrder)
	for _, b := range branchOrder {
		exp := expectedByBranch[b]
		pres := presentByBranch[b]
		stats.Branches = append(stats.Branches, models.BranchAttendanceStat{Branch: b, Present: pres, Expected: exp, AttendanceRate: clamp100(percent(pres, exp))})
	}
	return stats, nil
}
