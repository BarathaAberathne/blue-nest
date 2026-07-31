---
id: ROOMNET-TC-002
number: 2.12.2
type: Test Case
title: A transfer leaves exactly one active placement (never two, never none)
owner: QA
mode: Standalone
status: Active
tags:
  - roomnet
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Transfer keeps a single active placement

New coverage (`SUI-ROOMNET-001`). The transfer is one transactional
operation from the caller's view — afterwards the child has exactly one
active placement (the destination) and one ended (the source). Reads
shared `adminSession`/`room`/`room2`/`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into start Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus start 201

When Post /api/v1/admin/children/${child.id}/transfer-room Into moved Using adminSession.accessToken
{ "room_id": "${room2.id}", "reason": "net test" }
Then AssertStatus moved 200

When Get /api/v1/admin/children/${child.id}/room-assignments Into hist Using adminSession.accessToken
Then AssertStatus hist 200
And AssertJson hist "$.body.data[?(@.status=='active')].length()" == 1
And AssertJson hist "$.body.data[?(@.room_id=='${room2.id}' && @.status=='active')].length()" == 1

Teardown
Patch /api/v1/admin/child-room-assignments/${moved.body.data.id} Using adminSession.accessToken
{ "end": true }
