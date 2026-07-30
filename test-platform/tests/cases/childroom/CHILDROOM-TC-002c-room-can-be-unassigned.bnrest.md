---
id: CHILDROOM-TC-002c
number: 1.9.5
type: Test Case
title: room_id CAN still be explicitly cleared (legitimate unassign, not part of the regression fix)
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# Room can be explicitly unassigned

Replaces legacy `ChildRoomSuite.tc_childroom_002c_roomCanBeUnassigned` —
clearing `room_id` is the one field the DOB/name-preservation fix
deliberately still allows to change, since it's the legitimate "unassign
from room" action. Reads the shared `adminSession`/`branch`/`room`/`child`
suite fixtures — see `SUI-ASSIGN-001`. `room_id` is `omitempty` on the
wire, so a cleared value is genuinely **absent** from the response JSON
rather than present-as-null — not directly assertable with this engine's
strict path resolution (`Assert`/`AssertJson` both throw on a truly
missing key, by design), so this checks the clear succeeds (200) and
proves it took effect via the reassignment that follows, same tolerance
the legacy test itself used (`anyOf(nullValue(), emptyString())`).

```bnrest
Given Put /api/v1/admin/children/${child.id} Into cleared Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": ""
}
Then AssertStatus cleared 200

When Put /api/v1/admin/children/${child.id} Into reassigned Using adminSession.accessToken
{
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus reassigned 200
And Assert reassigned.body.data.room_id == room.id
```
