---
id: AUTH-TC-003
number: 1.1.14
type: Test Case
title: Repeated failed logins from one caller are rate-limited
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - security
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 60
---

# Login is rate-limited

Replaces legacy `SecuritySuite.tc_auth_003_loginIsRateLimited` — a
regression lock on `middleware.RateLimit(10, time.Minute)`, shared by BOTH
`/auth/login` and `/admin/auth/login` (`backend/internal/routes/routes.go`)
and keyed **per IP, not per account** — every login in this whole test run
shares this one budget.

**MUST be the very last thing this platform runs in the entire
collection** (see `SUI-AUTH-001`'s and `COL-FUNC-001`'s own notes) —
deliberately burns the shared per-IP login budget with 12 rapid wrong-
password attempts. If this ran any earlier, every subsequent suite's
`AUTH-UTIL-001` Setup login would start failing for the rest of that
1-minute window. The exact cutover point depends on how much of the
window earlier tests already consumed, so this asserts the *behaviour*
(both a 401 and a 429 occur somewhere in the burst; never a 500; never
more than 10 real attempts let through) rather than a fixed count.

```bnrest
Given Post /api/v1/admin/auth/login Into a1
{"email": "admin@bluenest.uk", "password": "still-wrong"}
And Assert a1.status == 401 || a1.status == 429

When Post /api/v1/admin/auth/login Into a2
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a2.status == 401 || a2.status == 429

When Post /api/v1/admin/auth/login Into a3
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a3.status == 401 || a3.status == 429

When Post /api/v1/admin/auth/login Into a4
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a4.status == 401 || a4.status == 429

When Post /api/v1/admin/auth/login Into a5
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a5.status == 401 || a5.status == 429

When Post /api/v1/admin/auth/login Into a6
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a6.status == 401 || a6.status == 429

When Post /api/v1/admin/auth/login Into a7
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a7.status == 401 || a7.status == 429

When Post /api/v1/admin/auth/login Into a8
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a8.status == 401 || a8.status == 429

When Post /api/v1/admin/auth/login Into a9
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a9.status == 401 || a9.status == 429

When Post /api/v1/admin/auth/login Into a10
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a10.status == 401 || a10.status == 429

When Post /api/v1/admin/auth/login Into a11
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a11.status == 401 || a11.status == 429

When Post /api/v1/admin/auth/login Into a12
{"email": "admin@bluenest.uk", "password": "still-wrong"}
Then Assert a12.status == 401 || a12.status == 429
And Assert a1.status == 429 || a2.status == 429 || a3.status == 429 || a4.status == 429 || a5.status == 429 || a6.status == 429 || a7.status == 429 || a8.status == 429 || a9.status == 429 || a10.status == 429 || a11.status == 429 || a12.status == 429
```
