---
id: COL-FUNC-001
number: "1"
type: Test Collection
title: Nursery CMS Functional Tests
owner: QA
mode: Standalone
status: Active
tags:
  - functional
---

# Nursery CMS Functional Tests

The primary generic functional collection (see the "Critical Architecture
Correction" in `docs/testing/test-platform-architecture.md`'s "Generic
functional architecture" section — this replaced the earlier
Harrow-specific `COL-HAR-001`, same suites, same verified results,
generic name). Suites describe **functional areas** (Authentication,
Branch Management, Room Management, Staff and Role Setup, …), never a
named branch — branches/staff/children are runtime data supplied through
fixtures/data profiles, not the architecture itself.

`SUI-AUTH-001`, `SUI-BRANCH-001`, `SUI-ROOM-001`, `SUI-STAFF-001`,
`SUI-REG-001` (Child Registration), `SUI-KEYPERSON-001` (Key Person
Allocation, all-new coverage) and `SUI-ENQUIRY-001` (Enquiry Lifecycle)
are migrated and wired in so far — see `docs/testing/test-migration-map.md`
for the full rollout plan and exact per-legacy-test mapping of the
remaining suites, all tracked in `test-platform/migration-manifest.json`.
Genuinely environment/branch-specific tests (verifying the real, live
Harrow branch's actual pre-existing state — not generic behaviour) live
separately in `COL-CONFIG-001` (`docs/testing/test-platform-architecture.md`
"Exceptions"), not here.

**`SUI-AUTH-001` MUST be called LAST**, not first: it now ends with
`AUTH-TC-003` (login rate-limit regression lock), which deliberately burns
the shared per-IP login budget (`middleware.RateLimit(10, time.Minute)` on
both login routes) — every other suite's own `Setup` needs a fresh login
to succeed first. See `SUI-AUTH-001`/`AUTH-TC-003`'s own doc comments.

```bnrest
Call CatchError ../../suites/branch/SUI-BRANCH-001-branch.bnrest.md
Call CatchError ../../suites/room/SUI-ROOM-001-rooms.bnrest.md
Call CatchError ../../suites/staff/SUI-STAFF-001-staff-and-roles.bnrest.md
Call CatchError ../../suites/reg/SUI-REG-001-child-registration.bnrest.md
Call CatchError ../../suites/key/SUI-KEYPERSON-001-key-person-allocation.bnrest.md
Call CatchError ../../suites/enquiry/SUI-ENQUIRY-001-enquiry-lifecycle.bnrest.md
Call CatchError ../../suites/visit/SUI-VISIT-001-visit-booking.bnrest.md
Call CatchError ../../suites/attendance/SUI-ATT-001-attendance.bnrest.md
Call CatchError ../../suites/dailylog/SUI-LOG-001-daily-logs.bnrest.md
Call CatchError ../../suites/schedule/SUI-KPI-001-schedule-and-capacity.bnrest.md
Call CatchError ../../suites/net/SUI-NET-001-network-and-endpoint-validation.bnrest.md
Call CatchError ../../suites/blog/SUI-BLOG-001-blog.bnrest.md
Call CatchError ../../suites/shifts/SUI-SHIFTS-001-rota.bnrest.md
Call CatchError ../../suites/audit/SUI-AUDIT-001-audit-log.bnrest.md
Call CatchError ../../suites/kiosk/SUI-KIOSK-001-kiosk.bnrest.md
Call CatchError ../../suites/store/SUI-STORE-001-store.bnrest.md
Call CatchError ../../suites/procurement/SUI-PROCUREMENT-001-procurement.bnrest.md
Call CatchError ../../suites/useraccount/SUI-USERACCOUNT-001-user-account.bnrest.md
Call CatchError ../../suites/staffroom/SUI-STAFFROOM-001-staff-room-allocation.bnrest.md
Call CatchError ../../suites/childroom/SUI-CHILDROOM-001-child-room-allocation.bnrest.md
Call CatchError ../../suites/capacity/SUI-CAPACITY-001-room-capacity.bnrest.md
Call CatchError ../../suites/roomaudit/SUI-ROOMAUDIT-001-room-audit.bnrest.md
Call CatchError ../../suites/roomnet/SUI-ROOMNET-001-room-network.bnrest.md
Call CatchError ../../suites/auth/SUI-AUTH-001-authentication.bnrest.md
```
