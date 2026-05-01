package service

import (
	"context"
	"errors"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type CartService interface {
	GetByUserID(ctx context.Context, userID string) (*models.Cart, error)
	AddItem(ctx context.Context, userID string, req models.AddCartItemRequest) (*models.Cart, error)
	UpdateItem(ctx context.Context, userID, productID string, req models.UpdateCartItemRequest) (*models.Cart, error)
	RemoveItem(ctx context.Context, userID, productID string) (*models.Cart, error)
}

type cartService struct {
	repo     repository.CartRepository
	products repository.ProductRepository
}

func NewCartService(repo repository.CartRepository, products repository.ProductRepository) CartService {
	return &cartService{repo: repo, products: products}
}

func (s *cartService) GetByUserID(ctx context.Context, userID string) (*models.Cart, error) {
	cart, err := s.repo.FindByUserID(ctx, userID)
	if err == nil {
		return cart, nil
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, err
	}

	userOID, convErr := primitive.ObjectIDFromHex(userID)
	if convErr != nil {
		return nil, convErr
	}
	return &models.Cart{
		UserID: userOID,
		Items:  make([]models.CartItem, 0),
	}, nil
}

func (s *cartService) AddItem(ctx context.Context, userID string, req models.AddCartItemRequest) (*models.Cart, error) {
	if req.Qty <= 0 {
		return nil, errors.New("qty must be greater than zero")
	}

	product, err := s.products.FindByID(ctx, req.ProductID)
	if err != nil {
		return nil, errors.New("product not found")
	}
	if !product.IsActive {
		return nil, errors.New("product is not available")
	}

	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	cart, err := s.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	cart.UserID = userOID

	found := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == product.ID {
			nextQty := cart.Items[i].Qty + req.Qty
			if product.StockQty > 0 && nextQty > product.StockQty {
				return nil, errors.New("insufficient stock")
			}
			cart.Items[i].Qty = nextQty
			cart.Items[i].Name = product.Name
			cart.Items[i].Price = product.Price
			cart.Items[i].ImageURL = product.ImageURL
			found = true
			break
		}
	}

	if !found {
		if product.StockQty > 0 && req.Qty > product.StockQty {
			return nil, errors.New("insufficient stock")
		}
		cart.Items = append(cart.Items, models.CartItem{
			ProductID: product.ID,
			Name:      product.Name,
			Price:     product.Price,
			Qty:       req.Qty,
			ImageURL:  product.ImageURL,
		})
	}

	return s.repo.UpsertByUserID(ctx, cart)
}

func (s *cartService) UpdateItem(ctx context.Context, userID, productID string, req models.UpdateCartItemRequest) (*models.Cart, error) {
	if req.Qty <= 0 {
		return nil, errors.New("qty must be greater than zero")
	}

	product, err := s.products.FindByID(ctx, productID)
	if err != nil {
		return nil, errors.New("product not found")
	}
	if !product.IsActive {
		return nil, errors.New("product is not available")
	}
	if product.StockQty > 0 && req.Qty > product.StockQty {
		return nil, errors.New("insufficient stock")
	}

	cart, err := s.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	updated := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == product.ID {
			cart.Items[i].Qty = req.Qty
			cart.Items[i].Name = product.Name
			cart.Items[i].Price = product.Price
			cart.Items[i].ImageURL = product.ImageURL
			updated = true
			break
		}
	}
	if !updated {
		return nil, errors.New("cart item not found")
	}

	return s.repo.UpsertByUserID(ctx, cart)
}

func (s *cartService) RemoveItem(ctx context.Context, userID, productID string) (*models.Cart, error) {
	productOID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		return nil, errors.New("invalid product id")
	}

	cart, err := s.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	filtered := make([]models.CartItem, 0, len(cart.Items))
	for _, item := range cart.Items {
		if item.ProductID != productOID {
			filtered = append(filtered, item)
		}
	}
	cart.Items = filtered

	return s.repo.UpsertByUserID(ctx, cart)
}
