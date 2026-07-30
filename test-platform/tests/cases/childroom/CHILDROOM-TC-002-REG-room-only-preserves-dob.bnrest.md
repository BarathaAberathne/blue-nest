---
id: CHILDROOM-TC-002-REG
number: 1.9.3
type: Test Case
title: A room-only update payload does NOT wipe the child's date of birth
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

# Room-only update preserves DOB (regression)

Replaces legacy
`ChildRoomSuite.tc_childroom_002_reg_roomOnlyUpdatePreservesDob` — a
Critical/data-loss regression lock: a minimal `{branch_slug, room_id}`
payload used to wipe the child's DOB (`applyChild` now only overwrites
fields the request actually supplies). Reads the shared `adminSession`/`branch`/`room`/`child`/`childDob` suite
fixtures — see `SUI-ASSIGN-001`.

```bnrest
Given Get /api/v1/admin/children/${child.id} Into before Using adminSession.accessToken
Then Assert before.body.data.dob == childDob

When Put /api/v1/admin/children/${child.id} Into updated Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus updated 200

When Get /api/v1/admin/children/${child.id} Into after Using adminSession.accessToken
Then Assert after.body.data.dob == childDob
```
