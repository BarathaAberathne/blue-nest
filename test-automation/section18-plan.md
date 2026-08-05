# Plan — Sections 18–21 (Performance, Security, Accessibility, Automated Coverage)

Scoped against the real system as it exists today (not a hypothetical greenfield build). Each section
states what's genuinely achievable, what infrastructure it needs that doesn't exist yet, and a concrete
first step.

---

## Section 18 — Performance testing

**Target scale:** 10 branches, 500 staff, 2,000 children, 10,000 enquiries, 100,000 attendance records,
500,000 daily log entries.

**Blocker:** this cannot run against the current dev database. It's the same Mongo instance holding real
Harrow data — seeding 500k+ synthetic documents into it isn't reversible in any convenient way, and the
plan's own Section 3.1 says production-shaped destructive testing needs an isolated environment.

**Plan:**
1. **Spin up an isolated Mongo** — either a second `mongo:7` container (`docker-compose.perf.yml`, a
   throwaway volume) or a fresh database name on the existing instance (`blue_nest_perf`), pointed at by
   `MONGODB_DATABASE` for a dedicated `blue-nest-api-perf` container. Either way: never the real `blue_nest_montessori` DB.
2. **Bulk-seed synthetic data** — a new `cmd/seedperf` (mirroring the existing seed commands' pattern: raw
   `mongo.Collection` bulk inserts, batched, org/branch-stamped correctly) generating the target volumes.
   Needs org_id stamped correctly (the gap behind past reseed pain) — write it through `NewTenantCollection`
   or stamp org_id explicitly in the seed script itself, not raw driver calls.
3. **Load-test tool** — no k6/artillery/vegeta currently in the repo. Recommend **k6** (single binary, scriptable
   in JS, no new language dependency) for HTTP-level checks against the plan's targets: branch dashboard load,
   enquiry board load/search, room register load, attendance write, KPI calculation, daily-log timeline,
   parent dashboard. Each becomes a small `.js` scenario asserting the plan's thresholds (page load <3s,
   API read <1s, attendance write <1s, search <2s, KPI refresh <3s).
4. **Expected findings, given what's already known:** the DB-integrity pass this session found **no
   secondary indexes** on `staff.ref`/`orders.ref`/`purchase_carts.ref`, and no compound index on
   `(branch_slug, date)` for attendance/daily-records collections (the two fields every register/report
   query filters by). At 100k+ attendance rows this will very likely blow past the 1s write / 3s KPI targets
   on collection scans — worth confirming with `explain()` on the hot queries before assuming k6 is even needed
   to prove it.
5. **Teardown** — drop the perf database/container after each run; never merge perf-scale data into dev.

**First concrete step if you want to proceed:** I'd start with step 4 (run `explain()` on the actual
hot queries — staff-attendance register, daily-records list, enquiry board) against the *current* real
data to see where the missing indexes already show up as collection scans, before building the full
seed+k6 pipeline. That's a same-session, no-new-infra way to get most of the signal cheaply.

---

## Section 19 — Full security testing

**Already done this session (code review + light live probes):** IDOR (pass, branch-scope checked
server-side), NoSQL injection (pass, no unsafe filter construction found), XSS via `dangerouslySetInnerHTML`
(1 real gap found and fixed — DOMPurify added), token storage (localStorage, known tradeoff, not a new
finding), one live 401/403 probe against a real endpoint.

**Not yet done, needs a decision on tooling/scope:**
- **CSRF** — this is a bearer-token SPA (`Authorization` header, not cookies), so classic CSRF mostly
  doesn't apply architecturally. Worth a 10-minute confirmation that no endpoint accepts cookie-based auth
  as a fallback, but not worth a full CSRF test harness.
- **Rate limiting** — only the kiosk route group has `middleware.RateLimit` (confirmed by the endpoint-
  validation pass). Login (`/auth/login`, `/admin/auth/login`) has **none** — a scripted credential-stuffing
  or brute-force run isn't throttled server-side. This is a real gap; fixing it is a small, contained change
  (reuse `middleware.RateLimit` on the two login routes) — flagging as a candidate for the next bug-fix pass,
  not something that needs a "testing plan," it just needs a go-ahead.
- **Full injection fuzzing** — an automated pass trying `$where`, `$ne`, `$gt` etc. as query-param values
  against every filterable list endpoint, to get systematic coverage beyond my manual code read. Doable with
  a short Go or Python script; ~30 min of work.
- **Dependency/secret scanning** — `npm audit` already surfaced 5 pre-existing vulnerabilities (sharp/next
  transitive, not investigated this session — worth a `npm audit` triage pass). No secret-scanning tool
  (gitleaks/trufflehog) has been run against the repo history.
- **Anything requiring an actual attacker mindset at scale** (systematic auth-bypass fuzzing, timing
  attacks, session-fixation) is out of scope for me to self-direct — that's a real pentest engagement,
  typically time-boxed and often done by a third party for a system handling child safeguarding data.

**Recommended next step:** fix the login rate-limiting gap now (cheap, real, no new infra) and run the
injection-fuzzing script — both fit in a normal work session. Treat a full third-party pentest as a
separate, later decision given the safeguarding-data sensitivity.

---

## Section 20 — Accessibility & multi-device testing

**Hard blocker:** this session only has Chrome-via-automation. Real Safari/Edge, Android tablet, iPad, and
the physical kiosk device can't be exercised here at all.

**What *is* achievable in Chrome:**
- Keyboard-only navigation through the golden path (tab order, focus visibility, no keyboard traps).
- `aria-label`/role audit via the DOM (a Lighthouse or axe-core pass — **axe-core isn't in the repo**,
  would need `npm install -D @axe-core/playwright` or similar plus a small script).
- Colour contrast spot-checks (axe-core covers this too).
- Responsive-table / modal behaviour at a few breakpoints via Chrome's device-emulation.

**Recommended next step:** add `@axe-core/playwright` (or the standalone `axe-core` + a small runner
script, no Playwright suite required) and run it against the 5–6 highest-traffic admin pages (dashboard,
enquiry detail, staff attendance, kiosk). That gets automated a11y coverage without needing real devices.
Real cross-browser/device testing needs either BrowserStack/Sauce Labs (paid, external) or the actual
hardware in hand — flagging as an infra decision, not something to attempt blind.

---

## Section 21 — Automated test coverage (unit/integration/API/E2E)

This section is explicitly "write test suites," not "run tests" — a different kind of deliverable from
everything done so far this session. Current state: `backend/internal/service/*_test.go` exists for
enquiries only (`enquiry_test.go`, `enquiry_lifecycle_test.go`); nothing for staff/child/room/attendance;
no frontend test runner configured at all (no Jest/Vitest/Playwright config in `frontend/package.json`).

**If you want this built, it's a separate, scoped piece of work — not something to bundle into "keep
testing."** Suggested shape if greenlit:
1. Backend unit tests for the fixed logic first (room capacity/dup-name validation, staff dup-email,
   child-attendance duplicate guards, child update field-preservation) — cheapest ROI since it directly
   regression-locks what was just fixed.
2. A minimal Playwright setup (`frontend/tests/e2e/`) covering just the golden path this session already
   ran by hand: login → enquiry → register → room assign → attendance → daily log → KPI check. One spec,
   not the full 8-file structure from Section 25 — expand later if it proves valuable.
3. Explicitly **not** attempting the full `tests/` tree from Section 25 in one pass — that's dozens of
   files; better to land the golden-path spec, confirm it's useful in CI, then grow it.

**Recommended next step:** if you want this, say the word and I'll scope it as its own task — it's real
engineering effort (probably a few hours), not a quick follow-on to today's session.

---

## Suggested order, if you want to keep going today

1. Login rate-limiting fix (cheap, real security gap, ~10 min).
2. `explain()` audit on the hot queries to confirm the missing-index hypothesis before building perf infra.
3. Everything else (perf harness, axe-core pass, injection fuzzing, automated test suite) — each is a
   real chunk of work; pick based on what you actually need next rather than doing all four back-to-back.
