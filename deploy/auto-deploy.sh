#!/usr/bin/env bash
#
# auto-deploy.sh — hands-off production deploy, run on the droplet by a systemd
# timer (deploy/bluenest-deploy.timer). Polls origin/main + GHCR; when something
# changed it runs the env-parity preflight, recreates the stack, health-checks,
# and rolls back to the previously-running images if health fails.
#
# Design choices:
#   - Polling (not an inbound webhook) → no public port/secret to expose.
#   - Pure `docker compose` with BOTH -f files + --force-recreate (per ops
#     notes); never calls the Makefile docker-up/seed-* targets (they run a host
#     seed that drops prod-shaped data).
#   - No-op and exits 0 when nothing changed, so it's cheap to run every couple
#     of minutes.
#
# One-time setup on the droplet is documented in docs/DEPLOYMENT.md.

set -euo pipefail

# ── Config (override via environment in the systemd unit) ─────────────────────
APP_DIR="${APP_DIR:-/home/deploy/app}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
LOG_FILE="${LOG_FILE:-/var/log/bluenest-deploy.log}"
STATE_DIR="${STATE_DIR:-/home/deploy/.bluenest-deploy}"
HEALTH_API="${HEALTH_API:-http://127.0.0.1:8080/api/v1/health}"
HEALTH_WEB="${HEALTH_WEB:-http://127.0.0.1:3000}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-3}"
# Optional: path to a file containing a GHCR read token (CR_PAT) for `docker
# login`. If absent we assume the host is already logged in or images are public.
GHCR_TOKEN_FILE="${GHCR_TOKEN_FILE:-/home/deploy/.ghcr-token}"
GHCR_USER="${GHCR_USER:-}"

DC="docker compose ${COMPOSE_FILES}"

mkdir -p "$STATE_DIR"

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }

# Single-instance lock so overlapping timer ticks can't race.
exec 9>"$STATE_DIR/deploy.lock"
if ! flock -n 9; then
  exit 0   # a deploy is already running; quietly skip this tick
fi

cd "$APP_DIR"

# ── GHCR auth (best effort) ───────────────────────────────────────────────────
if [ -f "$GHCR_TOKEN_FILE" ] && [ -n "$GHCR_USER" ]; then
  docker login ghcr.io -u "$GHCR_USER" --password-stdin < "$GHCR_TOKEN_FILE" >/dev/null 2>&1 || \
    log "WARN: ghcr login failed; continuing (images may be public or already authed)"
fi

img_id() { docker inspect --format '{{.Image}}' "$1" 2>/dev/null || echo "none"; }
img_ref() {
  # Resolve a service's image ref as compose computes it, from the env file.
  local prefix tag
  prefix="$(grep -E '^IMAGE_PREFIX=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  tag="$(grep -E '^IMAGE_TAG=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  tag="${tag:-latest}"
  if [ -n "$prefix" ]; then echo "${prefix}/blue-nest-$1:${tag}"; else echo "blue-nest-$1:${tag}"; fi
}

# ── 1. Detect change: git, images, or .env ────────────────────────────────────
git fetch --quiet origin "$BRANCH" || { log "ERROR: git fetch failed"; exit 1; }
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
git_changed=0; [ "$LOCAL_SHA" != "$REMOTE_SHA" ] && git_changed=1

env_sum="$( (sha256sum .env 2>/dev/null || shasum -a 256 .env 2>/dev/null) | awk '{print $1}')"
prev_env_sum="$(cat "$STATE_DIR/env.sum" 2>/dev/null || echo "")"
env_changed=0; [ "$env_sum" != "$prev_env_sum" ] && env_changed=1

# Bring compose files / scripts up to date before pulling images.
if [ "$git_changed" = "1" ]; then
  log "main advanced ${LOCAL_SHA:0:7} → ${REMOTE_SHA:0:7}; syncing working tree"
  git reset --hard "origin/$BRANCH" >>"$LOG_FILE" 2>&1
fi

# Snapshot currently-running image IDs for rollback.
PREV_BE_ID="$(img_id blue-nest-api)"
PREV_FE_ID="$(img_id blue-nest-web)"

log "pulling images…"
$DC pull >>"$LOG_FILE" 2>&1 || { log "ERROR: docker compose pull failed"; exit 1; }

NEW_BE_REF="$(img_ref backend)"; NEW_FE_REF="$(img_ref frontend)"
NEW_BE_ID="$(docker inspect --format '{{.Id}}' "$NEW_BE_REF" 2>/dev/null || echo none)"
NEW_FE_ID="$(docker inspect --format '{{.Id}}' "$NEW_FE_REF" 2>/dev/null || echo none)"
images_changed=0
{ [ "$NEW_BE_ID" != "$PREV_BE_ID" ] || [ "$NEW_FE_ID" != "$PREV_FE_ID" ]; } && images_changed=1

if [ "$git_changed" = "0" ] && [ "$images_changed" = "0" ] && [ "$env_changed" = "0" ]; then
  log "no changes (git, images, env all current) — nothing to deploy"
  exit 0
fi
log "change detected → git:$git_changed images:$images_changed env:$env_changed — deploying"

# ── 2. Env-parity preflight (block deploy on missing required keys) ───────────
if ! bash scripts/check-env.sh .env >>"$LOG_FILE" 2>&1; then
  log "ERROR: env-parity preflight FAILED — see $LOG_FILE. Aborting BEFORE recreate."
  exit 1
fi

# ── 3. Deploy ──────────────────────────────────────────────────────────────────
log "recreating containers (up -d --force-recreate)…"
$DC up -d --force-recreate --remove-orphans >>"$LOG_FILE" 2>&1 || {
  log "ERROR: compose up failed"; exit 1;
}

# ── 4. Health check ─────────────────────────────────────────────────────────────
healthy=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -fsS "$HEALTH_API" >/dev/null 2>&1 && curl -fsS "$HEALTH_WEB" >/dev/null 2>&1; then
    healthy=1; break
  fi
  sleep "$HEALTH_INTERVAL"
done

if [ "$healthy" = "1" ]; then
  echo "$env_sum" > "$STATE_DIR/env.sum"
  log "✓ deploy healthy (api+web) at ${REMOTE_SHA:0:7}"
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

# ── 5. Rollback to previously-running images ──────────────────────────────────
log "✗ health check FAILED — rolling back to previous images"
if [ "$PREV_BE_ID" != "none" ]; then docker tag "$PREV_BE_ID" "$NEW_BE_REF" >>"$LOG_FILE" 2>&1 || true; fi
if [ "$PREV_FE_ID" != "none" ]; then docker tag "$PREV_FE_ID" "$NEW_FE_REF" >>"$LOG_FILE" 2>&1 || true; fi
$DC up -d --force-recreate >>"$LOG_FILE" 2>&1 || log "ERROR: rollback recreate failed — manual intervention needed"
log "rollback attempted; deploy left at previous images. Investigate $LOG_FILE"
exit 1
