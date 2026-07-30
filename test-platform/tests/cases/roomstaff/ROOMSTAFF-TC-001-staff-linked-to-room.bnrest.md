---
id: ROOMSTAFF-TC-001
number: 1.9.10
type: Test Case
title: Assigning a staff member's room_id links them to that room (there is no separate 'leader' designation)
owner: QA
mode: Standalone
status: Active
tags:
  - roomstaff
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Staff room assignment (golden path)

Replaces legacy `RoomStaffSuite.tc_roomstaff_001_staffLinkedToRoom` —
verified directly against `internal/models/staff.go`/`room.go` and
`service/staff.go`: there is no dedicated room-staff-assignment entity or
"room leader" concept — a staff member just carries a plain `room_id`
string, set generically via `PUT /admin/staff/{id}`. Reads the shared
`adminSession`/`branch`/`room` suite fixtures — see `SUI-ASSIGN-001`.

```bnrest
Setup
Post /api/v1/admin/staff Into staff Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "RoomLeader-${random()}",
  "email": "qa-autotest-roomleader-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "status": "active"
}
AssertStatus staff 201

Body
When Put /api/v1/admin/staff/${staff.body.data.id} Into linked Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Room Leader",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus linked 200
And Assert linked.body.data.room_id == room.id

Teardown
Delete /api/v1/admin/staff/${staff.body.data.id} Using adminSession.accessToken
```
