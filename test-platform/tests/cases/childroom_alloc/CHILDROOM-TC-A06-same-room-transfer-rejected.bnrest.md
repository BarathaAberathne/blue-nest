---
id: CHILDROOM-TC-A06
number: 2.9.6
type: Test Case
title: Transferring a child to the room they are already in is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Same-room transfer rejected

New coverage (`SUI-CHILDROOM-001`). Reads shared `adminSession`/`room`/
`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into start Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus start 201

When Post /api/v1/admin/children/${child.id}/transfer-room Into rejected Using adminSession.accessToken
{ "room_id": "${room.id}", "reason": "no-op" }
Then AssertStatus rejected 400

Teardown
Patch /api/v1/admin/child-room-assignments/${start.body.data.id} Using adminSession.accessToken
{ "end": true }
