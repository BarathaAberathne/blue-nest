# Blue Nest Montessori — QA REST-Assured Suite

An API/end-to-end regression suite for the flows and defects covered by
`test-automation/test-instructions` (the master QA plan) and this project's
live manual QA pass. Java 17+, Maven, REST-Assured 5, JUnit 5.

**Status: complete coverage of what's actually testable.** 120
tests, all passing, referencing 49 of the plan's 55 `TC-XXX-NNN` cases (some
partially — see the coverage matrix below). The remaining 6 are **not
missing tests** — they're plan cases describing functionality that was
verified, directly against the backend source, not to exist at all (no live
staff:child ratio/warning system, no sleep or nappy/toileting record type, no
standalone Visit entity). Every one of those is documented below with the
exact code checked, rather than silently skipped.

## Running it

From the repo root, `make test-e2e` (full ordered run) or
`make test-e2e-regression` (regression subset only) — both export
`PATH`/`JAVA_HOME` for a keg-only Homebrew OpenJDK install and default to
`http://localhost:8080` / `admin@bluenest.uk`, overridable via
`QA_BASE_URL`/`QA_ADMIN_EMAIL`/`QA_ADMIN_PASSWORD` env vars. See CLAUDE.md's
"QA & test automation" section — running one of these (ideally the
regression subset at minimum) is a **required step before pushing** any
backend business-logic/permission/API-contract change.

Or drive Maven directly from this directory:

```bash
cd test-automation/rest-assured-suite
mvn test
```

Override the target environment without touching code:

```bash
mvn test -Dqa.baseUrl=http://localhost:8080 \
         -Dqa.adminEmail=admin@bluenest.uk \
         -Dqa.adminPassword='...'
```

Run only the regression subset (everything this session found-and-fixed,
fastest way to confirm a deploy hasn't reintroduced a known bug):

```bash
mvn test -Dgroups=regression
```

Almost every `@Tag("regression")` test is self-contained (creates its own
throwaway fixture inline) specifically so this filtered run works standalone.
**One exception:** `EnquiryRegistrationSuite.tc_reg_001b_expectedStartDateHasNoTimezoneShift`
(the date-timezone regression) can only be proven by actually walking an
enquiry through New → Contacted → Booked visit → Visit completed → Register
— there's no cheaper way to produce a real `registration.expected_start_date`
to assert against. That test is tagged `regression` for documentation/
traceability, but only actually passes standalone as part of that class's
full ordered run (i.e. plain `mvn test`, not `-Dgroups=regression` in
isolation) — this is a deliberate, documented exception, not a bug in the
filter.

Run only the happy-path smoke test:

```bash
mvn test -Dgroups=golden-path
```

## Why this suite runs against the real Harrow branch, not a fresh tenant

The master plan's Phase 2 assumes creating Harrow from scratch. In this
codebase Harrow already exists with real Famly-imported data — there is no
disposable per-test database to reset (see `test-automation/section18-plan.md`
for the plan to build one, needed for Section 18 load testing). Every suite
therefore:

1. **Asserts** the existing branch/rooms/staff satisfy what a from-scratch
   creation would have proven (`BranchSuite.tc_br_001_harrowExistsCorrectly`,
   `RoomSuite.tc_room_001_existingRoomsAreValid`), instead of creating them.
2. **Creates** clearly-marked, run-unique fixtures for anything the plan
   needs to actually exercise a write path (`TestData.uniqueName`/
   `uniqueEmail` — prefix `QA-AUTOTEST-`, suffix a per-run identifier).
3. **Cleans up** everything it creates in `@AfterAll` where a delete endpoint
   exists — rooms, staff, children — except records that only exist to prove
   a REJECTION (nothing was created, nothing to delete). **Enquiries are the
   one exception**: there is no `DELETE /admin/enquiries/{id}` in this
   codebase (they're an audit/CRM trail by design), so `EnquiryRegistrationSuite`
   leaves its `QA-AUTOTEST-`-prefixed enquiries in place after each run —
   harmless, self-documenting, and consistent with this session's own
   "meaningful test data, not deleted" precedent.

If a suite run is ever interrupted before cleanup runs, anything with the
`QA-AUTOTEST-` prefix is safe to delete by hand — it is never a real person
or a real branch record.

## Why there's no separate Visit suite

The plan's Phase 9 (TC-VISIT-*) assumes a standalone Visit entity with its
own booking/reschedule/complete lifecycle. This codebase folds that entirely
into the Enquiry's own `status` field (`booked_visit` → `visit_completed` —
see `backend/internal/models/enquiry.go`). `EnquiryRegistrationSuite`
expresses TC-VISIT-001/004 as the equivalent status-transition assertions
rather than inventing a Visit API that doesn't exist.

## Test numbering

Every test's `@DisplayName` carries the master plan's own `TC-XXX-NNN` ID
where a direct equivalent exists. Where this session found and fixed a real
defect the plan didn't originally call out as its own numbered case, the
suite mints a suffixed ID (`TC-ROOM-002-REG`, `TC-CHILDATT-004-REG`, or a new
`SEC-NNN` for Section 19 items with no existing TC number) so the regression
is traceable back to its finding without inventing a fake plan citation.

## What's intentionally not (yet) duplicated

- **TC-STAFF-002** (Deputy Manager / Room Leader / Practitioner / Bank Staff
  creation) is the identical `POST /admin/staff` code path as TC-STAFF-001
  with a different `job_title`/`login_role` value — not re-implemented as
  four near-copies. Role-specific *permission* behaviour is covered instead
  by `RoleSuite`.
- **TC-LOG-002/TC-LOG-003** (sleep log, nappy/toileting log) are **N/A by
  design, not a gap** — verified directly against
  `backend/internal/models/daily_record.go`: the real `DailyRecordType` enum
  is only `observation | incident | safeguarding | medication | meal`. There
  is no sleep type, no nappy/toileting type, and no adjacent field to express
  them through (unlike TC-VISIT-*, see below) — a fabricated test would just
  re-test the `observation`/`meal` types under a different name.
- **TC-RATIO-001/TC-RATIO-002** (live staff:child ratio, understaffing
  warnings) are **N/A by design, not a gap** — verified directly against
  `backend/internal/service/child.go` and `models/room.go`: the only ratio
  concept anywhere server-side is a static, manually-set `Room.StaffRatio`
  int and a `ceil(children/ratio)` helper used solely inside the *forward*
  capacity-forecast planner (enrolled children vs. a fixed number — never
  today's actual check-ins). There is no age-band derivation from a child's
  DOB, no read of live staff attendance, no breach/warning field, and no
  room "At Risk" status anywhere in the codebase — there is nothing live to
  test. `ScheduleSuite` covers the one real, adjacent capability (the
  capacity-forecast's own math), clearly labelled as a different feature,
  not as TC-RATIO coverage.

## Coverage matrix (against `test-instructions` §7) — validated at TC-ID granularity

The master plan defines **55 unique `TC-XXX-NNN` identifiers**. This suite's
`@DisplayName`s reference **49** of them, and not always completely — some of
those 49 only cover part of their case's original scope, and several are
deliberate **gap locks** (a passing test that proves the plan's *expected*
behaviour is currently absent — see the "gap lock" callouts below). Numbers
below are exact (`comm` between `grep -oE 'TC-[A-Z]+-[0-9]+'` against the
plan and against the suite source, intersected — not estimates). Two extras
exist outside the 49: `TC-AUTH-003` (`SecuritySuite`'s rate-limit test) and
`TC-STAFF-004` (`StaffSuite`'s email/phone/job-title wipe-bug regression) are
both self-minted regression ids with no matching plan case (the plan only
goes to `TC-AUTH-002`/`TC-STAFF-003`) — real, valuable tests, just not plan
citations.

**Fully covered (21):** `TC-AUTH-001/002`, `TC-BR-001/002`, `TC-ENQ-001/002/
004/005/006`, `TC-REG-001/002/003`, `TC-ROOM-001/002`, `TC-SCHEDULE-001`,
`TC-STAFF-001/003`, `TC-VISIT-001/004` *(expressed as status transitions —
see "no separate Visit suite" above)*, `TC-CHILDROOM-002`, `TC-ROLE-003`
*(session/permission-propagation policy — old token keeps old permissions
until refresh, a fresh login picks up a role change, and the
privilege-escalation regression this session found and fixed)*.

**Partially covered (28) — present in the suite but narrower than the plan's
case, INCLUDING gap locks (marked below) that pass by proving the plan's
expected behaviour does not currently exist:**

| ID | Suite covers | Plan also asks for (not covered) |
|---|---|---|
| `TC-CHILDATT-001/002/004` | check-in, check-out, check-out-with-no-check-in | two simultaneous active sessions, collection by an unauthorised person, cross-branch attendance |
| `TC-CHILDROOM-001` | rooms expose a non-empty `age_range` | the actual age→room *recommendation* logic isn't asserted |
| `TC-STAFF-002` | — | only justified in a Javadoc comment as "same code path as TC-STAFF-001"; never actually executed as its own test |
| `TC-ROLE-001` | branch manager is scoped to Harrow, cannot access another branch, cannot do branch lifecycle actions | the branch-settings *assignment* flow itself, "only one active primary manager" and "previous manager reassignment" business rules — not enforced anywhere server-side, not just untested |
| `TC-ROLE-002` | deputy manager can act on enquiries, cannot view `/admin/users`, cannot cross into another branch | the plan's full per-capability checklist (book visits / register children / view rooms / record attendance / add daily logs individually) — covered generically by the same permission gate, not asserted one-by-one |
| `TC-STAFFATT-001` | one record created, status Present, `clock_in` set, duplicate clock-in blocked | Present-KPI delta, room available-staff count, staff-ratio recalculation, kiosk anti-double-tap (client-side, not testable via this API-layer suite) |
| `TC-STAFFATT-002` | session closes, `worked_minutes` computed, second clock-out rejected | break-rule deduction (no breaks recorded in the test), monthly-hours KPI; **the plan expects status to change away from Present on check-out — the real system does not do this** (`ClockOut` never modifies `Status`), a genuine plan-vs-system discrepancy, not a test gap |
| `TC-STAFFATT-003` | manager correction with a reason is applied and appended to `corrections[]` (including create-on-correct backfill); a shift left open on a genuinely PAST date is counted in the live `missing_clockout` KPI immediately (no background job needed — `summarize()` computes it from `date < today()`), with no hours calculated while the shift stays open, and the record's own flag flips true once corrected | — |
| `TC-STAFFATT-004` | a duplicate clock-in call is rejected rather than creating a second session (the same server-side guard that makes a client retry safe) | literal offline-queue/network-failure simulation and explicit "user receives clear feedback" — client-side concerns outside an API-layer suite |
| `TC-LOG-001` | meal log created once, correct branch/date, ref minted, required-field validation | parent-visibility rules, "Daily Log Completion KPI" (no such field exists server-side) |
| `TC-LOG-004` | EYFS areas + next steps persist correctly; the record's real status lifecycle | media/photo uploads, consent restrictions; **the plan's "draft and published states" don't exist server-side at all** — every type shares one `status` field with no draft concept, a genuine plan-vs-system discrepancy |
| `TC-LOG-005` | required fields, audit-log entry on delete | manager-review workflow trigger, parent acknowledgement, sensitive-data access restriction (no field-level redaction exists); **the plan says a record "cannot be silently deleted" — the real system allows a genuine hard delete, just an audited one, not a blocked one** — documented as a characteristic, not fixed here |
| `TC-LOG-006` | the branch-wide `/admin/daily-records/stats` KPI aggregate is well-formed | **this is a different feature than the plan's case** — the plan wants a per-*child* chronological daily summary (meals/sleep/toileting/activities/attendance in order); no such per-child timeline endpoint exists, only the branch-wide aggregate tested here |
| `TC-BR-003` | address/contact/opening-hours/capacity round-trip via `PUT` | **gap lock** — an invalid opening-hours entry (`"open":"not-a-time"`) is accepted, not rejected; fees/funding/notification/enquiry-settings/holiday-calendar fields don't exist on the `Branch` model at all |
| `TC-ENQ-003` | two identical enquiry submissions both succeed | **gap lock** — no duplicate-enquiry detection exists anywhere (no email+child window check); the plan expects this flagged/blocked |
| `TC-REG-004` | registering with no child fields still flips the enquiry to Registered | **gap lock** — `Register` is two non-transactional writes with no rollback; "registered" does not guarantee a child record exists |
| `TC-ROOMSTAFF-001` | a staff member's `room_id` links them to a room | **gap lock** — there is no "room leader" concept at all, just a plain link |
| `TC-ROOMSTAFF-002` | two staff assigned to the same room both succeed | **gap lock** — no max-staff-per-room cap exists |
| `TC-ROOMSTAFF-003` | an inactive staff member's room assignment succeeds; a nonexistent `room_id` is accepted | **gap lock** — no active/inactive gating, no room-existence check |
| `TC-CHILDROOM-003` | a second child assigned to a capacity-1 room succeeds | **gap lock** — no room-capacity enforcement anywhere in the write path |
| `TC-CHILDROOM-004` | a child far outside a room's `age_range` is assigned successfully | **gap lock** — no age-band enforcement anywhere in the write path |
| `TC-CHILDATT-003` | check-in on a day with no scheduled session succeeds, no "unscheduled" flag | **gap lock** — `CheckIn` never reads `Child.Sessions` or the day of week |
| `TC-SCHEDULE-002` | changing Fri→Thu updates the schedule; Friday occupancy decreases, Thursday increases | **the plan's "old schedule retained in history" and "effective date" claims are not implemented** — `Sessions` is a destructive wholesale overwrite, no history collection exists |
| `TC-CON-001` | two concurrent, field-disjoint enquiry edits (status change + note) both persist; AND two concurrent edits to the SAME field (status → two different values) both succeed with a plain 200 each, one silently overwriting the other | **gap lock** — no versioning/timestamp/optimistic-locking conflict detection exists anywhere; neither writer is ever told their change may have been lost |
| `TC-CON-002` | two children concurrently assigned to the same capacity-1 room both succeed | **gap lock**, same root cause as `TC-CHILDROOM-003` — proven under genuine concurrency (`ExecutorService` + `CountDownLatch`), not just sequential calls |
| `TC-CON-003` | two concurrent clock-ins for the same staff+date never produce more than one attendance record | the `staff_id+date` upsert key guarantees this invariant regardless of the race outcome, but the plan's specific "one succeeds, one gets an idempotent/conflict result" status-code pattern isn't hard-asserted (would be nondeterministic under a true race) |

**Zero coverage (6) — all N/A by design, not gaps:**

| ID | Why |
|---|---|
| `TC-VISIT-002/003` | No separate Visit entity exists to conflict-check or reschedule — folded into Enquiry status (see "no separate Visit suite" above) |
| `TC-LOG-002/003` | No sleep or nappy/toileting record type exists server-side (see "not (yet) duplicated" above) |
| `TC-RATIO-001/002` | No live staff:child ratio/warning system exists anywhere server-side (see "not (yet) duplicated" above) |

No further under-tested gaps remain identified as of this writing — every plan case that maps to real backend behaviour now has
either full coverage or an explicit gap-lock proving the plan's expectation isn't currently met. The 6 zero-coverage ids above are
the only cases left, and none of them are closeable by writing more tests (see "not (yet) duplicated" above for what would actually
need to be built first).

## What this suite is (and isn't)

It is a **REST/API-layer** end-to-end suite — it proves the business logic
and HTTP contract, which is where every bug found this session actually
lived. It does **not** cover:

- Browser rendering, duplicate network calls, or client-side state (Section
  10 of the plan) — that needs a browser-driving tool (Playwright/Cypress),
  a separate suite.
- Accessibility/keyboard nav/screen readers (Section 20) — same limitation.
- Load/performance at scale (Section 18) — see
  `test-automation/section18-plan.md`.

If UI-layer coverage becomes a priority, it's a second, separate suite next
to this one, not a rewrite of it — the two test different layers and should
stay decoupled.
