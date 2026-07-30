---
id: SEC-TC-001
number: 1.1.5
type: Test Case
title: No token is rejected with 401, not data or a 500
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - security
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# No token is rejected

Replaces legacy `SecuritySuite.sec_001_noTokenRejected`.

```bnrest
Given Get /api/v1/admin/staff Into rejected
Then AssertStatus rejected 401
```
