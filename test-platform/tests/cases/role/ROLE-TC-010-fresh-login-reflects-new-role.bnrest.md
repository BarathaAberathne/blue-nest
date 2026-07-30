---
id: ROLE-TC-010
number: 1.4.16
type: Test Case
title: Logging back in AFTER the downgrade correctly reflects the NEW, reduced permissions
owner: QA
mode: Dependent
status: Active
tags:
  - role
dependsOn:
  - ROLE-TC-009
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Fresh login reflects the new role

Replaces legacy `RoleSuite.tc_role_003b_freshLoginReflectsNewRole`. Genuinely
`dependsOn: [ROLE-TC-009]` (not just a suite-fixture read like the other
Role cases) — this needs `ROLE-TC-009` to have actually performed the role
downgrade; if that case didn't pass, this one is skipped with a clear
reason instead of failing confusingly.

Uses `Call Fresh` — `AUTH-UTIL-001` is `fixtureScope: run`, so a plain
`Call` with the same email+password as the suite `Setup`'s original
`deputySession` login would silently return that **cached, pre-downgrade**
token instead of genuinely logging in again (found while building this
test — exactly the failure mode this test exists to catch, just happening
inside the test harness itself instead of the real system).

```bnrest
Given Call Fresh ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into freshSession
{
  "email": "${deputy.email}",
  "password": "RoleSuiteDeputy2026!"
}

When Get /api/v1/admin/enquiries?branch=${branch.slug} Into attempt Using freshSession.accessToken
Then AssertStatus attempt 403
```
