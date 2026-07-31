---
id: CHILDROOM-TC-A02
number: 2.9.2
type: Test Case
title: A child cannot hold two active room placements
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

# Second active placement rejected

New coverage (`SUI-CHILDROOM-001`). Reads shared `adminSession`/`room`/
`room2`/`child` fixtures.

```bnrest
Given Post /api/v1/admin/child-room-assignments Into first Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus first 201

When Post /api/v1/admin/child-room-assignments Into second Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room2.id}" }
Then AssertStatus second 400

Teardown
Patch /api/v1/admin/child-room-assignments/${first.body.data.id} Using adminSession.accessToken
{ "end": true }
