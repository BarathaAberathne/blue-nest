# Troubleshooting

## `make test-validate` errors

| Code | Meaning | Fix |
|---|---|---|
| `DUPLICATE_ID` | Two files declare the same `id`. | Rename one — check `test-numbering.md` for the right prefix. |
| `DUPLICATE_NUMBER` | Two files declare the same `number`. | Pick the next free slot under the right parent. |
| `MISSING_REFERENCE` | A `Call`/`dependsOn`/`uses` target doesn't exist. | Check the relative path (`../../cases/...` etc.) and that the target file's `id` actually matches what you typed. |
| `INVALID_CALL_HIERARCHY` | E.g. a Test Case tried to `Call` a Test Suite. | Only `Case→Util`, `Suite→Case`, `Collection→Suite\|Collection`, `Util→Util`, `Data→Util` are allowed — see `test-dependencies.md`. |
| `CIRCULAR_DEPENDENCY` | A cycle in Call/dependsOn/uses/containment. | The error prints the full cycle path — break it by removing one edge or restructuring which side owns the dependency. |
| `ORPHAN_TEST_CASE` (warning) | A case isn't `Call`ed by any suite. | Either add it to a suite, or it's intentionally standalone (fine to leave — it's a warning, not an error, and doesn't block a run). |
| `EMPTY_SUITE` (warning) | A suite has zero contained cases. | Add at least one `Call CatchError ...` line, or remove the suite if it's a stub. |
| `HIDDEN_GLOBAL_STATE` (warning) | A `mode: Dependent` case declares no `dependsOn`/`uses`. | Either add the real dependency, or change `mode` to `Standalone` if it doesn't actually need anything from another test. |

Only `ERROR`-severity issues block a run (`test-validate`/`run` exit 1);
warnings are informational.

## "Secret 'X' is not set"

`${secret:X}` / `secret("X")` only reads from the process environment
(`System.getenv`) — export it before running:

```bash
export QA_ADMIN_PASSWORD=...
make test-new
```

Never write a real secret value directly in a `.bnrest.md` file — that's
exactly what this error is guarding against.

## "Undefined variable/path"

The dotted path you referenced (`session.accessToken`, `loginResponse.body.user.role`,
…) doesn't exist at that point. Common causes:

- A typo in the path.
- Referencing a REST response's field before the request that populates it
  has run (statement order matters — top to bottom).
- Referencing a Util's `input.X` when the caller's `With Json` payload
  didn't include `X`.
- Reading `${input.X}` inside a Case that isn't data-driven (`dataFile`
  not set) and never itself set an `input` variable.

## A case is `BLOCKED` / `SKIPPED` and I don't know why

Check `skippedReason` in the JSON report or the case's row in the HTML
report / visual mapper — it names the exact `dependsOn` target and its
actual status. The case never silently "just didn't run".

## Duplicate-write warnings I didn't expect

Check `test-results/requests/<CASE-ID>.json` for
`"duplicateWarning": true` — it names `duplicateOfStep`. Common causes:
a suite fixture and a case both logging in, a retried write after it
already succeeded, or a genuinely duplicated `Call`. If the repeat is
intentional (idempotency test), add `allowDuplicateRequest: true` to that
case's front matter.

## The engine won't compile / `mvn test` fails oddly

- Confirm Java 17+ is on `PATH` (`java -version`) — the Makefile targets
  export `/opt/homebrew/opt/openjdk/bin` for a keg-only Homebrew install;
  harmless no-op elsewhere.
- `cd test-platform/engine && mvn -q compile` in isolation to separate a
  real compile error from a runtime/test failure.

## `make test-docker` hangs or exits instantly with no output

See `docker-testing.md`'s "Known limitations" — the historical cause
(`--abort-on-container-exit` racing against the one-shot `seed-test`
container) is already fixed in the Makefile; if it recurs, check
`docker compose -f docker-compose.test.yml ps` for a service stuck
unhealthy (usually `backend-test` failing to reach `mongodb-test` — check
`docker compose -f docker-compose.test.yml logs backend-test`).

## The visual mapper shows "Could not load the graph"

Run `make test-map` first — it generates
`test-results/graphs/graph.json` and copies it to
`frontend/public/test-platform-graph.json`; the mapper page fetches that
static file, it doesn't call the engine directly.
