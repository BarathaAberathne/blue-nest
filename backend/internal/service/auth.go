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
	Refresh(ctx context.Context, refreshToken string) (*models.AuthResponse, error)
	CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error)
	ListAdminUsers(ctx context.Context) ([]models.User, error)
	ListAllUsers(ctx context.Context) ([]models.User, error)
	UpdateUser(ctx context.Context, id string, req models.AdminUpdateUserRequest) (*models.User, error)
	DeleteUser(ctx context.Context, id string) error
	UpsertOAuthUser(ctx context.Context, email, firstName, lastName, provider, providerID string) (*models.AuthResponse, error)
}

type authService struct {
	users              repository.UserRepository
	jwtSecret          string
	jwtExpiry          time.Duration
	refreshTokenExpiry time.Duration
}

func NewAuthService(users repository.UserRepository, jwtSecret string, expiry time.Duration, refreshExpiry time.Duration) AuthService {
	return &authService{users: users, jwtSecret: jwtSecret, jwtExpiry: expiry, refreshTokenExpiry: refreshExpiry}
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

	access, refresh, err := s.issueTokenPair(user)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{AccessToken: access, RefreshToken: refresh, User: user}, nil
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
		role = models.RoleCustomer
	}

	validRoles := map[models.Role]bool{
		models.RoleAdmin:         true,
		models.RoleBranchManager: true,
		models.RoleCustomer:      true,
	}
	if !validRoles[role] {
		return nil, errors.New("invalid role")
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

	access, refresh, err := s.issueTokenPair(*user)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{AccessToken: access, RefreshToken: refresh, User: *user}, nil
}

func (s *authService) Refresh(ctx context.Context, refreshToken string) (*models.AuthResponse, error) {
	token, err := jwt.Parse(refreshToken, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	// Verify this is a refresh token
	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		return nil, errors.New("not a refresh token")
	}

	userID, _ := claims["sub"].(string)
	if userID == "" {
		return nil, errors.New("invalid token claims")
	}

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	access, newRefresh, err := s.issueTokenPair(*user)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{AccessToken: access, RefreshToken: newRefresh, User: *user}, nil
}

func (s *authService) ListAllUsers(ctx context.Context) ([]models.User, error) {
	return s.users.FindAll(ctx)
}

func (s *authService) UpdateUser(ctx context.Context, id string, req models.AdminUpdateUserRequest) (*models.User, error) {
	return s.users.Update(ctx, id, req)
}

func (s *authService) DeleteUser(ctx context.Context, id string) error {
	return s.users.Delete(ctx, id)
}

func (s *authService) UpsertOAuthUser(ctx context.Context, email, firstName, lastName, provider, providerID string) (*models.AuthResponse, error) {
	user := &models.User{
		ID:            primitive.NewObjectID(),
		Email:         email,
		FirstName:     firstName,
		LastName:      lastName,
		Role:          models.RoleCustomer,
		OAuthProvider: provider,
		OAuthID:       providerID,
		PasswordHash:  "",
	}

	result, err := s.users.UpsertByEmail(ctx, email, user)
	if err != nil {
		return nil, err
	}

	access, refresh, err := s.issueTokenPair(*result)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{AccessToken: access, RefreshToken: refresh, User: *result}, nil
}

func (s *authService) issueTokenPair(user models.User) (accessToken, refreshToken string, err error) {
	accessToken, err = s.issueToken(user, "access", s.jwtExpiry)
	if err != nil {
		return
	}
	refreshToken, err = s.issueToken(user, "refresh", s.refreshTokenExpiry)
	return
}

func (s *authService) issueToken(user models.User, tokenType string, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":          user.ID.Hex(),
		"email":        user.Email,
		"role":         string(user.Role),
		"branch_slugs": user.BranchSlugs,
		"type":         tokenType,
		"exp":          time.Now().Add(expiry).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}
