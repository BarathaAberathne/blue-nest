---
id: USER-TC-003
number: 2.7.3
type: Test Case
title: A management user who isn't super_admin is rejected from user-management routes with 403
owner: QA
mode: Standalone
status: Active
tags:
  - useraccount
  - security
dependsOn: []
uses:
  - STAFF-UTIL-001
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Non-super-admin is rejected

New coverage (`SUI-USERACCOUNT-001`). `AdminOnly` = super_admin|admin|
branch_manager, so a plain `admin` role reaches the shell but is still
outside `SuperAdminOnly`. Reads the shared `adminSession`/`branch` suite
fixtures — see `SUI-USERACCOUNT-001`.

```bnrest
Setup
Set plainAdminSuffix = random()
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into plainAdmin
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "PlainAdmin-${plainAdminSuffix}",
  "email": "qa-autotest-plainadmin-${plainAdminSuffix}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": true,
  "loginRole": "admin",
  "loginPassword": "PlainAdmin2027!"
}
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into plainAdminSession
{
  "email": "qa-autotest-plainadmin-${plainAdminSuffix}@bluenest.test",
  "password": "PlainAdmin2027!"
}

Body
When Get /api/v1/admin/users Into rejected Using plainAdminSession.accessToken
Then AssertStatus rejected 403

When Get /api/v1/admin/roles Into rejectedRoles Using plainAdminSession.accessToken
Then AssertStatus rejectedRoles 403

Teardown
Delete /api/v1/admin/staff/${plainAdmin.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${plainAdmin.userId} Using adminSession.accessToken
```
