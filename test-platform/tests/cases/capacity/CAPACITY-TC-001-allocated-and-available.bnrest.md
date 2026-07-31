---
id: CAPACITY-TC-001
number: 2.10.1
type: Test Case
title: Capacity reports allocated children and available spaces, excluding ended placements
owner: QA
mode: Standalone
status: Active
tags:
  - capacity
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Allocated + available, ended excluded

New coverage (`SUI-CAPACITY-001`). Room capacity is 3. Reads shared
`adminSession`/`room`/`child`/`child2` fixtures.

```bnrest
Given Get /api/v1/admin/rooms/${room.id}/capacity Into before Using adminSession.accessToken
Then AssertStatus before 200
And Assert before.body.data.capacity == 3
And Assert before.body.data.allocated_children == 0
And Assert before.body.data.available_spaces == 3

When Post /api/v1/admin/child-room-assignments Into a1 Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${room.id}" }
Then AssertStatus a1 201

When Post /api/v1/admin/child-room-assignments Into a2 Using adminSession.accessToken
{ "child_id": "${child2.id}", "room_id": "${room.id}" }
Then AssertStatus a2 201

When Get /api/v1/admin/rooms/${room.id}/capacity Into mid Using adminSession.accessToken
Then Assert mid.body.data.allocated_children == 2
And Assert mid.body.data.available_spaces == 1
And Assert mid.body.data.present_children == 0

When Patch /api/v1/admin/child-room-assignments/${a1.body.data.id} Using adminSession.accessToken
{ "end": true }
Then Get /api/v1/admin/rooms/${room.id}/capacity Into after Using adminSession.accessToken
And Assert after.body.data.allocated_children == 1
And Assert after.body.data.available_spaces == 2

Teardown
Patch /api/v1/admin/child-room-assignments/${a2.body.data.id} Using adminSession.accessToken
{ "end": true }
