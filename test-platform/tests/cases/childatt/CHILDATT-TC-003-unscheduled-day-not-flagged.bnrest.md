---
id: CHILDATT-TC-003
number: 1.10.8
type: Test Case
title: Checking in a child on a day with no scheduled session succeeds silently, with no 'unscheduled' flag
owner: QA
mode: Standalone
status: Active
tags:
  - childatt
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Unscheduled day is not flagged (gap lock)

Replaces legacy `ChildAttendanceSuite.tc_childatt_003_unscheduledDayNotFlagged`
— a **gap lock**: `attendanceService.CheckIn` never reads `Child.Sessions`
or the day of week, so a check-in on a day the child has no scheduled
session for succeeds unconditionally, with no "unscheduled" flag anywhere
in the response. The shared `child` suite fixture was created with no
`sessions` at all, so every day is, by definition, unscheduled for it.
Reads the shared `adminSession`/`child` suite fixtures — see
`SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/attendance/check-in Into checked Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-18"
}
Then AssertStatus checked 200
And Assert checked.body.data.status == "present"
```
