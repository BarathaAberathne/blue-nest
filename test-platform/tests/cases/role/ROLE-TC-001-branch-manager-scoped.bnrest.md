---
id: ROLE-TC-001
number: 1.4.7
type: Test Case
title: A Branch Manager sees Harrow operational data and is rejected for another branch
owner: QA
mode: Standalone
status: Active
tags:
  - role
  - security
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Branch Manager is scoped to their own branch

Replaces legacy `RoleSuite.tc_role_001_branchManagerScopedToOwnBranch`.
Reads the shared `managerSession`/`branch`/`branchB` fixtures created once
in `SUI-STAFF-001`'s own `Setup` (spec §2 `suite` fixture scope) — this
case can only run as part of that suite, never standalone (`mode:
Standalone` here means "doesn't depend on another CASE's pass/fail", not
"has no external state" — if the suite's own `Setup` fails, this fails
with a clear undefined-variable error instead). `branchB` is a second,
independent dynamic branch — genuinely proving cross-branch rejection,
not just a hardcoded second real branch name.

```bnrest
Given Get /api/v1/admin/enquiries?branch=${branch.slug} Into ownBranch Using managerSession.accessToken
Then AssertStatus ownBranch 200

When Get /api/v1/admin/enquiries?branch=${branchB.slug} Into otherBranch Using managerSession.accessToken
Then AssertStatus otherBranch 403
```
