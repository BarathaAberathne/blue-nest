---
id: SUI-AUTH-001
number: "1.1"
type: Test Suite
title: Authentication
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
---

# Authentication suite

Runs every migrated Authentication case (see
`docs/testing/test-migration-map.md` — `SUI-AUTH-001`). Each `Call` is
`CatchError`'d so one case failing never stops the others (spec §8) — a
suite is a container for independent cases, not one big ordered pipeline
(unlike the legacy `AuthSuite.java`, whose `@Test` methods share instance
state — see `docs/testing/migration-guide.md` for that distinction).

Also carries the migrated `SecuritySuite` cases (§19) — the legacy suite
grouped these here too (see `test-migration-map.md`'s suite-grouping
rationale: "no separate SUI-SECURITY-001 in the spec's 12-suite list").
**`AUTH-TC-003` (login rate-limit) MUST stay the LAST case in this file**
and **this whole suite MUST run LAST in `COL-FUNC-001`** — it deliberately
burns the shared per-IP login budget used by every other suite's own
Setup login (see `AUTH-TC-003`'s own doc comment for the full reasoning).

```bnrest
Call CatchError ../../cases/auth/AUTH-TC-001-login.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-002-invalid-password.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-002b-no-enumeration.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-004-invalid-credentials-datadriven.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-001-no-token-rejected.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-002-malformed-token-rejected.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-003-operator-injection-inert.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-004-malformed-regex-staff-search.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-004b-malformed-regex-children-search.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-004c-malformed-regex-daily-records-search.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-005-escaped-search-finds-matches.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-006-json-type-confusion-rejected.bnrest.md
Call CatchError ../../cases/auth/SEC-TC-007-branch-filter-no-leak.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-003-login-rate-limited.bnrest.md
```
