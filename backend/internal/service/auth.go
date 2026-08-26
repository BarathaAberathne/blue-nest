package service

import (
	"context"
	"errors"
	"net"
	"net/mail"
	"os"
	"strings"
	"sync"
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
	FindUserByID(ctx context.Context, id string) (*models.User, error)
	ResetPassword(ctx context.Context, id, newPassword string) error
	DeleteUser(ctx context.Context, id string) error
	UpsertOAuthUser(ctx context.Context, email, firstName, lastName, provider, providerID string) (*models.AuthResponse, error)
	// TokenVersion is the middleware revocation lookup: the user's current
	// token version (cached ~60s in-process, so it is one Mongo read per user
	// per minute, not per request). Returns an error for unknown/deleted users.
	TokenVersion(ctx context.Context, userID string) (int, error)
	// Logout revokes every token the user currently holds (token-version bump).
	Logout(ctx context.Context, userID string) error
}

type authService struct {
	users              repository.UserRepository
	roles              RoleDirectory // custom-role assignability lookup; nil-safe (built-ins only)
	jwtSecret          string
	jwtExpiry          time.Duration
	refreshTokenExpiry time.Duration

	// token-version cache (userID → version) backing the per-request Auth
	// check. Entries expire after tvCacheTTL; a revocation on THIS process
	// invalidates immediately. NOTE single-process: with multiple API
	// replicas a revocation propagates to other replicas within the TTL.
	tvMu    sync.Mutex
	tvCache map[string]tvEntry
}

type tvEntry struct {
	version int
	expires time.Time
}

// tvCacheTTL bounds how long a revoked token can outlive the bump on other
// processes / cache hits. 60s keeps Auth cheap while ending a fired user's
// session within a minute.
const tvCacheTTL = 60 * time.Second

// RoleDirectory is the subset of the role repository the auth service needs to
// validate role assignments: it resolves an org's role definitions (built-in
// AND Permission-Builder custom roles) in the caller's tenant context.
// RoleRepository satisfies it.
type RoleDirectory interface {
	FindByName(ctx context.Context, name string) (*models.RoleDefinition, error)
}

func NewAuthService(users repository.UserRepository, roles RoleDirectory, jwtSecret string, expiry time.Duration, refreshExpiry time.Duration) AuthService {
	return &authService{users: users, roles: roles, jwtSecret: jwtSecret, jwtExpiry: expiry, refreshTokenExpiry: refreshExpiry, tvCache: map[string]tvEntry{}}
}

func (s *authService) TokenVersion(ctx context.Context, userID string) (int, error) {
	s.tvMu.Lock()
	if e, ok := s.tvCache[userID]; ok && time.Now().Before(e.expires) {
		s.tvMu.Unlock()
		return e.version, nil
	}
	s.tvMu.Unlock()

	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return 0, err
	}
	s.tvMu.Lock()
	// Opportunistic cache hygiene: drop expired entries so the map cannot
	// grow unboundedly across many distinct users.
	now := time.Now()
	for k, e := range s.tvCache {
		if now.After(e.expires) {
			delete(s.tvCache, k)
		}
	}
	// Monotonic guard: versions only ever increase, so never let a fetch that
	// raced a concurrent bump (read pre-$inc, arrived post-invalidation)
	// overwrite a NEWER cached version with a stale one. Without this, a
	// background request in flight during a logout could resurrect the old
	// version for a full TTL and 401 fresh post-logout logins as "revoked".
	if e, ok := s.tvCache[userID]; !ok || user.TokenVersion >= e.version {
		s.tvCache[userID] = tvEntry{version: user.TokenVersion, expires: now.Add(tvCacheTTL)}
	}
	v := s.tvCache[userID].version
	s.tvMu.Unlock()
	return v, nil
}

// revokeTokens bumps the user's token version and writes the NEW version into
// the cache (not a bare delete — a delete races with concurrent lookups
// re-caching the pre-bump value; see the monotonic guard in TokenVersion).
func (s *authService) revokeTokens(ctx context.Context, userID string) error {
	newVersion, err := s.users.BumpTokenVersion(ctx, userID)
	if err != nil {
		return err
	}
	s.tvMu.Lock()
	s.tvCache[userID] = tvEntry{version: newVersion, expires: time.Now().Add(tvCacheTTL)}
	s.tvMu.Unlock()
	return nil
}

func (s *authService) Logout(ctx context.Context, userID string) error {
	return s.revokeTokens(ctx, userID)
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

	// Re-fetch rather than minting from the local `user` value: TenantCollection's
	// InsertOne stamps org_id onto the document it sends to Mongo, not back onto
	// this in-memory struct (see repository/tenant.go stampOrg), so the local
	// copy's OrgID is still "" here. Login already re-fetches via FindByEmail for
	// this same reason; without it, every newly registered customer's very first
	// token would carry an empty org_id, which middleware.Auth then treats as
	// cross-org — leaving their own orders un-scoped and invisible to admin reads.
	created, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	user = *created

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
	// are excluded from the admin login — mirroring middleware.ManagementOnly,
	// so Permission-Builder CUSTOM roles are admitted too (they used to be
	// rejected here by a literal built-in-role allowlist, which made custom
	// roles unusable end-to-end even when assigned).
	return s.loginWithRoleGuard(ctx, req, func(r models.Role) bool { return r != models.RoleCustomer })
}

func (s *authService) CreateAdminUser(ctx context.Context, req models.AdminCreateUserRequest) (*models.User, error) {
	role := req.Role
	if role == "" {
		role = models.RoleCustomer
	}

	if !s.isAssignableRole(ctx, role) {
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

func (s *authService) loginWithRoleGuard(ctx context.Context, req models.LoginRequest, roleAllowed func(models.Role) bool) (*models.AuthResponse, error) {
	user, err := s.users.FindByEmail(ctx, normalizeEmail(req.Email))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	if roleAllowed != nil && !roleAllowed(user.Role) {
		// The credentials were valid, but this account isn't a management
		// role. Make that explicit so staff/parents who land on the admin
		// login don't think their password is wrong.
		return nil, errors.New("this account doesn't have staff or admin access — parents sign in at the main login page")
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

	// Revocation check: a refresh token minted before the user's last
	// logout / password change / role change carries a stale "tv" claim and
	// must not mint a fresh pair. A missing claim reads as version 0, which
	// keeps pre-revocation-era sessions valid until their first bump.
	tokenVersion := 0
	if tv, ok := claims["tv"].(float64); ok {
		tokenVersion = int(tv)
	}
	if tokenVersion != user.TokenVersion {
		return nil, errors.New("invalid or expired refresh token")
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
	if req.Role != "" && !s.isAssignableRole(ctx, req.Role) {
		return nil, errors.New("invalid role")
	}
	if req.Password != "" {
		if err := s.ResetPassword(ctx, id, req.Password); err != nil {
			return nil, err
		}
	}
	updated, err := s.users.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}
	// A role or branch-scope change must invalidate the user's existing
	// tokens — role and branch_slugs live in the JWT claims and are never
	// re-read from the DB per request, so without a revocation a demoted
	// user keeps their old powers until the token expires.
	if req.Role != "" || req.BranchSlugs != nil {
		_ = s.revokeTokens(ctx, id) // best-effort; the update itself succeeded
	}
	return updated, nil
}

func (s *authService) ResetPassword(ctx context.Context, id, newPassword string) error {
	if len(newPassword) < 8 || len(newPassword) > 72 {
		return errors.New("password must be between 8 and 72 characters")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.users.UpdatePassword(ctx, id, string(hash)); err != nil {
		return err
	}
	// A password change ends every existing session (stolen-credential reset
	// must actually lock the thief out).
	_ = s.revokeTokens(ctx, id)
	return nil
}

func (s *authService) DeleteUser(ctx context.Context, id string) error {
	return s.users.Delete(ctx, id)
}

// FindUserByEmail looks up a login account by email (nil when none). Used by the
// staff module to link an existing account when enabling a person's login.
func (s *authService) FindUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return s.users.FindByEmail(ctx, normalizeEmail(email))
}

// FindUserByID resolves one user account — used by the staff module to project
// the linked login's system role onto staff reads (Staff.LoginRole), and by the
// users admin handler to audit role changes with their before value.
func (s *authService) FindUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.users.FindByID(ctx, id)
}

// isAssignableRole reports whether a role can be assigned to a user account:
// customer, any built-in back-office role, or a role DEFINED for the caller's
// org (the Permission Builder's custom roles — resolved through the
// tenant-scoped roles collection, so one tenant's custom role never validates
// in another). platform_super_admin — the only cross-tenant role — is
// assignable ONLY from a cross-org context, i.e. by an existing platform
// operator (middleware.Auth pins tenant callers to their org, so an org
// super-admin minting a platform operator was a cross-org privilege
// escalation). The first platform operator is provisioned by cmd/seedusers
// (DEFAULT_PLATFORM_EMAIL/PASSWORD), not through these endpoints.
func (s *authService) isAssignableRole(ctx context.Context, role models.Role) bool {
	if role == models.RolePlatformSuperAdmin {
		// Fail-closed: only the EXPLICIT cross-org marker (a platform
		// operator's request context) qualifies — a bare context does not.
		return repository.IsCrossOrg(ctx)
	}
	if role == models.RoleCustomer {
		return true
	}
	for _, r := range models.ManagementRoles {
		if r == role {
			return true
		}
	}
	if s.roles != nil {
		if def, err := s.roles.FindByName(ctx, string(role)); err == nil && def != nil {
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
		"org_id":       user.OrgID, // tenant the user belongs to (multi-tenancy)
		"branch_slugs": user.BranchSlugs,
		"type":         tokenType,
		"tv":           user.TokenVersion, // revocation: Auth/Refresh reject a stale version
		"exp":          time.Now().Add(expiry).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}
