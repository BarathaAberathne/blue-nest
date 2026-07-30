# BlueNest TestFlow (`.bnrest.md`) — testing docs

This is the entry point for writing and running API tests in this repo.

## What replaced what

The legacy hand-written suite (`test-automation/rest-assured-suite`, Java/
JUnit/REST-Assured) is being replaced, incrementally, by **BlueNest
TestFlow** — declarative `.bnrest.md` test files executed by a Java engine
(`test-platform/engine`). See `test-platform-architecture.md` for the full
design and `test-migration-map.md` for exactly which legacy test maps to
which new one, and what's still pending. BlueNest TestFlow has also grown
well beyond a 1:1 migration — it now covers modules the legacy suite never
touched at all (Store, Blog, Kiosk, Procurement, Shifts, Audit, User
Account Management); see `endpoint-inventory.md` for the full,
current, endpoint-by-endpoint picture across both suites. **The legacy
suite is not removed until every test in
`test-platform/migration-manifest.json` reaches verified parity** —
`make test-legacy` still runs it in the meantime.

## Where to start

| I want to… | Read |
|---|---|
| Write a new test case | [`writing-tests.md`](writing-tests.md) |
| Write a reusable utility (e.g. login) | [`writing-utilities.md`](writing-utilities.md) |
| Group cases into a suite/collection | [`writing-suites.md`](writing-suites.md) |
| Understand IDs and numbering | [`test-numbering.md`](test-numbering.md) |
| Understand `dependsOn`/`uses`/fixture scopes | [`test-dependencies.md`](test-dependencies.md) |
| Run tests locally | [`running-tests.md`](running-tests.md) |
| Run tests in Docker | [`docker-testing.md`](docker-testing.md) |
| Browse the test graph visually | [`visual-mapper.md`](visual-mapper.md) |
| Migrate a legacy suite | [`migration-guide.md`](migration-guide.md) |
| Something's failing and I don't know why | [`troubleshooting.md`](troubleshooting.md) |
| See the platform's own architecture | [`test-platform-architecture.md`](test-platform-architecture.md) |
| See what's covered | [`endpoint-inventory.md`](endpoint-inventory.md) (current), [`current-test-inventory.md`](current-test-inventory.md)/[`current-endpoint-coverage.md`](current-endpoint-coverage.md) (legacy-suite baseline) |

## 60-second quickstart

```bash
make dev                 # or: make docker-up  — backend must be running on :8080
make test-new            # runs every discovered .bnrest.md test
make test-validate       # just checks metadata/graph correctness, no HTTP calls
make test-map            # regenerates the visual mapper's graph.json
make test-ui             # opens the mapper at http://localhost:3000/test-mapper
```

A tester adding a new test doesn't touch any Java: create a `.bnrest.md`
file with valid front matter, add it to a suite, run `make test-discover`
to confirm it's picked up, then `make test-new` (or `make test-case
CASE=YOUR-ID`) to run it.
