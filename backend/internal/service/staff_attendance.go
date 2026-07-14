package service

import (
	"context"
	"errors"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// ClockContext carries where/how a clock action came from — the kiosk fills in
// device/ip/location; the admin path fills in ActorID. It keeps the attendance
// record's capture provenance without changing the clock request shapes.
type ClockContext struct {
	Source   models.AttendanceSource
	DeviceID string
	IP       string
	Location string
	ActorID  string
	// Allowed restricts which branches the actor may write to (nil = org-wide, no
	// restriction). Set from the caller's branch scope so a branch manager can't
	// clock/correct another branch's staff.
	Allowed []string
}

// branchAllowed reports whether a branch is within an allowed set (nil = any).
func branchAllowed(allowed []string, branch string) bool {
	if allowed == nil {
		return true
	}
	for _, s := range allowed {
		if s == branch {
			return true
		}
	}
	return false
}

var errOutsideScope = errors.New("outside your branch scope")

func (c ClockContext) source() models.AttendanceSource {
	if c.Source == "" {
		return models.AttSourceManual
	}
	return c.Source
}

type StaffAttendanceService interface {
	Register(ctx context.Context, date, branch string) ([]models.StaffAttendanceRecord, error)
	ClockIn(ctx context.Context, req models.StaffClockInRequest, cc ClockContext) (*models.StaffAttendanceRecord, error)
	ClockOut(ctx context.Context, req models.StaffClockOutRequest, cc ClockContext) (*models.StaffAttendanceRecord, error)
	Mark(ctx context.Context, req models.StaffAttendanceMarkRequest, actor string, allowed []string) (*models.StaffAttendanceRecord, error)
	TodayStats(ctx context.Context, date, branch string) (*models.StaffStats, error)
	// DaySummary is the attendance-dashboard KPI payload for a date + branch
	// (company-wide with a per-branch breakdown when branch is empty).
	DaySummary(ctx context.Context, date, branch string) (*models.AttendanceDaySummary, error)
	// Correct applies a manager's manual edit, appending an audit correction and
	// recomputing the derived minutes.
	Correct(ctx context.Context, id string, req models.AttendanceCorrectionRequest, actorID, actorName string, allowed []string) (*models.StaffAttendanceRecord, error)
}

type staffAttendanceService struct {
	repo   repository.StaffAttendanceRepository
	staff  repository.StaffRepository
	shifts repository.ShiftRepository // optional; enables shift-based late/overtime
	rooms  repository.RoomRepository  // optional; resolves room names for the register
}

func NewStaffAttendanceService(repo repository.StaffAttendanceRepository, staff repository.StaffRepository, shifts repository.ShiftRepository, rooms repository.RoomRepository) StaffAttendanceService {
	return &staffAttendanceService{repo: repo, staff: staff, shifts: shifts, rooms: rooms}
}

// roomNames builds an id→name map for a branch (or all branches when empty),
// best-effort — an unavailable rooms repo just yields empty names.
func (s *staffAttendanceService) roomNames(ctx context.Context, branch string) map[string]string {
	out := map[string]string{}
	if s.rooms == nil {
		return out
	}
	rooms, err := s.rooms.FindAll(ctx, branch)
	if err != nil {
		return out
	}
	for _, rm := range rooms {
		out[rm.ID.Hex()] = rm.Name
	}
	return out
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
	roomName := s.roomNames(ctx, branch)
	out := make([]models.StaffAttendanceRecord, 0, len(people))
	for _, p := range people {
		id := p.ID.Hex()
		rec, ok := byStaff[id]
		if !ok {
			rec = models.StaffAttendanceRecord{
				StaffID:    id,
				StaffName:  strings.TrimSpace(p.FirstName + " " + p.LastName),
				BranchSlug: p.BranchSlug,
				Date:       date,
				Status:     models.StaffAttExpected,
			}
		}
		rec.JobTitle = p.JobTitle
		rec.RoomName = roomName[p.RoomID]
		out = append(out, rec)
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

// lateThreshold: clock-in after 09:00 counts as a late arrival. Until shifts
// exist (Phase B) this fixed threshold also drives late_minutes.
const lateHour, lateMinute = 9, 0

func isLate(t time.Time) bool {
	return t.Hour() > lateHour || (t.Hour() == lateHour && t.Minute() > lateMinute)
}

// lateMinutes returns minutes past the 09:00 threshold (0 if on time).
func lateMinutes(t time.Time) int {
	if !isLate(t) {
		return 0
	}
	threshold := time.Date(t.Year(), t.Month(), t.Day(), lateHour, lateMinute, 0, 0, t.Location())
	return int(t.Sub(threshold).Minutes())
}

// shiftFor returns the staff member's shift for the date, or nil (no shift repo
// wired, unrostered, or lookup error → nil, so callers fall back to the fixed
// threshold).
func (s *staffAttendanceService) shiftFor(ctx context.Context, staffID, date string) *models.Shift {
	if s.shifts == nil {
		return nil
	}
	sh, err := s.shifts.FindByStaffDate(ctx, staffID, date)
	if err != nil {
		return nil
	}
	return sh
}

// minsFromShiftTime returns (clock − HH:MM) in signed minutes on clock's date.
func minsFromShiftTime(clock time.Time, hhmm string) (int, bool) {
	parts := strings.Split(hhmm, ":")
	if len(parts) != 2 {
		return 0, false
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return 0, false
	}
	ref := time.Date(clock.Year(), clock.Month(), clock.Day(), h, m, 0, 0, clock.Location())
	return int(clock.Sub(ref).Minutes()), true
}

// breakMinutes sums completed breaks (both ends set).
func breakMinutes(breaks []models.BreakEntry) int {
	total := 0
	for _, b := range breaks {
		if b.Start != nil && b.End != nil && b.End.After(*b.Start) {
			total += int(b.End.Sub(*b.Start).Minutes())
		}
	}
	return total
}

// applyCapture stamps the capture context onto a record.
func applyCapture(rec *models.StaffAttendanceRecord, cc ClockContext) {
	rec.Source = cc.source()
	if cc.DeviceID != "" {
		rec.DeviceID = cc.DeviceID
	}
	if cc.IP != "" {
		rec.IP = cc.IP
	}
	if cc.Location != "" {
		rec.Location = cc.Location
	}
	if cc.ActorID != "" {
		rec.CreatedBy = cc.ActorID
	}
}

func (s *staffAttendanceService) ClockIn(ctx context.Context, req models.StaffClockInRequest, cc ClockContext) (*models.StaffAttendanceRecord, error) {
	rec, err := s.baseRecord(ctx, req.StaffID, req.Date)
	if err != nil {
		return nil, err
	}
	if !branchAllowed(cc.Allowed, rec.BranchSlug) {
		return nil, errOutsideScope
	}
	if rec.ClockIn != nil && rec.ClockOut == nil {
		return nil, errors.New("already clocked in")
	}
	now := time.Now()
	rec.Status = models.StaffAttPresent
	rec.ClockIn = &now
	rec.ClockOut = nil
	rec.MissingClockOut = false
	// Late is measured against the rostered shift start when one exists, else
	// against the fixed 09:00 threshold.
	if sh := s.shiftFor(ctx, rec.StaffID, rec.Date); sh != nil {
		rec.ShiftID = sh.ID.Hex()
		if diff, ok := minsFromShiftTime(now, sh.StartTime); ok && diff > 0 {
			rec.LateArrival, rec.LateMinutes = true, diff
		} else {
			rec.LateArrival, rec.LateMinutes = false, 0
		}
	} else {
		rec.LateArrival = isLate(now)
		rec.LateMinutes = lateMinutes(now)
	}
	if req.Notes != "" {
		rec.Notes = req.Notes
	}
	applyCapture(&rec, cc)
	return s.repo.Upsert(ctx, rec)
}

func (s *staffAttendanceService) ClockOut(ctx context.Context, req models.StaffClockOutRequest, cc ClockContext) (*models.StaffAttendanceRecord, error) {
	rec, err := s.baseRecord(ctx, req.StaffID, req.Date)
	if err != nil {
		return nil, err
	}
	if !branchAllowed(cc.Allowed, rec.BranchSlug) {
		return nil, errOutsideScope
	}
	if rec.ClockIn == nil {
		return nil, errors.New("not clocked in yet")
	}
	if rec.ClockOut != nil {
		return nil, errors.New("already clocked out")
	}
	now := time.Now()
	rec.ClockOut = &now
	if rec.Status == models.StaffAttExpected || rec.Status == "" {
		rec.Status = models.StaffAttPresent
	}
	// Worked = clock_out − clock_in − completed breaks (the payroll base).
	rec.BreakMinutes = breakMinutes(rec.Breaks)
	worked := int(now.Sub(*rec.ClockIn).Minutes()) - rec.BreakMinutes
	if worked < 0 {
		worked = 0
	}
	rec.WorkedMinutes = worked
	rec.MissingClockOut = false
	// Overtime / early departure measured against the rostered shift end.
	rec.OvertimeMinutes, rec.EarlyDepartureMinutes = 0, 0
	if sh := s.shiftFor(ctx, rec.StaffID, rec.Date); sh != nil {
		rec.ShiftID = sh.ID.Hex()
		if diff, ok := minsFromShiftTime(now, sh.EndTime); ok {
			if diff > 0 {
				rec.OvertimeMinutes = diff
			} else if diff < 0 {
				rec.EarlyDepartureMinutes = -diff
			}
		}
	}
	applyCapture(&rec, cc)
	return s.repo.Upsert(ctx, rec)
}

func (s *staffAttendanceService) Mark(ctx context.Context, req models.StaffAttendanceMarkRequest, actor string, allowed []string) (*models.StaffAttendanceRecord, error) {
	if strings.TrimSpace(string(req.Status)) == "" {
		return nil, errors.New("status is required")
	}
	rec, err := s.baseRecord(ctx, req.StaffID, req.Date)
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

// ── attendance dashboard + manual corrections (Phase C) ─────────────────────

func minutesOfDayLocal(t *time.Time) int {
	lt := t.In(time.Local)
	return lt.Hour()*60 + lt.Minute()
}

// summarize reduces one branch's register rows to the KPI summary.
func summarize(date string, rows []models.StaffAttendanceRecord) models.AttendanceDaySummary {
	isPast := date < today()
	s := models.AttendanceDaySummary{Date: date, Total: len(rows)}
	arrivals := make([]int, 0, len(rows))
	for _, r := range rows {
		hasIn, hasOut := r.ClockIn != nil, r.ClockOut != nil
		if hasIn && !hasOut {
			if isPast {
				s.MissingClockOut++
			} else {
				s.CurrentlyIn++
			}
		}
		if hasOut {
			s.ClockedOut++
		}
		switch r.Status {
		case models.StaffAttLeave, models.StaffAttSick, models.StaffAttTraining, models.StaffAttMeeting, models.StaffAttRemote:
			s.OnLeave++
		}
		if r.LateArrival {
			s.Late++
		}
		s.OvertimeMinutes += r.OvertimeMinutes
		if hasIn {
			arrivals = append(arrivals, minutesOfDayLocal(r.ClockIn))
		}
	}
	attended := s.CurrentlyIn + s.ClockedOut + s.MissingClockOut
	if s.Absent = s.Total - attended - s.OnLeave; s.Absent < 0 {
		s.Absent = 0
	}
	s.AttendanceRate = percent(attended, s.Total)
	if len(arrivals) > 0 {
		total := 0
		for _, m := range arrivals {
			total += m
		}
		avg := total / len(arrivals)
		s.AvgArrival = fmtHM(avg)
	}
	return s
}

func fmtHM(mins int) string {
	h, m := mins/60, mins%60
	return strconv.Itoa(h/10) + strconv.Itoa(h%10) + ":" + strconv.Itoa(m/10) + strconv.Itoa(m%10)
}

func (s *staffAttendanceService) DaySummary(ctx context.Context, date, branch string) (*models.AttendanceDaySummary, error) {
	if date == "" {
		date = today()
	}
	rows, err := s.Register(ctx, date, branch)
	if err != nil {
		return nil, err
	}
	sum := summarize(date, rows)
	// Company-wide view → per-branch breakdown.
	if branch == "" {
		byBranch := map[string][]models.StaffAttendanceRecord{}
		order := []string{}
		for _, r := range rows {
			if _, ok := byBranch[r.BranchSlug]; !ok {
				order = append(order, r.BranchSlug)
			}
			byBranch[r.BranchSlug] = append(byBranch[r.BranchSlug], r)
		}
		for _, b := range order {
			bs := summarize(date, byBranch[b])
			sum.Branches = append(sum.Branches, models.StaffBranchAttendanceStat{
				Branch: b, Total: bs.Total, CurrentlyIn: bs.CurrentlyIn,
				Attended: bs.CurrentlyIn + bs.ClockedOut + bs.MissingClockOut, Late: bs.Late, Rate: bs.AttendanceRate,
			})
		}
	}
	return &sum, nil
}

func parseClockOnDate(date, hhmm string) (*time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02 15:04", date+" "+hhmm, time.Local)
	if err != nil {
		return nil, errors.New("time must be HH:MM")
	}
	return &t, nil
}

// recompute re-derives late/overtime/early/worked/missing from the current
// clock times + the rostered shift. Used after a manual correction.
func (s *staffAttendanceService) recompute(ctx context.Context, rec *models.StaffAttendanceRecord) {
	rec.LateArrival, rec.LateMinutes = false, 0
	rec.OvertimeMinutes, rec.EarlyDepartureMinutes, rec.WorkedMinutes, rec.BreakMinutes = 0, 0, 0, 0
	rec.MissingClockOut = false
	sh := s.shiftFor(ctx, rec.StaffID, rec.Date)
	if sh != nil {
		rec.ShiftID = sh.ID.Hex()
	}
	if rec.ClockIn != nil {
		if sh != nil {
			if d, ok := minsFromShiftTime(*rec.ClockIn, sh.StartTime); ok && d > 0 {
				rec.LateArrival, rec.LateMinutes = true, d
			}
		} else {
			rec.LateArrival = isLate(*rec.ClockIn)
			rec.LateMinutes = lateMinutes(*rec.ClockIn)
		}
	}
	if rec.ClockIn != nil && rec.ClockOut != nil {
		rec.BreakMinutes = breakMinutes(rec.Breaks)
		if worked := int(rec.ClockOut.Sub(*rec.ClockIn).Minutes()) - rec.BreakMinutes; worked > 0 {
			rec.WorkedMinutes = worked
		}
		if sh != nil {
			if d, ok := minsFromShiftTime(*rec.ClockOut, sh.EndTime); ok {
				if d > 0 {
					rec.OvertimeMinutes = d
				} else if d < 0 {
					rec.EarlyDepartureMinutes = -d
				}
			}
		}
	} else if rec.ClockIn != nil && rec.Date < today() {
		rec.MissingClockOut = true
	}
}

func (s *staffAttendanceService) Correct(ctx context.Context, id string, req models.AttendanceCorrectionRequest, actorID, actorName string, allowed []string) (*models.StaffAttendanceRecord, error) {
	rec, err := s.repo.FindByID(ctx, id)
	if err != nil {
		// No persisted record for this id — manual backfill for an "expected"
		// staff member the kiosk never captured. Materialise a baseline from
		// staff_id + date so the correction can create the day's record.
		if strings.TrimSpace(req.StaffID) == "" {
			return nil, err
		}
		base, berr := s.baseRecord(ctx, req.StaffID, req.Date)
		if berr != nil {
			return nil, berr
		}
		rec = &base
	}
	if !branchAllowed(allowed, rec.BranchSlug) {
		return nil, errOutsideScope
	}
	corr := func(field, from, to string) {
		rec.Corrections = append(rec.Corrections, models.AttendanceCorrection{
			At: time.Now(), ActorID: actorID, ActorName: actorName, Field: field, From: from, To: to, Reason: req.Reason,
		})
	}
	if req.Status != nil && *req.Status != string(rec.Status) {
		corr("status", string(rec.Status), *req.Status)
		rec.Status = models.StaffAttendanceStatus(*req.Status)
	}
	if req.ClockIn != nil {
		v := strings.TrimSpace(*req.ClockIn)
		old := ""
		if rec.ClockIn != nil {
			old = rec.ClockIn.In(time.Local).Format("15:04")
		}
		if v == "" {
			rec.ClockIn = nil
		} else {
			t, err := parseClockOnDate(rec.Date, v)
			if err != nil {
				return nil, err
			}
			rec.ClockIn = t
		}
		corr("clock_in", old, v)
	}
	if req.ClockOut != nil {
		v := strings.TrimSpace(*req.ClockOut)
		old := ""
		if rec.ClockOut != nil {
			old = rec.ClockOut.In(time.Local).Format("15:04")
		}
		if v == "" {
			rec.ClockOut = nil
		} else {
			t, err := parseClockOnDate(rec.Date, v)
			if err != nil {
				return nil, err
			}
			rec.ClockOut = t
		}
		corr("clock_out", old, v)
	}
	if req.Notes != nil && *req.Notes != rec.Notes {
		corr("notes", rec.Notes, *req.Notes)
		rec.Notes = *req.Notes
	}
	// A freshly-created baseline (manual backfill) has no status — derive one so
	// it doesn't persist blank: clocked-in ⇒ present, otherwise expected.
	if rec.Status == "" {
		if rec.ClockIn != nil {
			rec.Status = models.StaffAttPresent
		} else {
			rec.Status = models.StaffAttExpected
		}
	}
	if rec.Source == "" {
		rec.Source = models.AttSourceManual
	}
	s.recompute(ctx, rec)
	return s.repo.Upsert(ctx, *rec)
}
