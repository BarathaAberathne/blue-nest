---
id: CHILDATT-TC-001-REG
number: 1.10.3
type: Test Case
title: A duplicate check-in the same day is rejected, not silently overwritten
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

# Duplicate check-in rejected (regression)

Replaces legacy `ChildAttendanceSuite.tc_childatt_001_reg_duplicateCheckinRejected`.
Reads the shared `adminSession`/`child` suite fixtures — see
`SUI-ATT-001`. Uses its own dedicated date.

```bnrest
Given Post /api/v1/admin/attendance/check-in Into first Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "${today("+30w+1d")}"
}
Then AssertStatus first 200

When Post /api/v1/admin/attendance/check-in Into rejected Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "${today("+30w+1d")}"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already checked in"
```
