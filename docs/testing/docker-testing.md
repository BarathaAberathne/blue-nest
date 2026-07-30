# Running tests in Docker

`docker-compose.test.yml` (repo root) is a fully isolated stack — separate
Compose **project name** (`bluenest-test`), separate network
(`bluenest-test-net`), ephemeral Mongo (`tmpfs`, never a named volume). It
never touches the dev stack's containers, network, or the
`mongo_data`/`uploads_data` volumes, and no secrets are baked into any
image — `QA_ADMIN_PASSWORD`/`QA_ADMIN_EMAIL` are read from the host
environment (falling back to the same non-secret placeholder
`test-automation/rest-assured-suite/pom.xml` already defaults to).

## Services

| Service | Role |
|---|---|
| `mongodb-test` | Ephemeral Mongo, healthchecked. |
| `backend-test` | The real backend image (unmodified `backend/Dockerfile`), pointed at `mongodb-test`, healthchecked (`/api/v1/health`). |
| `seed-test` | One-shot — runs the backend image's own `seedusers` binary to create the admin account the Auth suite logs in as, then exits 0. |
| `test-runner` | The bnrest engine (`test-platform/engine/Dockerfile`), waits for `backend-test` healthy + `seed-test` completed, runs the tests, mounts `test-platform/tests` read-only and `test-results` read-write back to the host. |

## Running it

```bash
make test-docker
```

This builds every image, brings up `mongodb-test`/`backend-test`/
`seed-test` with `--wait` (blocks until healthy/completed), then runs
`test-runner` as its own step and returns **its** exit code, then always
tears the stack down (`down -v`) regardless of outcome.

**Why not `docker compose up --abort-on-container-exit`**: `seed-test` is a
one-shot service that's *supposed* to exit(0) once seeding is done —
`--abort-on-container-exit` tears the whole stack down the instant *any*
container exits, including `seed-test`, which happens before `test-runner`
even starts (it `depends_on: seed-test: condition:
service_completed_successfully`). That race was hit and fixed during this
session — see the Makefile comment above `test-docker` and
`test-platform-architecture.md`'s "Deliberate scope decisions". Bringing
the dependencies up first with `--wait`, then `run`-ning the test-runner as
a separate step, avoids the race entirely.

## Debugging a Docker run

```bash
# Bring up just the dependencies and leave them running:
docker compose -f docker-compose.test.yml up -d --wait mongodb-test backend-test seed-test

# Run the test-runner interactively, with any CLI args you want:
docker compose -f docker-compose.test.yml run --rm test-runner discover --testsRoot=/app/tests
docker compose -f docker-compose.test.yml run --rm test-runner validate --testsRoot=/app/tests

# Tear down when done:
docker compose -f docker-compose.test.yml down -v
```

## Known limitations

- `seed-test` only seeds the default admin — a suite that needs other
  fixture data (branches/rooms/staff) would need its own seed step or an
  idempotent setup case; not needed yet since only Authentication is
  migrated.
- The backend image's healthcheck (`wget` against `/api/v1/health`)
  confirms the process is up, not that Mongo writes are fully warmed —
  hasn't been an issue in practice (Mongo's own healthcheck gates the
  backend's start).
