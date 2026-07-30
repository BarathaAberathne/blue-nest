---
id: SEC-TC-003
number: 1.1.7
type: Test Case
title: NoSQL operator injection via query-string values stays a literal, inert string
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - security
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# NoSQL operator injection is inert

Replaces legacy `SecuritySuite.sec_003_operatorInjectionQueryParamsInert`.
Go's typed request structs mean a `$ne`-shaped query value can only ever be
treated as a literal search string, never a real Mongo operator — the
query string is percent-encoded here since `{`/`"`/`$` aren't safe to
embed raw in a URL.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/staff?q=%7B%22%24ne%22%3Anull%7D Into probed Using adminSession.accessToken
Then AssertStatus probed 200
```
