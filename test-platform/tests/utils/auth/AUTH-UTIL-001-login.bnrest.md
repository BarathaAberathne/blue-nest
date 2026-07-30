---
id: AUTH-UTIL-001
number: U.1
type: Test Util
title: Authenticate an API user
owner: QA Platform
mode: Standalone
status: Active
tags:
  - authentication
fixtureScope: run
timeoutSeconds: 30
---

# Authenticate an API user

The one authoritative login implementation (spec §2/§6) — every test that
needs a session calls this utility instead of duplicating the login request
body, token extraction, or login assertions. Declared `fixtureScope: run`
(not just `suite`) so a second call **anywhere in the whole run** with the
**same** email+password is served from cache instead of hitting
`/auth/login` again — admin credentials are safe, immutable data for the
run's entire duration (spec §2 "run: only for safe immutable
configuration"). This is exactly what stops N suites' worth of tests from
burning the backend's shared login rate limit, the same problem
`support/Api.java#loginAsAdmin()` solves (JVM-wide static cache) in the
legacy suite — found to matter for real once a 4th suite (`SUI-STAFF-001`)
started sharing the same admin login within one collection run and started
tripping the rate limit even without external interference.

Inputs (explicit — spec §12 "Utility inputs must be explicitly passed"):
`input.email`, `input.password`.

```bnrest
Post /api/v1/admin/auth/login Into loginResponse
{
  "email": "${input.email}",
  "password": "${input.password}"
}

AssertStatus loginResponse 200
Assert loginResponse.body.data.access_token != null
Assert loginResponse.body.data.user.id != null

Output
{
  "accessToken": "${loginResponse.body.data.access_token}",
  "refreshToken": "${loginResponse.body.data.refresh_token}",
  "userId": "${loginResponse.body.data.user.id}",
  "role": "${loginResponse.body.data.user.role}",
  "email": "${loginResponse.body.data.user.email}"
}
```
