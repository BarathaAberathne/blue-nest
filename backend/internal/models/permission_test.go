package models

import "testing"

// TestRolePermissionsAreOrgScoped locks the per-org isolation of the effective
// role->permission cache: a custom role or an edited built-in in one org must
// not leak into another, and an org with no cached slice falls back to the
// built-in code defaults.
func TestRolePermissionsAreOrgScoped(t *testing.T) {
	const orgA, orgB = "orgAAAAAAAAAAAAAAAAAAAAA", "orgBBBBBBBBBBBBBBBBBBBBB"

	// Org A: a custom role "weekend_cover" with one permission, and a built-in
	// (branch_manager) trimmed to dashboard-only.
	SetRolePermissions(orgA, map[Role][]Permission{
		"weekend_cover":     {PermDashboardView},
		RoleBranchManager:   {PermDashboardView},
	}, map[Role]string{"weekend_cover": "Weekend Cover"})

	// Org B: branch_manager keeps leave.approve; no custom role.
	SetRolePermissions(orgB, map[Role][]Permission{
		RoleBranchManager: {PermDashboardView, PermLeaveApprove},
	}, nil)

	// Custom role is effective only in org A.
	if !HasPermission(orgA, "weekend_cover", PermDashboardView) {
		t.Error("org A custom role should have dashboard.view")
	}
	if HasPermission(orgB, "weekend_cover", PermDashboardView) {
		t.Error("org A custom role must NOT leak into org B")
	}

	// The same built-in role resolves to different permissions per org.
	if HasPermission(orgA, RoleBranchManager, PermLeaveApprove) {
		t.Error("org A branch_manager was trimmed and must not have leave.approve")
	}
	if !HasPermission(orgB, RoleBranchManager, PermLeaveApprove) {
		t.Error("org B branch_manager should keep leave.approve")
	}

	// An org with no cached slice falls back to the built-in code defaults.
	const orgC = "orgCCCCCCCCCCCCCCCCCCCCC"
	if !HasPermission(orgC, RoleSuperAdmin, PermLeaveApprove) {
		t.Error("uncached org should fall back to code defaults (super_admin has everything)")
	}
}
