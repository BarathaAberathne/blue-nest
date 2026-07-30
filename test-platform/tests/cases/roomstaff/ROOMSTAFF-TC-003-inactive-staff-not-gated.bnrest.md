---
id: ROOMSTAFF-TC-003
number: 1.9.12
type: Test Case
title: An INACTIVE staff member can still be assigned to a room
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

# Inactive staff room assignment not gated (gap lock)

Replaces legacy `RoomStaffSuite.tc_roomstaff_003_inactiveStaffAssignmentNotGated`
— a **gap lock**: nothing checks a staff member's status before allowing a
room assignment. Reads the shared `adminSession`/`branch`/`room` suite
fixtures — see `SUI-ASSIGN-001`.

```bnrest
Setup
Post /api/v1/admin/staff Into staff Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Inactive-${random()}",
  "email": "qa-autotest-inactive-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "status": "inactive"
}
AssertStatus staff 201

Body
When Put /api/v1/admin/staff/${staff.body.data.id} Into linked Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Inactive Assignee",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}",
  "status": "inactive"
}
Then AssertStatus linked 200
And Assert linked.body.data.room_id == room.id

Teardown
Delete /api/v1/admin/staff/${staff.body.data.id} Using adminSession.accessToken
```
