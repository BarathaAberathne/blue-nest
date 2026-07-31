---
id: SUI-STAFFROOM-001
number: "2.8"
type: Test Suite
title: Staff Room Allocation
owner: QA
mode: Standalone
status: Active
tags:
  - staffroom
---

# Staff Room Allocation suite

New coverage for the authoritative staff→room assignment model
(`docs/rooms/room-allocation-design.md`) — distinct from the legacy
`SUI-ASSIGN-001` which exercised the old single `room_id` field. `Setup`
creates a dynamic branch with two rooms, a second branch with one room
(for the cross-branch rejection case), and one active staff member.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branchB
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Nest-${random()}", "ageRange": "2-5 years", "capacity": 10 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room2
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Burrow-${random()}", "ageRange": "2-5 years", "capacity": 10 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into roomB
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branchB.slug}", "name": "QA-AUTOTEST-OtherBranchRoom-${random()}", "ageRange": "2-5 years", "capacity": 10 }

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "RoomStaff-${random()}",
  "email": "qa-autotest-roomstaff-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-001-allocate-from-room.bnrest.md
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-002-duplicate-rejected.bnrest.md
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-003-multi-room-and-primary.bnrest.md
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-004-inactive-staff-rejected.bnrest.md
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-005-cross-branch-rejected.bnrest.md
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-006-end-allocation.bnrest.md
Call CatchError ../../cases/staffroom_alloc/STAFFROOM-TC-007-profile-edit-preserves-room.bnrest.md

Teardown
Delete /api/v1/admin/staff/${staff.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room2.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${roomB.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanupB
{ "accessToken": "${adminSession.accessToken}", "slug": "${branchB.slug}" }
