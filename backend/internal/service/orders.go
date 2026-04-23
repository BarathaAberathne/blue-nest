package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type OrderService interface {
	ListByUser(ctx context.Context, userID string) ([]models.Order, error)
	ListAll(ctx context.Context) ([]models.Order, error)
	GetByID(ctx context.Context, id string) (*models.Order, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type orderService struct {
	repo repository.OrderRepository
}

func NewOrderService(repo repository.OrderRepository) OrderService {
	return &orderService{repo: repo}
}

func (s *orderService) ListByUser(ctx context.Context, userID string) ([]models.Order, error) {
	return s.repo.FindByUserID(ctx, userID)
}

func (s *orderService) ListAll(ctx context.Context) ([]models.Order, error) {
	return s.repo.FindAll(ctx)
}

func (s *orderService) GetByID(ctx context.Context, id string) (*models.Order, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *orderService) UpdateStatus(ctx context.Context, id, status string) error {
	return s.repo.UpdateStatus(ctx, id, status)
}
