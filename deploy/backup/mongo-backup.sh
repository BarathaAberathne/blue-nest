#!/usr/bin/env bash
#
# mongo-backup.sh — nightly production MongoDB backup, run on the droplet by a
# systemd timer (deploy/bluenest-backup.timer).
#
# What it does, in order:
#   1. mongodump (archive + gzip) THROUGH the running mongo container — no
#      extra tooling on the host, works with the prod overlay's auth enabled.
#   2. Integrity check: the archive must gunzip cleanly and be non-trivially
#      sized, or the run fails loudly (a 200-byte "backup" is a failed backup).
#   3. Retention: prune local archives older than RETENTION_DAYS.
#   4. Off-host copy (STRONGLY recommended): if rclone is installed and
#      BACKUP_RCLONE_REMOTE is set (e.g. "spaces:bluenest-backups/mongo"),
#      copy the archive there and prune the remote by the same retention.
#      A backup that only lives on the droplet dies with the droplet.
#
# Install (one-time, as root — see deploy/backup/README.md for the full drill):
#   cp /home/deploy/app/deploy/bluenest-backup.{service,timer} /etc/systemd/system/
#   systemctl daemon-reload && systemctl enable --now bluenest-backup.timer
#
# Restore (drill this at least once — an untested backup is a hope, not a plan):
#   gunzip -t <archive>                              # integrity
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T \
#     -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD mongodb sh -c \
#     'exec mongorestore -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
#        --authenticationDatabase admin --archive --gzip --drop' < <archive>
#
# NEVER point this at the dev Makefile targets; it reads the droplet's .env for
# credentials and talks only to the compose-managed mongodb service.

set -euo pipefail

APP_DIR="${APP_DIR:-/home/deploy/app}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups/mongo}"
LOG_FILE="${LOG_FILE:-/var/log/bluenest-backup.log}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
# Optional off-host target, e.g. an rclone remote for DO Spaces:
#   BACKUP_RCLONE_REMOTE=spaces:bluenest-backups/mongo
BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"
# Anything smaller than this is treated as a failed dump (bytes).
MIN_BYTES="${MIN_BYTES:-10240}"
STATE_DIR="${STATE_DIR:-/home/deploy/.bluenest-backup}"

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }
fail() { log "ERROR: $*"; exit 1; }

mkdir -p "$BACKUP_DIR" "$STATE_DIR"

# Single-instance lock so an overlapping timer tick can't race a slow dump.
# Guarded on flock existing: "flock missing" must degrade to an UNLOCKED run,
# never to a silent skip — skipping IS the failure mode for a backup job.
if command -v flock >/dev/null 2>&1; then
  exec 9>"$STATE_DIR/backup.lock"
  flock -n 9 || { log "another backup is already running; skipping"; exit 0; }
else
  log "WARN: flock unavailable on this host — running without the single-instance lock"
fi

cd "$APP_DIR" || fail "APP_DIR $APP_DIR does not exist"
[ -f .env ] || fail "no .env in $APP_DIR — refusing to guess credentials"

# Compose files: honour COMPOSE_FILE from .env (the prod safety pin) or from
# the caller's environment; fall back to the explicit prod pair.
DC="docker compose"
if ! grep -qE '^COMPOSE_FILE=' .env && [ -z "${COMPOSE_FILE:-}" ]; then
  DC="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
fi

# Read the DB name + root credentials the way compose does (last value wins).
env_val() { grep -E "^${1}=" .env | tail -n1 | cut -d= -f2- | tr -d '\r'; }
DB_NAME="$(env_val MONGODB_DATABASE)"; DB_NAME="${DB_NAME:-blue_nest_montessori}"
export MONGO_ROOT_USERNAME="$(env_val MONGO_ROOT_USERNAME)"
export MONGO_ROOT_PASSWORD="$(env_val MONGO_ROOT_PASSWORD)"

STAMP="$(date -u +'%Y%m%d-%H%M%S')"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.archive.gz"

log "dumping $DB_NAME → $OUT"

# Credentials are FORWARDED by name (-e VAR with no value), so they never
# appear in the host's process list. Auth-less dev/staging mongo (no root user
# in .env) falls back to an unauthenticated dump.
if [ -n "$MONGO_ROOT_USERNAME" ]; then
  $DC exec -T -e MONGO_ROOT_USERNAME -e MONGO_ROOT_PASSWORD mongodb sh -c \
    'exec mongodump --username "$MONGO_ROOT_USERNAME" --password "$MONGO_ROOT_PASSWORD" \
       --authenticationDatabase admin --db '"$DB_NAME"' --archive --gzip --quiet' \
    > "$OUT" || fail "mongodump failed"
else
  $DC exec -T mongodb sh -c \
    'exec mongodump --db '"$DB_NAME"' --archive --gzip --quiet' \
    > "$OUT" || fail "mongodump failed (no-auth mode)"
fi

# ── Integrity: must gunzip cleanly and be non-trivially sized ────────────────
gunzip -t "$OUT" 2>>"$LOG_FILE" || { rm -f "$OUT"; fail "archive failed gzip integrity check"; }
BYTES=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")
[ "$BYTES" -ge "$MIN_BYTES" ] || { rm -f "$OUT"; fail "archive suspiciously small (${BYTES}B < ${MIN_BYTES}B) — treating as failed dump"; }
log "dump OK (${BYTES} bytes)"

# ── Local retention ──────────────────────────────────────────────────────────
PRUNED=$(find "$BACKUP_DIR" -name "${DB_NAME}-*.archive.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
[ "$PRUNED" -gt 0 ] && log "pruned $PRUNED local archive(s) older than ${RETENTION_DAYS}d"

# ── Off-host copy (rclone → DO Spaces or any S3-compatible bucket) ───────────
if [ -n "$BACKUP_RCLONE_REMOTE" ]; then
  if command -v rclone >/dev/null 2>&1; then
    rclone copy "$OUT" "$BACKUP_RCLONE_REMOTE" --no-traverse >>"$LOG_FILE" 2>&1 \
      || fail "off-host copy to $BACKUP_RCLONE_REMOTE failed (local archive kept)"
    rclone delete "$BACKUP_RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" >>"$LOG_FILE" 2>&1 || true
    log "off-host copy OK → $BACKUP_RCLONE_REMOTE"
  else
    log "WARN: BACKUP_RCLONE_REMOTE set but rclone is not installed — backup is LOCAL-ONLY"
  fi
else
  log "WARN: no BACKUP_RCLONE_REMOTE configured — backup is LOCAL-ONLY (dies with the droplet)"
fi

log "backup complete: $OUT"
