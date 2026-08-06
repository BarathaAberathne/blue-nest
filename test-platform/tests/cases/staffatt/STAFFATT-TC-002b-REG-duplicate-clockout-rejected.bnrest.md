---
id: STAFFATT-TC-002b-REG
number: 1.10.13
type: Test Case
title: A second clock-out the same day is rejected
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

# Duplicate clock-out rejected (regression)

Replaces legacy `StaffAttendanceSuite.tc_staffatt_002b_reg_duplicateClockOutRejected`.
Reads the shared `adminSession`/`staff` suite fixtures — see
`SUI-ATT-001`. Uses its own dedicated date + a full clock-in/clock-out
cycle.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-in Into clockedIn Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("+32w+2d")}"
}
Then AssertStatus clockedIn 200

When Post /api/v1/admin/staff-attendance/clock-out Into clockedOut Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("+32w+2d")}"
}
Then AssertStatus clockedOut 200

When Post /api/v1/admin/staff-attendance/clock-out Into rejected Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("+32w+2d")}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already clocked out"
```
