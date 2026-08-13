# Deployment pipeline — sandbox → staging → prod

A lightweight, git-branch-based promotion flow. No Concourse, no extra servers.

**Branches vs environments** (don't conflate them):
- **Branches:** `feature/*` → **`develop`** (integration, default branch) → **`main`** (prod).
- **Environments:** `sandbox` (localhost dev) · `staging` (prod images built & run **locally** — a QA gate, **not** a branch) · `prod` (the droplet, tracking `main`).

```
feature/* ──PR──▶ develop ──(local prod-image QA gate: make staging-up)──▶ PR ──▶ main ──▶ manual deploy on droplet (build on the box)
  sandbox: localhost dev        staging env: localhost                          prod
```

| Stage | What it is | How |
|---|---|---|
| **sandbox** | localhost dev | `make dev` (hot reload) on a `feature/*` branch |
| **staging** | the **production images, built & run locally** | `make staging-up`, QA at http://localhost:3000 |
| **prod** | the `main` branch on the droplet | merge, then **manually** deploy (SSH + build on the box) — see [Manual deploy & verify](#manual-deploy--verify-current-prod-method) |

> **Prod deploy is MANUAL (local-build mode).** There is no auto-deploy: you SSH in
> and build the images on the droplet from `main`. The GHCR + systemd auto-deploy
> further down is a documented *alternative that is NOT currently enabled*.

The guarantee that prevents the 2026-06-09 chat outage (missing `ANTHROPIC_API_KEY`)
is **env parity**: `.env.production.example` is the authoritative list of required
keys, and `scripts/check-env.sh` blocks both the staging run and the prod deploy
when a required key is missing or empty.

---

## Day-to-day flow

### 1. Develop (sandbox)
```bash
git checkout -b feature/my-change      # off develop
make dev                               # localhost:3000 / :8080, hot reload
```
Open a PR into **`develop`**. GitHub Actions (`ci.yml`) runs lint/test/build.

### 2. Release candidate (the staging-environment QA gate)
Merge the PR into `develop`, then locally:
```bash
git checkout develop && git pull
cp .env.staging.example .env.staging   # first time only; fill in a REAL
                                       # ANTHROPIC_API_KEY + Stripe TEST keys
make staging-up                        # builds prod images, runs them, verifies
```
`make staging-up` runs the env-parity check, builds the **production** Dockerfiles,
starts the stack as the isolated `bluenest-staging` compose project, and waits for
health. Then QA at **http://localhost:3000** — re-run the QA sweep (forms, fee
calculator, cart, and especially **chat**: `POST /api/chat` must return 200, not 503).

```bash
make staging-logs     # watch logs
make staging-down      # stop (keeps DB)
make staging-clean     # stop + wipe the staging DB volume
```

### 3. Promote to production
Open a PR from `develop` → `main` and merge it once CI (`ci.yml`) is green. Then
**deploy manually** — see the runbook directly below.

---

## Manual deploy & verify (current prod method)

Prod runs in **local-build mode** (`IMAGE_PREFIX` empty): the droplet checks out
`main` and **builds the images on the box**. The `mongo_data` + `uploads_data`
volumes persist across rebuilds, so deploys never touch data.

### Deploy
```bash
ssh deploy@165.232.47.89
cd ~/app
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'

git rev-parse --short HEAD          # ← note this SHA for rollback
free -h                             # confirm swap exists — the 4 GB box OOMs on the Next build without it

git fetch origin main && git reset --hard origin/main
dc up -d --build --force-recreate
```

### Verify it worked
```bash
dc ps                               # all 3 up; blue-nest-mongo + blue-nest-api show "healthy"
curl -s -o /dev/null -w "api(local): %{http_code}\n" http://localhost:8080/api/v1/health   # want 200
dc logs --tail=40 backend           # scan for panics / "Failed" / connection errors
dc logs --tail=40 frontend
```
Externally, through nginx:
```bash
curl -s -o /dev/null -w "api:  %{http_code}\n" https://api.bluenest.uk/api/v1/health   # 200
curl -s -o /dev/null -w "site: %{http_code}\n" https://bluenest.uk                       # 200
```
Then a browser smoke (hard-refresh, Cmd+Shift+R): log into `/admin`, confirm the
dashboard loads and the feature you shipped renders (proves the new image is live).

**✅ Deploy succeeded when:** `dc ps` all up (mongo + api healthy) · both curls return
`200` · logs clean · the new feature renders in the browser.

### Env-only changes (e.g. Stripe keys in `.env`)
No rebuild needed — just recreate the affected service:
```bash
dc up -d --force-recreate backend
```
The `pull access denied for blue-nest-backend` warning is **harmless** in local-build
mode (there's nothing to pull; it falls back to the local image).

### Rollback
```bash
git reset --hard <OLD_SHA>          # the SHA noted before deploying
dc up -d --build --force-recreate
```
Data is safe — volumes persist. **Never** `dc down -v` (wipes the DB) or run
`make seed-*` on the droplet (drops products).

---

## Alternative: GHCR auto-deploy (NOT currently enabled — reference only)

> ⚠️ **Prod deploys manually** (see [Manual deploy & verify](#manual-deploy--verify-current-prod-method)).
> The GHCR + systemd auto-deploy documented in this section is **not active**, and
> there is currently no CI workflow building/pushing GHCR images either — it was
> removed because nothing consumed them. This section is kept for reference if you
> later switch to registry pulls: you'd need to set `IMAGE_PREFIX` to GHCR, install
> the timer below, *and* re-add an image-build CI workflow.

Assumes the existing layout: app checkout at `/home/deploy/app`, populated `.env`,
nginx already terminating TLS for bluenest.uk / api.bluenest.uk.

```bash
# 1. Make sure .env is complete (this is the same gate prod uses):
cd /home/deploy/app && bash scripts/check-env.sh .env

# 2. (If pulling private GHCR images) drop a read token for docker login:
echo "ghp_xxx_read_packages_token" > /home/deploy/.ghcr-token && chmod 600 /home/deploy/.ghcr-token
#    and set GHCR_USER in the service file (or export it there).

# 3. Install the auto-deploy timer:
sudo cp deploy/bluenest-deploy.service deploy/bluenest-deploy.timer /etc/systemd/system/
sudo touch /var/log/bluenest-deploy.log && sudo chown deploy:deploy /var/log/bluenest-deploy.log
sudo systemctl daemon-reload
sudo systemctl enable --now bluenest-deploy.timer

# 4. Verify:
systemctl list-timers bluenest-deploy.timer
sudo systemctl start bluenest-deploy.service   # force one pass now
tail -f /var/log/bluenest-deploy.log
```

The deployer is a **no-op when nothing changed**, so the 2-minute cadence is cheap.

### Manual deploy / force a pass
```bash
sudo systemctl start bluenest-deploy.service        # run one cycle now
# or directly:
sudo -u deploy /home/deploy/app/deploy/auto-deploy.sh
```

### Rollback
`auto-deploy.sh` auto-rolls-back to the previously-running images if the health
check fails. To roll back deliberately to a tagged release:
```bash
cd /home/deploy/app
# pin to a known-good image tag and recreate
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=v1.3.0/' .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
```
(Then `git revert` the bad commit on `main` so the timer doesn't re-pull `latest`
over your pinned tag.)

---

## Notes & limitations

- **Known gap of local staging:** the locally-built frontend bakes
  `NEXT_PUBLIC_API_URL=http://localhost:8080`, so staging validates *runtime*
  config (chat key, CORS, email, Stripe) but **not** the prod-baked API domain.
  The env-parity preflight + the post-deploy prod health check cover the residual
  risk; for a 100%-identical pre-prod you'd need a real staging subdomain.
- **Never** run `make docker-up` / `make docker-restart` / `make seed-*` on the
  droplet — they invoke a host Go seed that can't reach prod Mongo and drops
  product data. The deployer uses plain `docker compose` only.
- **Seeding on prod = run the compiled binary _inside_ the backend container**
  (reaches prod Mongo over the compose network; never the host `make seed-*`).
  These are safe & idempotent (upsert-only, no collection drop, only touch
  their own collection — other tables are untouched):
  ```bash
  cd ~/app
  # role/super-admin migration (after auth changes):
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedusers
  # supply catalogue from the embedded Gompels order CSVs:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedcatalogue
  # per-branch fee schedules + org-wide fee meta ($setOnInsert per org — never
  # overwrites rates an admin has already entered in Settings → Fees):
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedfees
  # configurable lists (session types / allergies / dietary / age groups), same class:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedtaxonomy
  ```
  Run these only **after** deploying the new image (the binary + embedded CSVs
  ship in it). `cmd/seed` (products) is NOT safe — it drops the collection — so
  never run it against prod.
  **`./seedfees` is a required one-time step on any FRESH environment** — the
  binary ships in the image but nothing executes it automatically. Found live
  (2026-08-11): prod's `fee_configs` had never been seeded, so the public fee
  calculator silently served its bundled fallback JSON while `/admin/fees`
  showed all-zero drafts. (Prod itself is now populated — via the admin API —
  so this is a fresh-environment step, and re-running it on prod is harmless.)
- Branch protection: require PRs into `main` (from `develop`) with `ci.yml` green.
