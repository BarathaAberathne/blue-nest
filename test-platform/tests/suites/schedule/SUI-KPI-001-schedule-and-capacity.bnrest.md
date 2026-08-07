---
id: SUI-KPI-001
number: "1.12"
type: Test Suite
title: Schedule and Capacity Forecast
owner: QA
mode: Standalone
status: Active
tags:
  - schedule
  - kpi
---

# Schedule and Capacity Forecast suite

Migrates legacy `ScheduleSuite`. Verified against `internal/models/child.go`
(`Child.Sessions []ChildSession{Day, Type}` is real and live-wired into
`GET /admin/children/capacity-forecast`) and the handler that drives it.
No per-entry schedule-change history or "effective date" concept exists
server-side — a genuine, un-implemented gap, not asserted by either case.
`Setup` creates a dynamic branch, one dedicated room and one dedicated
unassigned-then-assigned child; both cases share and mutate the same
child's `sessions`, matching the legacy suite's own `@BeforeAll` fixture
shape.

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
  "name": "QA-AUTOTEST-Schedule-${random()}",
  "ageRange": "2-5 years",
  "capacity": 10
}

Call ../../utils/child/CHILD-UTIL-003-create-child-direct.bnrest.md With Json Into child
{
  "accessToken": "${adminSession.accessToken}",
  "branchSlug": "${branch.slug}",
  "firstName": "QA-AUTOTEST",
  "lastName": "Schedule-${random()}",
  "dob": "${today("-42m")}"
}

Call ../../utils/childroom/CHILDROOM-UTIL-001-allocate-child.bnrest.md With Json Into placement
{
  "accessToken": "${adminSession.accessToken}",
  "childId": "${child.id}",
  "roomId": "${room.id}"
}

Body
Call CatchError ../../cases/schedule/SCHEDULE-TC-001-mon-wed-fri-pattern.bnrest.md
Call CatchError ../../cases/schedule/SCHEDULE-TC-002-schedule-change-moves-occupancy.bnrest.md

Teardown
Delete /api/v1/admin/children/${child.id} Using adminSession.accessToken
Delete /api/v1/admin/rooms/${room.id} Using adminSession.accessToken
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
