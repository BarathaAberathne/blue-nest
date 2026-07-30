---
id: SEC-TC-004b
number: 1.1.9
type: Test Case
title: Same malformed-regex fix on the children search endpoint
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

# Malformed regex in children search doesn't 500

Replaces legacy `SecuritySuite.sec_004b_malformedRegexChildrenSearchNoLonger500s`.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Get /api/v1/admin/children?q=%28 Into r1 Using adminSession.accessToken
Then Assert r1.status != 500

When Get /api/v1/admin/children?q=%5Ba- Into r2 Using adminSession.accessToken
Then Assert r2.status != 500
```
