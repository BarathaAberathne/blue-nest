---
id: SHIFTS-TC-004
number: 2.2.4
type: Test Case
title: An end time at or before the start time is rejected, and a nonexistent staff_id is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - shifts
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Shift validation rejections

New coverage (`SUI-SHIFTS-001`). Verified against `service/shift.go`'s
`resolve()`. Reads the shared `adminSession`/`branch`/`staff` suite
fixtures — see `SUI-SHIFTS-001`.

```bnrest
Given Post /api/v1/admin/shifts Into badTimes Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "date": "${monday("+20w+3d")}",
  "start_time": "17:00",
  "end_time": "09:00"
}
Then AssertStatus badTimes 400

When Post /api/v1/admin/shifts Into unknownStaff Using adminSession.accessToken
{
  "staff_id": "000000000000000000000099",
  "branch_slug": "${branch.slug}",
  "date": "${monday("+20w+3d")}",
  "start_time": "09:00",
  "end_time": "17:00"
}
Then AssertStatus unknownStaff 400
```
