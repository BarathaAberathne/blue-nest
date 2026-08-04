#!/usr/bin/env bash
#
# Local dev baseline snapshot helper. The baseline is a full, coherent
# single-tenant (Blue Nest) dataset for MANUAL testing: 5 branches, 10 rooms,
# real-named staff + children (from the local famly-templates export), room
# assignments, enquiries across every pipeline stage, leave in every state,
# rota shifts, staff + child attendance, terms, PINs, kiosk devices, catalogue
# and products.
#
# It lives as a gzipped mongodump archive at deploy/baseline/baseline.archive.
# That file is GITIGNORED because it embeds real names (same PII policy as
# famly-templates/), so it stays on this machine only. Restoring it is how you
# get an identical baseline back after wiping the DB / on `make docker-restart`.
#
# Subcommands:
#   snapshot   Dump the CURRENT database into the archive (update the baseline).
#   restore    Drop the database and restore it from the archive (reset to baseline).
#   ensure     Restore ONLY if the database is empty (used by docker-up/restart).
#
# Usage: scripts/baseline.sh <snapshot|restore|ensure>
set -euo pipefail

DB="${MONGODB_DATABASE:-blue_nest_montessori}"
ARCHIVE_HOST="deploy/baseline/baseline.archive"
MONGO_SVC="mongodb"

cd "$(dirname "$0")/.."

compose() { docker compose "$@"; }

mongo_running() {
  compose ps "$MONGO_SVC" --status running --quiet 2>/dev/null | grep -q .
}

db_doc_count() {
  compose exec -T "$MONGO_SVC" mongosh "$DB" --quiet --eval \
    'db.organisations.countDocuments({}) + db.branches.countDocuments({})' 2>/dev/null | tr -d '[:space:]'
}

require_mongo() {
  if ! mongo_running; then
    echo "✗ mongo container ('$MONGO_SVC') is not running - start it with 'docker compose up -d $MONGO_SVC'" >&2
    exit 1
  fi
}

cmd_snapshot() {
  require_mongo
  mkdir -p "$(dirname "$ARCHIVE_HOST")"
  echo "→ Snapshotting '$DB' into $ARCHIVE_HOST ..."
  compose exec -T "$MONGO_SVC" sh -c "mongodump --db=$DB --archive=/tmp/baseline.archive --gzip" >/dev/null
  compose cp "$MONGO_SVC:/tmp/baseline.archive" "$ARCHIVE_HOST" >/dev/null
  compose exec -T "$MONGO_SVC" rm -f /tmp/baseline.archive
  echo "✓ Baseline snapshot updated ($(du -h "$ARCHIVE_HOST" | cut -f1))"
}

cmd_restore() {
  require_mongo
  if [ ! -f "$ARCHIVE_HOST" ]; then
    echo "✗ No baseline archive at $ARCHIVE_HOST - nothing to restore." >&2
    echo "  (It is gitignored PII; build it once with the documented steps, then 'make baseline-snapshot'.)" >&2
    exit 1
  fi
  echo "→ Resetting '$DB' to the baseline snapshot ..."
  compose exec -T "$MONGO_SVC" mongosh "$DB" --quiet --eval 'db.dropDatabase()' >/dev/null
  compose cp "$ARCHIVE_HOST" "$MONGO_SVC:/tmp/restore.archive" >/dev/null
  compose exec -T "$MONGO_SVC" sh -c "mongorestore --archive=/tmp/restore.archive --gzip --drop --nsInclude='$DB.*'" 2>&1 | tail -2
  compose exec -T "$MONGO_SVC" rm -f /tmp/restore.archive
  echo "✓ Baseline restored"
}

cmd_ensure() {
  require_mongo
  if [ ! -f "$ARCHIVE_HOST" ]; then
    echo "• No baseline archive present - skipping restore (run 'make seed-all' or build the baseline)."
    return 0
  fi
  local n; n="$(db_doc_count || echo 0)"
  if [ "${n:-0}" = "0" ]; then
    echo "→ Database is empty - restoring the baseline snapshot ..."
    cmd_restore
  else
    echo "✓ Database already populated ($n branch/org docs) - keeping existing data (run 'make baseline-reset' to reset)."
  fi
}

case "${1:-}" in
  snapshot) cmd_snapshot ;;
  restore)  cmd_restore ;;
  ensure)   cmd_ensure ;;
  *) echo "usage: $0 <snapshot|restore|ensure>" >&2; exit 2 ;;
esac
