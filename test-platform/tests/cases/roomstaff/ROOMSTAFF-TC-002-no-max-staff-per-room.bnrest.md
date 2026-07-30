---
id: ROOMSTAFF-TC-002
number: 1.9.11
type: Test Case
title: Multiple staff can be assigned the same room with no maximum enforced
owner: QA
mode: Standalone
status: Active
tags:
  - roomstaff
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# No max staff per room (gap lock)

Replaces legacy `RoomStaffSuite.tc_roomstaff_002_noMaxStaffPerRoomEnforced`
— a **gap lock**: no cap, no warning, no conflict is reported when a
second (third, ...) staff member is assigned the same room. Reads the
shared `adminSession`/`branch`/`room` suite fixtures — see
`SUI-ASSIGN-001`.

```bnrest
Setup
Post /api/v1/admin/staff Into staffA Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "MultiA-${random()}",
  "email": "qa-autotest-multia-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "status": "active"
}
AssertStatus staffA 201

Post /api/v1/admin/staff Into staffB Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "MultiB-${random()}",
  "email": "qa-autotest-multib-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "status": "active"
}
AssertStatus staffB 201

Body
When Put /api/v1/admin/staff/${staffA.body.data.id} Into linkedA Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Multi A",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus linkedA 200

When Put /api/v1/admin/staff/${staffB.body.data.id} Into linkedB Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Multi B",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus linkedB 200
And Assert linkedB.body.data.room_id == room.id

Teardown
Delete /api/v1/admin/staff/${staffA.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/staff/${staffB.body.data.id} Using adminSession.accessToken
```
