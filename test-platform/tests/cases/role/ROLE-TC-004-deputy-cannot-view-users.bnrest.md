---
id: ROLE-TC-004
number: 1.4.10
type: Test Case
title: A Deputy Manager CANNOT view org-wide user/account management
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

# Deputy Manager cannot view users

Replaces legacy `RoleSuite.tc_role_002b_deputyCannotViewUsers`. Reads the
shared `deputySession` suite fixture — see `ROLE-TC-001`.

```bnrest
Given Get /api/v1/admin/users Into attempt Using deputySession.accessToken
Then AssertStatus attempt 403
```
