---
id: ROOMSTAFF-TC-003b
number: 1.9.13
type: Test Case
title: A room_id for a room that doesn't exist is accepted, not rejected
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

# Nonexistent room_id is accepted (gap lock)

Replaces legacy `RoomStaffSuite.tc_roomstaff_003b_nonexistentRoomIdAccepted`
— a **gap lock**: the write path never checks the target room actually
exists. Reads the shared `adminSession`/`branch` suite fixtures — see
`SUI-ASSIGN-001`.

```bnrest
Setup
Post /api/v1/admin/staff Into staff Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "GhostRoom-${random()}",
  "email": "qa-autotest-ghostroom-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "status": "active"
}
AssertStatus staff 201

Body
When Put /api/v1/admin/staff/${staff.body.data.id} Into linked Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Ghost Room",
  "branch_slug": "${branch.slug}",
  "room_id": "000000000000000000000000"
}
Then AssertStatus linked 200
And Assert linked.body.data.room_id == "000000000000000000000000"

Teardown
Delete /api/v1/admin/staff/${staff.body.data.id} Using adminSession.accessToken
```
