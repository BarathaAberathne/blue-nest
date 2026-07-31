---
id: ROOMAUDIT-TC-002
number: 2.11.2
type: Test Case
title: Transferring a child writes a transfer_child audit entry
owner: QA
mode: Standalone
status: Active
tags:
  - roomaudit
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Child transfer is audited

New coverage (`SUI-ROOMAUDIT-001`). Reads shared `adminSession`/`room`/
`room2`/`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into start Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus start 201

When Post /api/v1/admin/children/${child.id}/transfer-room Into moved Using adminSession.accessToken
{ "room_id": "${room2.id}", "reason": "audit test move" }
Then AssertStatus moved 200

When Get /api/v1/admin/audit-logs?entity_type=child_room_assignment&action=transfer_child Into logs Using adminSession.accessToken
Then AssertStatus logs 200
And AssertJson logs "$.body.data[?(@.entity_id=='${moved.body.data.id}')].length()" == 1

Teardown
Patch /api/v1/admin/child-room-assignments/${moved.body.data.id} Using adminSession.accessToken
{ "end": true }
