---
id: AUTH-TC-002b
number: 1.1.3
type: Test Case
title: Login error is identical for a wrong password vs. a non-existent account
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - regression
  - security
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# No account enumeration via the login error message

Replaces legacy `AuthSuite.tc_auth_002b_noAccountEnumeration`. This test is
about comparing two raw error responses, not the login-success flow, so it
calls the raw endpoint directly rather than through `AUTH-UTIL-001` (which
asserts success and isn't the right tool here) — see
`docs/testing/writing-tests.md` "negative API test" example.

```bnrest
Given Post /api/v1/admin/auth/login Into wrongPassword
{
  "email": "admin@bluenest.uk",
  "password": "wrong-password"
}

And Post /api/v1/admin/auth/login Into noSuchAccount
{
  "email": "no-such-user-${random()}@bluenest.test",
  "password": "whatever"
}

Then AssertStatus wrongPassword 401
And AssertStatus noSuchAccount 401
And Assert wrongPassword.body.error == noSuchAccount.body.error
```
