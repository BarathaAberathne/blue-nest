---
id: SUI-NET-001
number: "1.13"
type: Test Suite
title: Network and Endpoint Validation
owner: QA
mode: Standalone
status: Active
tags:
  - net
  - regression
---

# Network and Endpoint Validation suite

Migrates the two genuine "Exit Criteria §6 (regression)" duplicate/replay
tests (`ChildRoomSuite.tc_exitcriteria_duplicateChildRejected` and
`DailyLogSuite.tc_exitcriteria_duplicateDailyRecordDebounced`) plus the
**sequentially-testable** slice of legacy `ConcurrencySuite`.

**A real, deliberate platform limitation, not a silent gap:** this
Markdown-based test grammar (see `docs/testing/test-platform-architecture.md`)
has no primitive for firing two genuinely simultaneous HTTP requests — every
`.bnrest.md` case is, by design, a strictly sequential list of `Given/When/
Then` steps (`Command.java`'s closed command set has no thread/parallel/
race construct; `Batch` is a documented alias for a single sequential
sub-request chain, not concurrent execution). Legacy `ConcurrencySuite` used
a real Java `ExecutorService` + `CountDownLatch` start-gate specifically to
prove behaviour **under a genuine race** (two threads released at the same
instant). That mechanism cannot be expressed in this engine today, so:

- `TC-CON-001`/`TC-CON-001b` (concurrent enquiry edits) and `TC-CON-003`
  (concurrent staff clock-in) are **not** migrated here. Re-running them as
  two *sequential* calls would not exercise a race at all — it would just
  prove "the second of two sequential writes wins", which is true of any
  ordinary system and asserts nothing about the actual, documented gap (no
  optimistic locking / no conflict detection on same-field writes). A test
  that looks like a concurrency regression lock but never exercises
  concurrency would be actively misleading, not a lesser version of the
  real thing.
- `TC-CON-002` (concurrent over-capacity room assignment) is **not**
  re-migrated as a separate case because its non-concurrent half — capacity
  is never enforced on assignment, sequential or not — is already covered
  by `CHILDROOM-TC-003-over-capacity-not-enforced` (`SUI-ASSIGN-001`); a
  second, sequential-only version here would add no new observable
  coverage, only the appearance of it.
- Bringing genuine concurrent-request execution to this platform (e.g. a
  future `Concurrent`/`Race` block spawning N REST calls off one start
  gate) is documented here as a real, tracked follow-up, not yet
  implemented.

What **is** genuinely, honestly testable sequentially — and is migrated —
is duplicate/replay-call handling, which this suite's name ("Network and
Endpoint Validation") equally covers: a client retry/double-tap sending the
exact same request twice.

`Setup` creates one dynamic branch shared by both cases.

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

Body
Call CatchError ../../cases/childroom/CHILDROOM-TC-EXIT6-duplicate-child-rejected.bnrest.md
Call CatchError ../../cases/dailylog/LOG-TC-EXIT6-duplicate-debounce-vs-distinct.bnrest.md

Teardown
Call ../../utils/branch/BRANCH-FIX-002-archive-test-branch.bnrest.md With Json Into cleanup
{
  "accessToken": "${adminSession.accessToken}",
  "slug": "${branch.slug}"
}
```
