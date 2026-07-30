---
id: STAFFROOM-UTIL-001
number: U.15
type: Test Util
title: Allocate a staff member to a room (authoritative endpoint)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - staffroom
  - fixture
fixtureScope: case
timeoutSeconds: 30
---

# Allocate a staff member to a room

The one authoritative staff→room allocation call — every test that needs a
staff-room assignment uses this instead of duplicating the
`POST /admin/staff-room-assignments` body. Both the room profile and the
staff profile hit this same endpoint.

Inputs: `input.accessToken`, `input.staffId`, `input.roomId`,
`input.roleInRoom` (optional), `input.isPrimary` (optional).

```bnrest
Post /api/v1/admin/staff-room-assignments Into created Using input.accessToken
{
  "staff_id": "${input.staffId}",
  "room_id": "${input.roomId}",
  "role_in_room": "${input.roleInRoom}",
  "is_primary": ${input.isPrimary}
}

AssertStatus created 201
Assert created.body.data.id != null

Output
{
  "id": "${created.body.data.id}",
  "staffId": "${created.body.data.staff_id}",
  "roomId": "${created.body.data.room_id}",
  "isPrimary": ${created.body.data.is_primary}
}
```
