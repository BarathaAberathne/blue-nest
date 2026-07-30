# Dependencies, fixture scopes, and the dependency graph

## `dependsOn` vs `uses`

- **`dependsOn`**: this test's *result* is conditional on another test
  having passed. If the dependency failed, this test is skipped (`BLOCKED`)
  with a clear reason — it's never silently run anyway. Creates a
  `DEPENDS_ON` edge; the dependency runs first (the graph's topological
  sort orders dependencies before dependents even if they're declared out
  of file order).
- **`uses`**: this test calls a Util (or another Case, if ever needed) but
  doesn't skip if that Util's *last recorded result* was bad — a Util
  failing means THIS test fails too (the exception propagates normally),
  it's not a separate pass/fail gate the way `dependsOn` is. `uses` mainly
  documents the reuse relationship for the dependency graph/visual mapper
  (which utilities are actually reused, orphan detection, etc.).

In practice: `uses` a Util you `Call`; `dependsOn` another Test Case whose
state you need to already exist.

## Fixture scopes

| Scope | Behaviour |
|---|---|
| `case` (default) | Re-run every time this script is `Call`ed. |
| `suite` | Run once per suite; every caller in that suite with the *same* explicit input gets the same cached result — no re-execution, no duplicate HTTP calls. |
| `run` | Run once for the whole run; only appropriate for read-only/immutable configuration. |

This is enforced by construction, not convention: a suite-scoped Util's
result is cached in a map shared across every case in that suite (see
`test-platform-architecture.md`); a case can never see or mutate a
suite/run-scoped variable directly — only what's explicitly passed via
`With Json` / returned via `Output`.

## The dependency graph

Built from: Collection→Suite/Suite→Case containment (`Call` edges),
front-matter `dependsOn`/`uses`, and every REST verb's endpoint (for
`CALLS_ENDPOINT` edges → the coverage matrix). `make test-validate` runs
every check before any HTTP call is made:

1. **Circular dependencies** — rejected with the full cycle path.
2. **Missing references** — a `Call`/`dependsOn`/`uses` target that
   doesn't exist as a real test id.
3. **Invalid call hierarchy** — enforced per spec §3:
   `Collection→Collection|Suite`, `Suite→Case`, `Case→Util`, `Data→Util`,
   `Util→Util`. A Case trying to `Call` a Suite, for example, is rejected.
4. **Duplicate ids / duplicate numbers.**
5. **Orphan Test Cases** — not contained by any Suite (warning).
6. **Empty suites** — zero cases (warning).
7. **Hidden global state** — a `mode: Dependent` case with no
   `dependsOn`/`uses` at all (warning — it's relying on something the graph
   can't see).

Topological sort orders everything with `dependsOn` edges correctly even
when the files are authored out of order.

## Diagnosing a specific failure

`make test-validate` prints every issue with a code
(`CIRCULAR_DEPENDENCY`, `MISSING_REFERENCE`, `INVALID_CALL_HIERARCHY`,
`DUPLICATE_ID`, `DUPLICATE_NUMBER`, `ORPHAN_TEST_CASE`, `EMPTY_SUITE`,
`HIDDEN_GLOBAL_STATE`) — see `troubleshooting.md` for what each one means
and how to fix it.
