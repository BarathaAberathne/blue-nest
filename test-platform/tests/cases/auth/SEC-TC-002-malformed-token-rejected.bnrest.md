---
id: SEC-TC-002
number: 1.1.6
type: Test Case
title: A malformed bearer token is rejected with 401, not a 500
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

# Malformed bearer token is rejected

Replaces legacy `SecuritySuite.sec_002_malformedTokenRejected`.

```bnrest
Set fakeToken = "not.a.real.jwt"
Given Get /api/v1/admin/staff Into rejected Using fakeToken
Then AssertStatus rejected 401
```
