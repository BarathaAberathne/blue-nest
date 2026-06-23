package service

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"strings"

	"github.com/blue-nest-montessori/api/internal/middleware"
	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// AuditService records admin actions and lists them back for the activity page.
type AuditService interface {
	// Record persists an audit entry derived from the authenticated request
	// (actor + client IP) plus the supplied action details. It is best-effort:
	// a failure is logged but never propagated, so auditing can never break the
	// underlying operation. Call it after the operation succeeds.
	Record(r *http.Request, action, entityType, entityID, summary string, details map[string]interface{})
	List(ctx context.Context, filter models.AuditLogFilter) ([]models.AuditLog, error)
}

type auditService struct {
	repo repository.AuditLogRepository
}

func NewAuditService(repo repository.AuditLogRepository) AuditService {
	return &auditService{repo: repo}
}

func (s *auditService) Record(r *http.Request, action, entityType, entityID, summary string, details map[string]interface{}) {
	ctx := r.Context()
	actorID, _ := ctx.Value(middleware.UserIDKey).(string)
	actorEmail, _ := ctx.Value(middleware.UserEmailKey).(string)
	actorRole, _ := ctx.Value(middleware.UserRoleKey).(string)

	entry := &models.AuditLog{
		ActorID:    actorID,
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Summary:    summary,
		Details:    details,
		IPAddress:  clientIP(r),
	}

	if err := s.repo.Create(ctx, entry); err != nil {
		slog.Error("failed to write audit log",
			"error", err, "action", action, "entity_type", entityType, "actor", actorEmail)
	}
}

func (s *auditService) List(ctx context.Context, filter models.AuditLogFilter) ([]models.AuditLog, error) {
	return s.repo.FindAll(ctx, filter)
}

// clientIP extracts the originating client address, honoring the X-Forwarded-For
// header set by the production reverse proxy (nginx on the droplet) and falling
// back to the raw connection address.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if first := strings.TrimSpace(strings.Split(xff, ",")[0]); first != "" {
			return first
		}
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
