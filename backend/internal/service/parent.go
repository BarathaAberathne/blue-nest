package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"html"
	"strconv"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// DefaultTemporaryAccessDays bounds a parent's temporary portal window when
// the org hasn't configured one.
const DefaultTemporaryAccessDays = 7

// inviteTokenTTL is how long a portal invitation link stays valid.
const inviteTokenTTL = 14 * 24 * time.Hour

// ParentService is the canonical parent/guardian domain: person records,
// child↔parent relationships (the replacement for the embedded
// Child.guardians array), and the secure portal invitation lifecycle.
type ParentService interface {
	List(ctx context.Context, q string) ([]models.Parent, error)
	GetByID(ctx context.Context, id string) (*models.Parent, error)
	Create(ctx context.Context, req models.ParentRequest) (*models.Parent, error)
	Update(ctx context.Context, id string, req models.ParentRequest) (*models.Parent, error)
	// Delete removes a parent with NO remaining child relationships (links
	// must be unlinked first — deleting a linked parent would orphan
	// safeguarding-relevant data).
	Delete(ctx context.Context, id string) error

	// Relationships.
	ForChild(ctx context.Context, childID string) ([]models.ChildParentRelationship, error)
	ForParent(ctx context.Context, parentID string) ([]models.ChildParentRelationship, error)
	// LinkChild links an existing parent (ParentID) or creates+links in one
	// call (Parent set). Duplicate links are rejected.
	LinkChild(ctx context.Context, req models.LinkChildRequest) (*models.ChildParentRelationship, error)
	UpdateRelationship(ctx context.Context, id string, flags models.RelationshipFlags) (*models.ChildParentRelationship, error)
	Unlink(ctx context.Context, id string) error

	// Portal invitation lifecycle. Invite returns the one-time activation URL
	// (also emailed best-effort when the parent has an email + mailer is
	// configured) — the raw token is never stored.
	Invite(ctx context.Context, parentID string, temporaryDays int) (string, error)
	AcceptInvite(ctx context.Context, req models.InviteAcceptRequest) (*models.Parent, error)
	// SetPortalState is the manager override (extend/activate/restrict/
	// suspend/restore) — every call is audited by the handler.
	SetPortalState(ctx context.Context, parentID string, state models.PortalAccessState, temporaryDays int) (*models.Parent, error)

	// AuthorisedChildIDs resolves a portal user to the child ids their
	// relationships grant portal access to — THE server-side scoping check
	// for every /portal endpoint.
	AuthorisedChildIDs(ctx context.Context, userID string) (*models.Parent, []string, error)
}

type parentService struct {
	repo     repository.ParentRepository
	rels     repository.ChildParentRepository
	children repository.ChildRepository
	users    repository.UserRepository
	counters repository.CounterRepository
	mailer   *email.Mailer
	frontend string
}

func NewParentService(repo repository.ParentRepository, rels repository.ChildParentRepository, children repository.ChildRepository, users repository.UserRepository, counters repository.CounterRepository, mailer *email.Mailer, frontendURL string) ParentService {
	return &parentService{repo: repo, rels: rels, children: children, users: users, counters: counters, mailer: mailer, frontend: strings.TrimRight(frontendURL, "/")}
}

func (s *parentService) List(ctx context.Context, q string) ([]models.Parent, error) {
	return s.repo.FindAll(ctx, q)
}

func (s *parentService) GetByID(ctx context.Context, id string) (*models.Parent, error) {
	return s.repo.FindByID(ctx, id)
}

func applyParent(p *models.Parent, req models.ParentRequest) {
	p.FirstName = strings.TrimSpace(req.FirstName)
	p.LastName = strings.TrimSpace(req.LastName)
	p.Email = strings.ToLower(strings.TrimSpace(req.Email))
	p.Profession = strings.TrimSpace(req.Profession)
	p.MobilePhone = strings.TrimSpace(req.MobilePhone)
	p.WorkPhone = strings.TrimSpace(req.WorkPhone)
	p.HomePhone = strings.TrimSpace(req.HomePhone)
	p.HomeAddress = strings.TrimSpace(req.HomeAddress)
	p.WorkAddress = strings.TrimSpace(req.WorkAddress)
	if req.ContactPrefs != nil {
		p.ContactPrefs = req.ContactPrefs
	}
}

func (s *parentService) Create(ctx context.Context, req models.ParentRequest) (*models.Parent, error) {
	if strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.LastName) == "" {
		return nil, errors.New("first and last name are required")
	}
	p := &models.Parent{}
	applyParent(p, req)
	if s.counters != nil {
		year := time.Now().Year()
		if seq, err := s.counters.Next(ctx, models.CounterParent+"-"+strconv.Itoa(year)); err == nil {
			p.Ref = models.FormatRef(models.RefPrefixParent, year, seq)
		}
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *parentService) Update(ctx context.Context, id string, req models.ParentRequest) (*models.Parent, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("parent not found")
	}
	applyParent(existing, req)
	return s.repo.Update(ctx, id, *existing)
}

func (s *parentService) Delete(ctx context.Context, id string) error {
	rels, err := s.rels.FindByParent(ctx, id)
	if err != nil {
		return err
	}
	if len(rels) > 0 {
		return errors.New("this parent is linked to children — unlink the relationships first")
	}
	return s.repo.Delete(ctx, id)
}

// ── Relationships ─────────────────────────────────────────────────────────────

func (s *parentService) ForChild(ctx context.Context, childID string) ([]models.ChildParentRelationship, error) {
	rels, err := s.rels.FindByChild(ctx, childID)
	if err != nil {
		return nil, err
	}
	s.resolveNames(ctx, rels)
	return rels, nil
}

func (s *parentService) ForParent(ctx context.Context, parentID string) ([]models.ChildParentRelationship, error) {
	rels, err := s.rels.FindByParent(ctx, parentID)
	if err != nil {
		return nil, err
	}
	s.resolveNames(ctx, rels)
	return rels, nil
}

func (s *parentService) resolveNames(ctx context.Context, rels []models.ChildParentRelationship) {
	pids := make([]string, 0, len(rels))
	for _, r := range rels {
		pids = append(pids, r.ParentID)
	}
	parents, _ := s.repo.FindByIDs(ctx, pids)
	pname := map[string]string{}
	for _, p := range parents {
		pname[p.ID.Hex()] = strings.TrimSpace(p.FirstName + " " + p.LastName)
	}
	for i := range rels {
		rels[i].ParentName = pname[rels[i].ParentID]
		if s.children != nil {
			if c, err := s.children.FindByID(ctx, rels[i].ChildID); err == nil && c != nil {
				rels[i].ChildName = strings.TrimSpace(c.FirstName + " " + c.LastName)
			}
		}
	}
}

func applyFlags(rel *models.ChildParentRelationship, f models.RelationshipFlags) {
	rel.Relationship = strings.ToLower(strings.TrimSpace(f.Relationship))
	rel.ParentalResponsibility = f.ParentalResponsibility
	rel.PrimaryContact = f.PrimaryContact
	rel.EmergencyContact = f.EmergencyContact
	rel.AuthorisedCollection = f.AuthorisedCollection
	rel.BillingContact = f.BillingContact
	rel.ReceivesComms = f.ReceivesComms
	rel.LivesWithChild = f.LivesWithChild
	rel.PortalAccess = f.PortalAccess
	rel.FinanceAccess = f.FinanceAccess
	rel.LegalContact = f.LegalContact
	rel.ContactArrangements = strings.TrimSpace(f.ContactArrangements)
	rel.Priority = f.Priority
}

func (s *parentService) LinkChild(ctx context.Context, req models.LinkChildRequest) (*models.ChildParentRelationship, error) {
	if _, err := s.children.FindByID(ctx, req.ChildID); err != nil {
		return nil, errors.New("child not found")
	}
	parentID := strings.TrimSpace(req.ParentID)
	if parentID == "" {
		if req.Parent == nil {
			return nil, errors.New("parent_id or an inline parent is required")
		}
		// Create-or-link: an existing parent with the same email is reused so
		// siblings share ONE person record.
		if e := strings.ToLower(strings.TrimSpace(req.Parent.Email)); e != "" {
			if existing, err := s.repo.FindByEmail(ctx, e); err == nil && existing != nil {
				parentID = existing.ID.Hex()
			}
		}
		if parentID == "" {
			created, err := s.Create(ctx, *req.Parent)
			if err != nil {
				return nil, err
			}
			parentID = created.ID.Hex()
		}
	} else if _, err := s.repo.FindByID(ctx, parentID); err != nil {
		return nil, errors.New("parent not found")
	}

	existing, err := s.rels.FindByChild(ctx, req.ChildID)
	if err != nil {
		return nil, err
	}
	for _, r := range existing {
		if r.ParentID == parentID {
			return nil, errors.New("this parent is already linked to the child")
		}
	}

	rel := &models.ChildParentRelationship{ChildID: req.ChildID, ParentID: parentID}
	applyFlags(rel, req.RelationshipFlags)
	if rel.Relationship == "" {
		rel.Relationship = "guardian"
	}
	if err := s.rels.Create(ctx, rel); err != nil {
		return nil, err
	}
	s.resolveNames(ctx, []models.ChildParentRelationship{*rel})
	one := []models.ChildParentRelationship{*rel}
	s.resolveNames(ctx, one)
	return &one[0], nil
}

func (s *parentService) UpdateRelationship(ctx context.Context, id string, flags models.RelationshipFlags) (*models.ChildParentRelationship, error) {
	rel, err := s.rels.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("relationship not found")
	}
	applyFlags(rel, flags)
	updated, err := s.rels.Update(ctx, id, *rel)
	if err != nil {
		return nil, err
	}
	one := []models.ChildParentRelationship{*updated}
	s.resolveNames(ctx, one)
	return &one[0], nil
}

func (s *parentService) Unlink(ctx context.Context, id string) error {
	if _, err := s.rels.FindByID(ctx, id); err != nil {
		return errors.New("relationship not found")
	}
	return s.rels.Delete(ctx, id)
}

// ── Portal invitations ────────────────────────────────────────────────────────

func (s *parentService) Invite(ctx context.Context, parentID string, temporaryDays int) (string, error) {
	p, err := s.repo.FindByID(ctx, parentID)
	if err != nil {
		return "", errors.New("parent not found")
	}
	if p.Email == "" {
		return "", errors.New("the parent needs an email address before they can be invited")
	}
	rels, err := s.rels.FindByParent(ctx, parentID)
	if err != nil {
		return "", err
	}
	hasPortalChild := false
	for _, r := range rels {
		if r.PortalAccess {
			hasPortalChild = true
			break
		}
	}
	if !hasPortalChild {
		return "", errors.New("grant portal access on at least one child relationship before inviting")
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	token := hex.EncodeToString(raw)
	hash, err := bcrypt.GenerateFromPassword([]byte(token), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(inviteTokenTTL)
	if temporaryDays <= 0 {
		temporaryDays = DefaultTemporaryAccessDays
	}
	until := time.Now().Add(time.Duration(temporaryDays) * 24 * time.Hour)

	p.InviteTokenHash = string(hash)
	p.InviteExpiresAt = &expires
	p.PortalState = models.PortalInvited
	p.TemporaryUntil = &until
	if _, err := s.repo.Update(ctx, parentID, *p); err != nil {
		return "", err
	}

	link := fmt.Sprintf("%s/portal/activate?parent=%s&token=%s", s.frontend, parentID, token)
	if s.mailer != nil {
		subject := "Activate your Blue Nest parent account"
		body := "<p>Hello " + html.EscapeString(p.FirstName) + ",</p>" +
			"<p>You have been invited to the Blue Nest parent portal. Use the secure link below to set your password and activate your account. The link expires in 14 days and can be used once.</p>" +
			`<p><a href="` + link + `">Activate my account</a></p>`
		// The ONLY delivery channel for the activation link — a silently-failed
		// send means the parent simply never hears from us, with no trace
		// (audit finding: this was `_ =` inside the goroutine).
		email, parentRef := p.Email, p.ID.Hex()
		go func() {
			logErrorIf(s.mailer.Send([]string{email}, subject, body),
				"parents: portal invitation email NOT delivered — re-invite required", "parent_id", parentRef)
		}()
	}
	return link, nil
}

func (s *parentService) AcceptInvite(ctx context.Context, req models.InviteAcceptRequest) (*models.Parent, error) {
	p, err := s.repo.FindByID(ctx, req.ParentID)
	if err != nil {
		return nil, errors.New("invitation not found")
	}
	if p.InviteTokenHash == "" || p.InviteExpiresAt == nil || time.Now().After(*p.InviteExpiresAt) {
		return nil, errors.New("this invitation has expired — ask the nursery to send a new one")
	}
	if bcrypt.CompareHashAndPassword([]byte(p.InviteTokenHash), []byte(req.Token)) != nil {
		return nil, errors.New("invalid invitation link")
	}
	if len(req.Password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	// Link (or create) the customer login. An existing customer account with
	// the same email is reused so store + portal share one identity.
	user, err := s.users.FindByEmail(ctx, p.Email)
	if err != nil || user == nil {
		user = &models.User{
			Email: p.Email, FirstName: p.FirstName, LastName: p.LastName,
			Role: models.RoleCustomer, PasswordHash: string(hash),
		}
		if err := s.users.Create(ctx, user); err != nil {
			return nil, err
		}
		if fresh, ferr := s.users.FindByEmail(ctx, p.Email); ferr == nil && fresh != nil {
			user = fresh
		}
	} else {
		if user.Role != models.RoleCustomer {
			return nil, errors.New("this email belongs to a staff account — use a different email for portal access")
		}
		if err := s.users.UpdatePassword(ctx, user.ID.Hex(), string(hash)); err != nil {
			return nil, err
		}
	}

	p.UserID = user.ID.Hex()
	p.InviteTokenHash = ""
	p.InviteExpiresAt = nil
	p.PortalState = models.PortalTemporary
	return s.repo.Update(ctx, req.ParentID, *p)
}

func (s *parentService) SetPortalState(ctx context.Context, parentID string, state models.PortalAccessState, temporaryDays int) (*models.Parent, error) {
	if !models.IsValidPortalState(state) {
		return nil, errors.New("invalid portal state")
	}
	p, err := s.repo.FindByID(ctx, parentID)
	if err != nil {
		return nil, errors.New("parent not found")
	}
	p.PortalState = state
	if state == models.PortalTemporary {
		if temporaryDays <= 0 {
			temporaryDays = DefaultTemporaryAccessDays
		}
		until := time.Now().Add(time.Duration(temporaryDays) * 24 * time.Hour)
		p.TemporaryUntil = &until
	}
	if state == models.PortalActive {
		p.TemporaryUntil = nil
	}
	return s.repo.Update(ctx, parentID, *p)
}

// AuthorisedChildIDs is the portal scoping primitive: user → parent →
// child ids whose relationship grants portal access. A temporary window that
// has lapsed downgrades to restricted (lazily, like scheduled room
// assignments activate lazily).
func (s *parentService) AuthorisedChildIDs(ctx context.Context, userID string) (*models.Parent, []string, error) {
	p, err := s.repo.FindByUserID(ctx, userID)
	if err != nil || p == nil {
		return nil, nil, errors.New("no parent account is linked to this login")
	}
	if p.PortalState == models.PortalTemporary && p.TemporaryUntil != nil && time.Now().After(*p.TemporaryUntil) {
		p.PortalState = models.PortalRestricted
		if updated, uerr := s.repo.Update(ctx, p.ID.Hex(), *p); uerr == nil {
			p = updated
		}
	}
	if !models.PortalAllowsLogin(p.PortalState) {
		return p, nil, errors.New("portal access is not active for this account — contact the nursery")
	}
	rels, err := s.rels.FindByParent(ctx, p.ID.Hex())
	if err != nil {
		return p, nil, err
	}
	ids := make([]string, 0, len(rels))
	for _, r := range rels {
		if r.PortalAccess {
			ids = append(ids, r.ChildID)
		}
	}
	return p, ids, nil
}
