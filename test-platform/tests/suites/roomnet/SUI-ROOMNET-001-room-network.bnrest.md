---
id: SUI-ROOMNET-001
number: "2.12"
type: Test Suite
title: Room Allocation API and Network Behaviour
owner: QA
mode: Standalone
status: Active
tags:
  - roomnet
---

# Room Allocation API and Network Behaviour suite

New coverage — proves each deliberate allocation action produces one
logical write and retries/transfers never leave duplicate active rows
(the partial unique indexes + compensating-rollback design in
`docs/rooms/room-allocation-design.md`). `Setup` creates a branch, two
rooms and one child.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-NetNest-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room2
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-NetBurrow-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "NetChild-${random()}", "dob": "2024-01-01" }

Body
Call CatchError ../../cases/roomnet/ROOMNET-TC-001-retry-no-duplicate.bnrest.md
Call CatchError ../../cases/roomnet/ROOMNET-TC-002-transfer-single-active.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room2.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
