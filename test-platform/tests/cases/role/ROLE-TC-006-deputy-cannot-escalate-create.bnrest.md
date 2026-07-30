---
id: ROLE-TC-006
number: 1.4.12
type: Test Case
title: A Deputy Manager CANNOT grant themselves or anyone else super_admin (via create)
owner: QA
mode: Standalone
status: Active
tags:
  - role
  - regression
  - security
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Deputy Manager cannot escalate to super_admin via create (CRITICAL regression)

Replaces legacy `RoleSuite.tc_role_002d_reg_deputyCannotEscalateToSuperAdmin`
— the headline finding of the legacy suite: a `staff.manage` holder could
mint themselves a `super_admin` login. Reads the shared `deputySession`/
`adminSession` suite fixtures — see `ROLE-TC-001`.

```bnrest
Given Post /api/v1/admin/staff Into superAdminAttempt Using deputySession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Escalation Attempt",
  "email": "qa-autotest-escalation-attempt-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "enable_login": true,
  "login_role": "super_admin",
  "login_password": "EscalationAttempt2026!"
}
Then AssertStatus superAdminAttempt 403
And AssertJson superAdminAttempt $.body.error contains "cannot grant"

When Post /api/v1/admin/staff Into platformAdminAttempt Using deputySession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Platform Escalation Attempt",
  "email": "qa-autotest-platform-escalation-attempt-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "enable_login": true,
  "login_role": "platform_super_admin",
  "login_password": "EscalationAttempt2026!"
}
Then AssertStatus platformAdminAttempt 403

When Get /api/v1/admin/users Into allUsers Using adminSession.accessToken
Then AssertJson allUsers "$.body.data[?(@.last_name=='Escalation Attempt' || @.last_name=='Platform Escalation Attempt')]" == 0
```
