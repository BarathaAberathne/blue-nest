---
id: SUI-ATT-001
number: "1.10"
type: Test Suite
title: Attendance
owner: QA
mode: Standalone
status: Active
tags:
  - childatt
  - staffatt
---

# Attendance suite (child + staff)

Combines legacy `ChildAttendanceSuite` and `StaffAttendanceSuite` — the
spec's 12-suite lifecycle groups both under one "Attendance" concept (see
`test-migration-map.md`'s suite-grouping rationale; the kiosk itself
authenticates via a per-device token rather than a JWT and shares the same
`ClockIn`/`ClockOut` service code this suite already exercises, so it's
out of scope here per the legacy suite's own note). `Setup` creates a
dynamic branch, one shared child (no `sessions` — every day is
"unscheduled" for it, which `CHILDATT-TC-003` relies on) and one shared
permanent/active staff member. Every scenario uses a dedicated future (or,
for the missing-clockout KPI, deliberately past) date this suite owns
exclusively, so re-runs never collide with a same-day record.

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

Post /api/v1/admin/children Into child Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Attendance-${random()}",
  "dob": "2026-03-01",
  "branch_slug": "${branch.slug}"
}
AssertStatus child 201

Post /api/v1/admin/staff Into staff Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "StaffAttendance-${random()}",
  "email": "qa-autotest-staffattendance-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "job_title": "Practitioner",
  "staff_type": "permanent",
  "status": "active"
}
AssertStatus staff 201

Body
Call CatchError ../../cases/childatt/CHILDATT-TC-004-REG-checkout-without-checkin-rejected.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-001-check-in.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-001-REG-duplicate-checkin-rejected.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-002-check-out.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-002-REG-duplicate-checkout-rejected.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-004b-recheckin-clears-stale-checkout.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-004c-unknown-child-rejected.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-003-unscheduled-day-not-flagged.bnrest.md
Call CatchError ../../cases/childatt/CHILDATT-TC-005-noshow-counts-absent.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-002-REG-clockout-without-clockin-rejected.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-001-clock-in.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-001-REG-duplicate-clockin-rejected.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-002-clock-out-and-correct-existing.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-002b-REG-duplicate-clockout-rejected.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-003-correction-backfills-missing-day.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-004-mark-absent-clears-times.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-005-leave-taxonomy-breakdown.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-004b-summary-payload-well-formed.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-004c-unknown-staff-rejected.bnrest.md
Call CatchError ../../cases/staffatt/STAFFATT-TC-003c-missing-clockout-flagged-for-past-open-shift.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.body.data.id} Using adminSession.accessToken
Delete /api/v1/admin/staff/${staff.body.data.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
