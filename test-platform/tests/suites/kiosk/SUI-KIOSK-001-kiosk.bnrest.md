---
id: SUI-KIOSK-001
number: "2.4"
type: Test Suite
title: Kiosk (Entrance Tablet)
owner: QA
mode: Standalone
status: Active
tags:
  - kiosk
---

# Kiosk suite

New coverage (no legacy equivalent). Verified against
`internal/models/kiosk_device.go`, `internal/middleware/kiosk.go`,
`internal/handler/kiosk.go`, `internal/handler/admin/kiosk.go`,
`internal/service/kiosk.go`.

**A real, deliberate platform limitation, not a silent gap:** the
kiosk-facing routes (`POST /kiosk/session`, `GET /kiosk/staff`,
`GET /kiosk/overview`, `POST /kiosk/clock-in`, `POST /kiosk/clock-out`)
authenticate via a custom `X-Kiosk-Token` header, never a JWT bearer
token. This engine's REST commands (`Get/Post/Put/Patch/Delete ... Using
<var>`) can only ever attach the resolved variable as an
`Authorization: Bearer <token>` header (`HttpClient.java`/`Executor.java`
— there is no `Header <name> <value>` command in the closed command set,
`Command.java`). None of the kiosk-facing routes can be exercised until
this engine gains a generic custom-header primitive — documented here as
a real, tracked follow-up, not yet implemented. What **is**
covered: the admin-side device lifecycle (create/list/toggle/delete, all
normal `Authorization: Bearer` admin routes) and the staff-PIN endpoint
that kiosk clock-in/out depends on. `Setup` creates a dynamic branch and
one staff member shared by every case.

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

Call ../../utils/staff/STAFF-UTIL-001-create-staff.bnrest.md With Json Into staff
{
  "accessToken": "${adminSession.accessToken}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Kiosk-${random()}",
  "email": "qa-autotest-kiosk-${random()}@bluenest.test",
  "branchSlug": "${branch.slug}",
  "jobTitle": "",
  "enableLogin": false,
  "loginRole": "",
  "loginPassword": ""
}

Body
Call CatchError ../../cases/kiosk/KIOSK-TC-001-create-device-token-shown-once.bnrest.md
Call CatchError ../../cases/kiosk/KIOSK-TC-002-list-toggle-delete-device.bnrest.md
Call CatchError ../../cases/kiosk/KIOSK-TC-003-staff-pin-set-and-validated.bnrest.md

Teardown
Delete /api/v1/admin/staff/${staff.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
