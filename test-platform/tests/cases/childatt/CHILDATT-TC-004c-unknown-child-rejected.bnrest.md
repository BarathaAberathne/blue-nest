---
id: CHILDATT-TC-004c
number: 1.10.7
type: Test Case
title: Check-in for a nonexistent child is rejected, not a 500
owner: QA
mode: Standalone
status: Active
tags:
  - childatt
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unknown child is rejected cleanly

Replaces legacy `ChildAttendanceSuite.tc_childatt_004c_unknownChildRejected`.
Verified the real handler always returns 400 for any service error here
(`AdminAttendanceHandler.CheckIn` → `response.BadRequest` unconditionally)
— more precise than the legacy test's own `anyOf(400, 404)` hedge.

```bnrest
Given Post /api/v1/admin/attendance/check-in Into rejected Using adminSession.accessToken
{
  "child_id": "000000000000000000000000",
  "date": "2027-03-15"
}
Then AssertStatus rejected 400
```
