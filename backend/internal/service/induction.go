package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// InductionService manages the per-child induction form (save/resume by
// section, submit, manager review) and the append-only consent records.
// Sections with a canonical home write through: allergies_dietary updates the
// Child record's allergy/dietary/medical fields, child_details updates the
// child's address — the induction never keeps a divergent copy.
type InductionService interface {
	// Get lazily creates the empty induction on first read.
	Get(ctx context.Context, childID string) (*models.ChildInduction, error)
	SaveSection(ctx context.Context, childID, sectionKey string, req models.SectionSaveRequest, actorUserID string) (*models.ChildInduction, error)
	// Submit hands the induction to the nursery for review (all required
	// sections must be complete).
	Submit(ctx context.Context, childID, actorUserID string) (*models.ChildInduction, error)
	// Review is the manager sign-off — four-eyes: the reviewer must differ
	// from the submitter.
	Review(ctx context.Context, childID, actorUserID, note string) (*models.ChildInduction, error)

	Consents(ctx context.Context, childID string) ([]models.Consent, error)
	// RecordConsent appends a decision (never edits) — the latest row per key
	// is the current position.
	RecordConsent(ctx context.Context, childID string, req models.ConsentRequest, parentID, userID string) (*models.Consent, error)
}

type inductionService struct {
	repo     repository.InductionRepository
	consents repository.ConsentRepository
	children repository.ChildRepository
	users    repository.UserRepository
	notifs   NotificationService
}

func NewInductionService(repo repository.InductionRepository, consents repository.ConsentRepository, children repository.ChildRepository, users repository.UserRepository, notifs NotificationService) InductionService {
	return &inductionService{repo: repo, consents: consents, children: children, users: users, notifs: notifs}
}

// reviewersFor returns users holding children.manage scoped to the child's
// branch — the audience for the four-eyes induction review.
func (s *inductionService) reviewersFor(ctx context.Context, branch string) []string {
	return usersWithPermission(ctx, s.users, models.PermChildrenManage, branch)
}

func (s *inductionService) Get(ctx context.Context, childID string) (*models.ChildInduction, error) {
	if _, err := s.children.FindByID(ctx, childID); err != nil {
		return nil, errors.New("child not found")
	}
	ind, err := s.repo.FindByChild(ctx, childID)
	if err == nil {
		return ind, nil
	}
	return &models.ChildInduction{ChildID: childID, Status: models.InductionNotStarted, Sections: map[string]models.InductionSection{}}, nil
}

func (s *inductionService) SaveSection(ctx context.Context, childID, sectionKey string, req models.SectionSaveRequest, actorUserID string) (*models.ChildInduction, error) {
	def := models.InductionSectionByKey(sectionKey)
	if def == nil {
		return nil, errors.New("unknown induction section")
	}
	ind, err := s.Get(ctx, childID)
	if err != nil {
		return nil, err
	}
	if ind.Status == models.InductionReviewed {
		return nil, errors.New("this induction has been signed off — ask the nursery to reopen it")
	}
	// Backstop for the wizard's field-level validation: a section can only be
	// COMPLETE when it actually contains at least one answered value — clicking
	// Next on an untouched section (or any client sending complete=true with
	// empty data) must never mark it done. The field catalogue lives client-side
	// (lib/induction.ts), so this is deliberately schema-agnostic.
	if req.Complete && !hasAnsweredValue(req.Data) {
		return nil, errors.New("fill in the section before it can be marked complete")
	}
	if ind.Sections == nil {
		ind.Sections = map[string]models.InductionSection{}
	}
	ind.Sections[sectionKey] = models.InductionSection{
		Data: req.Data, Complete: req.Complete, UpdatedAt: time.Now(), UpdatedBy: actorUserID,
	}
	if ind.Status == models.InductionNotStarted {
		ind.Status = models.InductionInProgress
	}
	// A save after submission drops back to in-progress (the parent corrected
	// something) so the manager reviews the final state.
	if ind.Status == models.InductionSubmitted {
		ind.Status = models.InductionInProgress
		ind.SubmittedBy, ind.SubmittedAt = "", nil
	}
	s.writeThrough(ctx, childID, sectionKey, req.Data)
	return s.repo.Upsert(ctx, ind)
}

// hasAnsweredValue reports whether at least one value in an induction
// section's data is a real answer (non-blank string, true bool, non-empty
// list, or any number).
func hasAnsweredValue(data map[string]any) bool {
	for _, v := range data {
		switch t := v.(type) {
		case nil:
			continue
		case string:
			if strings.TrimSpace(t) != "" {
				return true
			}
		case bool:
			if t {
				return true
			}
		case []any:
			if len(t) > 0 {
				return true
			}
		default:
			return true
		}
	}
	return false
}

// writeThrough pushes canonical-home fields onto the Child record.
func (s *inductionService) writeThrough(ctx context.Context, childID, sectionKey string, data map[string]any) {
	if data == nil {
		return
	}
	child, err := s.children.FindByID(ctx, childID)
	if err != nil || child == nil {
		return
	}
	changed := false
	str := func(k string) (string, bool) {
		v, ok := data[k].(string)
		return strings.TrimSpace(v), ok
	}
	strs := func(k string) ([]string, bool) {
		raw, ok := data[k].([]any)
		if !ok {
			return nil, false
		}
		out := make([]string, 0, len(raw))
		for _, item := range raw {
			if sv, ok := item.(string); ok {
				out = append(out, sv)
			}
		}
		return out, true
	}
	switch sectionKey {
	case "allergies_dietary":
		if v, ok := strs("allergy_tags"); ok {
			child.AllergyTags, changed = v, true
		}
		if v, ok := strs("dietary_tags"); ok {
			child.DietaryTags, changed = v, true
		}
		if v, ok := str("allergies"); ok {
			child.Allergies, changed = v, true
		}
		if v, ok := str("dietary_reqs"); ok {
			child.DietaryReqs, changed = v, true
		}
		if v, ok := str("medical_notes"); ok {
			child.MedicalNotes, changed = v, true
		}
	case "child_details":
		if v, ok := str("address"); ok {
			child.Address, changed = v, true
		}
	}
	if changed {
		// This is the write-through of induction answers onto the CANONICAL
		// child record (allergies/dietary/medical/address) — a silent failure
		// means staff-facing safety data diverges from what the parent wrote.
		_, err := s.children.Update(ctx, childID, *child)
		logErrorIf(err, "induction: write-through to canonical child record FAILED — allergy/medical/address data now out of sync",
			"child_id", childID)
	}
}

func (s *inductionService) Submit(ctx context.Context, childID, actorUserID string) (*models.ChildInduction, error) {
	ind, err := s.Get(ctx, childID)
	if err != nil {
		return nil, err
	}
	for _, def := range models.InductionSections {
		if !def.Required {
			continue
		}
		if sec, ok := ind.Sections[def.Key]; !ok || !sec.Complete {
			return nil, errors.New("section not complete yet: " + def.Label)
		}
	}
	now := time.Now()
	ind.Status = models.InductionSubmitted
	ind.SubmittedBy = actorUserID
	ind.SubmittedAt = &now
	ind.ReviewedBy, ind.ReviewedAt, ind.ReviewNote = "", nil, ""
	out, err := s.repo.Upsert(ctx, ind)
	if err != nil {
		return nil, err
	}
	if s.notifs != nil {
		child, _ := s.children.FindByID(ctx, childID)
		name := "a child"
		branch := ""
		if child != nil {
			name = strings.TrimSpace(child.FirstName + " " + child.LastName)
			branch = child.BranchSlug
		}
		var recipients []string
		for _, id := range s.reviewersFor(ctx, branch) {
			if id != actorUserID {
				recipients = append(recipients, id)
			}
		}
		logWarnIf(s.notifs.NotifyMany(ctx, recipients, models.Notification{
			Type:       models.NotifInductionSubmitted,
			Title:      "Induction form to review",
			Body:       "The induction for " + name + " was submitted and needs a second-person review.",
			Link:       "/admin/children/" + childID,
			EntityType: "induction",
			EntityID:   out.ID.Hex(),
		}), "induction: submitted-for-review notification dropped", "child_id", childID)
	}
	return out, nil
}

func (s *inductionService) Review(ctx context.Context, childID, actorUserID, note string) (*models.ChildInduction, error) {
	ind, err := s.Get(ctx, childID)
	if err != nil {
		return nil, err
	}
	if ind.Status != models.InductionSubmitted {
		return nil, errors.New("only a submitted induction can be reviewed")
	}
	if ind.SubmittedBy != "" && ind.SubmittedBy == actorUserID {
		return nil, errors.New("you cannot review an induction you submitted — it needs a second person")
	}
	now := time.Now()
	ind.Status = models.InductionReviewed
	ind.ReviewedBy = actorUserID
	ind.ReviewedAt = &now
	ind.ReviewNote = strings.TrimSpace(note)
	out, err := s.repo.Upsert(ctx, ind)
	if err != nil {
		return nil, err
	}
	if s.notifs != nil && out.SubmittedBy != "" && out.SubmittedBy != actorUserID {
		child, _ := s.children.FindByID(ctx, childID)
		name := "your child"
		if child != nil {
			name = strings.TrimSpace(child.FirstName + " " + child.LastName)
		}
		logWarnIf(s.notifs.NotifyMany(ctx, []string{out.SubmittedBy}, models.Notification{
			Type:       models.NotifInductionReviewed,
			Title:      "Induction reviewed",
			Body:       "The induction for " + name + " has been reviewed and locked in.",
			Link:       "/portal",
			EntityType: "induction",
			EntityID:   out.ID.Hex(),
		}), "induction: reviewed notification dropped", "child_id", childID)
	}
	return out, nil
}

func (s *inductionService) Consents(ctx context.Context, childID string) ([]models.Consent, error) {
	return s.consents.FindByChild(ctx, childID)
}

func (s *inductionService) RecordConsent(ctx context.Context, childID string, req models.ConsentRequest, parentID, userID string) (*models.Consent, error) {
	if models.ConsentByKey(req.Key) == nil {
		return nil, errors.New("unknown consent type")
	}
	if strings.TrimSpace(req.SignatureName) == "" {
		return nil, errors.New("a typed signature name is required")
	}
	if _, err := s.children.FindByID(ctx, childID); err != nil {
		return nil, errors.New("child not found")
	}
	c := &models.Consent{
		ChildID: childID, Key: req.Key, Granted: req.Granted,
		Note: strings.TrimSpace(req.Note), SignatureName: strings.TrimSpace(req.SignatureName),
		SignedByParentID: parentID, SignedByUserID: userID,
	}
	if err := s.consents.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// LatestConsents reduces the append-only rows to the current position per key.
func LatestConsents(rows []models.Consent) map[string]models.Consent {
	out := map[string]models.Consent{}
	for _, c := range rows { // rows sorted ascending — later rows win
		out[c.Key] = c
	}
	return out
}
