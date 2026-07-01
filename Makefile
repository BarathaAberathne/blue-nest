.PHONY: all build run dev test lint install clean \
        _guard-not-prod \
        docker-up docker-down docker-build docker-logs docker-restart docker-stop \
        dev-backend dev-frontend run-backend run-frontend \
        mongo-shell setup \
        seed seed-products seed-branches seed-catalogue seed-users seed-all \
        wait-api \
        staging-up staging-verify staging-logs staging-down staging-clean \
        optimize-images optimize-images-dry

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
docker-up docker-restart docker-build seed-products seed-branches seed-catalogue seed-all: _guard-not-prod

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
seed: seed-all  ## alias

seed-products:
	@echo "→ Seeding products & categories..."
	cd backend && go run ./cmd/seed

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

seed-all: seed-products seed-branches seed-catalogue seed-users
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

# ── Local staging (prod-image QA gate) ────────────────────────────────────────
# Builds the PRODUCTION images locally and runs them as an isolated compose
# project (bluenest-staging) for pre-prod verification. Pure docker compose —
# deliberately does NOT chain seed-* (which drop prod-shaped data; see ops
# notes). Browse the stack at http://localhost:3000 and QA before promoting
# the `staging` branch → `main`.
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
