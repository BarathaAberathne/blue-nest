package service

import (
	"context"
	"errors"
	"net"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

const (
	minPasswordLen   = 8
	maxPasswordLen   = 72 // bcrypt silently truncates inputs longer than 72 bytes
	maxEmailLen      = 254
	maxNameLen       = 100
	emailDNSLookupTO = 3 * time.Second
)

// reservedTestTLDs are TLDs that RFC 6761 / RFC 2606 reserve for documentation,
// testing, and local-only use. They never have public DNS records, so the MX
// lookup would always fail — skip the deliverability check for these so test
// suites and fixtures keep working.
var reservedTestTLDs = map[string]bool{
	"test":      true,
	"example":   true,
	"invalid":   true,
	"localhost": true,
}

// normalizeEmail lowercases and trims whitespace so duplicate-email checks
// and login lookups are case-insensitive (RFC 5321 local parts are technically
// case-sensitive, but in practice no real-world provider relies on that; the
// confusion of letting "User@x.com" and "user@x.com" coexist is far worse).
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// validateRegisterInput enforces the rules implied by the `validate:` struct
// tags on models.RegisterRequest (and AdminCreateUserRequest). Those tags exist
// but are not actually executed anywhere — pkg/validator.DecodeJSON only does
// JSON decoding. Until we wire up a real validator library, do it here.
//
// Caller should pass already-normalized email and already-trimmed names.
// The context is used to bound the email deliverability (DNS) check.
func validateRegisterInput(ctx context.Context, email, password, firstName, lastName string) error {
	// ── Email syntax ────────────────────────────────────────────────────────
	if email == "" {
		return errors.New("email is required")
	}
	if len(email) > maxEmailLen {
		return errors.New("email is too long")
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return errors.New("email is not valid")
	}
	// net/mail.ParseAddress accepts "user@hostname" without a TLD; reject those.
	at := strings.LastIndex(email, "@")
	if at == -1 || !strings.Contains(email[at+1:], ".") {
		return errors.New("email is not valid")
	}

	// ── Email deliverability (DNS) ──────────────────────────────────────────
	// Reject domains that can't possibly receive mail. Catches typos like
	// `gmial.com`, fake TLDs like `.ccc`, and made-up domains. Can be turned
	// off with EMAIL_DNS_CHECK=false (handy for CI runners with no DNS or for
	// air-gapped dev). Reserved test/example TLDs are always allowed.
	if err := validateEmailDeliverable(ctx, email[at+1:]); err != nil {
		return err
	}

	// ── Password ────────────────────────────────────────────────────────────
	if len(password) < minPasswordLen {
		return errors.New("password must be at least 8 characters")
	}
	if len(password) > maxPasswordLen {
		// bcrypt would silently truncate, which is surprising; reject explicitly.
		return errors.New("password must be at most 72 characters")
	}

	// ── Names ───────────────────────────────────────────────────────────────
	if firstName == "" {
		return errors.New("first_name is required")
	}
	if lastName == "" {
		return errors.New("last_name is required")
	}
	if len(firstName) > maxNameLen || len(lastName) > maxNameLen {
		return errors.New("first_name and last_name must be at most 100 characters")
	}

	return nil
}

// validateEmailDeliverable checks that the domain has DNS records indicating
// it can receive mail. RFC 5321 §5 says SMTP should try MX records first, then
// fall back to the domain's A/AAAA records — so either is enough to say "this
// domain at least exists on the public internet."
//
// Cost: one or two DNS lookups, bounded to ~3s via context. Skipped entirely
// when EMAIL_DNS_CHECK=false, and for reserved test TLDs (.test, .example,
// .invalid, .localhost per RFC 6761).
//
// Fail-open policy: only reject on a definitive "this domain does not exist"
// signal (NXDOMAIN). Transient errors (timeout, network unreachable, resolver
// down) let the registration through — better to occasionally accept a typo
// than to block real users when DNS is flaky.
func validateEmailDeliverable(parent context.Context, domain string) error {
	if strings.EqualFold(os.Getenv("EMAIL_DNS_CHECK"), "false") {
		return nil
	}
	if dot := strings.LastIndex(domain, "."); dot != -1 {
		if reservedTestTLDs[strings.ToLower(domain[dot+1:])] {
			return nil
		}
	}

	ctx, cancel := context.WithTimeout(parent, emailDNSLookupTO)
	defer cancel()

	// MX records say "this domain accepts mail here."
	if mx, err := net.DefaultResolver.LookupMX(ctx, domain); err == nil && len(mx) > 0 {
		return nil
	}
	// Per RFC 5321 §5.1, a domain with only A/AAAA records can still receive
	// mail (the "implicit MX"). Try that before giving up.
	hosts, hostErr := net.DefaultResolver.LookupHost(ctx, domain)
	if hostErr == nil && len(hosts) > 0 {
		return nil
	}

	// Only reject when DNS gave us a definitive "no such domain" answer.
	// Anything else (timeout, EAI_AGAIN, network unreachable) is treated as
	// transient and we let the registration through.
	if isDNSNotFound(hostErr) {
		return errors.New("email domain doesn't appear to receive mail")
	}
	return nil
}

func isDNSNotFound(err error) bool {
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return dnsErr.IsNotFound
	}
	return false
}

type AuthService interface {
	Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error)
	Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error)
	AdminLogin(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error)
	Refresh(ctx context.Context, refreshToken string) (*models.AuthResponse, error)
	CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error)
	ListAdminUsers(ctx context.Context) ([]models.User, error)
	ListAllUsers(ctx context.Context) ([]models.User, error)
	UpdateUser(ctx context.Context, id string, req models.AdminUpdateUserRequest) (*models.User, error)
	FindUserByEmail(ctx context.Context, email string) (*models.User, error)
	ResetPassword(ctx context.Context, id, newPassword string) error
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
	email := normalizeEmail(req.Email)
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)

	if err := validateRegisterInput(ctx, email, req.Password, firstName, lastName); err != nil {
		return nil, err
	}

	// Reject if a user with this email already exists. The DB-level unique
	// index on `users.email` is the ultimate safety net (see NewUserRepository),
	// but checking here lets us return a clean 4xx instead of a 500.
	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return nil, errors.New("user already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Role:         models.RoleCustomer,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err = s.users.Create(ctx, &user); err != nil {
		// Race-condition fallback: another concurrent Register slipped past
		// the FindByEmail check but tripped the unique index. Surface a clean
		// error instead of leaking the raw Mongo duplicate-key message.
		if mongo.IsDuplicateKeyError(err) {
			return nil, errors.New("user already exists")
		}
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
	// Staff are allowed in: they sign into the same back-office shell (a
	// restricted "Staff Portal" — see AdminLayout) as management. Only customers
	// are excluded from the admin login.
	return s.loginWithRoleGuard(ctx, req, models.ManagementRoles)
}

func (s *authService) CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error) {
	role := req.Role
	if role == "" {
		role = models.RoleCustomer
	}

	if !isAssignableRole(role) {
		return nil, errors.New("invalid role")
	}

	email := normalizeEmail(req.Email)
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)

	if err := validateRegisterInput(ctx, email, req.Password, firstName, lastName); err != nil {
		return nil, err
	}

	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return nil, errors.New("user already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := models.User{
		ID:           primitive.NewObjectID(),
		Email:        email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Role:         role,
		BranchSlugs:  req.BranchSlugs,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.users.Create(ctx, &user); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, errors.New("user already exists")
		}
		return nil, err
	}

	return &user, nil
}

func (s *authService) ListAdminUsers(ctx context.Context) ([]models.User, error) {
	return s.users.FindByRoles(ctx, []models.Role{models.RoleAdmin, models.RoleBranchManager})
}

func (s *authService) loginWithRoleGuard(ctx context.Context, req models.LoginRequest, allowedRoles []models.Role) (*models.AuthResponse, error) {
	user, err := s.users.FindByEmail(ctx, normalizeEmail(req.Email))
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
			// The credentials were valid, but this account isn't a management
			// role. Make that explicit so staff/parents who land on the admin
			// login don't think their password is wrong.
			return nil, errors.New("this account doesn't have staff or admin access — parents sign in at the main login page")
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
	if req.Role != "" && !isAssignableRole(req.Role) {
		return nil, errors.New("invalid role")
	}
	if req.Password != "" {
		if err := s.ResetPassword(ctx, id, req.Password); err != nil {
			return nil, err
		}
	}
	return s.users.Update(ctx, id, req)
}

func (s *authService) ResetPassword(ctx context.Context, id, newPassword string) error {
	if len(newPassword) < 8 || len(newPassword) > 72 {
		return errors.New("password must be between 8 and 72 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.users.UpdatePassword(ctx, id, string(hash))
}

func (s *authService) DeleteUser(ctx context.Context, id string) error {
	return s.users.Delete(ctx, id)
}

// FindUserByEmail looks up a login account by email (nil when none). Used by the
// staff module to link an existing account when enabling a person's login.
func (s *authService) FindUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return s.users.FindByEmail(ctx, normalizeEmail(email))
}

// isAssignableRole reports whether a role can be assigned to a user account.
func isAssignableRole(role models.Role) bool {
	if role == models.RoleCustomer {
		return true
	}
	for _, r := range models.ManagementRoles {
		if r == role {
			return true
		}
	}
	return false
}

func (s *authService) UpsertOAuthUser(ctx context.Context, email, firstName, lastName, provider, providerID string) (*models.AuthResponse, error) {
	normalized := normalizeEmail(email)
	user := &models.User{
		ID:            primitive.NewObjectID(),
		Email:         normalized,
		FirstName:     firstName,
		LastName:      lastName,
		Role:          models.RoleCustomer,
		OAuthProvider: provider,
		OAuthID:       providerID,
		PasswordHash:  "",
	}

	result, err := s.users.UpsertByEmail(ctx, normalized, user)
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
