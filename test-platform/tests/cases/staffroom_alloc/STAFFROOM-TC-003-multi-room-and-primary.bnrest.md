---
id: STAFFROOM-TC-003
number: 2.8.3
type: Test Case
title: A staff member can hold multiple rooms with exactly one primary, and primary can be moved
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Multi-room with single primary

New coverage (`SUI-STAFFROOM-001`). Reads shared `adminSession`/`room`/
`room2`/`staff` fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into a1 Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room.id}" }
Then AssertStatus a1 201
And Assert a1.body.data.is_primary == true

When Post /api/v1/admin/staff-room-assignments Into a2 Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room2.id}", "is_primary": true }
Then AssertStatus a2 201
And Assert a2.body.data.is_primary == true

When Get /api/v1/admin/staff/${staff.id}/room-assignments Into rooms Using adminSession.accessToken
Then AssertStatus rooms 200
And AssertJson rooms "$.body.data[?(@.status=='active')].length()" == 2
And AssertJson rooms "$.body.data[?(@.is_primary==true)].length()" == 1

Teardown
Patch /api/v1/admin/staff-room-assignments/${a1.body.data.id} Using adminSession.accessToken
{ "end": true }
Patch /api/v1/admin/staff-room-assignments/${a2.body.data.id} Using adminSession.accessToken
{ "end": true }
