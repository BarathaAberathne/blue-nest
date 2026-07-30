---
id: STAFFROOM-TC-007
number: 2.8.7
type: Test Case
title: Editing a staff profile never disturbs their room allocation
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Editing a staff profile preserves the room allocation

Regression lock for the original bug (`docs/rooms/staff-room-field-investigation.md`):
room allocation lives only in the canonical assignment model, so a staff
profile edit (`PUT /admin/staff/{id}`, which no longer carries room at all)
cannot touch it. Allocate a room, edit the profile, and the assignment —
and the computed `room_id` projection on the staff record — are unchanged.
Reads shared `adminSession`/`room`/`staff` fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into alloc Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room.id}" }
Then AssertStatus alloc 201

When Put /api/v1/admin/staff/${staff.id} Into edited Using adminSession.accessToken
{ "first_name": "QA-AUTOTEST", "last_name": "RoomKept", "branch_slug": "${branch.slug}" }
Then AssertStatus edited 200
And Assert edited.body.data.room_id == room.id

When Get /api/v1/admin/staff/${staff.id}/room-assignments Into stillThere Using adminSession.accessToken
Then AssertStatus stillThere 200
And AssertJson stillThere "$.body.data[?(@.room_id=='${room.id}' && @.status=='active')].length()" == 1

Teardown
Patch /api/v1/admin/staff-room-assignments/${alloc.body.data.id} Using adminSession.accessToken
{ "end": true }
