---
id: CHILDROOM-TC-003
number: 1.9.6
type: Test Case
title: Assigning a second child to a full (capacity-1) room is accepted, not rejected
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - regression
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - ROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Room capacity is not enforced at assignment (gap lock)

Replaces legacy `ChildRoomSuite.tc_childroom_003_overCapacityAssignmentNotEnforced`
— a **gap lock**, not a bug fix target: the room-assignment write path
never looks up the target room or counts its current occupants against
`Room.Capacity`.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${session.accessToken}"
}

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Capacity1Room-${random()}",
  "ageRange": "QA-AUTOTEST capacity probe",
  "capacity": 1
}

Body
When Post /api/v1/admin/children Into child1 Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Cap1-${random()}",
  "dob": "2026-03-01",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus child1 201

When Post /api/v1/admin/children Into child2 Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Cap2-${random()}",
  "dob": "2026-03-01",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus child2 201
And Assert child2.body.data.room_id == room.id

Teardown
Delete /api/v1/admin/children/${child1.body.data.id} Using session.accessToken
Delete /api/v1/admin/children/${child2.body.data.id} Using session.accessToken
Delete /api/v1/admin/rooms/${room.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
