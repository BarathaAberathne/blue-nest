// Package policy centralises branch-scope + capability decisions so the rest of
// the codebase never scatters role/branch conditionals. It answers two things:
// which branches a caller may see (scope), and whether they may do a thing
// (capability), from (role, branch_slugs). See the enterprise hierarchy in the
// project guide: super_admin/admin/director see all branches; regional/branch/
// deputy managers are scoped to their assigned branch_slugs.
package policy

import "github.com/blue-nest-montessori/api/internal/models"

// IsPlatformOperator reports whether the role is the cross-tenant SaaS operator.
// It is the ONLY role that may act outside its own organisation (e.g. manage the
// list of organisations, or run platform-wide analytics). Every other role —
// including super_admin/admin/director — is confined to its own tenant, enforced
// centrally by the repository tenant wrapper.
func IsPlatformOperator(role models.Role) bool {
	return role == models.RolePlatformSuperAdmin
}

// orgWideRoles see every branch regardless of branch_slugs (WITHIN their org).
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

// EffectiveBranch resolves which branch a list/summary query runs against so a
// branch-scoped caller can never read another branch's data. It returns the
// branch to query and whether the request is permitted:
//   - org-wide roles: an explicit branch is honoured; no branch ⇒ "" (all).
//   - scoped roles: an explicit branch must be one they hold (else denied); no
//     branch ⇒ pinned to their first branch (they view one branch at a time, so
//     the "all branches" view never leaks). A scoped caller with no branches at
//     all is denied.
func EffectiveBranch(role models.Role, branchSlugs []string, requested string) (branch string, ok bool) {
	all, slugs := AllowedBranches(role, branchSlugs)
	if requested != "" {
		if all {
			return requested, true
		}
		for _, s := range slugs {
			if s == requested {
				return requested, true
			}
		}
		return "", false
	}
	if all {
		return "", true
	}
	if len(slugs) > 0 {
		return slugs[0], true
	}
	return "", false
}

// AllowedOrNil returns the caller's branch set for filtering mutations, or nil
// when the caller is org-wide (nil = no restriction). A scoped caller with no
// branches returns an empty (non-nil) slice, which matches nothing.
func AllowedOrNil(role models.Role, branchSlugs []string) []string {
	all, slugs := AllowedBranches(role, branchSlugs)
	if all {
		return nil
	}
	if slugs == nil {
		return []string{}
	}
	return slugs
}

// InAllowed reports whether branch is within an allowed set (nil = unrestricted).
func InAllowed(allowed []string, branch string) bool {
	if allowed == nil {
		return true
	}
	for _, s := range allowed {
		if s == branch {
			return true
		}
	}
	return false
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
