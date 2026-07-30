---
id: SUI-KEYPERSON-001
number: "1.6"
type: Test Suite
title: Key Person Allocation
owner: QA
mode: Standalone
status: Active
tags:
  - key-person
  - child
---

# Key Person Allocation suite

**All new generic-functional coverage** — the legacy `test-automation`
suite has no key-person test anywhere (`grep -rl "key.person\|KeyPerson"`
across its `src/test/java` returns nothing), so nothing here migrates a
legacy test; every case is tracked in `migration-manifest.json` as
`parityStatus: n/a-new-coverage` (same convention as `BRANCH-TC-004`).
Each case is fully independent (own throwaway branch(es)/staff/child via
`BRANCH-FIX-001`/`002`, `STAFF-UTIL-001`, `CHILD-UTIL-003`) — no suite-level
shared fixtures, matching the Room/Branch retrofit pattern rather than the
Staff/Role suite's shared-fixture one.

```bnrest
Call CatchError ../../cases/key/KEY-TC-001-assign-key-person-same-branch.bnrest.md
Call CatchError ../../cases/key/KEY-TC-002-reassign-key-person.bnrest.md
Call CatchError ../../cases/key/KEY-TC-003-clear-key-person.bnrest.md
Call CatchError ../../cases/key/KEY-TC-004-duplicate-allocation-allowed-gap-lock.bnrest.md
Call CatchError ../../cases/key/KEY-TC-005-cross-branch-rejected.bnrest.md
```
