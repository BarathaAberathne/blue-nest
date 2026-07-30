---
id: ROLE-TC-007
number: 1.4.13
type: Test Case
title: The same escalation attempt via UPDATE (upgrading an existing login) is also rejected
owner: QA
mode: Standalone
status: Active
tags:
  - role
  - regression
  - security
dependsOn: []
uses:
  - STAFF-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Deputy Manager cannot escalate to super_admin via update (CRITICAL regression)

Replaces legacy `RoleSuite.tc_role_002e_reg_deputyCannotEscalateViaUpdate`.
Reads the shared `deputySession`/`adminSession` suite fixtures — see
`ROLE-TC-001`.

```bnrest
Setup
Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into target
{
  "accessToken": "${deputySession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Upgrade Target",
  "email": "qa-autotest-upgrade-target-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": true,
  "loginRole": "staff",
  "loginPassword": "UpgradeTarget2026!"
}

Body
When Put /api/v1/admin/staff/${target.id} Into upgradeAttempt Using deputySession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Upgrade Target",
  "email": "${target.email}",
  "branch_slug": "${branch.slug}",
  "enable_login": true,
  "login_role": "super_admin",
  "login_password": "UpgradeTarget2026!"
}
Then AssertStatus upgradeAttempt 403

Teardown
Delete /api/v1/admin/staff/${target.id} Using adminSession.accessToken
Delete /api/v1/admin/users/${target.userId} Using adminSession.accessToken
```
