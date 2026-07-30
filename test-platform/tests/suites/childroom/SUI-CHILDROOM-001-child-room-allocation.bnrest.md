---
id: SUI-CHILDROOM-001
number: "2.9"
type: Test Suite
title: Child Room Allocation and Transfer
owner: QA
mode: Standalone
status: Active
tags:
  - childroom
---

# Child Room Allocation and Transfer suite

New coverage for the authoritative child→room placement model + transfers
(`docs/rooms/room-allocation-design.md`). `Setup` creates a dynamic branch
with two normal rooms + one capacity-1 room, a second branch with one room
(cross-branch case), and one child of a compatible age (rooms here leave
min/max age unset, so age never blocks except where a case sets it).

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Nest-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room2
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Burrow-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into tinyRoom
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Tiny-${random()}", "ageRange": "0-5 years", "capacity": 1 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into roomB
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branchB.slug}", "name": "QA-AUTOTEST-OtherBranch-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Placement-${random()}", "dob": "2024-01-01" }

Body
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A01-allocate-both-views.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A02-duplicate-rejected.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A03-cross-branch-rejected.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A04-capacity-override.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A05-transfer.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A06-same-room-transfer-rejected.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A07-inactive-room-rejected.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A08-future-transfer-scheduled.bnrest.md
Call CatchError ../../cases/childroom_alloc/CHILDROOM-TC-A09-age-mismatch-rejected.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-004-REG-preserves-safety-fields.bnrest.md
Call CatchError ../../cases/childroom/CHILDROOM-TC-001-room-age-ranges-present.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room2.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${tinyRoom.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${roomB.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupB
{ "accessToken": "${adminSession.accessToken}", "slug": "${branchB.slug}" }
