// Package policy centralises branch-scope + capability decisions so the rest of
// the codebase never scatters role/branch conditionals. It answers two things:
// which branches a caller may see (scope), and whether they may do a thing
// (capability), from (role, branch_slugs). See the enterprise hierarchy in the
// project guide: super_admin/admin/director see all branches; regional/branch/
// deputy managers are scoped to their assigned branch_slugs.
package policy

import "github.com/blue-nest-montessori/api/internal/models"

// orgWideRoles see every branch regardless of branch_slugs.
func orgWide(role models.Role) bool {
	switch role {
	case models.RoleSuperAdmin, models.RoleAdmin, models.RoleDirector:
		return true
	default:
		return false
	}
}

// AllowedBranches returns (all, slugs): if all is true the caller may see every
// branch (slugs is nil); otherwise slugs is the exact set they're scoped to.
// A branch_slugs entry of "*" also grants all.
func AllowedBranches(role models.Role, branchSlugs []string) (all bool, slugs []string) {
	if orgWide(role) {
		return true, nil
	}
	for _, s := range branchSlugs {
		if s == "*" {
			return true, nil
		}
	}
	return false, branchSlugs
}

// CanScope reports whether the caller may access a specific branch slug.
func CanScope(role models.Role, branchSlugs []string, slug string) bool {
	all, slugs := AllowedBranches(role, branchSlugs)
	if all {
		return true
	}
	for _, s := range slugs {
		if s == slug {
			return true
		}
	}
	return false
}

// FilterBranches returns only the branches the caller is scoped to.
func FilterBranches(role models.Role, branchSlugs []string, branches []models.Branch) []models.Branch {
	all, slugs := AllowedBranches(role, branchSlugs)
	if all {
		return branches
	}
	allowed := make(map[string]bool, len(slugs))
	for _, s := range slugs {
		allowed[s] = true
	}
	out := make([]models.Branch, 0, len(branches))
	for _, b := range branches {
		if allowed[b.Slug] {
			out = append(out, b)
		}
	}
	return out
}

// CanBranchLifecycle reports whether the caller may create/delete/archive/merge
// branches, assign managers, or connect Google/finance settings (super_admin).
func CanBranchLifecycle(role models.Role) bool {
	return models.HasPermission(role, models.PermBranchAdmin)
}

// CanManageBranch reports whether the caller may edit an in-scope branch.
func CanManageBranch(role models.Role, branchSlugs []string, slug string) bool {
	return models.HasPermission(role, models.PermBranchesManage) && CanScope(role, branchSlugs, slug)
}
