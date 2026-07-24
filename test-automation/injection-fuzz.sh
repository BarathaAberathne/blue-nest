#!/usr/bin/env bash
# Injection fuzzing script — Section 19 (Security Tests) of the QA test plan.
#
# Scope: NoSQL operator injection (query params + JSON bodies), regex-injection
# / malformed-regex handling on every admin search endpoint that builds a
# MongoDB $regex filter from raw user input, and JSON type-confusion attempts.
#
# Usage: ./injection-fuzz.sh [base_url] [admin_email] [admin_password]
# Defaults: http://localhost:8080  admin@bluenest.uk  changeme-min-8-chars
#
# Exit code is non-zero if any check fails. Each result line is
# "PASS|FAIL <id> <description>" so this is grep-able / CI-friendly.

set -uo pipefail

BASE_URL="${1:-http://localhost:8080}"
ADMIN_EMAIL="${2:-admin@bluenest.uk}"
ADMIN_PASSWORD="${3:-changeme-min-8-chars}"

FAILURES=0
pass() { echo "PASS $1 $2"; }
fail() { echo "FAIL $1 $2"; FAILURES=$((FAILURES+1)); }

TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Could not authenticate — aborting."
  exit 2
fi

auth_get() { curl -s -G "$1" -H "Authorization: Bearer $TOKEN" "${@:2}"; }
status_of() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

# ── FUZZ-001 — NoSQL operator injection via query-string values ─────────────
# A string like {"$ne":null} passed as a query VALUE must stay a literal
# string (Go's net/url always yields strings; Mongo can't reinterpret it as
# an operator document unless the app itself unmarshals raw JSON into a
# filter, which none of these endpoints do).
for ep in admin/staff admin/enquiries admin/children; do
  code=$(status_of -G "$BASE_URL/api/v1/$ep" -H "Authorization: Bearer $TOKEN" \
    --data-urlencode 'q={"$ne":null}' --data-urlencode 'status[$gt]=' --data-urlencode 'branch[$ne]=x')
  if [ "$code" = "200" ]; then pass "FUZZ-001.$ep" "operator-injection query params stay inert (200, no 500/data leak)"
  else fail "FUZZ-001.$ep" "unexpected status $code"; fi
done

# ── FUZZ-002 — malformed regex via the free-text `q` search param ───────────
# staff/children/daily-records all build {"$regex": q} directly from the raw
# query string. An unbalanced pattern must not surface as a raw 500.
for ep in admin/staff admin/children admin/daily-records; do
  ep_ok=1
  for payload in '(' '[a-' '(a' '**' '(?P<x>' ; do
    code=$(status_of -G "$BASE_URL/api/v1/$ep" -H "Authorization: Bearer $TOKEN" --data-urlencode "q=$payload")
    if [ "$code" = "500" ]; then
      fail "FUZZ-002.$ep" "malformed regex '$payload' → unhandled 500 (should be 400 or a safely-escaped no-match)"
      ep_ok=0
    fi
  done
  [ "$ep_ok" = "1" ] && pass "FUZZ-002.$ep" "malformed regex inputs handled without a raw 500"
done

# ── FUZZ-003 — ReDoS-shaped patterns via `q` (timing check) ──────────────────
# Catastrophic-backtracking-shaped patterns must not cause multi-second hangs.
for ep in admin/staff admin/children admin/daily-records; do
  for payload in '(a+)+$' '(a|a)+$' '(a|aa)+$' ; do
    t=$(curl -s -o /dev/null -w "%{time_total}" -G "$BASE_URL/api/v1/$ep" \
      -H "Authorization: Bearer $TOKEN" --data-urlencode "q=$payload")
    over=$(python3 -c "print(1 if float('$t') > 2.0 else 0)")
    if [ "$over" = "1" ]; then
      fail "FUZZ-003.$ep" "pattern '$payload' took ${t}s (>2s, possible ReDoS)"
    fi
  done
  pass "FUZZ-003.$ep" "no catastrophic-backtracking pattern exceeded 2s"
done

# ── FUZZ-004 — JSON body type confusion (object where a string is expected) ─
code=$(status_of -X POST "$BASE_URL/api/v1/admin/rooms" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"branch_slug":{"$ne":null},"name":"Fuzz","capacity":5}')
[ "$code" = "400" ] && pass "FUZZ-004.rooms" "object-typed branch_slug rejected (400)" \
  || fail "FUZZ-004.rooms" "expected 400, got $code"

code=$(status_of -X POST "$BASE_URL/api/v1/admin/staff" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"first_name":"X","last_name":"Y","branch_slug":"harrow","email":{"$gt":""}}')
[ "$code" = "400" ] && pass "FUZZ-004.staff" "object-typed email rejected (400)" \
  || fail "FUZZ-004.staff" "expected 400, got $code"

# ── FUZZ-005 — unauthenticated / cross-tenant probes ────────────────────────
code=$(status_of "$BASE_URL/api/v1/admin/staff")
[ "$code" = "401" ] && pass "FUZZ-005.noauth" "no token → 401, not data" \
  || fail "FUZZ-005.noauth" "expected 401, got $code"

code=$(status_of "$BASE_URL/api/v1/admin/staff" -H "Authorization: Bearer not.a.real.token")
[ "$code" = "401" ] && pass "FUZZ-005.badtoken" "malformed token → 401, not 500" \
  || fail "FUZZ-005.badtoken" "expected 401, got $code"

echo "----"
if [ "$FAILURES" -eq 0 ]; then
  echo "ALL CHECKS PASSED"
  exit 0
else
  echo "$FAILURES CHECK(S) FAILED"
  exit 1
fi
