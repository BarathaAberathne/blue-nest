# BlueNest TestFlow — platform architecture

## What this is

**BlueNest TestFlow** (`.bnrest.md`) is a declarative API test scripting
format and Java execution engine that replaces the handwritten
`test-automation/rest-assured-suite` JUnit classes with readable Markdown
test documents, inspired by IFS Script-A-Rest/Test-A-Rest's concepts
(collections/suites/cases/utilities, an explicit command grammar, a
dependency graph) — without copying IFS branding or implementation, and
without arbitrary code execution: every script parses into an explicit AST
evaluated by a restricted interpreter, never `eval()`'d as code.

Migration is an incremental **strangler pattern** (see `migration-guide.md`
and `test-migration-map.md`): the legacy suite keeps running unchanged via
`make test-legacy` for as long as any test remains unmigrated, and no
legacy test is deleted until its bnrest replacement exists, executes, and
reaches **verified parity**.

## Status

- **Engine**: fully implemented — parser, AST, restricted expression
  evaluator, dependency graph (cycle/duplicate/orphan/missing-ref
  detection + topological sort), REST-Assured-backed executor (fixture
  scopes, redaction, duplicate-write detection, correlation IDs, retries
  for idempotent reads only), JUnit 5 `@TestFactory` integration, a CLI
  (`discover`/`validate`/`run`/`report`/`graph`), and JUnit XML / JSON /
  static HTML / Mermaid+JSON-graph reporting.
- **Migrated**: Authentication (`SUI-AUTH-001`), Branch Management
  (`SUI-BRANCH-001`), Room Management (`SUI-ROOM-001`), Staff and Role
  Setup (`SUI-STAFF-001`, combining legacy `StaffSuite`+`RoleSuite`, 16
  cases — the first suite to use a shared suite-level `Setup` fixture, spec
  §2), Child Registration (`SUI-REG-001`, migrating legacy
  `EnquiryRegistrationSuite.tc_reg_001..004`), Key Person Allocation
  (`SUI-KEYPERSON-001`, all-new coverage — the legacy suite never tested
  key-person allocation), and Enquiry Lifecycle (`SUI-ENQUIRY-001`,
  migrating the remaining `EnquiryRegistrationSuite.tc_enq_*` tests — the
  CRM-status half of that legacy class, distinct from `SUI-REG-001`'s
  registration half), all inside `COL-FUNC-001`. Verified at parity
  against the legacy `AuthSuite`/`BranchSuite`/`RoomSuite`/`StaffSuite`/
  `RoleSuite`/`EnquiryRegistrationSuite` (see
  `test-results/migration/parity-report.md`) — **160 of 164** manifest
  entries `completed` as of the "add all endpoints" pass below (Wave 1
  finished the remaining legacy migration; Wave 2 added 7 brand-new
  suites for modules the legacy suite never covered at all).
- **Generic-architecture retrofit** (complete for every migrated suite,
  per the "Critical Architecture Correction"): the collection was renamed
  `COL-HAR-001` Harrow Branch Full Lifecycle → `COL-FUNC-001` Nursery CMS
  Functional Tests; suites describe functional areas, never a named branch
  — branches are runtime data via new dynamic fixtures `BRANCH-FIX-001`
  (create-throwaway-branch)/`BRANCH-FIX-002` (archive), not the
  architecture. `SUI-BRANCH-001` (`BRANCH-TC-002/002b`, plus new
  `BRANCH-TC-004` "create an active branch"), `SUI-ROOM-001`
  (`ROOM-TC-002..007`), and `SUI-STAFF-001` (all 16 `STAFF-TC-*`/
  `ROLE-TC-*` cases) now each create their **own independent throwaway
  branch** per case rather than sharing Harrow — `ROOM-TC-006` was
  genuinely improved in the process (the legacy test's own cross-branch
  claim was never actually exercised; it now creates two real independent
  branches and proves true cross-branch name reuse), and `SUI-STAFF-001`'s
  shared suite `Setup` creates **two** dynamic branches (`branch` +
  `branchB`) so `ROLE-TC-001`/`ROLE-TC-005` prove cross-branch rejection
  against a genuine second branch instead of the hardcoded real `pinner`
  branch. `BRANCH-TC-001/001b/003/003b` and `ROOM-TC-001` deliberately
  keep testing the real, live Harrow branch — they verify actual
  environment state (legacy parity), a genuinely different thing from
  generic behaviour (see "Exceptions" below) — not yet physically moved to
  a separate `COL-CONFIG-001`. `SUI-REG-001` and `SUI-KEYPERSON-001` were
  built generic from the start (own throwaway branch(es) per case via the
  same `BRANCH-FIX-001`/`002` fixtures) — no retrofit needed. Also found
  and fixed while retrofitting `SUI-STAFF-001`: the migration manifest's
  16 `SUI-STAFF-001` entries had been left `pending`/`not-verified` despite
  the suite having been built and passing — a bookkeeping gap from an
  earlier session, now corrected (`migrationStatus: completed`,
  `parityStatus: verified`, ids remapped to the real `ROLE-TC-001..010`/
  `STAFF-TC-001..006` filenames the manifest's own planned ids never quite
  matched).
- **Child registration + Key Person** (delivered): the architecture
  correction's own first two named example behaviours. Landed as
  `SUI-REG-001`/`SUI-KEYPERSON-001` rather than new `SUI-CHILD-001`/
  `SUI-KEY-001` ids — `migration-manifest.json` already had a
  `plannedSuite: SUI-REG-001` ("Child Registration", already a generic
  name) mapping `EnquiryRegistrationSuite.tc_reg_001..004`, so those real
  legacy tests migrated into it directly. New utilities:
  `ENQUIRY-UTIL-001` (submit an enquiry), `CHILD-UTIL-001` (register an
  enquiry with child details — the real, already-atomic
  `POST /admin/enquiries/{id}/register` + `child_*` fields path, which
  `AdminEnquiryHandler.Register` wires straight into
  `childService.EnsureFromEnquiry` — contrary to the correction's own
  illustrative Gherkin, which assumed two separate steps), `CHILD-UTIL-002`
  (get child), `CHILD-UTIL-003` (direct create, no enquiry), `KEY-UTIL-001`
  (`PATCH .../key-person`, set or clear), `KEY-UTIL-002` (reverse lookup via
  `GET /admin/staff/{id}/key-children`). `ChildStats` has no "registered
  children" counter distinct from `total`/`active` — the correction's KPI
  assertion doesn't map onto a real field, so `REG-TC-001` asserts the
  actual contract instead (enquiry status + `registration.is_registered` +
  the child resolvable by search), matching what the legacy suite itself
  verified. `KEY-TC-004` is a **gap lock**: `SetKeyPerson` has no
  exclusivity/caseload check, so the same staff member can be key person
  for multiple children today — documented, not silently fixed.
- **Not migrated yet**: the remaining 6 target suites / legacy tests — see
  `test-migration-map.md` for the exact per-test rollout plan — plus, per
  the architecture correction, two E2E journey collections
  (`COL-E2E-001`/`002`), a `PROFILE=` test-data-profile mechanism, and
  `COL-CONFIG-001` for the environment-specific tests named above — none
  of these exist yet. The legacy suite (`test-automation/rest-assured-suite`)
  is fully intact and still the primary regression gate for everything not
  yet migrated.
- **Visual mapper**: v0, read-only, at `frontend/app/test-mapper` — shows
  the functional hierarchy only; the "functional vs. runtime-data vs.
  reuse vs. journey vs. environment-profile" view separation the
  architecture correction calls for is **not implemented**.
- **Docker**: `docker-compose.test.yml` exists and validates; depth of an
  actual containerised run is noted in `docker-testing.md`'s limitations.

## Module layout

```
test-platform/
  engine/                       # Maven module, isolated from the legacy one
    pom.xml                     # Java 17, JUnit 5.11.3, REST-Assured 5.5.0
                                 # (HTTP transport only), Jackson, SnakeYAML
    src/main/java/com/bluenest/testplatform/
      model/       # ScriptType, Metadata, AST node types, Graph, RunResult
      parser/      # front-matter (SnakeYAML) + fenced-block statement parser
      eval/        # restricted expression evaluator
      graph/       # DependencyGraph: build, validate, topo-sort
      exec/        # Executor, RequestLedger, Redactor, FixtureContext
      report/      # JUnit XML / JSON / static HTML / Mermaid+graph.json
      discovery/   # filesystem scan + filtering
      cli/         # Main entrypoint (discover/validate/run/report/graph)
      junit/       # BnRestTestFactory (JUnit 5 @TestFactory)
    src/test/java/com/bluenest/testplatform/   # the platform's own tests
  tests/
    collections/functional/COL-FUNC-001-nursery-cms-functional-tests.bnrest.md
    suites/auth/SUI-AUTH-001-authentication.bnrest.md
    cases/auth/AUTH-TC-00{1,2,2b,4}-*.bnrest.md
    utils/auth/AUTH-UTIL-001-login.bnrest.md
    data/auth/DATA-AUTH-001-invalid-credentials.csv
  migration-manifest.json
docs/testing/*.md
docker-compose.test.yml
test-results/{junit,json,html,requests,graphs,performance,migration}/
```

The engine is its **own Maven module**, deliberately not touching
`test-automation/rest-assured-suite/pom.xml` — `make test-legacy` runs
exactly the same `mvn test` it always has, with zero coupling to the new
code.

## Command surface

All commands the spec requires are implemented; a few are intentional
aliases rather than separately-implemented behaviour (documented, not
hidden):

| Category | Commands | Notes |
|---|---|---|
| REST | `Get`, `Post`, `Create`, `Put`, `Patch`, `Modify`, `Delete`, `Query`, `Batch` | `Create`≈`Post`, `Modify`≈`Patch`, `Query`≈`Get` with params, `Batch`=sequential sub-requests sharing one step number |
| Reuse | `Call`, `Output`, `Into`, `With Json`, `When`, `CatchError`, `Fresh`, `Include`, `Setup`, `Teardown` | `dependsOn`/`uses` are **front-matter fields**, not inline statements — matches the spec's own examples. `Call Fresh <target>` bypasses the target Util's fixture-scope cache for that one invocation — needed when the exact same credentials/input must genuinely re-execute (e.g. logging in again to prove a role change took effect, where the cache would otherwise silently hand back the stale pre-change token — found migrating `ROLE-TC-010`). `Output`/request-body templates tolerate a missing **final** field in a path (resolve to `null` instead of throwing) — a REST response's optional field (e.g. a staff record's `user_id`, only present when a login was actually created) shouldn't block template construction; `Assert`/`Set` expressions are unaffected and still throw on any undefined path (found migrating `STAFF-UTIL-001`) |
| Variables | `Set`, `Eval`, `ApplyJson`, `CopyJson`, `RemoveJson`, `LoadJson`, `LoadCsv`, `Random`, `Timestamp` | `CopyJson` uses full Jayway JSONPath (same engine as `AssertJson`) — e.g. `CopyJson branches $.body.data[?(@.slug=='harrow')] Into harrow` to pull one item out of a list by filter (write the filter WITHOUT a trailing `[0]` — Jayway doesn't support chaining an index after a filter predicate; a single-element filter match is auto-unwrapped from its list instead — found and fixed during the Branch migration, see `writing-tests.md`). A multi-condition filter (e.g. matching first name AND last name together) needs the same double-quoting `AssertJson` uses to stay one token — `CopyJson` didn't unquote its argument until the Child Registration migration (`CHILD-UTIL-001`'s two-field filter was the first case that needed it; fixed in `StatementParser`, regression-locked in `ExecutorIntegrationTest`). `ApplyJson`/`RemoveJson` still use the simpler dotted/array-index resolver (object field mutation only). `LoadCsv` uses a small built-in parser (no quoted-comma escaping — documented limitation) |
| Validation | `Assert`, `AssertJson`, `AssertStatus`, `AssertHeader`, `AssertSchema`, `AssertResponseTime`, `ExpectFail`, `Print` | `AssertSchema` is a basic type/shape check, **not** full JSON-Schema — documented limitation. `AssertJson`'s JSONPath argument may contain spaces (multi-condition filters, multi-word string literals) — wrap it in double quotes to keep it one token (found during the Room migration; see `writing-tests.md`). A filter's match **count** (`== N`) is computed in Java from the result list's size, not via Jayway's own `.length()` chained after a filter, which is unreliable (found during the Room migration — see `test-results/migration/parity-report.md`'s "Engine bugs found and fixed" sections for the full list). |
| Aliases | `Given`, `When`, `Then`, `And` | Stripped before parsing; same AST node as the underlying command — one engine, not two |

Expressions (`Assert`, `Set`, `When` guards) go through an **allowlisted**
evaluator: dotted variable paths, string/number/bool/null literals,
`== != > >= < <= && ||`, and the functions `random()`, `timestamp()`,
`secret(name)`, `today(offset)`. There is no way to reach arbitrary Java,
shell, or JavaScript execution from a script file.

`today()` renders the run day as `YYYY-MM-DD`; an optional signed offset
shifts it — `today("+2y")`, `today("-30d")`, `today("+3m")`, `today("+1w")`.
**Date-sensitive tests must use it instead of hardcoding calendar dates**
(a "future" DOB written as `2030-01-01` silently stops being future when the
calendar catches up; `${today("+2y")}` never rots). See `REG-TC-005`.

## Fixture scopes

- **`case`** — fresh context per test case; nothing survives between cases.
- **`suite`** — created once per suite run (e.g. a suite-level login),
  shared **read-only** by every case in that suite after setup completes.
- **`run`** — immutable configuration only (base URL, environment name),
  loaded once for the whole run.

Suite/run contexts are wrapped immutable after their setup phase — there is
no raw shared mutable global map any script can write into, closing off the
"suite fixture and case fixture both perform login" duplicate-call failure
mode the spec calls out explicitly.

## Secrets and redaction

`${secret:NAME}` resolves **only** from `System.getenv(NAME)` — never a
committed file — and errors loudly if unset. `test-validate` flags any
literal-looking password/token string in a script body that isn't a
`${...}` reference.

Redaction happens at **trace-recording time**: `password`, any key/header
matching `*token*`/`*cookie*`/`api[_-]?key`, the `Authorization` header, and
known sensitive child/staff fields are replaced with `[REDACTED]` before
anything is written to `test-results/requests|json|html`. The in-memory
execution context still holds the real values (needed to make the actual
HTTP calls) — redaction is a reporting-boundary concern, not an
execution-time one.

## Duplicate write detection

A `RequestLedger`, scoped per case run, keys every write request
(`POST`/`PUT`/`PATCH`/`DELETE`) by `method + normalized URL + request-body
hash`. A repeat of the same key without `allowDuplicateRequest: true` in
that case's front matter is recorded as a `duplicate-warning` in the trace
report (**warn-by-default**, matching the spec's "warn or fail" — chosen so
a first migration pass doesn't hard-fail on borderline cases; tightening to
fail-by-default is a documented, easy follow-up once more suites are
migrated and the false-positive rate is known).

## Dependency graph

Built from: collection→suite containment, suite→case containment,
front-matter `dependsOn`/`uses`, inline `Call` targets, and declared
`Setup`/`Teardown` fixtures. Validation runs before any HTTP call is made
(`test-validate` / the `validate` CLI subcommand) and checks, in order:
circular dependencies, missing referenced IDs, invalid call-hierarchy edges
(e.g. a Test Case calling a Test Suite — rejected), duplicate IDs,
duplicate `number`s, orphan tests (not in any suite/collection), and
suites with zero cases. A topological sort produces the execution order for
anything with `dependsOn` edges.

## Execution engine

REST-Assured is used as the **HTTP transport only** — the executor builds
requests/reads responses through it, but no test author writes REST-Assured
Java; everything above that layer is bnrest's own AST/executor. Retries are
only ever applied to explicitly-marked idempotent reads or infrastructure
calls, never to writes (matching the spec — no blind retry of a `Post`).
Correlation IDs are generated per case run and threaded through every
request; the trace report includes them so a failure can be cross-referenced
against backend logs.

## BlueNest TestFlow UI (`frontend/app/test-mapper`)

**Redesigned from a single interactive-graph page into an explorer-first
layout**: Test Explorer (collapsible `Collection → Suite → Case` tree) +
Workspace (`Overview | Test Cases | Scenario | Dependencies | Endpoints`
tabs) + Inspector + a dedicated Runs screen, with the full dependency graph
demoted to a scoped, depth-limited diagnostic view (Dependencies tab, not
the landing page) — the original all-nodes graph stops being readable once
the suite has hundreds of cases, exactly as flagged when this redesign was
requested. Still a read-only route, `robots: noindex`, deliberately
**outside** `AdminLayout`/tenant RBAC. Two new (dev-only, `NODE_ENV`-gated
+ path-contained) Next.js API routes read `test-results/json/*.json` (run
history) and raw `.bnrest.md` source straight off disk, alongside the
existing static `test-platform-graph.json` export. Building the Scenario
tab surfaced a real engine bug — `StepTrace.utilId` was declared but never
assigned, so a step from inside a called Util couldn't be distinguished
from a direct case-level call; fixed in `Executor.executeRest`,
regression-locked (62 engine unit tests now, up from 61). See
`visual-mapper.md` for the full breakdown and what's still deferred
(Requirements/Roles coverage views, separate Dashboard/Migration/Settings
routes).

## Deliberate scope decisions / limitations

- **CI is untouched.** Like the legacy suite, the new one needs a live
  backend + real data and stays a manual pre-push gate, not a
  `.github/workflows/ci.yml` job. Wiring either suite into CI (with a
  disposable test database — see `test-automation/section18-plan.md`'s
  existing note about needing one) is future work.
- **`AssertSchema`** is a basic shape/type checker, not full JSON-Schema
  validation.
- **`LoadCsv`** uses a minimal built-in parser (no quoted-comma escaping).
- **Duplicate-write detection defaults to warn, not fail.**
- **7 of 12 original-spec target suites are not migrated yet** — Child
  Registration and Key Person Allocation are now delivered
  (`SUI-REG-001`/`SUI-KEYPERSON-001`); see `test-migration-map.md` for the
  exact rollout order for the rest.
- **`make test-docker`** is validated via `docker compose ... config`; a
  full containerised run's depth is documented in `docker-testing.md`.
- **No `PROFILE=` test-data-profile mechanism yet.** The architecture
  correction's model (`make test-suite SUITE=... PROFILE=generated|harrow|
  staging`) isn't implemented — every currently-migrated generic test
  creates its own dynamic branch inline (`BRANCH-FIX-001`) rather than
  selecting from a named profile; the environment-specific tests
  (`BRANCH-TC-001/001b/003/003b`, `ROOM-TC-001`) hardcode `harrow` directly
  rather than reading it from a profile. Both would need a real profile
  abstraction to match the correction's intent fully.
- **No `COL-CONFIG-001` yet.** The environment-specific tests above are
  flagged in their own suite's markdown as "genuinely branch-specific,
  pending move" rather than physically relocated to a separate collection.
- **Dynamic branch creation has a real, accepted cleanup gap**: this
  backend has no branch hard-delete (only soft-archive) and no enquiry
  delete at all, so every fixture-created branch (and anything created
  under it) is permanent data, invisible in normal admin UI lists but not
  actually removable — a known, explicitly user-accepted tradeoff (see the
  session's own risk assessment before this retrofit began), not an
  oversight.
- **Full-collection-run login volume now reliably exceeds the backend's
  rate limit.** `COL-FUNC-001` end-to-end makes well over a dozen real
  `/auth/login` calls in a few seconds (Auth's own negative-credential
  sweep, Staff/Role's deputy/manager/fresh-login fixtures, plus Child
  Registration's and Key Person's own admin logins in each suite/case
  Setup) — comfortably past the documented 10/minute-per-IP limit, so a
  full-collection run should be expected to 429 on whichever suite runs
  last (verified: Staff/Role's Setup login failed with 429 on a full
  `COL-FUNC-001` run immediately after adding these two suites, while all
  31 non-rate-limited tests passed). This is a test-runner characteristic,
  not a product bug — a per-suite login cache (rather than each suite/case
  logging in fresh) or a documented cooldown between suites in
  `COL-FUNC-001` would fix it, and is worth doing before the collection
  grows further. Running one suite at a time (`make test-suite SUITE=...`)
  stays comfortably under the limit and is the reliable way to run
  anything today.

## Wave 1 + Wave 2 — full-endpoint coverage

Covers every real, currently-working backend endpoint, not just the
original 123-legacy-test migration scope: **Wave 1** closes out the
remaining legacy migration; **Wave 2** adds 7 brand-new suites for modules
the legacy suite never touched at all. Full per-test mapping in
`test-migration-map.md`; full endpoint-by-endpoint checklist in
`endpoint-inventory.md`.

**Wave 1 (finishing the legacy migration — see `test-migration-map.md`
for the exact per-test mapping):** `SUI-VISIT-001` (visit
booking), `SUI-ASSIGN-001` (child→room + room→staff, merging legacy
`ChildRoomSuite`+`RoomStaffSuite`), `SUI-ATT-001` (child + staff
attendance, merging `ChildAttendanceSuite`+`StaffAttendanceSuite`),
`SUI-LOG-001` (daily records), `SUI-KPI-001` (schedule/capacity-forecast,
migrating `ScheduleSuite`), and `SUI-NET-001` (migrating the two genuine
"Exit Criteria §6" duplicate/replay tests, plus the `SecuritySuite`
migration folded into `SUI-AUTH-001` per the suite-grouping rationale).
**A real, deliberate platform limitation surfaced here**: legacy
`ConcurrencySuite`'s 4 tests use a genuine Java `ExecutorService` +
`CountDownLatch` to fire truly simultaneous HTTP requests — this
Markdown-based engine has no primitive for that (every case is a
strictly sequential `Given/When/Then` list; `Command.java`'s closed
command set has no thread/parallel/race construct). Re-running them
sequentially would prove nothing about the actual race and would be
actively misleading, so they were **deliberately not migrated**
(`migrationStatus: not-migrated`, `parityStatus:
n/a-platform-limitation` in the manifest) — documented as a real,
tracked follow-up (a future `Concurrent`/`Race` engine primitive), not a
silent gap. `SUI-NET-001` still migrates the genuinely
sequentially-testable slice (duplicate-call/replay handling).

**Wave 2 (brand-new suites, no legacy equivalent):** `SUI-STORE-001`
(products/categories/cart/checkout/orders, public+admin/customer),
`SUI-BLOG-001` (posts/likes/comments, public+admin), `SUI-SHIFTS-001`
(rota CRUD), `SUI-AUDIT-001` (audit log, incl. deterministic
action/entity_type assertions), `SUI-KIOSK-001` (admin device
lifecycle + staff PIN — the kiosk-facing routes themselves are
undertestable, see below), `SUI-PROCUREMENT-001` (order-requests,
catalogue, purchase-carts/orders incl. the full generate→place→fulfill→
receive lifecycle, suppliers, analytics, templates), and
`SUI-USERACCOUNT-001` (users, custom roles, org self-service, platform
organisations, personal + org-wide dashboard layouts).

**A second real, deliberate engine limitation surfaced in `SUI-KIOSK-001`**:
the kiosk-facing routes (`/kiosk/session`, `/kiosk/staff`,
`/kiosk/overview`, `/kiosk/clock-in`, `/kiosk/clock-out`) authenticate via
a custom `X-Kiosk-Token` header, never a JWT bearer token — this engine's
REST commands (`Get/Post/... Using <var>`) can only ever attach the
resolved variable as `Authorization: Bearer`, with no generic
`Header <name> <value>` primitive. Documented as a tracked follow-up
rather than faked; the suite still fully covers the admin-side device
CRUD + staff-PIN endpoint those kiosk routes depend on.

**A real product bug found (and fixed) while writing `SUI-STORE-001`**:
verifying that checkout creates an admin-visible pending order surfaced a
genuine multi-tenancy bug — every brand-new customer's first JWT (minted
by `POST /auth/register`) carried an **empty `org_id` claim**, because
`authService.Register` minted the token from its local, pre-insert
`models.User` struct rather than re-fetching it (the tenant-stamping in
`TenantCollection.InsertOne` rewrites the document sent to Mongo, not the
caller's original Go value). `middleware.Auth` then treated that empty
claim as cross-org, so the customer's own subsequent writes — including
their checkout order — got created with **no `org_id` at all**,
permanently invisible to any org-scoped admin fetch. `Login` was never
affected (it already re-fetches via `FindByEmail`). **Fixed** by making
`Register` do the same re-fetch before issuing tokens; backend container
rebuilt + redeployed; regression-locked by `STORE-TC-007`/`008`/`009`
(all now passing against the fixed backend). Full writeup in
`endpoint-inventory.md`.

**Two authoring pitfalls found and fixed in this engine's own test
scripts while building Wave 2** (both now avoided across the whole test
tree, verified by a tree-wide grep):
1. `AssertJson`'s "list + numeric literal = count of matches" convention
   (a deliberate design choice, documented in `Executor.java`'s
   `assertJson()`, working around Jayway's own unreliable `.length()`
   chaining) means a JSONPath like
   `"$.items[?(@.product_id=='x')].qty" == 2` is NOT a value comparison —
   it silently becomes "how many matches" (always resolving to `1` for a
   single match, regardless of the real `qty`). Fix: extract the matched
   object first via `CopyJson`, then `Assert extracted.qty == 2` against
   the plain dotted-path result — the same pattern already established
   for nested extractions in `SUI-KPI-001`.
2. `Set x = "prefix-${random()}"` does **not** resolve the `${...}`
   inside the quoted string — `Set`/`Assert`'s restricted expression
   grammar treats a quoted-string token as a literal verbatim (no
   recursive template substitution), unlike REST command targets/bodies,
   which do go through `TemplateSubstitutor`. The stored variable ends up
   containing the literal, unresolved text `${random()}` — harmless in a
   JSON body field (just a weird-but-consistent string, silently breaking
   true randomness across repeated runs), but a hard crash if that value
   is later used inside a URL path (REST-Assured's own `{...}`
   path-parameter syntax chokes on the leftover literal braces). Fix:
   never combine a literal prefix with `random()` inside a `Set`; either
   generate the random value directly inline in the JSON body/URL
   (`"name": "prefix-${random()}"` written straight into the REST
   statement, which DOES get substituted correctly) and read back the
   real value from the response for later steps, or `Set suffix =
   random()` as a bare, unwrapped function call and reference
   `${suffix}` elsewhere.

**Verification**: `mvn validate` clean (zero cycles/orphans/duplicate
ids) across the full tree; every suite listed above run live against the
real local backend and confirmed passing (`SUI-BLOG-001` 8/8,
`SUI-SHIFTS-001` 6/6, `SUI-AUDIT-001` 3/3, `SUI-KIOSK-001` 3/3,
`SUI-STORE-001` 9/9, `SUI-PROCUREMENT-001` 11/11, `SUI-USERACCOUNT-001`
8/8, `SUI-KPI-001` 2/2, `SUI-NET-001` 2/2) before wiring into
`COL-FUNC-001`. `SUI-AUTH-001` (now ending in the rate-limit-burning
`AUTH-TC-003`) was moved to run **last** in `COL-FUNC-001` — the same
positional constraint the legacy `SecuritySuite` needed, for the same
reason (see that suite's own note above).
