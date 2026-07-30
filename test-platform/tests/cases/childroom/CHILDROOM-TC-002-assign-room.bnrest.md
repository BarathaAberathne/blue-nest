---
id: CHILDROOM-TC-002
number: 1.9.2
type: Test Case
title: Assigning the child to a room succeeds and the room is reflected on the child
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - golden-path
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Assign child to room

Replaces legacy `ChildRoomSuite.tc_childroom_002_assignRoom`. Reads the
shared `adminSession`/`branch`/`room`/`child` suite fixtures — see
`SUI-ASSIGN-001`.

```bnrest
Given Put /api/v1/admin/children/${child.id} Into assigned Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}",
  "first_name": "QA-AUTOTEST",
  "last_name": "${child.lastName}"
}
Then AssertStatus assigned 200
And Assert assigned.body.data.room_id == room.id
```
