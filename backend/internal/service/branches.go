package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type BranchService interface {
	List(ctx context.Context) ([]models.Branch, error)
	GetBySlug(ctx context.Context, slug string) (*models.Branch, error)
}

type branchService struct {
	repo repository.BranchRepository
}

func NewBranchService(repo repository.BranchRepository) BranchService {
	return &branchService{repo: repo}
}

func (s *branchService) List(ctx context.Context) ([]models.Branch, error) {
	return s.repo.FindAll(ctx)
}

func (s *branchService) GetBySlug(ctx context.Context, slug string) (*models.Branch, error) {
	return s.repo.FindBySlug(ctx, slug)
}
