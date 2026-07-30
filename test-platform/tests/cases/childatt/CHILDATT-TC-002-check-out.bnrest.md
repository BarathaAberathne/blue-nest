---
id: CHILDATT-TC-002
number: 1.10.4
type: Test Case
title: Check-out closes the session and records the timestamp
owner: QA
mode: Dependent
status: Active
tags:
  - childatt
  - golden-path
dependsOn:
  - CHILDATT-TC-001
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Check-out golden path

Replaces legacy `ChildAttendanceSuite.tc_childatt_002_checkOut`. Genuinely
`dependsOn: [CHILDATT-TC-001]` — needs the child actually checked in on
the same date (`2027-03-15`) first. Reads the shared `adminSession`/
`child` suite fixtures — see `SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/attendance/check-out Into checked Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-15"
}
Then AssertStatus checked 200
And Assert checked.body.data.check_out != null
```
