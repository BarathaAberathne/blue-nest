---
id: ROOMNET-TC-001
number: 2.12.1
type: Test Case
title: Retrying an identical child allocation does not create a second active placement
owner: QA
mode: Standalone
status: Active
tags:
  - roomnet
  - regression
allowDuplicateRequest: true
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Retry is idempotent-safe (no duplicate placement)

New coverage (`SUI-ROOMNET-001`). Simulates a double-submit / retry: the
exact same allocation POST is sent twice. The first succeeds; the second
is rejected (400) rather than creating a second active row, and the
child's history shows exactly one active placement. `allowDuplicateRequest`
is set so the engine's own duplicate-write guard doesn't intercept the
deliberate retry. Reads shared `adminSession`/`room`/`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into first Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus first 201

When Post /api/v1/admin/child-room-assignments Into retry Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus retry 400

When Get /api/v1/admin/children/${child.id}/room-assignments Into hist Using adminSession.accessToken
Then AssertStatus hist 200
And AssertJson hist "$.body.data[?(@.status=='active')].length()" == 1

Teardown
Patch /api/v1/admin/child-room-assignments/${first.body.data.id} Using adminSession.accessToken
{ "end": true }
