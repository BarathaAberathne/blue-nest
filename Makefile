.PHONY: all build run dev test lint install clean \
        docker-up docker-down docker-build docker-logs docker-restart docker-stop \
        dev-backend dev-frontend run-backend run-frontend \
        mongo-shell setup seed

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
docker-up:
	docker compose up -d
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
	@echo "✓ Images rebuilt and services restarted"
	@echo "  API  → http://localhost:8080"
	@echo "  Web  → http://localhost:3000"

docker-stop:
	docker compose stop

# ── Utilities ─────────────────────────────────────────────────────────────────
mongo-shell:
	docker exec -it blue-nest-mongo mongosh blue_nest_montessori

clean:
	rm -rf backend/bin frontend/.next frontend/out
	@echo "✓ Cleaned"

# ── Database seed ─────────────────────────────────────────────────────────────
seed:
	cd backend && go run ./cmd/seed/main.go

# ── First-time setup ──────────────────────────────────────────────────────────
setup: install
	@cp -n .env.example .env 2>/dev/null || true
	@echo "✓ .env created — edit it with your secrets before starting"
	@echo "Run 'make dev' for local dev or 'make docker-up' for Docker."
