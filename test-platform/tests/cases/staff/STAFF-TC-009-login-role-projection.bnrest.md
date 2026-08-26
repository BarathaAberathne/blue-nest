---
id: STAFF-TC-009
number: 1.4.19
type: Test Case
title: Staff profile projects the linked account's live system role (single source of truth)
owner: QA
mode: Standalone
status: Active
tags:
  - staff
  - functional
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - STAFF-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
fixtureScope: case
timeoutSeconds: 30
---

# System-role consistency (the Dolvy mismatch)

Regression lock for the job-title/system-role drift fix: `user.role` is the
SINGLE source of truth, and `GET /admin/staff/{id}` projects it live as
`login_role` — so the staff profile and the users page can never disagree,
whichever surface the role was changed on:

1. staff created with a login → the projection reports that role;
2. role changed on the USERS page → the staff profile reports the new role
   with no staff-side write;
3. role changed via the STAFF form's login section → same stored field,
   projection follows.

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

Set roleSuffix = random()

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${session.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "RoleProj-${roleSuffix}",
  "email": "qa-autotest-roleproj-${roleSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "Nursery Manager",
  "enableLogin": true,
  "loginRole": "deputy_manager",
  "loginPassword": "RoleProj2026!"
}

Body
# 1. The staff read projects the account role it was created with.
When Get /api/v1/admin/staff/${staff.id} Into fresh Using session.accessToken
Then AssertStatus fresh 200
And Assert fresh.body.data.login_role == "deputy_manager"
And Assert fresh.body.data.job_title == "Nursery Manager"

# 2. Promote on the USERS page — the staff profile follows with no staff write.
When Put /api/v1/admin/users/${staff.userId} Into promoted Using session.accessToken
{
  "role": "regional_manager"
}
Then AssertStatus promoted 200

When Get /api/v1/admin/staff/${staff.id} Into afterUsersEdit Using session.accessToken
Then AssertStatus afterUsersEdit 200
And Assert afterUsersEdit.body.data.login_role == "regional_manager"

# 3. Change via the STAFF form's login section — same single stored field.
When Put /api/v1/admin/staff/${staff.id} Into viaStaffForm Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "RoleProj-${roleSuffix}",
  "branch_slug": "${branch.slug}",
  "email": "qa-autotest-roleproj-${roleSuffix}@bluenest.test",
  "enable_login": true,
  "login_role": "branch_manager"
}
Then AssertStatus viaStaffForm 200
And Assert viaStaffForm.body.data.user_id == staff.userId

When Get /api/v1/admin/staff/${staff.id} Into afterStaffEdit Using session.accessToken
Then AssertStatus afterStaffEdit 200
And Assert afterStaffEdit.body.data.login_role == "branch_manager"

Teardown
Delete /api/v1/admin/staff/${staff.id} Using session.accessToken
Delete /api/v1/admin/users/${staff.userId} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
