package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

type SupplierService interface {
	List(ctx context.Context) ([]models.Supplier, error)
	GetByID(ctx context.Context, id string) (*models.Supplier, error)
	Create(ctx context.Context, req models.SupplierRequest) (*models.Supplier, error)
	Update(ctx context.Context, id string, req models.SupplierRequest) (*models.Supplier, error)
	Delete(ctx context.Context, id string) error
}

type supplierService struct {
	repo repository.SupplierRepository
}

func NewSupplierService(repo repository.SupplierRepository) SupplierService {
	return &supplierService{repo: repo}
}

var supplierSlugRE = regexp.MustCompile("[^a-z0-9]+")

func supplierSlug(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = supplierSlugRE.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func (s *supplierService) List(ctx context.Context) ([]models.Supplier, error) {
	return s.repo.FindAll(ctx)
}

func (s *supplierService) GetByID(ctx context.Context, id string) (*models.Supplier, error) {
	return s.repo.FindByID(ctx, id)
}

// apply copies the editable request fields onto a supplier (shared by create +
// update). is_active defaults to true on create when omitted.
func apply(sup *models.Supplier, req models.SupplierRequest, isCreate bool) {
	sup.Name = strings.TrimSpace(req.Name)
	sup.Slug = supplierSlug(req.Name)
	sup.Category = strings.TrimSpace(req.Category)
	sup.ContactName = strings.TrimSpace(req.ContactName)
	sup.ContactEmail = strings.TrimSpace(req.ContactEmail)
	sup.ContactPhone = strings.TrimSpace(req.ContactPhone)
	sup.Website = strings.TrimSpace(req.Website)
	sup.OrderEmail = strings.TrimSpace(req.OrderEmail)
	sup.AccountRef = strings.TrimSpace(req.AccountRef)
	sup.LeadTimeDays = req.LeadTimeDays
	sup.Notes = strings.TrimSpace(req.Notes)
	if req.IsActive != nil {
		sup.IsActive = *req.IsActive
	} else if isCreate {
		sup.IsActive = true
	}
}

func (s *supplierService) Create(ctx context.Context, req models.SupplierRequest) (*models.Supplier, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("supplier name is required")
	}
	sup := &models.Supplier{}
	apply(sup, req, true)
	if err := s.repo.Create(ctx, sup); err != nil {
		return nil, err
	}
	return sup, nil
}

func (s *supplierService) Update(ctx context.Context, id string, req models.SupplierRequest) (*models.Supplier, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.New("supplier name is required")
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	apply(existing, req, false)
	return s.repo.Update(ctx, id, *existing)
}

func (s *supplierService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
