package service

import (
	"context"
	"errors"
	"strings"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderRequestService interface {
	// Submit creates a request on behalf of the authenticated staff member.
	Submit(ctx context.Context, userID string, req models.CreateOrderRequestRequest) (*models.OrderRequest, error)
	ListAll(ctx context.Context) ([]models.OrderRequest, error)
	ListMine(ctx context.Context, userID string) ([]models.OrderRequest, error)
	GetByID(ctx context.Context, id string) (*models.OrderRequest, error)
	UpdateStatus(ctx context.Context, id, status string) error
	// Cancel lets the owner withdraw their own request while it is still pending.
	Cancel(ctx context.Context, userID, id string) (*models.OrderRequest, error)
}

type orderRequestService struct {
	repo  repository.OrderRequestRepository
	users repository.UserRepository
}

func NewOrderRequestService(repo repository.OrderRequestRepository, users repository.UserRepository) OrderRequestService {
	return &orderRequestService{repo: repo, users: users}
}

func (s *orderRequestService) Submit(ctx context.Context, userID string, req models.CreateOrderRequestRequest) (*models.OrderRequest, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user")
	}

	// Sanitize + validate items.
	items := make([]models.OrderRequestItem, 0, len(req.Items))
	for _, it := range req.Items {
		name := strings.TrimSpace(it.ItemName)
		if name == "" {
			continue
		}
		supplier := strings.TrimSpace(it.Supplier)
		if supplier == "" {
			supplier = "Other"
		}
		qty := it.Qty
		if qty < 1 {
			qty = 1
		}
		items = append(items, models.OrderRequestItem{
			ItemName:        name,
			Supplier:        supplier,
			Qty:             qty,
			Notes:           strings.TrimSpace(it.Notes),
			Code:            strings.TrimSpace(it.Code),
			CatalogueItemID: strings.TrimSpace(it.CatalogueItemID),
		})
	}
	if len(items) == 0 {
		return nil, errors.New("at least one item is required")
	}

	// Resolve the requester's display name/email from their account so the
	// management view doesn't have to trust client-supplied identity.
	name, emailAddr := "", ""
	if u, err := s.users.FindByID(ctx, userID); err == nil && u != nil {
		name = strings.TrimSpace(u.FirstName + " " + u.LastName)
		emailAddr = u.Email
	}

	orderReq := &models.OrderRequest{
		UserID:           oid,
		RequestedByName:  name,
		RequestedByEmail: emailAddr,
		BranchSlug:       strings.TrimSpace(req.BranchSlug),
		Items:            items,
		Status:           models.OrderRequestPending,
		Notes:            strings.TrimSpace(req.Notes),
	}

	if err := s.repo.Create(ctx, orderReq); err != nil {
		return nil, err
	}
	return orderReq, nil
}

func (s *orderRequestService) ListAll(ctx context.Context) ([]models.OrderRequest, error) {
	return s.repo.FindAll(ctx)
}

func (s *orderRequestService) ListMine(ctx context.Context, userID string) ([]models.OrderRequest, error) {
	return s.repo.FindByUserID(ctx, userID)
}

func (s *orderRequestService) GetByID(ctx context.Context, id string) (*models.OrderRequest, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *orderRequestService) Cancel(ctx context.Context, userID, id string) (*models.OrderRequest, error) {
	req, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.UserID.Hex() != userID {
		return nil, errors.New("not your request")
	}
	if req.Status != models.OrderRequestPending {
		return nil, errors.New("only pending requests can be cancelled")
	}
	if err := s.repo.UpdateStatus(ctx, id, string(models.OrderRequestCancelled)); err != nil {
		return nil, err
	}
	req.Status = models.OrderRequestCancelled
	return req, nil
}

func (s *orderRequestService) UpdateStatus(ctx context.Context, id, status string) error {
	switch models.OrderRequestStatus(status) {
	case models.OrderRequestPending, models.OrderRequestOrdered,
		models.OrderRequestReceived, models.OrderRequestCancelled:
		return s.repo.UpdateStatus(ctx, id, status)
	default:
		return errors.New("invalid status")
	}
}
