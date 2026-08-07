---
id: SUI-CAPACITY-001
number: "2.10"
type: Test Suite
title: Room Capacity and Availability
owner: QA
mode: Standalone
status: Active
tags:
  - capacity
---

# Room Capacity and Availability suite

New coverage for the single authoritative capacity calculation
(`GET /admin/rooms/{id}/capacity` and the branch roll-up). Available
spaces is placement-based (capacity − active placements); attendance is
reported separately and never affects it. `Setup` creates a branch, a
capacity-3 room, and two children.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-Cap-${random()}", "ageRange": "0-5 years", "capacity": 3 }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Cap1-${random()}", "dob": "${today("-30m")}" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child2
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "Cap2-${random()}", "dob": "${today("-29m")}" }

Body
Call CatchError ../../cases/capacity/CAPACITY-TC-001-allocated-and-available.bnrest.md
Call CatchError ../../cases/capacity/CAPACITY-TC-002-branch-rollup.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/children/${child2.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
