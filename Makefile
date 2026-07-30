.PHONY: all build run dev test lint install clean \
        _guard-not-prod \
        docker-up docker-down docker-build docker-logs docker-restart docker-stop \
        dev-backend dev-frontend run-backend run-frontend \
        mongo-shell setup \
        seed seed-products seed-branches seed-catalogue seed-users seed-children seed-staff seed-daily seed-gbp seed-famly seed-all \
        wait-api \
        test-e2e test-e2e-regression \
        staging-up staging-verify staging-logs staging-down staging-clean \
        optimize-images optimize-images-dry \
        build-bnrest-cli test-legacy test-new test-all test-api test-smoke test-regression \
        test-parity test-validate test-discover test-changed test-map test-report test-ui \
        test-docker test-clean \
        test-suite test-case test-collection test-tag test-owner test-file

# ── Build ─────────────────────────────────────────────────────────────────────
all: build

build:
	@echo "→ Building Go API..."
	cd backend && go build -o bin/api ./cmd/api
	@echo "→ Building Next.js..."
	cd frontend && npm run build
	@echo "✓ Build complete"

build-backend:
	cd backend && go build -o bin/api ./cmd/api

build-frontend:
	cd frontend && npm run build

# ── Dev (hot-reload) ──────────────────────────────────────────────────────────
dev:
	@echo "Starting dev servers (Ctrl+C to stop both)..."
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	cd backend && APP_ENV=development go run ./cmd/api

dev-frontend:
	cd frontend && npm run dev

# ── Run (production builds) ───────────────────────────────────────────────────
run: build
	$(MAKE) -j2 run-backend run-frontend

run-backend:
	./backend/bin/api

run-frontend:
	cd frontend && npm start

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	@echo "→ Running Go tests..."
	cd backend && go test ./cmd/api
	cd backend && go test -race ./internal/... ./pkg/...
	@echo "→ Running frontend tests..."
	cd frontend && npm run test --if-present

test-backend:
	cd backend && go test -race -v ./...

# REST-Assured API/E2E suite (test-automation/rest-assured-suite) — the
# TDD-numbered TC-XXX-NNN suite documented in CLAUDE.md's "QA & test
# automation" section. Requires the API reachable (default
# http://localhost:8080 — `make docker-up`/`make dev` first) and a real
# admin login (defaults to the seeded admin@bluenest.uk). Override via
# QA_BASE_URL / QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD env vars, e.g. against
# staging: QA_BASE_URL=http://localhost:8080 make test-e2e (staging listens
# on the same host ports as dev). Exports PATH/JAVA_HOME for a keg-only
# Homebrew OpenJDK install (harmless no-op if that path doesn't exist, e.g.
# on Linux CI with a system JDK already on PATH).
test-e2e:
	@echo "→ Running REST-Assured E2E suite against $${QA_BASE_URL:-http://localhost:8080}..."
	@PATH="/opt/homebrew/opt/openjdk/bin:$$PATH" \
	 JAVA_HOME="$${JAVA_HOME:-/opt/homebrew/opt/openjdk}" \
	 bash -c 'cd test-automation/rest-assured-suite && mvn -q test \
	   -Dqa.baseUrl=$${QA_BASE_URL:-http://localhost:8080} \
	   -Dqa.adminEmail=$${QA_ADMIN_EMAIL:-admin@bluenest.uk} \
	   -Dqa.adminPassword=$${QA_ADMIN_PASSWORD:-changeme-min-8-chars}'

# Regression-tag subset only — fast pre-push check (see CLAUDE.md: run this,
# or the full test-e2e, before pushing any backend business-logic/permission/
# API-contract change).
test-e2e-regression:
	@echo "→ Running REST-Assured regression subset against $${QA_BASE_URL:-http://localhost:8080}..."
	@PATH="/opt/homebrew/opt/openjdk/bin:$$PATH" \
	 JAVA_HOME="$${JAVA_HOME:-/opt/homebrew/opt/openjdk}" \
	 bash -c 'cd test-automation/rest-assured-suite && mvn -q test -Dgroups=regression \
	   -Dqa.baseUrl=$${QA_BASE_URL:-http://localhost:8080} \
	   -Dqa.adminEmail=$${QA_ADMIN_EMAIL:-admin@bluenest.uk} \
	   -Dqa.adminPassword=$${QA_ADMIN_PASSWORD:-changeme-min-8-chars}'

# ── BlueNest TestFlow (bnrest) platform ───────────────────────────────────────
# docs/testing/README.md is the entry point for writing/running these tests.
# Every target below is a thin wrapper around one CLI (test-platform/engine's
# cli.Main) — see docs/testing/running-tests.md for the full command reference.
BNREST_JAR := test-platform/engine/target/testplatform-engine-1.0.0-cli.jar
BNREST_JAVA_ENV := PATH="/opt/homebrew/opt/openjdk/bin:$$PATH" JAVA_HOME="$${JAVA_HOME:-/opt/homebrew/opt/openjdk}"
BNREST_TESTS_ROOT := $(CURDIR)/test-platform/tests
BNREST_RESULTS_ROOT := $(CURDIR)/test-results

build-bnrest-cli:
	@$(BNREST_JAVA_ENV) bash -c 'cd test-platform/engine && mvn -q package -DskipTests'

# Phase C (spec §18): the legacy REST-Assured suite, unmodified, still runnable
# for as long as any test in migration-manifest.json remains "pending".
test-legacy: test-e2e

test-new: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) \
	  --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-all: test-legacy test-new

test-api: test-new

test-smoke: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --tag=smoke \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) \
	  --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-regression: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --tag=regression \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) \
	  --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

# Runs the legacy + new Auth suites and prints the parity report (see
# test-platform-architecture.md "Migration approach" — only Auth is verified
# so far; docs/testing/migration-guide.md tracks the rest).
test-parity: test-legacy test-new
	@echo "→ See test-results/migration/parity-report.md"
	@cat test-results/migration/parity-report.md 2>/dev/null || true

test-validate: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) validate --testsRoot=$(BNREST_TESTS_ROOT)

test-discover: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) discover --testsRoot=$(BNREST_TESTS_ROOT)

# Best-effort impact selection (spec §16): if any changed file IS a .bnrest.md
# test file, run just those; otherwise fall back safely to the full new suite
# and say why (a real backend-file → endpoint → test static map is future work,
# see test-platform-architecture.md "Deliberate scope decisions").
test-changed: build-bnrest-cli
	@changed=$$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached HEAD 2>/dev/null); \
	test_files=$$(echo "$$changed" | grep '\.bnrest\.md$$' || true); \
	if [ -z "$$test_files" ]; then \
	  echo "→ No changed .bnrest.md files detected — cannot map impact precisely; falling back to the full new suite (test-new)."; \
	  $(MAKE) test-new; \
	else \
	  echo "→ Changed test files detected, running only those:"; \
	  echo "$$test_files" | sed 's/^/    /'; \
	  for f in $$test_files; do $(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --file=$(CURDIR)/$$f \
	    --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}; done; \
	fi

test-map: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) graph --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT)
	@mkdir -p frontend/public
	@cp test-results/graphs/graph.json frontend/public/test-platform-graph.json
	@echo "→ Graph exported to test-results/graphs/graph.{json,mmd} and copied to frontend/public/test-platform-graph.json"
	@echo "→ Run 'make test-ui' then open http://localhost:3000/test-mapper"

test-report:
	@echo "→ Reports from the last run: test-results/{json,junit,html,requests,graphs,migration}/"
	@echo "→ Static HTML: open test-results/html/index.html"

test-ui:
	@$(MAKE) test-map
	cd frontend && npm run dev

# NOTE: deliberately NOT `up --abort-on-container-exit` — seed-test is a
# one-shot service that's SUPPOSED to exit(0) once seeding is done, and
# --abort-on-container-exit tears the whole stack down the instant ANY
# container exits (including seed-test, well before test-runner even starts,
# since it depends_on seed-test completing first) — that raced test-runner
# out before it could run at all. Bringing the long-running/one-shot
# dependencies up first (with --wait, which blocks until healthy/completed)
# and then `run`-ning test-runner as its own step avoids the race entirely.
test-docker:
	docker compose -f docker-compose.test.yml build
	docker compose -f docker-compose.test.yml up -d --wait mongodb-test backend-test seed-test; \
	docker compose -f docker-compose.test.yml run --rm test-runner \
	  run --testsRoot=/app/tests --resultsRoot=/app/results \
	  --baseUrl=http://backend-test:8080 --adminEmail=$${QA_ADMIN_EMAIL:-admin@bluenest.uk}; \
	code=$$?; \
	docker compose -f docker-compose.test.yml down -v; \
	exit $$code

test-clean:
	rm -rf test-results test-platform/engine/target

test-suite: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --suite=$(SUITE) \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-case: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --case=$(CASE) \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-collection: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --collection=$(COLLECTION) \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-tag: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --tag=$(TAG) \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-owner: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --owner=$(OWNER) \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

test-file: build-bnrest-cli
	@$(BNREST_JAVA_ENV) java -jar $(BNREST_JAR) run --file=$(FILE) \
	  --testsRoot=$(BNREST_TESTS_ROOT) --resultsRoot=$(BNREST_RESULTS_ROOT) --baseUrl=$${QA_BASE_URL:-http://localhost:8080}

# ── Lint ──────────────────────────────────────────────────────────────────────
lint:
	@echo "→ Linting Go..."
	cd backend && go vet ./...
	@echo "→ Linting frontend..."
	cd frontend && npm run lint

# ── Install deps ──────────────────────────────────────────────────────────────
install:
	@echo "→ Installing Go modules..."
	cd backend && go mod download
	@echo "→ Installing Node packages..."
	cd frontend && npm install

# ── Docker ────────────────────────────────────────────────────────────────────
# Production safety guard. The docker-*/seed-* targets below run the DEV (base)
# compose, which publishes MongoDB on 0.0.0.0:27017 with auth disabled. They must
# never run on a production host (APP_ENV=production in ./.env). Production
# deploys go through deploy/auto-deploy.sh (both compose files). Override for a
# genuine local exception with: make <target> ALLOW_DEV=1
_guard-not-prod:
	@if [ "$(ALLOW_DEV)" != "1" ] && grep -qsE '^[[:space:]]*APP_ENV=production' .env 2>/dev/null; then \
	  echo "✗ Refusing dev Docker target on production. Use deploy/auto-deploy.sh instead."; \
	  exit 1; \
	fi

# Attach the guard as a prerequisite to the dev-only targets (prereqs accumulate;
# the recipes are defined below).
docker-up docker-restart docker-build seed-products seed-branches seed-catalogue seed-children seed-staff seed-daily seed-gbp seed-all: _guard-not-prod

docker-up:
	docker compose up -d
	@$(MAKE) wait-api
	@$(MAKE) seed-all
	@echo "✓ Services running"
	@echo "  API  → http://localhost:8080"
	@echo "  Web  → http://localhost:3000"
	@echo "  DB   → mongodb://localhost:27017"

docker-down:
	docker compose down

docker-build:
	docker compose build

docker-logs:
	docker compose logs -f

docker-restart:
	docker compose up --build -d
	@$(MAKE) wait-api
	@$(MAKE) seed-all
	@echo "✓ Images rebuilt, services restarted, DB seeded"
	@echo "  API  → http://localhost:8080"
	@echo "  Web  → http://localhost:3000"

docker-stop:
	docker compose stop

# Wait for the API health endpoint before running seed commands. Polls every
# second up to 30s — enough time for MongoDB → backend boot order.
wait-api:
	@echo "→ Waiting for API health..."
	@for i in $$(seq 1 30); do \
	  if curl -fsS http://localhost:8080/api/v1/health > /dev/null 2>&1; then \
	    echo "✓ API healthy"; exit 0; \
	  fi; \
	  sleep 1; \
	done; \
	echo "✗ API didn't become healthy in 30s — check 'make docker-logs'"; exit 1

# ── Utilities ─────────────────────────────────────────────────────────────────
mongo-shell:
	docker exec -it blue-nest-mongo mongosh blue_nest_montessori

clean:
	rm -rf backend/bin frontend/.next frontend/out
	@echo "✓ Cleaned"

# ── Database seed ─────────────────────────────────────────────────────────────
# `make seed-all` runs everything in dependency order: products & categories
# first (categories are derived from products), then branches, then users.
# Re-running is safe — each command drops & re-inserts its collection except
# users, which is idempotent.
#
# seed/seedchildren/seedstaff/seeddailylogs/seedgbp DROP their collections, so
# each refuses to run (internal/platform/seedguard) unless SEED_ALLOW_DROP=1.
# These targets already pass through _guard-not-prod (blocked on a host whose
# .env has APP_ENV=production), so we export the confirmation here rather than
# make every contributor pass it by hand — a bare `go run ./cmd/seedchildren`
# outside `make` still refuses by default.
seed: seed-all  ## alias

seed-products:
	@echo "→ Seeding products & categories..."
	cd backend && SEED_ALLOW_DROP=1 go run ./cmd/seed

seed-branches:
	@echo "→ Seeding branches..."
	cd backend && go run ./cmd/seedbranches

seed-catalogue:
	@echo "→ Seeding supply catalogue from Gompels orders..."
	cd backend && go run ./cmd/seedcatalogue

seed-users:
	@echo "→ Seeding default users (admin / test customer)..."
	@if docker compose ps backend --status running --quiet 2>/dev/null | grep -q .; then \
	  echo "  using running backend container (production-style)"; \
	  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedusers; \
	else \
	  echo "  no backend container running → falling back to local Go toolchain"; \
	  cd backend && go run ./cmd/seedusers; \
	fi

seed-children:
	@echo "→ Seeding nursery rooms, children & today's attendance..."
	cd backend && SEED_ALLOW_DROP=1 go run ./cmd/seedchildren

# Import REAL Famly exports (rooms/staff/children). Idempotent — never drops, so
# it is prod-safe. On the droplet Mongo is only reachable inside the container,
# so when the backend container is running we copy the export folder in and run
# the compiled binary there (then remove the PII copy); locally we host-run.
# FAMLY_SRC = host export folder (default famly-templates). DRY_RUN=1 previews.
FAMLY_SRC ?= famly-templates
seed-famly:
	@echo "→ Importing real Famly rooms/staff/children (idempotent)..."
	@if docker compose ps backend --status running --quiet 2>/dev/null | grep -q .; then \
	  echo "  backend container running → copying $(FAMLY_SRC) in + running there"; \
	  docker compose cp "$(FAMLY_SRC)" backend:/tmp/famly-import; \
	  docker compose exec -T -e FAMLY_DIR=/tmp/famly-import -e DRY_RUN=$${DRY_RUN:-} backend ./seedfamly; \
	  docker compose exec -T backend rm -rf /tmp/famly-import; \
	else \
	  echo "  no backend container → local Go toolchain"; \
	  cd backend && FAMLY_DIR=$${FAMLY_DIR:-../$(FAMLY_SRC)} go run ./cmd/seedfamly; \
	fi

seed-staff:
	@echo "→ Seeding nursery staff & today's staff attendance..."
	cd backend && SEED_ALLOW_DROP=1 go run ./cmd/seedstaff

seed-daily:
	@echo "→ Seeding practitioner daily records (observations, safeguarding, meals)..."
	cd backend && SEED_ALLOW_DROP=1 go run ./cmd/seeddailylogs

seed-gbp:
	@echo "→ Seeding Google Business Profile digests & reviews..."
	cd backend && SEED_ALLOW_DROP=1 go run ./cmd/seedgbp

seed-all: seed-products seed-branches seed-catalogue seed-users seed-children seed-staff seed-daily seed-gbp
	@echo "✓ All seeds complete"

# One-off migration: assign human-readable refs (SR-/PO-/ORD-) to records created
# before the reference feature. Idempotent — only touches docs missing a ref.
backfill-refs:
	@echo "→ Backfilling human-readable references (SR / PO / ORD)..."
	@if docker compose ps backend --status running --quiet 2>/dev/null | grep -q .; then \
	  echo "  using running backend container"; \
	  docker compose exec backend ./backfillrefs; \
	else \
	  echo "  no backend container running → falling back to local Go toolchain"; \
	  cd backend && go run ./cmd/backfillrefs; \
	fi

# Phase T0 tenancy migration: create the default Organisation + back-stamp org_id
# onto every existing tenant-scoped document. Idempotent — safe to re-run.
migrate-tenancy:
	@echo "→ Multi-tenancy migration (create default org + back-stamp org_id)..."
	@if docker compose ps backend --status running --quiet 2>/dev/null | grep -q .; then \
	  echo "  using running backend container"; \
	  docker compose exec backend ./migratetenancy; \
	else \
	  echo "  no backend container running → falling back to local Go toolchain"; \
	  cd backend && go run ./cmd/migratetenancy; \
	fi

# ── Frontend image optimisation ──────────────────────────────────────────────
# One-shot pass that resizes any /public image wider than 1920px down to 1920,
# re-encodes JPEGs/PNGs with sane quality, and produces .webp siblings for
# Next/Image to serve. Idempotent — safe to re-run after adding new assets.
# `optimize-images-dry` reports what would change without writing anything.
optimize-images:
	cd frontend && npm run optimize:images

optimize-images-dry:
	cd frontend && npm run optimize:images:dry

# ── First-time setup ──────────────────────────────────────────────────────────
setup: install
	@cp -n .env.example .env 2>/dev/null || true
	@echo "✓ .env created — edit it with your secrets before starting"
	@echo "Run 'make dev' for local dev or 'make docker-up' for Docker."

# ── Local staging environment (prod-image QA gate) ───────────────────────────
# NOTE: "staging" here is an ENVIRONMENT, not a git branch (branches are
# feature → develop → main). Builds the PRODUCTION images locally and runs them
# as an isolated compose project (bluenest-staging) for pre-prod verification.
# Pure docker compose — deliberately does NOT chain seed-* (which drop
# prod-shaped data; see ops notes). Browse the stack at http://localhost:3000
# and QA before promoting the `develop` branch → `main`.
STAGING := docker compose --env-file .env.staging -p bluenest-staging -f docker-compose.yml -f docker-compose.staging.yml

staging-up:
	@test -f .env.staging || { echo "✗ Missing .env.staging — run: cp .env.staging.example .env.staging  (then edit it)"; exit 1; }
	bash scripts/check-env.sh .env.staging
	$(STAGING) up -d --build
	@$(MAKE) --no-print-directory staging-verify

staging-verify:
	bash scripts/check-env.sh .env.staging
	@echo "→ Waiting for staging health (web :3000, api :8080)..."
	@for i in $$(seq 1 45); do \
	  if curl -fsS http://localhost:8080/api/v1/health >/dev/null 2>&1 && curl -fsS http://localhost:3000 >/dev/null 2>&1; then \
	    echo "✓ staging healthy — QA at http://localhost:3000"; exit 0; \
	  fi; \
	  sleep 2; \
	done; \
	echo "✗ staging did not become healthy — check 'make staging-logs'"; exit 1

staging-logs:
	$(STAGING) logs -f --tail=100

staging-down:
	$(STAGING) down

staging-clean:
	$(STAGING) down -v
