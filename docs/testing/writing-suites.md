# Writing a Test Suite / Test Collection

## Test Suite

A **Test Suite** (`type: Test Suite`) contains Test Cases via `Call`
statements. A failed case must NOT stop its siblings — every `Call` to a
case is `CatchError`'d:

```bnrest
Call CatchError ../../cases/auth/AUTH-TC-001-login.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-002-invalid-password.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-002b-no-enumeration.bnrest.md
Call CatchError ../../cases/auth/AUTH-TC-004-invalid-credentials-datadriven.bnrest.md
```

Real, working example:
`test-platform/tests/suites/auth/SUI-AUTH-001-authentication.bnrest.md`.

**Important**: a Suite is a container for *independent* cases, not one
ordered pipeline that shares state — that's exactly the pattern the legacy
`AuthSuite.java` used (`@TestMethodOrder` + instance fields across ordered
`@Test` steps) and exactly what bnrest replaces it with. If a later case
genuinely needs an earlier one's data, express that with `mode: Dependent`
+ `dependsOn` on the case itself (see `writing-tests.md` "Dependent test"),
not by relying on suite-level ordering.

## Test Collection

A **Test Collection** (`type: Test Collection`) contains Suites (or other
Collections) the same way:

```bnrest
Call CatchError ../../suites/auth/SUI-AUTH-001-authentication.bnrest.md
```

Real, working example:
`test-platform/tests/collections/functional/COL-FUNC-001-nursery-cms-functional-tests.bnrest.md`
— the generic functional collection (see `test-migration-map.md` for the
full suite rollout, tracked as `pending`).

## Adding a new suite to the collection

1. Write the suite file, `Call CatchError`-ing whatever cases already exist
   for that domain.
2. Add ONE line to the collection file: `Call CatchError
   ../../suites/<domain>/<id>-<name>.bnrest.md`.
3. `make test-validate` — confirms no cycles, no missing references, no
   duplicate ids/numbers, and that the new suite actually has cases (an
   empty suite is a validation warning).
4. `make test-map` then check the visual mapper — the new suite/cases show
   up automatically, no other wiring needed.

## What NOT to do

Don't put assertions directly in a Suite or Collection file — they only
`Call` their children. All the actual HTTP calls/assertions live in Test
Cases (or the Utils cases call).
