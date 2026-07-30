---
id: AUTH-TC-001
number: 1.1.1
type: Test Case
title: Admin login succeeds and returns a usable session
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - smoke
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Admin login succeeds and returns a usable session

Replaces legacy `AuthSuite.tc_auth_001_validLoginSucceeds` +
`tc_auth_001b_tokenIsUsable` (`test-platform/migration-manifest.json`) — one
bnrest case covers both, since they're really one flow ("login, then use
the token"), not two independent tests.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Then Assert session.accessToken != null
And Assert session.refreshToken != null
And Assert session.userId != null
And Assert session.role != null

When Get /api/v1/admin/children/stats Into check Using session.accessToken
Then AssertStatus check 200
And Assert check.body.data.total >= 0
```
