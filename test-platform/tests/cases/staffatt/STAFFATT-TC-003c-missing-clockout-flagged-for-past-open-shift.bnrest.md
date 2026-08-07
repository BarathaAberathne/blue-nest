---
id: STAFFATT-TC-003c
number: 1.10.18
type: Test Case
title: A clock-in left open on a PAST date is flagged in the missing-clockout KPI immediately, with no hours calculated for the open shift
owner: QA
mode: Standalone
status: Active
tags:
  - staffatt
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Missing clock-out is flagged immediately for a past date

Replaces legacy `StaffAttendanceSuite.tc_staffatt_003c_missingClockOutFlaggedForPastOpenShift`
— `AttendanceDaySummary.MissingClockOut` is computed live from `date <
today()`, no background job needed. The persisted record's own
`missing_clockout` field only flips true inside `Correct` though, so a
stale open clock-in shows in the summary KPI immediately, but the raw
record stays `missing_clockout: false` until a manager corrects it. Both
halves are asserted below. Reads the shared `adminSession`/`branch`/
`staff` suite fixtures — see `SUI-ATT-001`.

```bnrest
Given Get /api/v1/admin/staff-attendance/summary?date=${today("-2y")}&branch=${branch.slug} Into before Using adminSession.accessToken
Then AssertStatus before 200
And Assert before.body.data.missing_clockout == 0

When Post /api/v1/admin/staff-attendance/clock-in Into clocked Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("-2y")}"
}
Then AssertStatus clocked 200
And Assert clocked.body.data.worked_minutes == 0

When Get /api/v1/admin/staff-attendance/summary?date=${today("-2y")}&branch=${branch.slug} Into after Using adminSession.accessToken
Then Assert after.body.data.missing_clockout == 1

When Patch /api/v1/admin/staff-attendance/000000000000000000000000/correct Into corrected Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "${today("-2y")}",
  "clock_out": "17:30",
  "reason": "QA-AUTOTEST manual correction — forgot to clock out"
}
Then AssertStatus corrected 200
And Assert corrected.body.data.missing_clockout == false
And AssertJson corrected "$.body.data.corrections[?(@.field=='clock_out')]" == 1
```
