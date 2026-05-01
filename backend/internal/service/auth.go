package service

import (
	"context"
	"errors"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error)
	Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error)
	AdminLogin(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error)
	CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error)
	ListAdminUsers(ctx context.Context) ([]models.User, error)
}

type authService struct {
	users     repository.UserRepository
	jwtSecret string
	jwtExpiry time.Duration
}

func NewAuthService(users repository.UserRepository, jwtSecret string, expiry time.Duration) AuthService {
	return &authService{users: users, jwtSecret: jwtSecret, jwtExpiry: expiry}
}

func (s *authService) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        req.Email,
		PasswordHash: string(hash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         models.RoleCustomer,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err = s.users.Create(ctx, &user); err != nil {
		return nil, err
	}

	token, err := s.issueToken(user)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{AccessToken: token, User: user}, nil
}

func (s *authService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	return s.loginWithRoleGuard(ctx, req, nil)
}

func (s *authService) AdminLogin(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	return s.loginWithRoleGuard(ctx, req, []models.Role{models.RoleAdmin, models.RoleBranchManager})
}

func (s *authService) CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error) {
	role := req.Role
	if role == "" {
		role = models.RoleAdmin
	}

	if role != models.RoleAdmin && role != models.RoleBranchManager {
		return nil, errors.New("invalid role for admin user")
	}

	if _, err := s.users.FindByEmail(ctx, req.Email); err == nil {
		return nil, errors.New("user already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        req.Email,
		PasswordHash: string(hash),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         role,
		BranchSlugs:  req.BranchSlugs,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.users.Create(ctx, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *authService) ListAdminUsers(ctx context.Context) ([]models.User, error) {
	return s.users.FindByRoles(ctx, []models.Role{models.RoleAdmin, models.RoleBranchManager})
}

func (s *authService) loginWithRoleGuard(ctx context.Context, req models.LoginRequest, allowedRoles []models.Role) (*models.AuthResponse, error) {
	user, err := s.users.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	if len(allowedRoles) > 0 {
		allowed := false
		for _, role := range allowedRoles {
			if user.Role == role {
				allowed = true
				break
			}
		}
		if !allowed {
			return nil, errors.New("admin credentials required")
		}
	}

	token, err := s.issueToken(*user)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{AccessToken: token, User: *user}, nil
}

func (s *authService) issueToken(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":          user.ID.Hex(),
		"email":        user.Email,
		"role":         string(user.Role),
		"branch_slugs": user.BranchSlugs,
		"exp":          time.Now().Add(s.jwtExpiry).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}
