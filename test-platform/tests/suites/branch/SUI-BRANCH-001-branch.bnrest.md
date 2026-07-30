---
id: SUI-BRANCH-001
number: "1.2"
type: Test Suite
title: Branch Management
owner: QA
mode: Standalone
status: Active
tags:
  - branch
---

# Branch Management suite

`BRANCH-TC-001/001b/003/003b` verify the real, live Harrow branch's actual
state (migrated 1:1 from legacy `BranchSuite` — genuinely
environment-specific per `test-platform-architecture.md`'s "Exceptions",
not yet physically moved to a separate `COL-CONFIG-001`). `BRANCH-TC-002/
002b/004` are branch-independent generic behaviour (duplicate-slug
rejection, create-an-active-branch) and don't depend on Harrow specifically
— `BRANCH-TC-004` uses the new dynamic `BRANCH-FIX-001`/`002` fixtures
rather than the real branch.

```bnrest
Call CatchError ../../cases/branch/BRANCH-TC-001-harrow-exists.bnrest.md
Call CatchError ../../cases/branch/BRANCH-TC-001b-kpis-sane.bnrest.md
Call CatchError ../../cases/branch/BRANCH-TC-002-duplicate-slug-rejected.bnrest.md
Call CatchError ../../cases/branch/BRANCH-TC-002b-repeated-duplicate-rejected.bnrest.md
Call CatchError ../../cases/branch/BRANCH-TC-003-config-roundtrip.bnrest.md
Call CatchError ../../cases/branch/BRANCH-TC-003b-invalid-opening-hours-gap-lock.bnrest.md
Call CatchError ../../cases/branch/BRANCH-TC-004-create-active-branch.bnrest.md
```
