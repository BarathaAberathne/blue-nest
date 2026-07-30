---
id: CHILDATT-TC-004-REG
number: 1.10.1
type: Test Case
title: Check-out with NO prior check-in that day is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - childatt
  - regression
  - safeguarding
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Check-out without check-in is rejected (safeguarding regression)

Replaces legacy `ChildAttendanceSuite.tc_childatt_004_reg_checkoutWithoutCheckinRejected`.
Reads the shared `adminSession`/`child` suite fixtures — see
`SUI-ATT-001`. Uses its own dedicated date so it's independent of the
other check-in/out cases in this suite.

```bnrest
Given Post /api/v1/admin/attendance/check-out Into rejected Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-14"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "not checked in"
```
