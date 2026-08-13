package service

import (
	"context"

	"github.com/blue-nest-montessori/api/internal/models"
	"github.com/blue-nest-montessori/api/internal/repository"
)

// usersWithPermission returns the ids of users whose role holds perm and whose
// branch scope covers branch (org-wide users carry no branch_slugs and always
// match). This is the single notification-audience resolver — leave approvals,
// daily-log approvals and induction reviews all route through it. Best-effort:
// empty on any error, because resolving an audience must never block the
// underlying operation.
func usersWithPermission(ctx context.Context, users repository.UserRepository, perm models.Permission, branch string) []string {
	if users == nil {
		return nil
	}
	orgID, _ := repository.OrgFromContext(ctx)
	all, err := users.FindAll(ctx)
	if err != nil {
		return nil
	}
	var ids []string
	for _, u := range all {
		if !models.HasPermission(orgID, u.Role, perm) {
			continue
		}
		if len(u.BranchSlugs) == 0 || contains(u.BranchSlugs, branch) {
			ids = append(ids, u.ID.Hex())
		}
	}
	return ids
}
