---
id: ROLE-TC-002
number: 1.4.8
type: Test Case
title: A Branch Manager cannot create or archive a branch (lifecycle is super-admin only)
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

# Branch Manager cannot do branch lifecycle actions

Replaces legacy `RoleSuite.tc_role_001b_branchManagerCannotDoBranchLifecycle`.
Reads the shared `managerSession` suite fixture — see `ROLE-TC-001`.

```bnrest
Given Post /api/v1/admin/branches Into createAttempt Using managerSession.accessToken
{
  "name": "Should Not Exist",
  "slug": "should-not-exist",
  "capacity": 10
}
Then AssertStatus createAttempt 403

When Post /api/v1/admin/branches/${branch.slug}/archive Into archiveAttempt Using managerSession.accessToken
Then AssertStatus archiveAttempt 403
```
