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

// SendSupportService — SEND/additional-support profiles + the branch overview.
// The profile is the source of truth; Child.SendStatus is its operational
// projection (this service is the ONLY writer of both). Room allocation is
// untouched: provision comes from the Room, placement from the canonical
// child_room_assignments, and the overview only joins the three at read time.
type SendSupportService interface {
	// Get returns the child's profile, or (nil, nil) when none is recorded.
	Get(ctx context.Context, childID string) (*models.ChildSendSupport, error)
	// Upsert creates/updates the profile and syncs Child.SendStatus.
	// prevStatus is returned for the caller's audit record.
	Upsert(ctx context.Context, childID string, req models.SendSupportRequest) (p *models.ChildSendSupport, prevStatus models.SendStatus, err error)
	// Overview derives the branch SEND view + KPIs (branch "" = all branches
	// the policy layer already scoped the caller to).
	Overview(ctx context.Context, branch string) (*models.SendOverview, error)
}

type sendSupportService struct {
	repo       repository.SendSupportRepository
	children   repository.ChildRepository
	staff      repository.StaffRepository
	rooms      repository.RoomRepository
	placements repository.ChildRoomAssignmentRepository
}

func NewSendSupportService(repo repository.SendSupportRepository, children repository.ChildRepository, staff repository.StaffRepository, rooms repository.RoomRepository, placements repository.ChildRoomAssignmentRepository) SendSupportService {
	return &sendSupportService{repo: repo, children: children, staff: staff, rooms: rooms, placements: placements}
}

func (s *sendSupportService) staffName(ctx context.Context, id string) string {
	if id == "" {
		return ""
	}
	if st, err := s.staff.FindByID(ctx, id); err == nil && st != nil {
		return strings.TrimSpace(st.FirstName + " " + st.LastName)
	}
	return ""
}

func (s *sendSupportService) Get(ctx context.Context, childID string) (*models.ChildSendSupport, error) {
	if _, err := s.children.FindByID(ctx, childID); err != nil {
		return nil, errors.New("child not found")
	}
	p, err := s.repo.FindByChild(ctx, childID)
	if err != nil {
		return nil, nil // no profile recorded — a valid state, not an error
	}
	p.SendLeadName = s.staffName(ctx, p.SendLeadStaffID)
	return p, nil
}

func (s *sendSupportService) Upsert(ctx context.Context, childID string, req models.SendSupportRequest) (*models.ChildSendSupport, models.SendStatus, error) {
	child, err := s.children.FindByID(ctx, childID)
	if err != nil {
		return nil, "", errors.New("child not found")
	}
	if !models.ValidSendStatus(req.Status) {
		return nil, "", errors.New("invalid SEND status")
	}
	if req.Status == models.SendNone {
		return nil, "", errors.New("choose a SEND status — a child with no additional-support information simply has no profile")
	}
	if !models.ValidSendPlanStatus(req.PlanStatus) {
		return nil, "", errors.New("invalid support-plan status")
	}
	for _, d := range []string{req.ReviewDate, req.StartDate, req.EndDate} {
		if d != "" {
			if _, err := time.Parse("2006-01-02", d); err != nil {
				return nil, "", errors.New("dates must be YYYY-MM-DD")
			}
		}
	}
	if req.SendLeadStaffID != "" {
		if _, err := s.staff.FindByID(ctx, req.SendLeadStaffID); err != nil {
			return nil, "", errors.New("SEND lead staff member not found")
		}
	}
	prev := child.SendStatus

	// Dedupe categories, preserving order (the UI feeds them from the
	// org-configurable send_category taxonomy list).
	cats := make([]string, 0, len(req.Categories))
	for _, c := range req.Categories {
		if c = strings.TrimSpace(c); c != "" && !contains(cats, c) {
			cats = append(cats, c)
		}
	}

	p := &models.ChildSendSupport{
		ChildID:         childID,
		Status:          req.Status,
		Summary:         strings.TrimSpace(req.Summary),
		Categories:      cats,
		SendLeadStaffID: strings.TrimSpace(req.SendLeadStaffID),
		PlanStatus:      req.PlanStatus,
		ReviewDate:      req.ReviewDate,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
	}
	out, err := s.repo.Upsert(ctx, p)
	if err != nil {
		return nil, "", err
	}
	// Project the operational marker onto the canonical child (single writer).
	if child.SendStatus != out.Status {
		if _, err := s.children.SetSendStatus(ctx, childID, out.Status); err != nil {
			return nil, "", fmt.Errorf("profile saved but child status projection failed: %w", err)
		}
	}
	out.SendLeadName = s.staffName(ctx, out.SendLeadStaffID)
	return out, prev, nil
}

func (s *sendSupportService) Overview(ctx context.Context, branch string) (*models.SendOverview, error) {
	kids, err := s.children.FindAll(ctx, repository.ChildFilter{Branch: branch})
	if err != nil {
		return nil, err
	}
	// SEND children = active statuses on the canonical child record.
	sendKids := make([]models.Child, 0)
	ids := make([]string, 0)
	for _, k := range kids {
		if k.Status != models.ChildLeft && models.SendStatusActive(k.SendStatus) {
			sendKids = append(sendKids, k)
			ids = append(ids, k.ID.Hex())
		}
	}
	profiles, _ := s.repo.FindByChildren(ctx, ids)
	profileBy := map[string]*models.ChildSendSupport{}
	for i := range profiles {
		profileBy[profiles[i].ChildID] = &profiles[i]
	}

	// Rooms + current placements (branch "" = all).
	rooms, _ := s.rooms.FindAll(ctx, branch)
	roomBy := map[string]*models.Room{}
	dedicated := 0
	for i := range rooms {
		roomBy[rooms[i].ID.Hex()] = &rooms[i]
		if rooms[i].Provision == models.ProvisionSendDedicated && rooms[i].Status != models.RoomInactive {
			dedicated++
		}
	}
	currentRoom := CurrentChildRooms(ctx, s.placements, branch)

	ov := &models.SendOverview{Rows: make([]models.SendOverviewRow, 0, len(sendKids))}
	ov.TotalSend = len(sendKids)
	ov.DedicatedRooms = dedicated
	staffNames := map[string]string{}
	name := func(id string) string {
		if id == "" {
			return ""
		}
		if n, ok := staffNames[id]; ok {
			return n
		}
		n := s.staffName(ctx, id)
		staffNames[id] = n
		return n
	}
	today := time.Now().Format("2006-01-02")
	for _, k := range sendKids {
		id := k.ID.Hex()
		row := models.SendOverviewRow{
			ChildID:    id,
			ChildName:  strings.TrimSpace(k.FirstName + " " + k.LastName),
			BranchSlug: k.BranchSlug,
			Status:     k.SendStatus,
			KeyPerson:  name(k.KeyPersonID),
		}
		if m := ageInMonths(k.DOB, today); m >= 0 {
			row.AgeLabel = fmt.Sprintf("%dy %dm", m/12, m%12)
		}
		switch k.SendStatus {
		case models.SendMonitoring:
			ov.Monitoring++
		case models.SendSupport:
			ov.SenSupport++
		case models.SendEHCP:
			ov.EHCP++
		}
		if p := profileBy[id]; p != nil {
			row.PlanStatus = string(p.PlanStatus)
			row.SendLead = name(p.SendLeadStaffID)
			row.ReviewDate = p.ReviewDate
			if p.PlanStatus == models.SendPlanActive {
				ov.ActivePlans++
			}
		}
		if roomID := currentRoom[id]; roomID != "" {
			row.RoomID = roomID
			if r := roomBy[roomID]; r != nil {
				row.RoomName = r.Name
				if r.Provision == models.ProvisionSendDedicated {
					row.Provision = "send_dedicated"
					ov.InSpecialist++
				} else {
					row.Provision = "mainstream"
					ov.InMainstream++
				}
			} else {
				// Placement exists but the room is outside the branch filter
				// (cannot happen for same-branch placements) — count mainstream.
				row.Provision = "mainstream"
				ov.InMainstream++
			}
		} else {
			row.Provision = "unallocated"
			ov.Unallocated++
		}
		ov.Rows = append(ov.Rows, row)
	}
	return ov, nil
}
