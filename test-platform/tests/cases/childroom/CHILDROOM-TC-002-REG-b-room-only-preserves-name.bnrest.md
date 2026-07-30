---
id: CHILDROOM-TC-002-REG-b
number: 1.9.4
type: Test Case
title: A room-only update also preserves first/last name
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

# Room-only update preserves name (regression)

Replaces legacy
`ChildRoomSuite.tc_childroom_002_reg_roomOnlyUpdatePreservesName`. Reads
the shared `adminSession`/`branch`/`room`/`child` suite fixtures — see
`SUI-ASSIGN-001`.

```bnrest
Given Get /api/v1/admin/children/${child.id} Into before Using adminSession.accessToken

When Put /api/v1/admin/children/${child.id} Into updated Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus updated 200

When Get /api/v1/admin/children/${child.id} Into after Using adminSession.accessToken
Then Assert after.body.data.first_name == before.body.data.first_name
And Assert after.body.data.last_name == before.body.data.last_name
```
