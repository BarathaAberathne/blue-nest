---
id: EXPORT-TC-001
number: 2.28.1
type: Test Case
title: The CSV export endpoints return a text/csv attachment
owner: QA
mode: Standalone
status: Active
tags:
  - export
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# CSV export endpoints

Each admin export streams a text/csv download (200 + text/csv content type).
Reads the shared `adminSession` fixture (see `SUI-EXPORT-001`).

```bnrest
When Get /api/v1/admin/children/export Into children Using adminSession.accessToken
Then AssertStatus children 200

When Get /api/v1/admin/staff/export Into staff Using adminSession.accessToken
Then AssertStatus staff 200

When Get /api/v1/admin/enquiries/export Into enquiries Using adminSession.accessToken
Then AssertStatus enquiries 200

When Get /api/v1/admin/leave-requests/export Into leave Using adminSession.accessToken
Then AssertStatus leave 200

When Get /api/v1/admin/staff-attendance/export?date=${today()}&branch=harrow Into att Using adminSession.accessToken
Then AssertStatus att 200
```
