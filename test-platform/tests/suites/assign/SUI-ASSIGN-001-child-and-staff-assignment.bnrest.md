---
id: SUI-ASSIGN-001
number: "1.9"
type: Test Suite
title: Child and Staff Assignment
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
  - roomstaff
---

# Child and Staff Assignment suite

Combines legacy `ChildRoomSuite` (child→room) and `RoomStaffSuite`
(staff→room) — the spec's 12-suite lifecycle groups both under one
"assignment" concept (see `test-migration-map.md`'s suite-grouping
rationale). `Setup` creates a dynamic branch, one shared room, and one
shared unassigned child — mirroring both legacy classes' own
`@BeforeAll`-created fixtures. `CHILDROOM-TC-001` is genuinely
environment-specific (real Harrow rooms) and doesn't touch these shared
fixtures; `CHILDROOM-TC-003`/`004`/`EXIT6` and all four `ROOMSTAFF-TC-*`
create their own additional fixtures as needed but still read the shared
`branch`/`room` where relevant.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{
  "accessToken": "${adminSession.accessToken}"
}

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "name": "QA-AUTOTEST-Nest-${random()}",
  "ageRange": "3-24 months",
  "capacity": 10
}

Set childDob = "2026-03-01"
Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "ChildRoom-${random()}",
  "dob": "${childDob}"
}

Body
Call CatchError ../../cases/childroom/CHILDROOM-TC-001-room-age-ranges-present.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-002-assign-room.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-002-REG-room-only-preserves-dob.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-002-REG-b-room-only-preserves-name.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-002c-room-can-be-unassigned.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-003-over-capacity-not-enforced.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-004-age-mismatch-not-enforced.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-004-REG-preserves-safety-fields.bnrest.md
Call CatchError ../../cases/roomstaff/ROOMSTAFF-TC-001-staff-linked-to-room.bnrest.md
Call CatchError ../../cases/roomstaff/ROOMSTAFF-TC-002-no-max-staff-per-room.bnrest.md
Call CatchError ../../cases/roomstaff/ROOMSTAFF-TC-003-inactive-staff-not-gated.bnrest.md
Call CatchError ../../cases/roomstaff/ROOMSTAFF-TC-003b-nonexistent-room-accepted.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
