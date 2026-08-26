package service

// Regression locks for custom-role wiring + role-assignment privilege guards
// (the "Mahaveer escalation": a Permission-Builder custom role could neither
// be assigned nor log in, so the only way to grant one blog permission was
// escalating the account to a full management role):
//  1. isAssignableRole accepts the org's CUSTOM role definitions.
//  2. platform_super_admin (the only cross-tenant role) is assignable ONLY
//     from a cross-org context — an org super-admin could previously mint a
//     platform operator (the first operator comes from cmd/seedusers).
//  3. policy.CanGrantRole gates the org-wide tier (super_admin/admin/
//     director) + platform behind super-admin callers — actor-aware, so a
//     super_admin's legitimate grants keep working (legacy TC-ROLE-002f)
//     while a deputy's escalation stays blocked (002d/002e).
//  4. AdminLogin admits custom roles (it used to allowlist built-ins only,
//     mirroring neither middleware.ManagementOnly nor lib/auth.ts).

import (
	"context"
	"errors"
	"testing"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/policy"
	"github.com/blue-nest-montessori/api/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// fakeRoleDirectory resolves only the custom-role names it was seeded with.
type fakeRoleDirectory struct {
	defs map[string]*models.RoleDefinition
}

func (f *fakeRoleDirectory) FindByName(_ context.Context, name string) (*models.RoleDefinition, error) {
	if d, ok := f.defs[name]; ok {
		return d, nil
	}
	return nil, errors.New("not found")
}

func TestIsAssignableRole(t *testing.T) {
	svc := &authService{roles: &fakeRoleDirectory{defs: map[string]*models.RoleDefinition{
		"marketing": {Name: "marketing", Label: "Marketing", IsCustom: true},
	}}}
	ctx := context.Background()

	cases := []struct {
		role models.Role
		want bool
	}{
		{models.RoleCustomer, true},
		{models.RoleStaff, true},
		{models.RoleDeputyManager, true},
		{models.RoleSuperAdmin, true},          // still assignable — but only /admin/users reaches this, which is SuperAdminOnly
		{models.Role("marketing"), true},       // org custom role
		{models.RolePlatformSuperAdmin, false}, // cross-tenant: requires a cross-org caller (tested below)
		{models.Role("no-such-role"), false},   // undefined anywhere
	}
	for _, c := range cases {
		if got := svc.isAssignableRole(ctx, c.role); got != c.want {
			t.Errorf("isAssignableRole(%q) = %v, want %v", c.role, got, c.want)
		}
	}

	t.Run("platform role is assignable from a cross-org (platform operator) context", func(t *testing.T) {
		crossCtx := repository.WithCrossOrg(context.Background())
		if !svc.isAssignableRole(crossCtx, models.RolePlatformSuperAdmin) {
			t.Fatal("a platform operator must be able to provision another platform operator")
		}
		// The tenant-pinned case is the escalation the guard closes.
		orgCtx := repository.WithOrg(context.Background(), "org-1")
		if svc.isAssignableRole(orgCtx, models.RolePlatformSuperAdmin) {
			t.Fatal("a tenant-pinned caller must never assign platform_super_admin")
		}
	})

	t.Run("nil role directory falls back to built-ins only", func(t *testing.T) {
		bare := &authService{}
		if bare.isAssignableRole(ctx, models.Role("marketing")) {
			t.Fatal("custom role must not validate without a directory")
		}
		if !bare.isAssignableRole(ctx, models.RoleStaff) {
			t.Fatal("built-in roles must still validate without a directory")
		}
	})
}

func TestProvisionLoginRejectsCustomerRole(t *testing.T) {
	svc := &staffService{}
	st := &models.Staff{Email: "escalate@bluenest.test", BranchSlug: "harrow"}
	if err := svc.provisionLogin(context.Background(), st, models.StaffRequest{LoginRole: models.RoleCustomer}); err == nil {
		t.Error("provisionLogin must reject the customer role")
	}
}

// TestCanGrantRole locks the actor-aware staff-form grant matrix — the
// handler-level guard that keeps escalation closed WITHOUT breaking a
// super-admin's legitimate grants (legacy TC-ROLE-002d/e/f).
func TestCanGrantRole(t *testing.T) {
	gated := []models.Role{models.RoleSuperAdmin, models.RolePlatformSuperAdmin, models.RoleAdmin, models.RoleDirector}
	for _, target := range gated {
		if policy.CanGrantRole(models.RoleDeputyManager, target) {
			t.Errorf("deputy must not grant %q", target)
		}
		if policy.CanGrantRole(models.RoleBranchManager, target) {
			t.Errorf("branch manager must not grant %q", target)
		}
		if !policy.CanGrantRole(models.RoleSuperAdmin, target) {
			t.Errorf("super_admin must be able to grant %q (TC-ROLE-002f)", target)
		}
	}
	if !policy.CanGrantRole(models.RoleDeputyManager, models.RoleStaff) {
		t.Error("deputy must still grant ordinary staff logins")
	}
	if !policy.CanGrantRole(models.RoleDeputyManager, models.Role("marketing")) {
		t.Error("deputy must be able to grant a custom operational role")
	}
}

func TestAdminLoginAdmitsCustomRoles(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("Marketing2026!"), bcrypt.MinCost)
	repo := &fakeUserRepo{user: models.User{
		ID: primitive.NewObjectID(), Email: "marketing@bluenest.test",
		Role: models.Role("marketing"), PasswordHash: string(hash),
	}}
	svc := NewAuthService(repo, nil, "test-secret", 1, 24).(*authService)

	if _, err := svc.AdminLogin(context.Background(), models.LoginRequest{
		Email: "marketing@bluenest.test", Password: "Marketing2026!",
	}); err != nil {
		t.Fatalf("custom-role account must be admitted to the admin shell: %v", err)
	}

	repo.user.Role = models.RoleCustomer
	if _, err := svc.AdminLogin(context.Background(), models.LoginRequest{
		Email: "marketing@bluenest.test", Password: "Marketing2026!",
	}); err == nil {
		t.Fatal("customers must still be rejected from the admin login")
	}
}
