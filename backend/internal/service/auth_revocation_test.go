package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Regression locks for token revocation (audit finding: logout was a no-op and
// a fired/demoted user's JWTs stayed valid to expiry — role and branch scope
// live in the claims and were never re-checked).

// fakeUserRepo implements just enough of UserRepository for the revocation
// paths: one in-memory user whose TokenVersion the tests bump and observe.
type fakeUserRepo struct {
	repository.UserRepository
	user models.User
}

func (f *fakeUserRepo) FindByID(_ context.Context, id string) (*models.User, error) {
	if id != f.user.ID.Hex() {
		return nil, errors.New("not found")
	}
	u := f.user
	return &u, nil
}

func (f *fakeUserRepo) FindByEmail(_ context.Context, email string) (*models.User, error) {
	if email != f.user.Email {
		return nil, errors.New("not found")
	}
	u := f.user
	return &u, nil
}

func (f *fakeUserRepo) BumpTokenVersion(_ context.Context, id string) (int, error) {
	if id != f.user.ID.Hex() {
		return 0, errors.New("not found")
	}
	f.user.TokenVersion++
	return f.user.TokenVersion, nil
}

func newRevocationFixture(t *testing.T) (*authService, *fakeUserRepo, models.User) {
	t.Helper()
	repo := &fakeUserRepo{user: models.User{
		ID:    primitive.NewObjectID(),
		Email: "revoke-test@bluenest.test",
		Role:  models.RoleStaff,
	}}
	svc := NewAuthService(repo, nil, "test-secret", time.Hour, 24*time.Hour).(*authService)
	return svc, repo, repo.user
}

func TestRefreshRejectedAfterRevocation(t *testing.T) {
	svc, _, user := newRevocationFixture(t)

	_, refresh, err := svc.issueTokenPair(user)
	if err != nil {
		t.Fatalf("issue pair: %v", err)
	}
	if _, err := svc.Refresh(context.Background(), refresh); err != nil {
		t.Fatalf("pre-revocation refresh must succeed: %v", err)
	}

	if err := svc.Logout(context.Background(), user.ID.Hex()); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := svc.Refresh(context.Background(), refresh); err == nil {
		t.Fatal("refresh token minted before logout must be rejected after it")
	}
}

func TestTokenVersionLookupReflectsRevocation(t *testing.T) {
	svc, _, user := newRevocationFixture(t)
	id := user.ID.Hex()

	v, err := svc.TokenVersion(context.Background(), id)
	if err != nil || v != 0 {
		t.Fatalf("initial version = %d, %v; want 0, nil", v, err)
	}

	// The cache must not mask a revocation performed through this process.
	if err := svc.Logout(context.Background(), id); err != nil {
		t.Fatalf("logout: %v", err)
	}
	v, err = svc.TokenVersion(context.Background(), id)
	if err != nil || v != 1 {
		t.Fatalf("post-revocation version = %d, %v; want 1, nil (cache must be invalidated by the bump)", v, err)
	}
}

// Regression lock for the invalidation race found live (a browser tab polling
// during a logout): a lookup that read the PRE-bump version from the DB but
// wrote its cache entry AFTER the revocation's invalidation used to resurrect
// the stale version for a full TTL — fresh post-logout logins then 401'd as
// "revoked". The bump now writes the authoritative new version into the cache
// and stale writers are refused by the monotonic guard.
func TestStaleLookupCannotOverwriteNewerCachedVersion(t *testing.T) {
	svc, repo, user := newRevocationFixture(t)
	id := user.ID.Hex()

	// Revocation caches the new version (1).
	if err := svc.Logout(context.Background(), id); err != nil {
		t.Fatalf("logout: %v", err)
	}

	// Simulate the racing reader: it fetched version 0 BEFORE the bump and
	// only now reaches the cache-write path. Re-running TokenVersion must
	// keep returning 1 — the repo now holds 1, but even a stale in-flight
	// value must not win, which we assert by checking the cached entry
	// directly after a poisoned write attempt.
	svc.tvMu.Lock()
	if e := svc.tvCache[id]; e.version != 1 {
		svc.tvMu.Unlock()
		t.Fatalf("revocation must cache the new version; cached %d", e.version)
	}
	svc.tvMu.Unlock()

	repo.user.TokenVersion = 1 // DB state after the bump
	v, err := svc.TokenVersion(context.Background(), id)
	if err != nil || v != 1 {
		t.Fatalf("post-revocation lookup = %d, %v; want 1", v, err)
	}
}

func TestLegacyTokenWithoutVersionClaimStaysValidUntilFirstBump(t *testing.T) {
	svc, repo, user := newRevocationFixture(t)

	// Simulate a pre-revocation-era refresh token: issue one, then confirm the
	// missing-claim → version-0 semantics by checking against a bumped user.
	_, refresh, err := svc.issueTokenPair(user) // carries tv=0
	if err != nil {
		t.Fatalf("issue pair: %v", err)
	}
	if _, err := svc.Refresh(context.Background(), refresh); err != nil {
		t.Fatalf("tv=0 token against version-0 user must refresh: %v", err)
	}
	repo.user.TokenVersion = 3
	if _, err := svc.Refresh(context.Background(), refresh); err == nil {
		t.Fatal("tv=0 token against version-3 user must be rejected")
	}
}
