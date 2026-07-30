---
id: SEC-TC-004
number: 1.1.8
type: Test Case
title: A malformed regex in the staff search box no longer causes a raw 500
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

# Malformed regex in staff search doesn't 500

Replaces legacy `SecuritySuite.sec_004_malformedRegexStaffSearchNoLonger500s`
— a regression lock on the `regexp.QuoteMeta` fix in `staff.go`. Each
payload is percent-encoded (raw `(`/`[`/`?`/`<`/`>` aren't safe to embed in
a URL): `(`, `[a-`, `(a`, `**`, `(?P<x>`.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/staff?q=%28 Into r1 Using adminSession.accessToken
Then Assert r1.status != 500

When Get /api/v1/admin/staff?q=%5Ba- Into r2 Using adminSession.accessToken
Then Assert r2.status != 500

When Get /api/v1/admin/staff?q=%28a Into r3 Using adminSession.accessToken
Then Assert r3.status != 500

When Get /api/v1/admin/staff?q=** Into r4 Using adminSession.accessToken
Then Assert r4.status != 500

When Get /api/v1/admin/staff?q=%28%3FP%3Cx%3E Into r5 Using adminSession.accessToken
Then Assert r5.status != 500
```
