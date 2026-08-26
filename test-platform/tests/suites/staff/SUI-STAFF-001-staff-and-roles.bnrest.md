---
id: SUI-STAFF-001
number: "1.4"
type: Test Suite
title: Staff and Role Setup
owner: QA
mode: Standalone
status: Active
tags:
  - staff
  - role
---

# Staff and Role suite

Combines legacy `StaffSuite` + `RoleSuite` (spec's 12-suite lifecycle has
no separate `SUI-ROLE-*` — see `test-migration-map.md`'s suite-grouping
rationale). `Setup` creates **two** dynamic throwaway branches
(`BRANCH-FIX-001`/`002` — generic-architecture retrofit, this suite was the
last one still hardcoded to the real Harrow branch), the shared
deputy-manager/branch-manager logins and a test enquiry **once** for the
whole suite (spec §2 `suite` fixture scope — mirrors legacy `RoleSuite`'s
`@BeforeAll`); every `ROLE-TC-*` case reads `deputySession`/
`managerSession`/`adminSession`/`deputy`/`enquiry`/`branch`/`branchB` from
this shared suite scope rather than logging in or creating fixtures
itself. `branchB` exists only so `ROLE-TC-001`/`ROLE-TC-005` can genuinely
prove cross-branch rejection against a second real branch (previously
hardcoded to the real `pinner` branch). `STAFF-TC-*` cases are fully
independent and don't touch these shared fixtures — each creates its own
throwaway branch instead (see those cases' own Setup).

`ROLE-TC-009` (role downgrade) and `ROLE-TC-010` (fresh-login check) run
**last**, after every other Role case that needs the deputy to still hold
`deputy_manager` — order matters here (see those cases' own descriptions).

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

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{
  "accessToken": "${adminSession.accessToken}"
}

Set deputySuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into deputy
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Role Deputy",
  "email": "qa-autotest-role-deputy-${deputySuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Deputy Manager",
  "enableLogin": true,
  "loginRole": "deputy_manager",
  "loginPassword": "RoleSuiteDeputy2026!"
}
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into deputySession
{
  "email": "qa-autotest-role-deputy-${deputySuffix}@bluenest.test",
  "password": "RoleSuiteDeputy2026!"
}

Set managerSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into manager
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Role Manager",
  "email": "qa-autotest-role-manager-${managerSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Branch Manager",
  "enableLogin": true,
  "loginRole": "branch_manager",
  "loginPassword": "RoleSuiteManager2026!"
}
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into managerSession
{
  "email": "qa-autotest-role-manager-${managerSuffix}@bluenest.test",
  "password": "RoleSuiteManager2026!"
}

Post /api/v1/admin/enquiries Into enquiry Using adminSession.accessToken
{
  "name": "QA-AUTOTEST-RoleTestParent-${random()}",
  "email": "qa-autotest-role-test-parent-${random()}@bluenest.test",
  "phone": "07000000099",
  "branch": "${branch.slug}",
  "enquiry_type": "General enquiry",
  "source": "phone"
}
AssertStatus enquiry 201

Body
Call CatchError ../../cases/staff/STAFF-TC-001-create-staff-once.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-002-invalid-status-rejected.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-003-duplicate-email-create-rejected.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-004-duplicate-email-update-rejected.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-005-own-unchanged-email-allowed.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-006-partial-update-preserves-fields.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-007-profile-photo.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-008-link-existing-user-login.bnrest.md
Call CatchError ../../cases/staff/STAFF-TC-009-login-role-projection.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-011-custom-role-end-to-end.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-001-branch-manager-scoped.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-002-branch-manager-cannot-branch-lifecycle.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-003-deputy-can-operate-on-enquiries.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-004-deputy-cannot-view-users.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-005-deputy-cannot-access-other-branch.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-006-deputy-cannot-escalate-create.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-007-deputy-cannot-escalate-update.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-008-super-admin-can-grant-super-admin.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-009-active-session-keeps-old-role.bnrest.md
Call CatchError ../../cases/role/ROLE-TC-010-fresh-login-reflects-new-role.bnrest.md

Teardown
Delete /api/v1/admin/staff/${deputy.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${deputy.userId} Using adminSession.accessToken
Delete /api/v1/admin/staff/${manager.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${manager.userId} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupBranch
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupBranchB
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branchB.slug}"
}
```
