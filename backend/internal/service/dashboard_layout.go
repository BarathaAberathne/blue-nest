package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type DashboardLayoutService interface {
	// Get returns the user's saved layout, or nil when they haven't customised one.
	Get(ctx context.Context, userID string) (*models.DashboardLayout, error)
	Save(ctx context.Context, userID string, widgets []models.DashboardWidget) (*models.DashboardLayout, error)
}

type dashboardLayoutService struct {
	repo repository.DashboardLayoutRepository
}

func NewDashboardLayoutService(repo repository.DashboardLayoutRepository) DashboardLayoutService {
	return &dashboardLayoutService{repo: repo}
}

func (s *dashboardLayoutService) Get(ctx context.Context, userID string) (*models.DashboardLayout, error) {
	return s.repo.FindByUserID(ctx, userID)
}

func (s *dashboardLayoutService) Save(ctx context.Context, userID string, widgets []models.DashboardWidget) (*models.DashboardLayout, error) {
	return s.repo.Upsert(ctx, userID, widgets)
}
