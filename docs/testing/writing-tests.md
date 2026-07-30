# Writing a Test Case

A **Test Case** (`type: Test Case`) is one bnrest file with YAML front
matter + one or more fenced ` ```bnrest ` blocks. See
`test-platform-architecture.md` for the full command grammar; this doc is
copyable examples for the patterns the platform spec calls out explicitly.

## Standalone login test

The real, currently-passing case
(`test-platform/tests/cases/auth/AUTH-TC-001-login.bnrest.md`):

````markdown
---
id: AUTH-TC-001
number: 1.1.1
type: Test Case
title: Admin login succeeds and returns a usable session
owner: QA
mode: Standalone
status: Active
tags:
  - authentication
  - smoke
  - golden-path
dependsOn: []
uses:
  - AUTH-UTIL-001
fixtureScope: case
timeoutSeconds: 30
---

# Admin login succeeds and returns a usable session

```bnrest
Given Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "${secret:QA_ADMIN_PASSWORD}"
}

Then Assert session.accessToken != null
And Assert session.refreshToken != null
And Assert session.userId != null
And Assert session.role != null

When Get /api/v1/admin/children/stats Into check Using session.accessToken
Then AssertStatus check 200
And Assert check.body.data.total >= 0
```
````

`Using session.accessToken` attaches that value as the bearer token for
just that one request — this is a small, documented grammar extension (the
spec doesn't define its own header-attachment syntax); see
`test-platform-architecture.md`.

## Dependent test

A `mode: Dependent` case with `dependsOn` is **skipped with a clear reason**
(not run, not silently ignored) if its dependency didn't pass:

```yaml
---
id: BRANCH-TC-002
number: 1.2.2
type: Test Case
title: Configure Harrow branch opening hours
owner: QA
mode: Dependent
status: Active
tags: [branch]
dependsOn:
  - BRANCH-TC-001
uses: []
---
```

If `BRANCH-TC-001` fails, `BRANCH-TC-002`'s result becomes `BLOCKED` with
`skippedReason: "Dependency 'BRANCH-TC-001' did not pass (status: FAILED)"`
— visible in the JSON/HTML report and the visual mapper, not just a bare
"skipped".

## Negative API test

Calls the raw endpoint directly (not through a success-oriented utility)
when the test is fundamentally about comparing failure responses — the real
`AUTH-TC-002b` (`.../cases/auth/AUTH-TC-002b-no-enumeration.bnrest.md`):

```bnrest
Given Post /api/v1/admin/auth/login Into wrongPassword
{
  "email": "admin@bluenest.uk",
  "password": "wrong-password"
}

And Post /api/v1/admin/auth/login Into noSuchAccount
{
  "email": "no-such-user-${random()}@bluenest.test",
  "password": "whatever"
}

Then AssertStatus wrongPassword 401
And AssertStatus noSuchAccount 401
And Assert wrongPassword.body.error == noSuchAccount.body.error
```

## Expected failure (`ExpectFail`)

When the operation under test is SUPPOSED to fail, wrap it in `ExpectFail`
instead of writing a bespoke raw request — this reuses whatever utility
already encodes the success path. Real example, `AUTH-TC-002`:

```bnrest
Given ExpectFail Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "admin@bluenest.uk",
  "password": "definitely-the-wrong-password"
}
```

`ExpectFail` inverts pass/fail: if the wrapped statement throws (the
utility's own `AssertStatus loginResponse 200` fails because the real
response was 401), the `ExpectFail` **passes**. If the wrapped statement
had succeeded, `ExpectFail` **fails** ("expected failure but got success").

## JSON assertion (JSONPath)

`AssertJson` takes a real JSONPath expression (Jayway JSONPath, not a
simplified dotted path):

```bnrest
Post /api/v1/admin/enquiries Into created
{ "parent_name": "Test Parent", "child_name": "Test Child", "email": "parent@example.test" }

AssertJson created $.body.data.status == "new"
AssertJson created $.body.data.notes.length() == 0
```

## CSV-driven test

Front-matter `dataFile` makes the runner produce one dynamic test per CSV
row, each with `${input.<column>}` bound from that row — the real
`AUTH-TC-004`:

```yaml
---
id: AUTH-TC-004
number: 1.1.4
type: Test Case
title: A sweep of malformed/invalid login credentials is rejected
owner: QA
mode: Standalone
status: Active
tags: [authentication, regression]
uses: [AUTH-UTIL-001]
dataFile: ../../data/auth/DATA-AUTH-001-invalid-credentials.csv
---
```

```bnrest
Given ExpectFail Call ../../utils/auth/AUTH-UTIL-001-login.bnrest.md With Json Into session
{
  "email": "${input.email}",
  "password": "${input.password}"
}
```

`test-platform/tests/data/auth/DATA-AUTH-001-invalid-credentials.csv`:

```csv
email,password,description
admin@bluenest.uk,,empty password
admin@bluenest.uk,   ,whitespace-only password
not-an-email,whatever123,malformed email address
admin@bluenest.uk,ADMIN@BLUENEST.UK,password equal to email uppercased
```

This produces 4 dynamic tests (`AUTH-TC-004#row1` … `#row4`) — see them
individually in `make test-discover` / the visual mapper.

## Setup and teardown

`Setup`/`Body`/`Teardown` are bare marker lines inside the same fenced
block — everything between `Setup` and `Body` (or the next marker) runs
once before the case's main statements, everything after `Teardown` runs
after (even if the body fails, for cleanup):

```bnrest
Setup
Post /api/v1/admin/rooms Into room
{ "name": "QA-AUTOTEST-Nursery-${random()}", "branch": "harrow", "capacity": 5 }

Body
Get /api/v1/admin/rooms Into rooms
Assert rooms.body.data.length() >= 1

Teardown
Delete /api/v1/admin/rooms/${room.body.data.id}
```

If a script has no `Setup`/`Teardown` markers at all (the common case),
everything is just body statements — see every example above.

## KPI validation (illustrative — not yet migrated)

No KPI suite (`SUI-KPI-001`) is migrated yet (see `test-migration-map.md`),
but the pattern for validating an aggregate/stat endpoint is the same
`AssertJson`/`Assert` pattern already shown:

```bnrest
Get /api/v1/admin/daily-records/stats?branch=harrow Into stats
AssertStatus stats 200
Assert stats.body.data.total_this_week >= 0
AssertJson stats $.body.data.by_type.meal >= 0
```

## Duplicate network-call validation

The engine's `RequestLedger` flags a repeated write (same method +
normalised URL + request-body hash) automatically — you don't assert this
yourself, you just read the report. After a run, check
`test-results/requests/<CASE-ID>.json` for any step with
`"duplicateWarning": true` and a `"duplicateOfStep"` pointing at the first
occurrence. If a case genuinely needs to repeat an identical write (rare —
e.g. proving idempotency), declare it explicitly in front matter:

```yaml
allowDuplicateRequest: true
```

so the report doesn't flag intentional repeats as a red flag next to
genuine bugs (a suite fixture and a case fixture both logging in, a
duplicated utility call, a retry-after-success, etc. — see spec §13).
