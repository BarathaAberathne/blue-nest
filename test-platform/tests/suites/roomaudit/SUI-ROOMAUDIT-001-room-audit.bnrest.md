---
id: SUI-ROOMAUDIT-001
number: "2.11"
type: Test Suite
title: Room Allocation Audit History
owner: QA
mode: Standalone
status: Active
tags:
  - roomaudit
---

# Room Allocation Audit History suite

New coverage — proves allocation mutations write audit entries with the
right action/entity_type (`docs/rooms/room-allocation-design.md` Audit).
`Setup` creates a branch, two rooms, one staff member and one child.

```bnrest
Setup
Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into adminSession
{ "email": "admin@bluenest.uk", "password": "${secret:QA_ADMIN_PASSWORD}" }

Call ../../utils/branch/BRANCH-FIX-001-create-test-branch.bnrest.md With Json Into branch
{ "accessToken": "${adminSession.accessToken}" }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-AuditNest-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/room/ROOM-UTIL-001-create-room.bnrest.md With Json Into room2
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "name": "QA-AUTOTEST-AuditBurrow-${random()}", "ageRange": "0-5 years", "capacity": 10 }

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{ "accessToken": "${adminSession.accessToken}", "firstName": "QA-AUTOTEST", "lastName": "AuditStaff-${random()}", "email": "qa-autotest-auditstaff-${random()}@bluenest.test", "branchSlug": "${branch.slug}", "jobTitle": "", "enableLogin": false, "loginRole": "", "loginPassword": "" }

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{ "accessToken": "${adminSession.accessToken}", "branchSlug": "${branch.slug}", "firstName": "QA-AUTOTEST", "lastName": "AuditChild-${random()}", "dob": "${today("-30m")}" }

Body
Call CatchError ../../cases/roomaudit/ROOMAUDIT-TC-001-staff-allocation-audited.bnrest.md
Call CatchError ../../cases/roomaudit/ROOMAUDIT-TC-002-child-transfer-audited.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/staff/${staff.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room2.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{ "accessToken": "${adminSession.accessToken}", "slug": "${branch.slug}" }
