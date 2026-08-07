---
id: STAFFATT-TC-004c
number: 1.10.17
type: Test Case
title: Clocking in an unknown staff id is rejected, not a 500
owner: QA
mode: Standalone
status: Active
tags:
  - staffatt
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unknown staff id is rejected cleanly

Replaces legacy `StaffAttendanceSuite.tc_staffatt_004c_unknownStaffRejected`.
Verified the real handler always returns 400 for any service error here —
more precise than the legacy test's own `anyOf(400, 404)` hedge. Reads the
shared `adminSession` suite fixture — see `SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-in Into rejected Using adminSession.accessToken
{
  "staff_id": "000000000000000000000000",
  "date": "${today("+32w")}"
}
Then AssertStatus rejected 400
```
