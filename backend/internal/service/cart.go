package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type CartService interface {
	GetByUserID(ctx context.Context, userID string) (*models.Cart, error)
}

type cartService struct {
	repo repository.CartRepository
}

func NewCartService(repo repository.CartRepository) CartService {
	return &cartService{repo: repo}
}

func (s *cartService) GetByUserID(ctx context.Context, userID string) (*models.Cart, error) {
	return s.repo.FindByUserID(ctx, userID)
}
