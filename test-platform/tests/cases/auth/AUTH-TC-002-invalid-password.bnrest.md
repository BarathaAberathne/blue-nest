---
id: AUTH-TC-002
number: 1.1.2
type: Test Case
title: Login with an invalid password is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Login with an invalid password is rejected

Replaces legacy `AuthSuite.tc_auth_002_invalidPasswordRejected`
(`test-platform/migration-manifest.json`). Reuses `AUTH-UTIL-001` — the same
one login implementation — wrapped in `ExpectFail` rather than
re-implementing the raw login request: the utility's own
`AssertStatus loginResponse 200` is expected to fail here, and `ExpectFail`
inverts that into a pass. This is the copyable "expected failure" pattern
referenced in `docs/testing/writing-tests.md`.

```bnrest
Given ExpectFail Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "definitely-the-wrong-password"
}
```
