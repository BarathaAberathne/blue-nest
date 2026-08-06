package service

import (
	"context"
	"html"
	"log/slog"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/platform/email"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type NotificationService interface {
	// NotifyMany creates one notification per recipient (best-effort; skips the
	// empty/duplicate recipients). Safe to call inline — errors are returned but
	// callers typically ignore them so a notification failure never blocks the
	// underlying action.
	NotifyMany(ctx context.Context, userIDs []string, n models.Notification) error
	ListMine(ctx context.Context, userID string, limit int64) ([]models.Notification, error)
	CountUnread(ctx context.Context, userID string) (int64, error)
	MarkRead(ctx context.Context, id, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
}

type notificationService struct {
	repo repository.NotificationRepository
	// Email delivery (opt-in): when emailEnabled and mailer/users are set,
	// NotifyMany also emails each recipient. Best-effort: never blocks the
	// in-app notification.
	mailer       *email.Mailer
	users        repository.UserRepository
	prefs        repository.NotificationPreferenceRepository
	frontendURL  string
	emailEnabled bool
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
}

// NewNotificationServiceWithEmail adds opt-in email delivery of notifications,
// respecting each recipient's per-type email preferences.
func NewNotificationServiceWithEmail(repo repository.NotificationRepository, mailer *email.Mailer, users repository.UserRepository, prefs repository.NotificationPreferenceRepository, frontendURL string, emailEnabled bool) NotificationService {
	return &notificationService{repo: repo, mailer: mailer, users: users, prefs: prefs, frontendURL: frontendURL, emailEnabled: emailEnabled}
}

// notificationEmailHTML renders a notification as a branded email body. Dynamic
// text is HTML-escaped; the deep-link (if any) is appended as an absolute URL.
func notificationEmailHTML(n models.Notification, frontendURL string) string {
	body := html.EscapeString(n.Body)
	if n.Link != "" {
		link := n.Link
		if strings.HasPrefix(link, "/") && frontendURL != "" {
			link = strings.TrimRight(frontendURL, "/") + link
		}
		if body != "" {
			body += "\n\n"
		}
		body += "Open in Blue Nest: " + link
	}
	if body == "" {
		body = html.EscapeString(n.Title)
	}
	return wrapEmailShell(body)
}

// deliverEmails resolves each recipient's email (in the caller's org ctx) then
// sends asynchronously. Best-effort; failures are logged, never surfaced.
func (s *notificationService) deliverEmails(ctx context.Context, userIDs []string, n models.Notification) {
	if !s.emailEnabled || s.mailer == nil || s.users == nil {
		return
	}
	var addrs []string
	seen := map[string]bool{}
	for _, uid := range userIDs {
		if uid == "" || seen[uid] {
			continue
		}
		seen[uid] = true
		u, err := s.users.FindByID(ctx, uid)
		if err != nil || u == nil || u.Email == "" {
			continue
		}
		// Respect the recipient's per-type email opt-outs (in-app still shown).
		if s.prefs != nil && n.Type != "" {
			if p, perr := s.prefs.FindByUser(ctx, uid); perr == nil && p != nil {
				muted := false
				for _, t := range p.MutedTypes {
					if t == n.Type {
						muted = true
						break
					}
				}
				if muted {
					continue
				}
			}
		}
		addrs = append(addrs, u.Email)
	}
	if len(addrs) == 0 {
		return
	}
	subject := n.Title
	htmlBody := notificationEmailHTML(n, s.frontendURL)
	go func() {
		for _, addr := range addrs {
			if err := s.mailer.Send([]string{addr}, subject, htmlBody); err != nil {
				slog.Error("failed to email notification", "to", addr, "error", err)
			}
		}
	}()
}

func (s *notificationService) NotifyMany(ctx context.Context, userIDs []string, n models.Notification) error {
	seen := map[string]bool{}
	batch := make([]models.Notification, 0, len(userIDs))
	for _, uid := range userIDs {
		if uid == "" || seen[uid] {
			continue
		}
		seen[uid] = true
		copy := n
		copy.UserID = uid
		copy.Read = false
		batch = append(batch, copy)
	}
	if err := s.repo.CreateMany(ctx, batch); err != nil {
		return err
	}
	s.deliverEmails(ctx, userIDs, n)
	return nil
}

func (s *notificationService) ListMine(ctx context.Context, userID string, limit int64) ([]models.Notification, error) {
	return s.repo.FindByUser(ctx, userID, limit)
}
func (s *notificationService) CountUnread(ctx context.Context, userID string) (int64, error) {
	return s.repo.CountUnread(ctx, userID)
}
func (s *notificationService) MarkRead(ctx context.Context, id, userID string) error {
	return s.repo.MarkRead(ctx, id, userID)
}
func (s *notificationService) MarkAllRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllRead(ctx, userID)
}
