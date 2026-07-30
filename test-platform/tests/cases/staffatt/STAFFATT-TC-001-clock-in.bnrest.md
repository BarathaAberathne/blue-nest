---
id: STAFFATT-TC-001
number: 1.10.10
type: Test Case
title: Clock-in records status Present, a clock_in timestamp, and clears any missing-clockout flag
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

# Clock-in golden path

Replaces legacy `StaffAttendanceSuite.tc_staffatt_001_clockIn`. Reads the
shared `adminSession`/`staff` suite fixtures — see `SUI-ATT-001`.

```bnrest
Given Post /api/v1/admin/staff-attendance/clock-in Into clocked Using adminSession.accessToken
{
  "staff_id": "${staff.body.data.id}",
  "date": "2027-04-12"
}
Then AssertStatus clocked 200
And Assert clocked.body.data.status == "present"
And Assert clocked.body.data.clock_in != null
And Assert clocked.body.data.missing_clockout == false
```
