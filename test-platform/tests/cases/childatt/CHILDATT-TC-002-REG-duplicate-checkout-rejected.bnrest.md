---
id: CHILDATT-TC-002-REG
number: 1.10.5
type: Test Case
title: A second check-out the same day is rejected
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

# Duplicate check-out rejected (regression)

Replaces legacy `ChildAttendanceSuite.tc_childatt_002_reg_duplicateCheckoutRejected`.
Reads the shared `adminSession`/`child` suite fixtures — see
`SUI-ATT-001`. Uses its own dedicated date + a full check-in/check-out
cycle, independent of the other cases.

```bnrest
Given Post /api/v1/admin/attendance/check-in Into checkedIn Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-17"
}
Then AssertStatus checkedIn 200

When Post /api/v1/admin/attendance/check-out Into checkedOut Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-17"
}
Then AssertStatus checkedOut 200

When Post /api/v1/admin/attendance/check-out Into rejected Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-17"
}
Then AssertStatus rejected 400
And AssertJson rejected $.body.error contains "already checked out"
```
