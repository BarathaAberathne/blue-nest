---
id: AUTH-TC-005
number: 1.1.15
type: Test Case
title: Logout revokes the session server-side — the same access token is rejected afterwards
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Logout actually ends the session (token-version revocation)

Regression lock for the audit finding that `POST /auth/logout` was a literal
no-op — it returned `{"message":"logged out"}` and touched nothing, so a
"signed-out" (or stolen) token stayed fully valid until expiry. Logout now
bumps the user's token version, and `middleware.Auth` rejects any token whose
`tv` claim is stale. The same access token must go 200 → logout → 401.

**Runs against a DEDICATED throwaway user, never the shared admin.** The
engine caches `AUTH-UTIL-001` logins per email+password for the whole run, so
revoking the admin's session here would poison every later case's cached
admin token (found the hard way: SEC-TC-003/005/006/007 all 401'd until this
case switched identities). The throwaway login also deliberately bypasses the
util — a cached token would defeat the point of the test.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Post /api/v1/admin/users Into victim Using adminSession.accessToken
{
  "email": "qa-autotest-revoke-${random()}@bluenest.test",
  "password": "RevokeMe2027!",
  "first_name": "QA-AUTOTEST",
  "last_name": "Revoke",
  "role": "admissions"
}
Then AssertStatus victim 201

When Post /api/v1/admin/auth/login Into session
{
  "email": "${victim.body.data.email}",
  "password": "RevokeMe2027!"
}
Then AssertStatus session 200

When Get /api/v1/auth/me Into before Using session.body.data.access_token
Then AssertStatus before 200

When Post /api/v1/auth/logout Into logout Using session.body.data.access_token
Then AssertStatus logout 200

When Get /api/v1/auth/me Into after Using session.body.data.access_token
Then AssertStatus after 401
And AssertJson after $.body.error contains "revoked"

Teardown
Delete /api/v1/admin/users/${victim.body.data.id} Using adminSession.accessToken
```
