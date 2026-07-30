---
id: CHILDATT-TC-001
number: 1.10.2
type: Test Case
title: Check-in records status Present, timestamp, and the checking-in staff member
owner: QA
mode: Standalone
status: Active
tags:
  - childatt
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Check-in golden path

Replaces legacy `ChildAttendanceSuite.tc_childatt_001_checkIn`. Reads the
shared `adminSession`/`child` suite fixtures — see `SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/attendance/check-in Into checked Using adminSession.accessToken
{
  "child_id": "${child.body.data.id}",
  "date": "2027-03-15"
}
Then AssertStatus checked 200
And Assert checked.body.data.status == "present"
And Assert checked.body.data.check_in != null
And Assert checked.body.data.checked_in_by != null
```
