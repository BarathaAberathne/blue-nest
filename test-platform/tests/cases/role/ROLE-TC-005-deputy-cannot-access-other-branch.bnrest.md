---
id: ROLE-TC-005
number: 1.4.11
type: Test Case
title: A Deputy Manager CANNOT access another branch's enquiries
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

# Deputy Manager cannot access another branch

Replaces legacy `RoleSuite.tc_role_002c_deputyCannotAccessAnotherBranch`.
Reads the shared `deputySession`/`branchB` suite fixtures — see
`ROLE-TC-001`. `branchB` is a second independent dynamic branch (was
hardcoded to the real `pinner` branch).

```bnrest
Given Get /api/v1/admin/enquiries?branch=${branchB.slug} Into attempt Using deputySession.accessToken
Then AssertStatus attempt 403
```
