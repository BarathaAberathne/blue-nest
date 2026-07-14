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

type StaffAttendanceService interface {
	Register(ctx context.Context, date, branch string) ([]models.StaffAttendanceRecord, error)
	ClockIn(ctx context.Context, req models.StaffClockInRequest, actor string) (*models.StaffAttendanceRecord, error)
	ClockOut(ctx context.Context, req models.StaffClockOutRequest, actor string) (*models.StaffAttendanceRecord, error)
	Mark(ctx context.Context, req models.StaffAttendanceMarkRequest, actor string) (*models.StaffAttendanceRecord, error)
	TodayStats(ctx context.Context, date, branch string) (*models.StaffStats, error)
}

type staffAttendanceService struct {
	repo  repository.StaffAttendanceRepository
	staff repository.StaffRepository
}

func NewStaffAttendanceService(repo repository.StaffAttendanceRepository, staff repository.StaffRepository) StaffAttendanceService {
	return &staffAttendanceService{repo: repo, staff: staff}
}

func (s *staffAttendanceService) activeStaff(ctx context.Context, branch string) ([]models.Staff, error) {
	return s.staff.FindAll(ctx, repository.StaffFilter{Branch: branch, Status: string(models.StaffActive)})
}

func (s *staffAttendanceService) Register(ctx context.Context, date, branch string) ([]models.StaffAttendanceRecord, error) {
	if date == "" {
		date = today()
	}
	people, err := s.activeStaff(ctx, branch)
	if err != nil {
		return nil, err
	}
	records, err := s.repo.FindByDate(ctx, date, branch)
	if err != nil {
		return nil, err
	}
	byStaff := map[string]models.StaffAttendanceRecord{}
	for _, r := range records {
		byStaff[r.StaffID] = r
	}
	out := make([]models.StaffAttendanceRecord, 0, len(people))
	for _, p := range people {
		id := p.ID.Hex()
		if rec, ok := byStaff[id]; ok {
			out = append(out, rec)
			continue
		}
		out = append(out, models.StaffAttendanceRecord{
			StaffID:    id,
			StaffName:  strings.TrimSpace(p.FirstName + " " + p.LastName),
			BranchSlug: p.BranchSlug,
			Date:       date,
			Status:     models.StaffAttExpected,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StaffName < out[j].StaffName })
	return out, nil
}

func (s *staffAttendanceService) baseRecord(ctx context.Context, staffID, date string) (models.StaffAttendanceRecord, error) {
	if strings.TrimSpace(staffID) == "" {
		return models.StaffAttendanceRecord{}, errors.New("staff_id is required")
	}
	if date == "" {
		date = today()
	}
	if existing, err := s.repo.FindByStaffDate(ctx, staffID, date); err == nil && existing != nil {
		return *existing, nil
	}
	st, err := s.staff.FindByID(ctx, staffID)
	if err != nil {
		return models.StaffAttendanceRecord{}, errors.New("staff not found")
	}
	return models.StaffAttendanceRecord{
		StaffID:    staffID,
		StaffName:  strings.TrimSpace(st.FirstName + " " + st.LastName),
		BranchSlug: st.BranchSlug,
		Date:       date,
	}, nil
}

// lateThreshold: clock-in after 09:00 counts as a late arrival.
func isLate(t time.Time) bool {
	return t.Hour() > 9 || (t.Hour() == 9 && t.Minute() > 0)
}

func (s *staffAttendanceService) ClockIn(ctx context.Context, req models.StaffClockInRequest, actor string) (*models.StaffAttendanceRecord, error) {
	rec, err := s.baseRecord(ctx, req.StaffID, req.Date)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	rec.Status = models.StaffAttPresent
	rec.ClockIn = &now
	rec.LateArrival = isLate(now)
	if req.Notes != "" {
		rec.Notes = req.Notes
	}
	return s.repo.Upsert(ctx, rec)
}

func (s *staffAttendanceService) ClockOut(ctx context.Context, req models.StaffClockOutRequest, actor string) (*models.StaffAttendanceRecord, error) {
	rec, err := s.baseRecord(ctx, req.StaffID, req.Date)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	rec.ClockOut = &now
	if rec.Status == models.StaffAttExpected || rec.Status == "" {
		rec.Status = models.StaffAttPresent
	}
	return s.repo.Upsert(ctx, rec)
}

func (s *staffAttendanceService) Mark(ctx context.Context, req models.StaffAttendanceMarkRequest, actor string) (*models.StaffAttendanceRecord, error) {
	if strings.TrimSpace(string(req.Status)) == "" {
		return nil, errors.New("status is required")
	}
	rec, err := s.baseRecord(ctx, req.StaffID, req.Date)
	if err != nil {
		return nil, err
	}
	rec.Status = req.Status
	if req.Notes != "" {
		rec.Notes = req.Notes
	}
	if req.Status != models.StaffAttPresent {
		rec.ClockIn = nil
		rec.ClockOut = nil
		rec.LateArrival = false
	}
	return s.repo.Upsert(ctx, rec)
}

// daysUntil returns whole days from now to a YYYY-MM-DD date (negative if past).
func daysUntil(date string) (int, bool) {
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return 0, false
	}
	return int(time.Until(t).Hours() / 24), true
}

func (s *staffAttendanceService) TodayStats(ctx context.Context, date, branch string) (*models.StaffStats, error) {
	pinned := date != ""
	if date == "" {
		date = today()
	}
	people, err := s.activeStaff(ctx, branch)
	if err != nil {
		return nil, err
	}
	records, err := s.repo.FindByDate(ctx, date, branch)
	if err != nil {
		return nil, err
	}
	// No rota for today yet → fall back to the most recent day with data so the
	// dashboard staff figures stay meaningful instead of collapsing to zero.
	if !pinned && len(records) == 0 {
		if latest, lerr := s.repo.LatestDate(ctx, branch); lerr == nil && latest != "" && latest != date {
			date = latest
			if records, err = s.repo.FindByDate(ctx, date, branch); err != nil {
				return nil, err
			}
		}
	}
	recByStaff := map[string]models.StaffAttendanceRecord{}
	for _, r := range records {
		recByStaff[r.StaffID] = r
	}

	stats := &models.StaffStats{Date: date, Total: len(people)}
	totalByBranch := map[string]int{}
	presentByBranch := map[string]int{}
	branchOrder := make([]string, 0)
	seenBranch := map[string]bool{}

	for _, p := range people {
		totalByBranch[p.BranchSlug]++
		if !seenBranch[p.BranchSlug] {
			seenBranch[p.BranchSlug] = true
			branchOrder = append(branchOrder, p.BranchSlug)
		}
		if d, ok := daysUntil(p.DBSExpiry); ok && d <= 90 {
			stats.DBSExpiring++
		}
		rec, ok := recByStaff[p.ID.Hex()]
		if !ok {
			continue // not yet marked → counts toward neither present nor absent
		}
		switch rec.Status {
		case models.StaffAttPresent:
			stats.Present++
			presentByBranch[p.BranchSlug]++
			if rec.LateArrival {
				stats.LateArrival++
			}
			if p.StaffType == models.StaffAgency {
				stats.Agency++
			}
		case models.StaffAttLeave:
			stats.OnLeave++
		case models.StaffAttTraining:
			stats.Training++
		case models.StaffAttSick:
			stats.Sick++
		case models.StaffAttAbsent:
			stats.Absent++
		}
	}

	stats.AttendanceRate = percent(stats.Present, stats.Total)

	sort.Strings(branchOrder)
	for _, b := range branchOrder {
		stats.Branches = append(stats.Branches, models.BranchStaffStat{Branch: b, Total: totalByBranch[b], Present: presentByBranch[b]})
	}
	return stats, nil
}
