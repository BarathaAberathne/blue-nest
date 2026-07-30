# BlueNest TestFlow UI

A read-only test-mapping and run-inspection UI at `frontend/app/test-mapper`
(`http://localhost:3000/test-mapper` once running). It's a **developer tool
for the test platform**, not a tenant/nursery-management feature —
deliberately outside `AdminLayout`/tenant RBAC, `robots: noindex`, not
linked from any nav.

**Redesigned** from the original v0 (single interactive-graph-first page,
spec §14) into an **explorer-first** layout: as the suite grows into the
hundreds/thousands of cases the spec envisions, one all-nodes-and-edges
graph stops being readable. The full dependency graph is now a **secondary,
scoped diagnostic view** (Dependencies tab, opened from a selected item),
not the landing page.

## Opening it

```bash
make test-map   # regenerates test-results/graphs/graph.json and copies it
                # to frontend/public/test-platform-graph.json
make test-ui    # runs test-map, then starts the frontend dev server
```

Then visit `http://localhost:3000/test-mapper`. `graph.json` only carries
structure + whatever status existed at the time it was generated — the UI
overlays the **freshest run it can find on disk** on top of that (via
`/test-mapper/api/runs`, see below), so you don't have to re-run
`make test-map` after every test run just to see current pass/fail state.
Re-run it when the *structure* changes (new suites/cases/utils).

## Layout

Four regions, matching the standard explorer/workspace/inspector/console
pattern:

- **Top bar** — title, an Explorer/Runs view switch, a "Run tests" menu
  (copies the actual `make test-suite SUITE=...`-style command — the mapper
  never executes tests itself), a density toggle, and a "Last run: Pass/Fail"
  pill.
- **Left: Test Explorer** — a collapsible `Collection → Suite → Case` tree
  (built from the graph's `CONTAINS` edges) with a search box and a
  per-row status icon (✓/✕/–/○/●/!), plus a flat, collapsed **Utilities**
  group below it. This replaces the old type/owner/tag filter bar +
  flat-list "Hierarchical tree" view.
- **Centre: Workspace** — tabs `Overview | Test Cases | Scenario |
  Dependencies | Endpoints`, scoped to whatever's selected in the Explorer:
  - **Overview** — case counts (passed/failed/not-run), endpoints-covered
    and reusable-utilities counts, last-run timestamp, and a compact
    result-card list.
  - **Test Cases** — a sortable table (id/title/status/duration/endpoints/
    tags) instead of cards spread across a canvas.
  - **Scenario** — a test case's real Given/When/Then flow, parsed from its
    `.bnrest.md` source (via `/test-mapper/api/source`) and merged with the
    matching run's HTTP steps (via `StepResult.utilId` — see "Engine fix"
    below). Setup/Teardown render as their own collapsed-by-default
    sections. Each request-issuing line expands to show the endpoint,
    status, response time, correlation id, and which utility (if any)
    issued it.
  - **Dependencies** — a **focused** React Flow graph rooted at the
    selected item, default **Direct dependencies** (one hop), with a
    depth selector (`Direct / Two levels / Complete graph`). Same-pair
    edges across `CALLS`/`USES`/`CONSUMES` are combined into one line
    rather than drawn three times; nodes fade with distance from the root.
    Complete graph is available but is the diagnostic option, not the
    default — selecting it on a heavily-reused utility like
    `BRANCH-FIX-001` demonstrates exactly why (dozens of cases fan back in).
  - **Endpoints** — a coverage matrix (endpoint/method/case count/last
    result), scoped to the current selection; a row expands to list its
    covering cases (click one to jump to it).
- **Right: Inspector** — accordion sections (Summary/Reuse/Last run/Source)
  for the selected item, with a "Copy path" and "View source" (opens the
  raw `.bnrest.md` in a modal) action instead of a dead "Open file" link
  (the browser can't invoke a local editor).
- **Bottom: Console** — collapsible, shows the latest run's totals and a
  "View report" link that switches to the Runs screen.

## Runs screen

A dedicated screen (not the definition map) at the top-bar's "Runs" switch:
a run-history list on the left (from every `test-results/json/run-*.json`
found on disk), and for the selected run — a per-suite timeline
(✓/✕/– with duration), a drill-down into failed cases showing the failed
assertion/error message, any duplicate-request warning, and every HTTP
step's correlation id. "Open in Explorer" jumps straight to that case's
Scenario tab.

## Data sources

- `frontend/public/test-platform-graph.json` — static structure export
  (`make test-map`), fetched client-side.
- `frontend/app/test-mapper/api/runs` — a Next.js API route reading
  `test-results/json/*.json` straight off disk (list + single-run detail).
- `frontend/app/test-mapper/api/source` — a Next.js API route reading a
  `.bnrest.md` file's raw text for the Scenario tab and the source modal.

Both API routes are **hard-disabled outside development**
(`NODE_ENV === "production"` → 404) and path-contained to
`test-platform/tests`/`test-results` respectively — this frontend also
runs in production (blue-nest.com), and an unauthenticated filesystem-read
endpoint has no business existing there even when path-constrained.

## Engine fix that came out of building this

`StepTrace.utilId` (declared on the model, exposed in every
`test-results/json/run-*.json` as `steps[].utilId`) was **never actually
assigned** anywhere in the executor — every step reported `utilId: null`,
even ones issued from deep inside a called Test Util. Fixed in
`Executor.executeRest`: the currently-executing script's own type is
checked, and `utilId` is set to that script's id when it's a Test Util.
Regression-locked in `DuplicateRequestWiringTest
.stepTraceTagsWhichUtilIssuedTheRequestAndLeavesDirectCallsUntagged`. The
Scenario tab depends on this being correct — it's how a `Call <util>`
source line gets reunited with the HTTP request(s) that util actually made.

## What's deferred

Hover-only edge labels (labels are always-on but small/muted — an
acceptable middle ground), a Requirements/Roles coverage view, and
separate `Dashboard`/`Migration`/`Settings` top-level routes from the
original redesign brief's "final navigation" — those need their own real
backing data/decisions not yet built. Tests/Runs/Coverage/Visual-Map are
all reachable through this one page's explorer + tabs instead of separate
routes.
