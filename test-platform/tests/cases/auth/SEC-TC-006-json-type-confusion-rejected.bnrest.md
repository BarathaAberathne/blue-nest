---
id: SEC-TC-006
number: 1.1.12
type: Test Case
title: JSON body type confusion (object where a string field is expected) is rejected, not silently coerced
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

# JSON type confusion is rejected

Replaces legacy `SecuritySuite.sec_006_jsonTypeConfusionRejected`. Go's
typed `branch_slug string` field means a JSON object where a string is
expected fails to unmarshal — a clean 400, not silent coercion or a 500.

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

When Post /api/v1/admin/rooms Into rejected Using adminSession.accessToken
{
  "branch_slug": {"$ne": null},
  "name": "SEC-006 probe",
  "capacity": 5
}
Then AssertStatus rejected 400
```
