---
id: STAFF-UTIL-001
number: U.4
type: Test Util
title: Create a staff member (optionally with a login)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - staff
fixtureScope: case
timeoutSeconds: 30
---

# Create a staff member

The one authoritative staff-creation implementation — serves both plain
employment records (`StaffSuite`-derived cases) and staff **logins**
(`RoleSuite`-derived cases), since they're the same endpoint with a few
extra fields. Pass `enableLogin: false` and empty `loginRole`/
`loginPassword` for a plain record.

Inputs: `input.accessToken`, `input.firstName`, `input.lastName`,
`input.email`, `input.branchSlug`, `input.jobTitle`, `input.enableLogin`,
`input.loginRole`, `input.loginPassword`.

```bnrest
Post /api/v1/admin/staff Into created Using input.accessToken
{
  "first_name": "${input.firstName}",
  "last_name": "${input.lastName}",
  "email": "${input.email}",
  "branch_slug": "${input.branchSlug}",
  "job_title": "${input.jobTitle}",
  "status": "active",
  "enable_login": ${input.enableLogin},
  "login_role": "${input.loginRole}",
  "login_password": "${input.loginPassword}"
}

AssertStatus created 201
Assert created.body.data.id != null

Output
{
  "id": "${created.body.data.id}",
  "userId": "${created.body.data.user_id}",
  "email": "${created.body.data.email}",
  "ref": "${created.body.data.ref}"
}
```
