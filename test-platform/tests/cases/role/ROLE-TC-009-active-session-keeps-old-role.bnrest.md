---
id: ROLE-TC-009
number: 1.4.15
type: Test Case
title: An already-issued access token keeps its OLD role's permissions until refreshed
owner: QA
mode: Standalone
status: Active
tags:
  - role
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Active session keeps old role until refresh (documented session policy)

Replaces legacy `RoleSuite.tc_role_003_activeSessionKeepsOldRoleUntilRefresh`.
Reads the shared `deputySession`/`adminSession`/`deputy` suite fixtures —
see `ROLE-TC-001`. **Downgrades the shared deputy's role to `staff`** —
must run AFTER every other Role case that needs the deputy to still hold
`deputy_manager` (enforced by this suite's `Call` order, see
`SUI-STAFF-001`), and `ROLE-TC-010` depends on this having run.

```bnrest
Given Get /api/v1/admin/enquiries?branch=${branch.slug} Into beforeDowngrade Using deputySession.accessToken
Then AssertStatus beforeDowngrade 200

When Put /api/v1/admin/staff/${deputy.id} Into downgrade Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Role Deputy",
  "email": "${deputy.email}",
  "branch_slug": "${branch.slug}",
  "enable_login": true,
  "login_role": "staff",
  "login_password": "RoleSuiteDeputy2026!"
}
Then AssertStatus downgrade 200

When Get /api/v1/admin/enquiries?branch=${branch.slug} Into afterDowngrade Using deputySession.accessToken
Then AssertStatus afterDowngrade 200
```
