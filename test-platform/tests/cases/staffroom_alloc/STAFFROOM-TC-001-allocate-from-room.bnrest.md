---
id: STAFFROOM-TC-001
number: 2.8.1
type: Test Case
title: Allocate staff to a room and confirm it shows on BOTH the room's staff list and the staff member's assignments
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Allocate staff, verify both directions

New coverage (`SUI-STAFFROOM-001`). Proves both-view consistency: one
allocation appears on the room's staff list AND the staff member's
room-assignments. Reads the shared `adminSession`/`room`/`staff` suite
fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into created Using adminSession.accessToken
{
  "staff_id": "${staff.id}",
  "room_id": "${room.id}",
  "role_in_room": "Room Leader"
}
Then AssertStatus created 201
And Assert created.body.data.is_primary == true

When Get /api/v1/admin/rooms/${room.id}/staff Into roomStaff Using adminSession.accessToken
Then AssertStatus roomStaff 200
And AssertJson roomStaff "$.body.data[?(@.staff_id=='${staff.id}')].length()" == 1

When Get /api/v1/admin/staff/${staff.id}/room-assignments Into staffRooms Using adminSession.accessToken
Then AssertStatus staffRooms 200
And AssertJson staffRooms "$.body.data[?(@.room_id=='${room.id}')].length()" == 1

Teardown
Patch /api/v1/admin/staff-room-assignments/${created.body.data.id} Using adminSession.accessToken
{ "end": true }
