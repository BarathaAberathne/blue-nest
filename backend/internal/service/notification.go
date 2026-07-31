package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
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
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
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
	return s.repo.CreateMany(ctx, batch)
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
