---
id: SUI-PAYROLL-001
number: "2.35"
type: Test Suite
title: Payroll roll-up (Phase D)
owner: QA
mode: Standalone
status: Active
tags:
  - payroll
---

# Payroll roll-up suite

New coverage for the Phase-D worked-hours roll-up (`GET /admin/payroll` +
`/export`), verified against `internal/service/payroll.go` /
`internal/handler/admin/payroll.go`. `Setup` creates a dynamic branch and
one permanent/active staff member; every case queries **branch-scoped**, so
the roll-up rows are deterministic (exactly the one fixture staff member)
and re-runs never collide with real data. Attendance records are written on
dedicated far-future dates (`+40w…`) this suite owns exclusively.

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

Post /api/v1/admin/staff Into staff Using adminSession.accessToken
{
  "first_name": "QA-AUTOTEST",
  "last_name": "Payroll-${random()}",
  "email": "qa-autotest-payroll-${random()}@bluenest.test",
  "branch_slug": "${branch.slug}",
  "job_title": "Practitioner",
  "staff_type": "permanent",
  "status": "active"
}
AssertStatus staff 201

Body
Call CatchError ../../cases/payroll/PAYROLL-TC-001-validation.bnrest.md
Call CatchError ../../cases/payroll/PAYROLL-TC-002-rollup-figures.bnrest.md
Call CatchError ../../cases/payroll/PAYROLL-TC-003-zero-record-staff-included.bnrest.md
Call CatchError ../../cases/payroll/PAYROLL-TC-004-export.bnrest.md

Teardown
Delete /api/v1/admin/staff/${staff.body.data.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
