---
id: ROLE-TC-011
number: 1.4.20
type: Test Case
title: A Permission-Builder custom role works end-to-end — assignable, admits at admin login, scoped to its permissions
owner: QA
mode: Standalone
status: Active
tags:
  - role
  - functional
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - STAFF-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 40
---

# Custom role end-to-end (the "Mahaveer escalation")

Regression lock for the custom-role wiring fix. Before it, a
Permission-Builder custom role was unusable end-to-end — rejected by
`isAssignableRole` ("invalid role") AND by the AdminLogin built-in-role
allowlist — so granting one person blog access meant escalating them to a
full management role. This case proves the whole journey plus the new
privilege guards:

1. create a custom role with only blog.manage + dashboard.view;
2. it appears in `GET /admin/roles/assignable` (and platform_super_admin
   never does);
3. a staff member is created with it via the staff form's login path;
4. that account signs in at the ADMIN login and holds exactly its
   permissions: blog list 200, children 403;
5. the cross-tenant platform role cannot be minted from a tenant-pinned
   context via the staff form (even by a super_admin);
6. nor assigned on /admin/users by an org super-admin.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${session.accessToken}"
}

# NB: CreateCustom slugifies names and maps '-' to '_' — use the stored form.
Set roleName = "qa_autotest_marketing"

Post /api/v1/admin/roles Into customRole Using session.accessToken
{
  "name": "${roleName}",
  "label": "QA Marketing",
  "permissions": ["blog.manage", "dashboard.view"]
}
AssertStatus customRole 201

Body
# 2. Offered by the assignable directory; the cross-tenant role never is.
When Get /api/v1/admin/roles/assignable Into assignable Using session.accessToken
Then AssertStatus assignable 200
And AssertJson assignable "$.body.data[?(@.name=='${roleName}')]" == 1
And AssertJson assignable "$.body.data[?(@.name=='platform_super_admin')]" == 0

# 3. Staff created with the custom login role (the staff-form path).
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into intern
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "CustomRole Intern",
  "email": "qa-autotest-customrole-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Marketing Intern",
  "enableLogin": true,
  "loginRole": "${roleName}",
  "loginPassword": "CustomRole2026!"
}

# 4. Admits at the ADMIN login and is scoped to exactly its permissions.
When Post /api/v1/admin/auth/login Into internLogin
{
  "email": "${intern.email}",
  "password": "CustomRole2026!"
}
Then AssertStatus internLogin 200

When Get /api/v1/auth/me Into me Using internLogin.body.data.access_token
Then AssertStatus me 200
And Assert me.body.data.role == roleName

When Get /api/v1/admin/blog/posts Into blogOk Using internLogin.body.data.access_token
Then AssertStatus blogOk 200

When Get /api/v1/admin/children Into childrenDenied Using internLogin.body.data.access_token
Then AssertStatus childrenDenied 403

# 5. Even a super_admin cannot mint the cross-tenant platform role from a
# tenant-pinned context (via the staff form OR anywhere else) — a super_admin
# granting super_admin stays legitimate (legacy TC-ROLE-002f), and the
# deputy-actor escalation guards are policy.CanGrantRole (TC-ROLE-002d/e).
When Post /api/v1/admin/staff Into escalate Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Escalate",
  "email": "qa-autotest-escalate-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "enable_login": true,
  "login_role": "platform_super_admin",
  "login_password": "Escalate2026!"
}
Then AssertStatus escalate 400
And AssertJson escalate $.body.error contains "invalid role"

# 6. The cross-tenant role is never assignable on /admin/users.
When Put /api/v1/admin/users/${intern.userId} Into crossTenant Using session.accessToken
{
  "role": "platform_super_admin"
}
Then AssertStatus crossTenant 400

Teardown
Delete /api/v1/admin/staff/${intern.id} Using session.accessToken
Delete /api/v1/admin/users/${intern.userId} Using session.accessToken
Delete /api/v1/admin/roles/${roleName} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
