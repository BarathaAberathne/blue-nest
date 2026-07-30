---
id: STAFFROOM-TC-006
number: 2.8.6
type: Test Case
title: Ending a staff allocation removes it from the active list but keeps it in history
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
dependsOn: []
uses: []
fixtureScope: case
timeoutSeconds: 30
---

# End staff allocation, history retained

New coverage (`SUI-STAFFROOM-001`). Reads shared `adminSession`/`room`/
`staff` fixtures.

```bnrest
Given Post /api/v1/admin/staff-room-assignments Into created Using adminSession.accessToken
{ "staff_id": "${staff.id}", "room_id": "${room.id}" }
Then AssertStatus created 201

When Patch /api/v1/admin/staff-room-assignments/${created.body.data.id} Into ended Using adminSession.accessToken
{ "end": true }
Then AssertStatus ended 200
And Assert ended.body.data.status == "ended"

When Get /api/v1/admin/staff/${staff.id}/room-assignments?include=history Into hist Using adminSession.accessToken
Then AssertStatus hist 200
And AssertJson hist "$.body.data[?(@.id=='${created.body.data.id}' && @.status=='ended')].length()" == 1
