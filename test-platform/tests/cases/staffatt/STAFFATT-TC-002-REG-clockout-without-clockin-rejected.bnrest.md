---
id: STAFFATT-TC-002-REG
number: 1.10.9
type: Test Case
title: Clock-out with NO prior clock-in that day is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - staffatt
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Clock-out without clock-in is rejected

Replaces legacy `StaffAttendanceSuite.tc_staffatt_002_reg_clockOutWithoutClockInRejected`.
Reads the shared `adminSession`/`staff` suite fixtures — see
`SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-out Into rejected Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-11"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "not clocked in"
```
