---
id: SUI-USERACCOUNT-001
number: "2.7"
type: Test Suite
title: User Account Management (Users, Roles, Org Self-Service, Platform Organisations, Dashboards)
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
---

# User Account Management suite

New coverage (no legacy equivalent). Verified against
`internal/models/{user,permission,role,organisation}.go`,
`internal/handler/admin/{users,roles,organisations,dashboard_profiles}.go`,
`internal/handler/dashboard_layout.go`. `Setup` creates one admin login
and a dynamic branch (used only by `USER-TC-003`'s non-super-admin
fixture).

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${adminSession.accessToken}"
}

Body
Call CatchError ../../cases/useraccount/USER-TC-001-create-user-validation.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-002-self-lockout-guards.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-003-non-super-admin-rejected.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-004-custom-role-lifecycle.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-005-org-self-service.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-006-platform-organisations.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-007-personal-dashboard-layout.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-008-dashboard-profiles.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-009-new-org-roles-seeded.bnrest.md
Call CatchError ../../cases/useraccount/USER-TC-010-branch-slug-org-scoped.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
