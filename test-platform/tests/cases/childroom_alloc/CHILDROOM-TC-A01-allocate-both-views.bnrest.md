---
id: CHILDROOM-TC-A01
number: 2.9.1
type: Test Case
title: Allocate a child to a room and confirm it shows on the room's children list and the child's current room
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Allocate child, verify both directions

New coverage (`SUI-CHILDROOM-001`). Reads shared `adminSession`/`room`/
`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into created Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus created 201
And Assert created.body.data.status == "active"

When Get /api/v1/admin/rooms/${room.id}/children Into roomChildren Using adminSession.accessToken
Then AssertStatus roomChildren 200
And AssertJson roomChildren "$.body.data[?(@.child_id=='${child.id}')].length()" == 1

When Get /api/v1/admin/children/${child.id}/room-assignments Into childRooms Using adminSession.accessToken
Then AssertStatus childRooms 200
And AssertJson childRooms "$.body.data[?(@.room_id=='${room.id}' && @.status=='active')].length()" == 1

When Get /api/v1/admin/children/${child.id} Into childRec Using adminSession.accessToken
Then AssertStatus childRec 200
And Assert childRec.body.data.room_id == room.id

Teardown
Patch /api/v1/admin/child-room-assignments/${created.body.data.id} Using adminSession.accessToken
{ "end": true }
