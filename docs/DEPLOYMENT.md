# Deployment pipeline — sandbox → staging → prod

A lightweight, git-branch-based promotion flow. No Concourse, no extra servers.

**Branches vs environments** (don't conflate them):
- **Branches:** `feature/*` → **`develop`** (integration, default branch) → **`main`** (prod).
- **Environments:** `sandbox` (localhost dev) · `staging` (prod images built & run **locally** — a QA gate, **not** a branch) · `prod` (the droplet, tracking `main`).

```
feature/* ──PR──▶ develop ──(local prod-image QA gate: make staging-up)──▶ PR ──▶ main ──▶ GHCR build ──▶ droplet
  sandbox: localhost dev        staging env: localhost                          prod
```

| Stage | What it is | How |
|---|---|---|
| **sandbox** | localhost dev | `make dev` (hot reload) on a `feature/*` branch |
| **staging** | the **production images, built & run locally** | `make staging-up`, QA at http://localhost:3000 |
| **prod** | the `main` branch on the droplet | merge → GitHub Actions builds GHCR images → droplet auto-pulls |

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
Open a PR from `develop` → `main`. When it merges:
- `build-images.yml` builds & pushes `blue-nest-frontend` / `blue-nest-backend` to GHCR.
- The droplet's `bluenest-deploy.timer` notices the new images within ~2 min, runs
  the **env-parity preflight**, recreates the stack, health-checks, and rolls back
  on failure — all hands-off.

Optional versioned release (recommended for clean rollbacks):
```bash
git tag -a v1.4.0 -m "release: ..." && git push origin v1.4.0
# → also builds an immutable ghcr …:v1.4.0 image
```

---

## One-time droplet setup

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
  These two are safe & idempotent (upsert-only, no collection drop, only touch
  their own collection — other tables are untouched):
  ```bash
  cd ~/app
  # role/super-admin migration (after auth changes):
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedusers
  # supply catalogue from the embedded Gompels order CSVs:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend ./seedcatalogue
  ```
  Run these only **after** deploying the new image (the binary + embedded CSVs
  ship in it). `cmd/seed` (products) is NOT safe — it drops the collection — so
  never run it against prod.
- Branch protection: require PRs into `main` (from `develop`) with `ci.yml` green.
