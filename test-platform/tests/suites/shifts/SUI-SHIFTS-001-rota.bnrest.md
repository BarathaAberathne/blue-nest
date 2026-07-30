---
id: SUI-SHIFTS-001
number: "2.2"
type: Test Suite
title: Rota / Shift Scheduling
owner: QA
mode: Standalone
status: Active
tags:
  - shifts
---

# Rota / Shift Scheduling suite

New coverage (no legacy equivalent). Verified against
`internal/models/shift.go`, `internal/service/shift.go`,
`internal/handler/admin/shifts.go`. `Setup` creates a dynamic branch, one
room and one staff member shared by every case.

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
  "name": "QA-AUTOTEST-ShiftsRoom-${random()}",
  "ageRange": "2-5 years",
  "capacity": 10
}

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Shifts-${random()}",
  "email": "qa-autotest-shifts-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
Call CatchError ../../cases/shifts/SHIFTS-TC-001-create-shift.bnrest.md
Call CatchError ../../cases/shifts/SHIFTS-TC-002-list-by-branch-and-week.bnrest.md
Call CatchError ../../cases/shifts/SHIFTS-TC-003-update-and-delete.bnrest.md
Call CatchError ../../cases/shifts/SHIFTS-TC-004-validation-rejections.bnrest.md
Call CatchError ../../cases/shifts/SHIFTS-TC-005-external-cover-shift.bnrest.md
Call CatchError ../../cases/shifts/SHIFTS-TC-006-gap-locks.bnrest.md

Teardown
Delete /api/v1/admin/staff/${staff.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
