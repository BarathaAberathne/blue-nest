---
id: CHILDROOM-TC-A07
number: 2.9.7
type: Test Case
title: A child cannot be placed into an inactive room
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

# Inactive room placement rejected

New coverage (`SUI-CHILDROOM-001`). Creates a throwaway room, deactivates
it, then proves placement is rejected. Reads shared `adminSession`/
`branch`/`child` fixtures.

```bnrest
Setup
Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into closedRoom
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Closed-${random()}", "ageRange": "2-5 years", "capacity": 5 }
Patch /api/v1/admin/rooms/${closedRoom.id}/status Into deact Using adminSession.accessToken
{ "status": "inactive" }
AssertStatus deact 200

Body
When Post /api/v1/admin/child-room-assignments Into rejected Using adminSession.accessToken
{ "child_id": "${child.id}", "room_id": "${closedRoom.id}" }
Then AssertStatus rejected 400

Teardown
Delete /api/v1/admin/rooms/${closedRoom.id} Using adminSession.accessToken
