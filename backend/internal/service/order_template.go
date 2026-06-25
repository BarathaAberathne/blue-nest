package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type OrderTemplateService interface {
	Create(ctx context.Context, userID, userName string, req models.CreateOrderTemplateRequest) (*models.OrderTemplate, error)
	List(ctx context.Context) ([]models.OrderTemplate, error)
	Delete(ctx context.Context, id string) error
}

type orderTemplateService struct {
	repo repository.OrderTemplateRepository
}

func NewOrderTemplateService(repo repository.OrderTemplateRepository) OrderTemplateService {
	return &orderTemplateService{repo: repo}
}

func (s *orderTemplateService) Create(ctx context.Context, userID, userName string, req models.CreateOrderTemplateRequest) (*models.OrderTemplate, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("template name is required")
	}
	items := make([]models.OrderRequestItem, 0, len(req.Items))
	for _, it := range req.Items {
		if strings.TrimSpace(it.ItemName) == "" {
			continue
		}
		if it.Qty < 1 {
			it.Qty = 1
		}
		items = append(items, it)
	}
	if len(items) == 0 {
		return nil, errors.New("a template needs at least one item")
	}
	t := &models.OrderTemplate{
		Name:          name,
		BranchSlug:    strings.TrimSpace(req.BranchSlug),
		Items:         items,
		CreatedBy:     userID,
		CreatedByName: userName,
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *orderTemplateService) List(ctx context.Context) ([]models.OrderTemplate, error) {
	return s.repo.FindAll(ctx)
}

func (s *orderTemplateService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
