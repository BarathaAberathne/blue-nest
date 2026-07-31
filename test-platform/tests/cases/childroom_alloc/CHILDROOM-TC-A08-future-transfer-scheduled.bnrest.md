---
id: CHILDROOM-TC-A08
number: 2.9.8
type: Test Case
title: A future-dated transfer is scheduled and leaves the current placement active until then
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Future-dated transfer schedules

New coverage (`SUI-CHILDROOM-001`). Reads shared `adminSession`/`room`/
`room2`/`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into start Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus start 201

When Post /api/v1/admin/children/${child.id}/transfer-room Into scheduled Using adminSession.accessToken
{ "room_id": "${room2.id}", "reason": "planned move", "effective_date": "2099-01-01" }
Then AssertStatus scheduled 200
And Assert scheduled.body.data.status == "scheduled"

When Get /api/v1/admin/children/${child.id} Into childRec Using adminSession.accessToken
Then Assert childRec.body.data.room_id == room.id

Teardown
Patch /api/v1/admin/child-room-assignments/${scheduled.body.data.id} Using adminSession.accessToken
{ "end": true }
Patch /api/v1/admin/child-room-assignments/${start.body.data.id} Using adminSession.accessToken
{ "end": true }
