package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// NotificationPreferencesResponse is the self-service payload: the emailable
// type catalogue + this user's current muted (opted-out) types.
type NotificationPreferencesResponse struct {
	Catalogue  []models.NotificationTypeInfo `json:"catalogue"`
	MutedTypes []string                      `json:"muted_types"`
}

// NotificationPreferenceService serves + edits a user's notification email prefs.
type NotificationPreferenceService interface {
	Get(ctx context.Context, userID string) (*NotificationPreferencesResponse, error)
	Set(ctx context.Context, userID string, muted []string) (*NotificationPreferencesResponse, error)
}

type notificationPreferenceService struct {
	repo repository.NotificationPreferenceRepository
}

func NewNotificationPreferenceService(repo repository.NotificationPreferenceRepository) NotificationPreferenceService {
	return &notificationPreferenceService{repo: repo}
}

func (s *notificationPreferenceService) Get(ctx context.Context, userID string) (*NotificationPreferencesResponse, error) {
	muted := []string{}
	if p, err := s.repo.FindByUser(ctx, userID); err == nil && p != nil {
		muted = p.MutedTypes
	}
	return &NotificationPreferencesResponse{Catalogue: models.NotificationTypeCatalogue, MutedTypes: muted}, nil
}

func (s *notificationPreferenceService) Set(ctx context.Context, userID string, muted []string) (*NotificationPreferencesResponse, error) {
	// Keep only known types, de-duplicated.
	valid := map[string]bool{}
	for _, t := range models.NotificationTypeCatalogue {
		valid[t.Type] = true
	}
	seen := map[string]bool{}
	clean := make([]string, 0, len(muted))
	for _, t := range muted {
		if valid[t] && !seen[t] {
			seen[t] = true
			clean = append(clean, t)
		}
	}
	if _, err := s.repo.Upsert(ctx, userID, clean); err != nil {
		return nil, err
	}
	return &NotificationPreferencesResponse{Catalogue: models.NotificationTypeCatalogue, MutedTypes: clean}, nil
}
