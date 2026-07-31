---
id: CHILDROOM-TC-A05
number: 2.9.5
type: Test Case
title: Transferring a child closes the old placement, opens one in the new room, and retains history
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

# Transfer closes old, opens new, keeps history

New coverage (`SUI-CHILDROOM-001`). Reads shared `adminSession`/`room`/
`room2`/`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into start Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus start 201

When Post /api/v1/admin/children/${child.id}/transfer-room Into moved Using adminSession.accessToken
{ "room_id": "${room2.id}", "reason": "moving up a room" }
Then AssertStatus moved 200
And Assert moved.body.data.room_id == room2.id
And Assert moved.body.data.status == "active"

When Get /api/v1/admin/children/${child.id}/room-assignments Into hist Using adminSession.accessToken
Then AssertStatus hist 200
And AssertJson hist "$.body.data[?(@.status=='active')].length()" == 1
And AssertJson hist "$.body.data[?(@.id=='${start.body.data.id}' && @.status=='ended')].length()" == 1

When Get /api/v1/admin/children/${child.id} Into childRec Using adminSession.accessToken
Then Assert childRec.body.data.room_id == room2.id

Teardown
Patch /api/v1/admin/child-room-assignments/${moved.body.data.id} Using adminSession.accessToken
{ "end": true }
