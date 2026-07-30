---
id: STAFFATT-TC-001-REG
number: 1.10.11
type: Test Case
title: A duplicate clock-in the same day is rejected, not silently overwritten
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

# Duplicate clock-in rejected (regression)

Replaces legacy `StaffAttendanceSuite.tc_staffatt_001_reg_duplicateClockInRejected`.
Reads the shared `adminSession`/`staff` suite fixtures — see
`SUI-ATT-001`. Uses its own dedicated date.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-in Into first Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-13"
}
Then AssertStatus first 200

When Post /api/v1/admin/staff-attendance/clock-in Into rejected Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-13"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already clocked in"
```
