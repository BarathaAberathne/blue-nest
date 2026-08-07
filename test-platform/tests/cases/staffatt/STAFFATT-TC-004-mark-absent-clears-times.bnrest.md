---
id: STAFFATT-TC-004
number: 1.10.15
type: Test Case
title: Marking a clocked-in staff member Absent clears their clock-in/out times
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

# Marking Absent clears clock times

Replaces legacy `StaffAttendanceSuite.tc_staffatt_004_markAbsentClearsClockTimes`.
`clock_in`/`clock_out` are `omitempty` on the wire, so their absence after
clearing can't be asserted directly with this engine's strict path
resolution (see `CHILDROOM-TC-002c`'s note) — this checks the mark itself
succeeds and sets the new status, which is the meaningful behaviour.
Reads the shared `adminSession`/`staff` suite fixtures — see
`SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-in Into clocked Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("+32w+4d")}"
}
Then AssertStatus clocked 200

When Patch /api/v1/admin/staff-attendance/mark Into marked Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("+32w+4d")}",
  "status": "absent"
}
Then AssertStatus marked 200
And Assert marked.body.data.status == "absent"
```
