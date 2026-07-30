---
id: BRANCH-TC-002b
number: 1.2.4
type: Test Case
title: Double-submitting the exact same duplicate-slug request twice both fail cleanly
owner: QA
mode: Standalone
status: Active
tags:
  - branch
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
allowDuplicateRequest: true
---

# Repeated identical duplicate-slug attempts both fail cleanly

Replaces legacy `BranchSuite.tc_br_002b_repeatedDuplicateAttemptsBothRejected`
— deliberately sends the exact same request body twice (matching the legacy
test precisely), so this is one of the few cases that legitimately needs
`allowDuplicateRequest: true`: without it, the engine's duplicate-write
detector would flag the second identical `POST` as a suspicious repeat
(spec §13) even though repeating it on purpose is the whole point of this
test.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Post /api/v1/admin/branches Into attempt1 Using session.accessToken
{
  "name": "QA-AUTOTEST-Duplicate-Harrow-Attempt-2",
  "slug": "harrow",
  "capacity": 60
}
Then AssertStatus attempt1 400

When Post /api/v1/admin/branches Into attempt2 Using session.accessToken
{
  "name": "QA-AUTOTEST-Duplicate-Harrow-Attempt-2",
  "slug": "harrow",
  "capacity": 60
}
Then AssertStatus attempt2 400
```
