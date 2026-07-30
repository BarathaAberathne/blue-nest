# Running tests

All commands assume the backend is reachable (`make dev` or the existing
Docker dev stack) at `http://localhost:8080` — override with `QA_BASE_URL`.
`QA_ADMIN_EMAIL`/`QA_ADMIN_PASSWORD` override the login credentials used by
`AUTH-UTIL-001` (default `admin@bluenest.uk` / the seeded dev password).

| Command | What it does |
|---|---|
| `make test-legacy` | The existing REST-Assured suite (alias for `test-e2e`) — unchanged, still the primary gate for anything not yet migrated. |
| `make test-new` | Every discovered `.bnrest.md` test. |
| `make test-all` | `test-legacy` + `test-new`. |
| `make test-api` | Alias for `test-new` — the platform's own entrypoint going forward. |
| `make test-smoke` | `test-new`, filtered to `tag: smoke`. |
| `make test-regression` | `test-new`, filtered to `tag: regression`. |
| `make test-parity` | Runs legacy + new and prints `test-results/migration/parity-report.md`. |
| `make test-validate` | Discovery + dependency-graph checks only — no HTTP calls, fast. |
| `make test-discover` | Lists every discovered script (id, type, number, title). |
| `make test-changed` | Best-effort: runs just the `.bnrest.md` files changed in git; falls back to the full `test-new` (and says why) when it can't map impact precisely. |
| `make test-map` | Regenerates `test-results/graphs/graph.{json,mmd}` and copies the JSON into `frontend/public/test-platform-graph.json` for the visual mapper. |
| `make test-report` | Prints where the last run's reports live. |
| `make test-ui` | Runs `test-map` then starts the frontend dev server — open `http://localhost:3000/test-mapper`. |
| `make test-docker` | Full isolated Docker run (see `docker-testing.md`). |
| `make test-clean` | Removes `test-results/` and the engine's Maven `target/`. |

Parameterised (each still needs the backend reachable):

```bash
make test-suite SUITE=SUI-AUTH-001
make test-case CASE=AUTH-TC-001
make test-collection COLLECTION=COL-FUNC-001
make test-tag TAG=smoke
make test-owner OWNER=QA
make test-file FILE=test-platform/tests/cases/auth/AUTH-TC-001-login.bnrest.md
```

All of the above are thin wrappers around one CLI
(`test-platform/engine`'s `cli.Main`) — there's one authoritative
filtering/execution implementation, not 19 bespoke scripts. You can also
run the CLI (or its packaged jar) directly:

```bash
cd test-platform/engine
mvn -q package -DskipTests
java -jar target/testplatform-engine-1.0.0-cli.jar run \
  --testsRoot=../tests --resultsRoot=../../test-results \
  --baseUrl=http://localhost:8080 --suite=SUI-AUTH-001
```

## From an IDE / CI (JUnit 5)

```bash
cd test-platform/engine
mvn test
```

`BnRestTestFactory` is a JUnit 5 `@TestFactory` that discovers/runs the
exact same `COL-FUNC-001` collection and reports one `DynamicTest` per case
(grouped into a `DynamicContainer` per suite) — this is what shows up
properly in an IDE's test tree and in any CI system that understands JUnit
XML (`test-results/junit/`).

## Reports after every run

```text
test-results/
├── junit/        # standard JUnit XML, one file per suite
├── json/          # full run report (redacted)
├── html/          # single static HTML report — CI artifact, no build step
├── requests/       # per-case request trace (redacted)
├── graphs/        # graph.json + graph.mmd (Mermaid)
├── performance/   # reserved — response-time trend data (not yet populated)
└── migration/     # parity-report.md
```
