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

type ChildService interface {
	List(ctx context.Context, f repository.ChildFilter) ([]models.Child, error)
	GetByID(ctx context.Context, id string) (*models.Child, error)
	Create(ctx context.Context, req models.ChildRequest) (*models.Child, error)
	Update(ctx context.Context, id string, req models.ChildRequest) (*models.Child, error)
	Delete(ctx context.Context, id string) error
	Stats(ctx context.Context) (*models.ChildStats, error)
	// EnsureFromEnquiry idempotently creates a child from a registered enquiry.
	EnsureFromEnquiry(ctx context.Context, enquiryID, firstName, lastName, dob, gender, branch string) (*models.Child, error)
}

type childService struct {
	repo     repository.ChildRepository
	rooms    repository.RoomRepository
	counters repository.CounterRepository
}

func NewChildService(repo repository.ChildRepository, rooms repository.RoomRepository, counters repository.CounterRepository) ChildService {
	return &childService{repo: repo, rooms: rooms, counters: counters}
}

func (s *childService) List(ctx context.Context, f repository.ChildFilter) ([]models.Child, error) {
	return s.repo.FindAll(ctx, f)
}
func (s *childService) GetByID(ctx context.Context, id string) (*models.Child, error) {
	return s.repo.FindByID(ctx, id)
}

func applyChild(c *models.Child, req models.ChildRequest) {
	c.FirstName = strings.TrimSpace(req.FirstName)
	c.LastName = strings.TrimSpace(req.LastName)
	c.DOB = strings.TrimSpace(req.DOB)
	c.Gender = strings.TrimSpace(req.Gender)
	c.BranchSlug = strings.TrimSpace(req.BranchSlug)
	c.RoomID = strings.TrimSpace(req.RoomID)
	if req.Status != "" {
		c.Status = req.Status
	}
	c.StartDate = strings.TrimSpace(req.StartDate)
	c.Guardians = req.Guardians
	if req.FundingType != "" {
		c.FundingType = req.FundingType
	}
	c.Sessions = req.Sessions
	c.Allergies = strings.TrimSpace(req.Allergies)
	c.DietaryReqs = strings.TrimSpace(req.DietaryReqs)
	c.MedicalNotes = strings.TrimSpace(req.MedicalNotes)
}

// mintRef allocates the next CHD-YYYY-NNNNNN reference for the current year.
func (s *childService) mintRef(ctx context.Context) (string, error) {
	year := time.Now().Year()
	seq, err := s.counters.Next(ctx, models.CounterChild+"-"+strconv.Itoa(year))
	if err != nil {
		return "", err
	}
	return models.FormatRef(models.RefPrefixChild, year, seq), nil
}

func (s *childService) Create(ctx context.Context, req models.ChildRequest) (*models.Child, error) {
	if strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.LastName) == "" {
		return nil, errors.New("child first and last name are required")
	}
	if strings.TrimSpace(req.BranchSlug) == "" {
		return nil, errors.New("branch is required")
	}
	c := &models.Child{Status: models.ChildActive, FundingType: "none"}
	applyChild(c, req)
	ref, err := s.mintRef(ctx)
	if err != nil {
		return nil, err
	}
	c.Ref = ref
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *childService) Update(ctx context.Context, id string, req models.ChildRequest) (*models.Child, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	applyChild(existing, req)
	return s.repo.Update(ctx, id, *existing)
}

func (s *childService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *childService) EnsureFromEnquiry(ctx context.Context, enquiryID, firstName, lastName, dob, gender, branch string) (*models.Child, error) {
	if existing, err := s.repo.FindByEnquiryID(ctx, enquiryID); err == nil && existing != nil {
		return existing, nil // already linked — idempotent
	}
	req := models.ChildRequest{FirstName: firstName, LastName: lastName, DOB: dob, Gender: gender, BranchSlug: branch, Status: models.ChildActive}
	c := &models.Child{Status: models.ChildActive, FundingType: "none", EnquiryID: enquiryID}
	applyChild(c, req)
	ref, err := s.mintRef(ctx)
	if err != nil {
		return nil, err
	}
	c.Ref = ref
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// ageYears returns whole years from a YYYY-MM-DD dob (0 if unparseable).
func ageYears(dob string) int {
	t, err := time.Parse("2006-01-02", dob)
	if err != nil {
		return 0
	}
	now := time.Now()
	years := now.Year() - t.Year()
	if now.YearDay() < t.YearDay() {
		years--
	}
	if years < 0 {
		years = 0
	}
	return years
}

func (s *childService) Stats(ctx context.Context) (*models.ChildStats, error) {
	children, err := s.repo.FindAll(ctx, repository.ChildFilter{})
	if err != nil {
		return nil, err
	}
	rooms, err := s.rooms.FindAll(ctx, "")
	if err != nil {
		return nil, err
	}

	capByBranch := map[string]int{}
	totalCap := 0
	for _, r := range rooms {
		capByBranch[r.BranchSlug] += r.Capacity
		totalCap += r.Capacity
	}

	stats := &models.ChildStats{Capacity: totalCap}
	childrenByBranch := map[string]int{}
	ageGroups := map[string]int{"Under 2": 0, "2–3 years": 0, "3–5 years": 0}
	for _, c := range children {
		stats.Total++
		switch c.Status {
		case models.ChildActive:
			stats.Active++
			childrenByBranch[c.BranchSlug]++
			switch a := ageYears(c.DOB); {
			case a < 2:
				ageGroups["Under 2"]++
			case a < 3:
				ageGroups["2–3 years"]++
			default:
				ageGroups["3–5 years"]++
			}
		case models.ChildWaitlist:
			stats.Waitlist++
		}
	}
	stats.Available = totalCap - stats.Active
	if stats.Available < 0 {
		stats.Available = 0
	}
	stats.OccupancyRate = percent(stats.Active, totalCap)

	// deterministic ordering
	branches := make([]string, 0, len(capByBranch)+len(childrenByBranch))
	seen := map[string]bool{}
	for b := range capByBranch {
		if !seen[b] {
			branches = append(branches, b)
			seen[b] = true
		}
	}
	for b := range childrenByBranch {
		if !seen[b] {
			branches = append(branches, b)
			seen[b] = true
		}
	}
	sort.Strings(branches)
	for _, b := range branches {
		cap := capByBranch[b]
		ch := childrenByBranch[b]
		rate := percent(ch, cap)
		stats.Branches = append(stats.Branches, models.BranchChildStat{Branch: b, Children: ch, Capacity: cap, OccupancyRate: rate})
		stats.ByBranch = append(stats.ByBranch, models.ChildStatPoint{Label: b, Value: ch})
	}
	for _, g := range []string{"Under 2", "2–3 years", "3–5 years"} {
		stats.ByAgeGroup = append(stats.ByAgeGroup, models.ChildStatPoint{Label: g, Value: ageGroups[g]})
	}
	return stats, nil
}
