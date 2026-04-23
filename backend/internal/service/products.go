package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type ProductService interface {
	List(ctx context.Context) ([]models.Product, error)
	GetByID(ctx context.Context, id string) (*models.Product, error)
	ListCategories(ctx context.Context) ([]models.Category, error)
	Create(ctx context.Context, p models.Product) (*models.Product, error)
	Update(ctx context.Context, id string, p models.Product) (*models.Product, error)
	Delete(ctx context.Context, id string) error
}

type productService struct {
	repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) List(ctx context.Context) ([]models.Product, error) {
	return s.repo.FindAll(ctx)
}

func (s *productService) GetByID(ctx context.Context, id string) (*models.Product, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *productService) ListCategories(ctx context.Context) ([]models.Category, error) {
	return s.repo.FindAllCategories(ctx)
}

func (s *productService) Create(ctx context.Context, p models.Product) (*models.Product, error) {
	return s.repo.Create(ctx, p)
}

func (s *productService) Update(ctx context.Context, id string, p models.Product) (*models.Product, error) {
	return s.repo.Update(ctx, id, p)
}

func (s *productService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
