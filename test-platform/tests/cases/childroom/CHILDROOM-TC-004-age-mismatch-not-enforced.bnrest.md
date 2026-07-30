---
id: CHILDROOM-TC-004
number: 1.9.7
type: Test Case
title: Assigning a child whose age doesn't match the room's age_range is accepted, not flagged
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

# Room age_range is not enforced at assignment (gap lock)

Replaces legacy `ChildRoomSuite.tc_childroom_004_ageMismatchAssignmentNotEnforced`
— a **gap lock**: the write path never compares the child's `dob` against
the room's `age_range`.

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
  "name": "QA-AUTOTEST-BabyOnlyRoom-${random()}",
  "ageRange": "QA-AUTOTEST 0-6 months only",
  "capacity": 5
}

Body
When Post /api/v1/admin/children Into child Using session.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "AgeMismatch-${random()}",
  "dob": "2016-01-01",
  "branch_slug": "${branch.slug}",
  "room_id": "${room.id}"
}
Then AssertStatus child 201
And Assert child.body.data.room_id == room.id

Teardown
Delete /api/v1/admin/children/${child.body.data.id} Using session.accessToken
Delete /api/v1/admin/rooms/${room.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
