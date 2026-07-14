package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type DashboardLayoutService interface {
	// Active returns the user's active layout, or nil when they haven't customised one.
	Active(ctx context.Context, userID string) (*models.DashboardLayout, error)
	// List returns all of a user's named layouts (active first).
	List(ctx context.Context, userID string) ([]models.DashboardLayout, error)
	// Save upserts a named layout and makes it active. An empty name saves the
	// default layout (back-compatible with the original single-layout API).
	Save(ctx context.Context, userID, name string, widgets []models.DashboardWidget) (*models.DashboardLayout, error)
	// Activate switches which named layout is active.
	Activate(ctx context.Context, userID, name string) (*models.DashboardLayout, error)
	// Delete removes a named layout, returning the name now active (empty if none).
	Delete(ctx context.Context, userID, name string) (string, error)
}

type dashboardLayoutService struct {
	repo repository.DashboardLayoutRepository
}

func NewDashboardLayoutService(repo repository.DashboardLayoutRepository) DashboardLayoutService {
	return &dashboardLayoutService{repo: repo}
}

func (s *dashboardLayoutService) Active(ctx context.Context, userID string) (*models.DashboardLayout, error) {
	return s.repo.FindActive(ctx, userID)
}

func (s *dashboardLayoutService) List(ctx context.Context, userID string) ([]models.DashboardLayout, error) {
	return s.repo.FindByUserID(ctx, userID)
}

func (s *dashboardLayoutService) Save(ctx context.Context, userID, name string, widgets []models.DashboardWidget) (*models.DashboardLayout, error) {
	return s.repo.Save(ctx, userID, name, widgets, true)
}

func (s *dashboardLayoutService) Activate(ctx context.Context, userID, name string) (*models.DashboardLayout, error) {
	return s.repo.SetActive(ctx, userID, name)
}

func (s *dashboardLayoutService) Delete(ctx context.Context, userID, name string) (string, error) {
	return s.repo.Delete(ctx, userID, name)
}
