---
id: ROOM-TC-002
number: 1.3.2
type: Test Case
title: Creating a new room with valid data succeeds exactly once
owner: QA
mode: Standalone
status: Active
tags:
  - room
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
  - BRANCH-FIX-001
  - BRANCH-FIX-002
  - ROOM-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Creating a valid room succeeds

Replaces legacy `RoomSuite.tc_room_001b_createValidRoom`. Legacy cleans up
via a suite-level `@AfterAll`; since bnrest cases are independent (spec §8
— a suite is a container, not a shared-state pipeline) and must run
independently without relying on branch data another test created (see the
"Critical Architecture Correction" in `test-platform-architecture.md`,
§13), this case creates its **own** throwaway branch via `BRANCH-FIX-001`
rather than the real Harrow branch, and cleans up both the room and the
branch in its own `Teardown`.

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

Body
Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{
  "accessToken": "${session.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Room-${random()}",
  "ageRange": "1-2 years",
  "capacity": 10
}

Assert room.id != null
Assert room.capacity == 10

Teardown
Delete /api/v1/admin/rooms/${room.id} Using session.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${session.accessToken}",
  "slug": "${branch.slug}"
}
```
