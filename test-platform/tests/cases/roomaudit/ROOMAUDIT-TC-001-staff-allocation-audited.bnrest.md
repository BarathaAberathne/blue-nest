---
id: ROOMAUDIT-TC-001
number: 2.11.1
type: Test Case
title: Allocating staff to a room writes an allocate_staff audit entry
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

# Staff allocation is audited

New coverage (`SUI-ROOMAUDIT-001`). Reads shared `adminSession`/`room`/
`staff` fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into created Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room.id}" }
Then AssertStatus created 201

When Get /api/v1/admin/audit-logs?entity_type=staff_room_assignment&action=allocate_staff Into logs Using adminSession.accessToken
Then AssertStatus logs 200
And AssertJson logs "$.body.data[?(@.entity_id=='${created.body.data.id}')].length()" == 1

Teardown
Patch /api/v1/admin/staff-room-assignments/${created.body.data.id} Using adminSession.accessToken
{ "end": true }
