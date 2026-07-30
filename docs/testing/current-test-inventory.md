# Current test inventory (legacy REST-Assured suite) — baseline snapshot

This is the **Phase A baseline** for the BlueNest TestFlow migration (see
[`test-platform-architecture.md`](test-platform-architecture.md)). It
reflects a fresh, real run — not the suite's own README, which is stale (it
claims 123 tests; the real, currently-passing count is **109**).

- **Baseline commit:** `e95c27b` (the `develop` HEAD this migration branched from)
- **Command:** `make test-e2e` against `http://localhost:8080` (local Docker stack, `admin@bluenest.uk`)
- **Result:** **109 / 109 passing, 0 failures, 0 errors, 0 skipped**
- **Build system:** Maven (`test-automation/rest-assured-suite/pom.xml`)
- **Java:** 17 (`maven.compiler.source/target`); locally run with Homebrew OpenJDK 26 targeting bytecode 17
- **JUnit:** 5.11.3 (`junit-bom`) — Jupiter, no Vintage/JUnit4
- **REST-Assured:** 5.5.0 (+ `json-path` 5.5.0)
- **Other deps:** Jackson Databind 2.18.1, Hamcrest 2.2
- **Docker:** suite runs against the existing `docker-compose.yml` dev stack (backend/frontend/mongo containers), not its own compose file
- **CI:** **not wired into `.github/workflows/ci.yml`** — this suite needs a live backend + real seeded Harrow data, so it's a manual pre-push gate (`make test-e2e` / `make test-e2e-regression`), documented in `CLAUDE.md`, not a CI job

## Totals

| Metric | Count |
|---|---|
| Test classes (`*Suite.java`) | 14 |
| Test methods (`@Test`) | **109** |
| Passing | 109 |
| Failing | 0 |
| Skipped/disabled | 0 |
| Plan `TC-XXX-NNN` ids referenced (per suite README) | 49 of 55 |
| Plan ids verified N/A (not gaps — see suite README) | 6 (`TC-VISIT-002/003`, `TC-LOG-002/003`, `TC-RATIO-001/002`) |

## Per-class breakdown (from the fresh run's surefire reports)

| # | Class | Package | Tests | Pass | Fail | Order-dependent | Tags used |
|---|---|---|---|---|---|---|---|
| 1 | `AuthSuite` | `phase01_auth` | 4 | 4 | 0 | yes (`@TestMethodOrder`) | golden-path |
| 2 | `BranchSuite` | `phase02_branch` | 6 | 6 | 0 | yes | golden-path, regression |
| 3 | `RoomSuite` | `phase03_rooms` | 7 | 7 | 0 | yes | golden-path, regression |
| 4 | `StaffSuite` | `phase04_staff` | 6 | 6 | 0 | yes | golden-path, regression |
| 5 | `RoleSuite` | `phase05_roles` | 10 | 10 | 0 | yes | golden-path, regression, security |
| 6 | `EnquiryRegistrationSuite` | `phase06_enquiry_registration` | 17 | 17 | 0 | yes | golden-path, regression |
| 7 | `ChildRoomSuite` | `phase07_childroom` | 9 | 9 | 0 | yes | golden-path, regression, safeguarding |
| 8 | `ChildAttendanceSuite` | `phase08_childattendance` | 8 | 8 | 0 | yes | golden-path, regression, safeguarding |
| 9 | `StaffAttendanceSuite` | `phase09_staffattendance` | 11 | 11 | 0 | yes | golden-path, regression |
| 10 | `DailyLogSuite` | `phase10_dailylogs` | 11 | 11 | 0 | yes | golden-path, regression, safeguarding |
| 11 | `RoomStaffSuite` | `phase11_roomstaff` | 4 | 4 | 0 | yes | golden-path, regression |
| 12 | `ScheduleSuite` | `phase12_schedule` | 2 | 2 | 0 | yes | golden-path |
| 13 | `ConcurrencySuite` | `phase13_concurrency` | 4 | 4 | 0 | yes | regression |
| 14 | `SecuritySuite` | `phase90_security` | 10 | 10 | 0 | yes | regression, security |
| | **Total** | | **109** | **109** | **0** | | |

Every one of the 14 classes is `@TestMethodOrder(MethodOrderer.OrderAnnotation.class)`
and `runOrder=alphabetical` at the Surefire level (so the phase-numbered
package names, not filenames, control run order). **None of these are
independent test cases in the bnrest sense** — each class is one ordered,
stateful pipeline (e.g. `BranchSuite`: create → configure → reject invalid
update), sharing instance/static state across its own `@Order`ed steps. This
is the single most important migration fact: a legacy "test method" maps to
a bnrest **Test Case**, but a legacy **class** maps to a bnrest **Test
Suite** whose cases are wired with `dependsOn` in the same order, not a set
of parallel-safe independent cases.

## Reusable helpers already in place (the exact pattern bnrest formalises)

| Helper | File | Role |
|---|---|---|
| `Api.spec()` / `Api.authed(token)` | `support/Api.java` | Shared REST-Assured request spec |
| `Api.loginAdmin(email, password)` | `support/Api.java` | The one login implementation — POSTs `/api/v1/admin/auth/login` |
| `Api.loginAsAdmin()` | `support/Api.java` | JVM-wide cached admin token (avoids the 10/min login rate limit across 14 suites) — **the direct precedent for `AUTH-UTIL-001`** |
| `TestData.uniqueName/uniqueEmail` | `support/TestData.java` | `QA-AUTOTEST-`-prefixed, run-unique fixture naming |
| `JsonUtil` | `support/JsonUtil.java` | Jackson `ObjectMapper` helpers |
| `Env` | `config/Env.java` | `qa.baseUrl` / `qa.adminEmail` / `qa.adminPassword` system properties, `HARROW_BRANCH_SLUG` |

No credentials are committed: `Env` reads Maven system properties, defaulted
from `-D` flags / the `QA_*` env vars the Makefile exports — same discipline
`AUTH-UTIL-001`'s `${secret:...}` continues.

## Roles exercised

`super_admin` (the cached admin token, used by almost every suite),
`branch_manager`, `staff`, `admissions` (created ad hoc inside `RoleSuite`
to test role-scoped access). `director`, `finance`, `procurement` are **not**
exercised by this suite.

## Duplicate/near-duplicate logic already identified

- **Login**: every suite calls `Api.loginAsAdmin()` — already centralised,
  not duplicated. This is preserved as `AUTH-UTIL-001` going forward.
- **`TC-STAFF-002`** is documented in the suite's own README as *not*
  re-implemented per role variant (Deputy Manager/Room Leader/Practitioner/
  Bank Staff) — same `POST /admin/staff` path, different `job_title`; a
  duplicate the legacy suite deliberately avoided, carried forward as-is.
- **Enquiry creation** (`POST /admin/enquiries`) was repeated verbatim
  across `EnquiryRegistrationSuite`, `RoleSuite`, and `ConcurrencySuite`
  with near-identical bodies in the legacy suite — consolidated into
  `ENQUIRY-UTIL-001` (submit) / `ENQUIRY-UTIL-002` (find-by-name) in the
  bnrest migration.
- **Room creation** (`POST /admin/rooms`) similarly repeats across
  `RoomSuite`, `ChildRoomSuite`, `ScheduleSuite`, `ConcurrencySuite`.

## Tests that depend on execution order (beyond intra-class ordering)

- `EnquiryRegistrationSuite.tc_reg_001b_expectedStartDateHasNoTimezoneShift`
  only passes as part of that class's full ordered run — it needs a real
  enquiry walked through New → Contacted → Booked visit → Visit completed →
  Register earlier in the same class. Documented in the legacy README as a
  deliberate exception to the "regression subset is self-contained" rule.
- `AuthSuite.warmSharedTokenCache()` (`@BeforeAll`) must populate the shared
  token cache before `SecuritySuite`'s rate-limit test burns the per-IP
  login budget — this is why `SecuritySuite` is numbered `phase90_` (always
  runs last alphabetically), not because of its plan section number.

## Where this doc's numbers came from

Generated by walking `src/test/java/com/bluenest/qa/suites/**/*.java` with a
small extraction script (method-signature regex, tolerant of `throws`
clauses), cross-checked against the fresh `surefire-reports/*.txt` from the
run above — not estimated, not copied from the stale README. See
`test-platform/migration-manifest.json` for the exact per-test mapping this
produced.
