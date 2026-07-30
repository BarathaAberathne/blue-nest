---
id: SHIFTS-TC-001
number: 2.2.1
type: Test Case
title: A shift is created for a real staff member and room, with the staff/room names resolved
owner: QA
mode: Standalone
status: Active
tags:
  - shifts
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Create a shift

New coverage (`SUI-SHIFTS-001`, no legacy equivalent). Verified against
`internal/models/shift.go`/`internal/service/shift.go`. Reads the shared
`adminSession`/`branch`/`room`/`staff` suite fixtures — see
`SUI-SHIFTS-001`.

```bnrest
Given Post /api/v1/admin/shifts Into shift Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}",
  "date": "2027-06-07",
  "start_time": "09:00",
  "end_time": "17:00"
}
Then AssertStatus shift 201
And Assert shift.body.data.id != null
And AssertJson shift $.body.data.staff_name contains "QA-AUTOTEST"
And Assert shift.body.data.room_name != null

Teardown
Delete /api/v1/admin/shifts/${shift.body.data.id} Using adminSession.accessToken
```
