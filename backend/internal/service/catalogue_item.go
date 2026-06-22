package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type CatalogueService interface {
	List(ctx context.Context) ([]models.CatalogueItem, error)
	ListActive(ctx context.Context) ([]models.CatalogueItem, error)
	GetByID(ctx context.Context, id string) (*models.CatalogueItem, error)
	GetByIDs(ctx context.Context, ids []string) (map[string]models.CatalogueItem, error)
	Create(ctx context.Context, req models.CatalogueItemRequest) (*models.CatalogueItem, error)
	Update(ctx context.Context, id string, req models.CatalogueItemRequest) (*models.CatalogueItem, error)
	Delete(ctx context.Context, id string) error
}

type catalogueService struct {
	repo repository.CatalogueItemRepository
}

func NewCatalogueService(repo repository.CatalogueItemRepository) CatalogueService {
	return &catalogueService{repo: repo}
}

func (s *catalogueService) List(ctx context.Context) ([]models.CatalogueItem, error) {
	return s.repo.FindAll(ctx)
}

// ListActive returns only active items — used by the staff request picker.
func (s *catalogueService) ListActive(ctx context.Context) ([]models.CatalogueItem, error) {
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	active := make([]models.CatalogueItem, 0, len(all))
	for _, it := range all {
		if it.IsActive {
			active = append(active, it)
		}
	}
	return active, nil
}

func (s *catalogueService) GetByID(ctx context.Context, id string) (*models.CatalogueItem, error) {
	return s.repo.FindByID(ctx, id)
}

// GetByIDs returns a map keyed by hex id for quick lookup during cart generation.
func (s *catalogueService) GetByIDs(ctx context.Context, ids []string) (map[string]models.CatalogueItem, error) {
	items, err := s.repo.FindByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make(map[string]models.CatalogueItem, len(items))
	for _, it := range items {
		out[it.ID.Hex()] = it
	}
	return out, nil
}

func (s *catalogueService) Create(ctx context.Context, req models.CatalogueItemRequest) (*models.CatalogueItem, error) {
	item, err := buildCatalogueItem(req)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, item)
}

func (s *catalogueService) Update(ctx context.Context, id string, req models.CatalogueItemRequest) (*models.CatalogueItem, error) {
	item, err := buildCatalogueItem(req)
	if err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, item)
}

func (s *catalogueService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func buildCatalogueItem(req models.CatalogueItemRequest) (models.CatalogueItem, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return models.CatalogueItem{}, errors.New("name is required")
	}
	offers := make([]models.CatalogueOffer, 0, len(req.Offers))
	for _, o := range req.Offers {
		o.Supplier = strings.TrimSpace(o.Supplier)
		o.Code = strings.TrimSpace(o.Code)
		if o.Supplier == "" || o.Code == "" {
			continue // skip incomplete offers
		}
		if o.PricePerUnit == 0 {
			o.PricePerUnit = o.Price // best-effort when pack size unknown
		}
		offers = append(offers, o)
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	aliases := make([]string, 0, len(req.Aliases))
	for _, a := range req.Aliases {
		if t := strings.TrimSpace(a); t != "" {
			aliases = append(aliases, t)
		}
	}
	return models.CatalogueItem{
		Name:     name,
		Category: strings.TrimSpace(req.Category),
		Offers:   offers,
		Aliases:  aliases,
		IsActive: isActive,
	}, nil
}
