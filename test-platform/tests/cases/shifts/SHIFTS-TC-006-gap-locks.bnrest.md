---
id: SHIFTS-TC-006
number: 2.2.6
type: Test Case
title: A nonexistent room_id is silently accepted, and overlapping shifts for the same staff member are not rejected (gap locks)
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

# Shift gap locks

New coverage (`SUI-SHIFTS-001`). Two currently-existing gaps, not fix
targets here: `service/shift.go` looks up `room_id` but never rejects an
unresolvable one (just leaves `room_name` blank), and never checks for an
overlapping shift on the same staff/day.
Reads the shared `adminSession`/`branch`/`staff` suite fixtures — see
`SUI-SHIFTS-001`.

```bnrest
Given Post /api/v1/admin/shifts Into badRoom Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "room_id": "000000000000000000000099",
  "date": "2027-06-12",
  "start_time": "09:00",
  "end_time": "17:00"
}
Then AssertStatus badRoom 201

When Post /api/v1/admin/shifts Into overlap Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "branch_slug": "${branch.slug}",
  "date": "2027-06-12",
  "start_time": "10:00",
  "end_time": "14:00"
}
Then AssertStatus overlap 201
And Assert overlap.body.data.id != badRoom.body.data.id

Teardown
Delete /api/v1/admin/shifts/${badRoom.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/shifts/${overlap.body.data.id} Using adminSession.accessToken
```
