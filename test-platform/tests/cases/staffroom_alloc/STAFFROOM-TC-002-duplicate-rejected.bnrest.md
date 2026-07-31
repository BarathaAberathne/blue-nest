---
id: STAFFROOM-TC-002
number: 2.8.2
type: Test Case
title: A duplicate active staff-room allocation is rejected
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
  - regression
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Duplicate staff allocation rejected

New coverage (`SUI-STAFFROOM-001`). Reads shared `adminSession`/`room`/
`staff` fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into first Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room.id}" }
Then AssertStatus first 201

When Post /api/v1/admin/staff-room-assignments Into dupe Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room.id}" }
Then AssertStatus dupe 400

Teardown
Patch /api/v1/admin/staff-room-assignments/${first.body.data.id} Using adminSession.accessToken
{ "end": true }
