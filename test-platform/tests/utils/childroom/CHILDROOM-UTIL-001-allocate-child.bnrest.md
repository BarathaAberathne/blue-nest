---
id: CHILDROOM-UTIL-001
number: U.16
type: Test Util
title: Allocate a child to a room (authoritative endpoint)
owner: QA Platform
mode: Standalone
status: Active
tags:
  - childroom
  - fixture
fixtureScope: case
timeoutSeconds: 30
---

# Allocate a child to a room

The one authoritative child→room allocation call
(`POST /admin/child-room-assignments`). Room profile and child profile both
use this endpoint.

Inputs: `input.accessToken`, `input.childId`, `input.roomId`,
`input.overrideReason` (optional).

```bnrest
Post /api/v1/admin/child-room-assignments Into created Using input.accessToken
{
  "child_id": "${input.childId}",
  "room_id": "${input.roomId}",
  "override_reason": "${input.overrideReason}"
}

AssertStatus created 201
Assert created.body.data.id != null

Output
{
  "id": "${created.body.data.id}",
  "childId": "${created.body.data.child_id}",
  "roomId": "${created.body.data.room_id}",
  "status": "${created.body.data.status}"
}
```
