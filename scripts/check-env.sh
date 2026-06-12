#!/usr/bin/env bash
#
# check-env.sh — environment-parity gate.
#
# Treats .env.production.example as the authoritative contract of required keys
# and verifies that a target env file (e.g. .env.staging on a laptop, or
# /home/deploy/app/.env on the droplet) defines every REQUIRED key with a
# non-empty value. This is what catches the class of bug found on 2026-06-09,
# where ANTHROPIC_API_KEY was simply absent from prod and the chat assistant
# returned 503 on every request.
#
# Exit status:
#   0  all required keys present and non-empty (warnings allowed)
#   1  one or more required keys missing/empty  → block the deploy
#   2  usage / contract file problem
#
# Usage:
#   bash scripts/check-env.sh .env.staging
#   bash scripts/check-env.sh /home/deploy/app/.env
#   CONTRACT=.env.production.example bash scripts/check-env.sh .env
#
# Portable: works on macOS bash 3.2 and Ubuntu bash 5 (no associative arrays).

set -u

TARGET="${1:-}"
CONTRACT="${CONTRACT:-.env.production.example}"

if [ -z "$TARGET" ]; then
  echo "usage: $0 <env-file-to-check>" >&2
  exit 2
fi

# Resolve the contract relative to this script's repo root if not found in CWD.
if [ ! -f "$CONTRACT" ]; then
  here="$(cd "$(dirname "$0")/.." && pwd)"
  if [ -f "$here/$CONTRACT" ]; then
    CONTRACT="$here/$CONTRACT"
  else
    echo "✗ contract file not found: $CONTRACT" >&2
    exit 2
  fi
fi

if [ ! -f "$TARGET" ]; then
  echo "✗ target env file not found: $TARGET" >&2
  exit 1
fi

# Keys allowed to be empty (feature-flagged or dev-only). Everything else listed
# in the contract is required to be present AND non-empty.
OPTIONAL_KEYS="
CHAT_MODEL
MONGODB_URI
COMPOSE_FILE
IMAGE_PREFIX
SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS
DEFAULT_CUSTOMER_EMAIL DEFAULT_CUSTOMER_PASSWORD DEFAULT_CUSTOMER_FIRST_NAME DEFAULT_CUSTOMER_LAST_NAME
GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URL
FACEBOOK_CLIENT_ID FACEBOOK_CLIENT_SECRET FACEBOOK_REDIRECT_URL
"
# Collapse newlines/extra spaces to single spaces so boundary tokens match.
OPTIONAL_KEYS=" $(printf '%s' "$OPTIONAL_KEYS" | tr '\n' ' ') "

is_optional() {
  case "$OPTIONAL_KEYS" in
    *" $1 "*) return 0 ;;
    *) return 1 ;;
  esac
}

# Return the (last) value for KEY in FILE, or empty string if undefined.
# Matches `KEY=...` and `export KEY=...`, ignores comments, strips one layer of
# surrounding single/double quotes and trailing CR (CRLF files).
val_of() {
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$2" 2>/dev/null \
    | tail -n1 \
    | sed -E "s/^[[:space:]]*(export[[:space:]]+)?$1=//; s/\r$//; s/^\"(.*)\"$/\1/; s/^'(.*)'$/\1/"
}

required_keys() {
  grep -E '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=' "$CONTRACT" \
    | sed -E 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/' \
    | sort -u
}

missing=0
warnings=0

echo "→ env-parity: checking '$TARGET' against contract '$CONTRACT'"

for key in $(required_keys); do
  value="$(val_of "$key" "$TARGET")"

  if [ -z "$value" ]; then
    if is_optional "$key"; then
      : # optional + empty is fine
    else
      echo "  ✗ MISSING required key: $key"
      missing=$((missing + 1))
    fi
    continue
  fi

  # Non-empty but still a template placeholder → warn (don't hard-fail, so the
  # store can ship before Stripe/OAuth are live, but you're told about it).
  case "$value" in
    *REPLACE_ME*|*REPLACE_WITH*|*placeholder*|*CHANGE_ME*|*your-*)
      echo "  ⚠ placeholder value for: $key"
      warnings=$((warnings + 1))
      ;;
  esac
done

# ── Production safety: never allow a base/dev-only compose on an APP_ENV=production
# environment. The base docker-compose.yml publishes MongoDB and runs it without
# auth, so a prod-mode env MUST pin a production-grade overlay via COMPOSE_FILE
# (docker-compose.prod.yml on the server; docker-compose.staging.yml for the
# local prod-image gate, which also runs APP_ENV=production).
app_env="$(val_of APP_ENV "$TARGET")"
if [ "$app_env" = "production" ]; then
  compose_file="$(val_of COMPOSE_FILE "$TARGET")"
  case "$compose_file" in
    *docker-compose.prod.yml*|*docker-compose.staging.yml*)
      : ;; # pinned to a production-grade overlay — safe
    "")
      echo "  ✗ APP_ENV=production but COMPOSE_FILE is missing — a bare 'docker compose' would start the dev/base config and expose MongoDB (0.0.0.0:27017, no auth). Set COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml"
      missing=$((missing + 1)) ;;
    *)
      echo "  ✗ APP_ENV=production but COMPOSE_FILE does not include docker-compose.prod.yml (got: '$compose_file') — refusing dev/base compose on production."
      missing=$((missing + 1)) ;;
  esac
fi

echo "----"
if [ "$missing" -gt 0 ]; then
  echo "✗ env-parity FAILED: $missing required key(s) missing/empty, $warnings warning(s)"
  exit 1
fi

if [ "$warnings" -gt 0 ]; then
  echo "✓ env-parity OK (all required keys set) — $warnings placeholder warning(s) to review"
else
  echo "✓ env-parity OK — all required keys set"
fi
exit 0
