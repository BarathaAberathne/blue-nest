# Deployment Instructions — Blue Nest Montessori

## Quickstart (after first-time setup is done)

From the deploy user's shell on the droplet:

```bash
cd /home/deploy/app

git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose ps
```

That's the day-to-day deploy. The rest of this document is the first-time
setup (sections 1–12) and ongoing maintenance reference.

The production setup files all live in-repo and shouldn't be hand-edited
during normal operation:

- `docker-compose.prod.yml` — port + auth + resource overrides
- `deploy/nginx/bluenest.conf` — nginx server config
- `deploy/mongo-init/01-create-app-user.js` — runs on first mongo start
- `.env.production.example` — populate as `.env` on the droplet

---

## Recommendation

**DigitalOcean Droplet + Nginx + Docker Compose** is the recommended path.

The app is already fully containerised (Next.js, Go API, MongoDB all have Dockerfiles and a `docker-compose.yml`). Production deployment is essentially pointing a server at the repo, adding secrets, and running `docker compose up`. No extra infrastructure tooling is needed.

### Why not AWS / GCP?
Overkill for this scale. Higher cost, far more moving parts, and weeks of setup vs hours.

### Why not Vercel + Railway?
Vercel is excellent for Next.js but the Go API and MongoDB would need to live on Railway or similar. Cross-origin CORS configuration then becomes a daily maintenance headache, and Railway's pricing scales unpredictably under load. A single Droplet keeps everything in one place, one SSH session, one log stream.

---

## Cost Comparison

| Setup | Monthly | Notes |
|---|---|---|
| **DO Droplet (2 GB) + MongoDB Atlas free** | **~£14 / $18** | Best value. Atlas free = 512 MB, fine for a school site |
| DO Droplet (2 GB) + DO Managed MongoDB | ~£26 / $33 | More reliable DB, easier backups |
| DO Droplet (4 GB) + DO Managed MongoDB | ~£38 / $48 | Headroom for traffic spikes |
| Vercel Pro + Railway Starter + Atlas free | ~£20 / $25 | Best Next.js CDN performance, more moving parts |
| DO App Platform + Managed MongoDB | ~£30 / $39+ | Fully managed, less control, harder to debug |

**Start with: Droplet (2 GB) + MongoDB Atlas free tier = ~£14/month.**  
Upgrade to Managed MongoDB ($15/month) when the site goes fully live with parents.

---

## Architecture

```
Browser
  │
  ▼
Cloudflare (free) — CDN, DDoS protection, SSL edge
  │
  ▼
DigitalOcean Droplet  (Ubuntu 24.04 LTS, 2 GB RAM)
  │
  Nginx  (ports 80 / 443)
  ├── bluenest.uk  ──────────→  Next.js   (container, port 3000)
  └── api.bluenest.uk  ──────→  Go API    (container, port 8080)
                                    │
                                    └──→  MongoDB Atlas  (cloud)
                                         OR
                                         MongoDB container (same Droplet)
```

---

## Step-by-step Setup

### 1 — Buy a domain

Register `bluenest.uk` (or your chosen domain) with any registrar (Namecheap, Google Domains, GoDaddy).  
Cost: ~£10–15/year.

---

### 2 — Create a DigitalOcean Droplet

1. Sign up at [digitalocean.com](https://digitalocean.com)
2. **Create Droplet:**
   - Image: **Ubuntu 24.04 LTS**
   - Plan: **Basic — 2 GB RAM / 2 vCPU / 60 GB SSD** → $18/month
   - Region: **London (LON1)** — closest to your users
   - Authentication: **SSH key** (add your public key)
   - Enable: **Monitoring** (free)
3. Note the Droplet's public IP address.

---

### 3 — Point DNS to the Droplet

Add these DNS records at your registrar (or in Cloudflare if you proxy through it):

| Type | Name | Value |
|---|---|---|
| A | `@` (root) | `<droplet-ip>` |
| A | `www` | `<droplet-ip>` |
| A | `api` | `<droplet-ip>` |

DNS propagation takes 5–30 minutes.

**Recommended: enable Cloudflare free plan** — it gives you CDN, DDoS protection, and automatic HTTPS at the edge for £0. Point Cloudflare's nameservers at your domain, then set SSL mode to **Full (strict)**.

---

### 4 — Initial server setup

SSH into the Droplet as root, then run:

```bash
ssh root@<droplet-ip>

# System updates
apt update && apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Docker Compose plugin (v2)
apt install -y docker-compose-plugin

# Nginx + Certbot
apt install -y nginx certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Create a non-root deploy user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/.ssh
```

From now on SSH as `deploy`, not root.

---

### 5 — Clone the repository

```bash
ssh deploy@<droplet-ip>

cd /home/deploy
git clone https://github.com/BarathaAberathne/blue-nest.git app
cd app
```

---

### 6 — Set up environment variables

```bash
cp .env.example .env
nano .env
```

Fill in every value. Key production changes vs local dev:

```env
APP_ENV=production
APP_SECRET=<random 32-char string>

# If using MongoDB Atlas:
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net
# If using MongoDB on the same Droplet (Docker Compose):
MONGODB_URI=mongodb://mongodb:27017

MONGODB_DATABASE=blue_nest_montessori

JWT_SECRET=<random 64-char string>
JWT_EXPIRY_HOURS=24
JWT_REFRESH_EXPIRY_DAYS=30

# Your live Stripe keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Public API URL — this is baked into the Next.js bundle at build time
NEXT_PUBLIC_API_URL=https://api.bluenest.uk
FRONTEND_URL=https://bluenest.uk

# SMTP — SendGrid is simplest
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
SMTP_FROM=noreply@bluenest.uk
SMTP_ADMIN_TO=manager@bluenest.uk
```

Generate secrets:
```bash
openssl rand -hex 16   # 32-char APP_SECRET
openssl rand -hex 32   # 64-char JWT_SECRET
```

---

### 7 — Production Docker Compose override

`docker-compose.prod.yml` is already committed in the repo. It overlays the
base `docker-compose.yml` to:

- enable MongoDB authentication and remove its public port
- bind the backend + frontend to `127.0.0.1` only (nginx is the public entry)
- set memory/CPU limits sized for a 2 vCPU / 4 GB droplet
- bake `NEXT_PUBLIC_API_URL=https://api.bluenest.uk` into the frontend bundle
- pull images from GHCR (`${IMAGE_PREFIX}/blue-nest-{frontend,backend}:${IMAGE_TAG}`)
  if `IMAGE_PREFIX` is set in `.env`; otherwise build locally on the droplet

> Requires `docker compose` ≥ 2.24 for the `!reset` directive. Ubuntu 24.04's
> `docker-compose-plugin` is current enough.

Open the file once to confirm the memory/CPU limits match your droplet:

```bash
less docker-compose.prod.yml
```

---

### 8 — Build (or pull) and start the containers

If you've wired up the GitHub Actions image-build workflow and set
`IMAGE_PREFIX` in `.env`:

```bash
cd /home/deploy/app
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose ps
```

Otherwise build the images locally on the droplet (slower, uses more RAM):

```bash
cd /home/deploy/app
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose ps
```

Expected output:
```
NAME               STATUS
blue-nest-web      Up (healthy)
blue-nest-api      Up (healthy)
blue-nest-mongo    Up (healthy)   ← only if using local MongoDB
```

---

### 9 — Configure Nginx

```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Create Blue Nest config
nano /etc/nginx/sites-available/bluenest
```

The nginx config is committed at `deploy/nginx/bluenest.conf` — it includes
the two server blocks, the WebSocket upgrade map, security headers (HSTS,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy),
gzip, long-lived caching for `/_next/static/*` and `client_max_body_size 20M`
on the API block. Symlink it into nginx:

```bash
sudo cp /home/deploy/app/deploy/nginx/bluenest.conf /etc/nginx/sites-available/bluenest
sudo ln -sf /etc/nginx/sites-available/bluenest /etc/nginx/sites-enabled/bluenest
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

### 10 — SSL certificates (Let's Encrypt)

```bash
certbot --nginx -d bluenest.uk -d www.bluenest.uk -d api.bluenest.uk
```

Follow the prompts. Certbot automatically:
- Obtains certificates from Let's Encrypt (free)
- Rewrites the Nginx config to redirect HTTP → HTTPS
- Schedules auto-renewal

Test auto-renewal:
```bash
certbot renew --dry-run
```

> **If using Cloudflare:** Set SSL/TLS mode to **Full (strict)** in the Cloudflare dashboard. Certbot still runs on the server for the origin certificate.

---

### 11 — Verify the deployment

```bash
# Health check — Go API
curl https://api.bluenest.uk/api/v1/health

# Frontend — should return HTML
curl -I https://bluenest.uk
```

Open `https://bluenest.uk` in a browser. You should see the live site.  
Open `https://bluenest.uk/admin/login` to confirm the admin dashboard loads.

---

### 12 — Set up MongoDB Atlas (if not using local MongoDB)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → create a free account
2. Create a **free M0 cluster** (512 MB, no credit card needed)
3. Add a database user with a strong password
4. Whitelist the Droplet's IP address under **Network Access**
5. Copy the connection string and paste it into `.env` as `MONGODB_URI`
6. Remove the `mongodb` service from your `docker-compose.prod.yml` if you switch to Atlas

---

## Ongoing Maintenance

### Deploy a code update

```bash
ssh deploy@<droplet-ip>
cd /home/deploy/app

git pull origin main

# Rebuild only changed images, then restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### View logs

```bash
# All services
docker compose logs -f

# One service
docker compose logs -f frontend
docker compose logs -f backend
```

### MongoDB backup (local MongoDB only)

```bash
# Dump to a local file
docker exec blue-nest-mongo mongodump \
  --db blue_nest_montessori \
  --archive=/tmp/backup.gz \
  --gzip

docker cp blue-nest-mongo:/tmp/backup.gz ./backup-$(date +%Y%m%d).gz
```

Schedule daily backups with cron:
```bash
crontab -e
# Add:
0 2 * * * cd /home/deploy/app && docker exec blue-nest-mongo mongodump --db blue_nest_montessori --archive=/tmp/backup.gz --gzip && docker cp blue-nest-mongo:/tmp/backup.gz /home/deploy/backups/backup-$(date +\%Y\%m\%d).gz
```

### Restart a service

```bash
docker compose restart frontend
docker compose restart backend
```

### Scale up (if traffic grows)

1. In DigitalOcean dashboard → Droplet → **Resize** (pick a larger plan, takes ~2 minutes, zero data loss)
2. Or migrate MongoDB to DO Managed Database for automatic backups and failover

---

## Stripe Webhook Setup

After deploying, register the webhook endpoint in the Stripe dashboard:

1. Go to **Stripe → Developers → Webhooks → Add endpoint**
2. URL: `https://api.bluenest.uk/webhooks/stripe`
3. Events to listen for: `checkout.session.completed`, `payment_intent.payment_failed`
4. Copy the **Signing secret** → paste into `.env` as `STRIPE_WEBHOOK_SECRET`
5. Restart the backend: `docker compose restart backend`

---

## SendGrid Email Setup

1. Sign up at [sendgrid.com](https://sendgrid.com) — free tier = 100 emails/day
2. Create an **API key** with **Mail Send** permission
3. Verify your sender domain (`bluenest.uk`) under **Sender Authentication**
4. Paste the API key into `.env` as `SMTP_PASS` (with `SMTP_USER=apikey`)

---

## Cost Summary (Recommended Setup)

| Item | Cost |
|---|---|
| DigitalOcean Droplet (2 GB, London) | $18 / month |
| MongoDB Atlas M0 (free tier) | $0 |
| Cloudflare (free plan) | $0 |
| Let's Encrypt SSL | $0 |
| SendGrid (free, 100 emails/day) | $0 |
| Domain (`bluenest.uk`) | ~£12 / year |
| **Total** | **~$18/month + £12/year** |

**Upgrade path when you need it:**

| When | Upgrade | Extra Cost |
|---|---|---|
| MongoDB nears 512 MB | Atlas M10 or DO Managed MongoDB | +$15–57/month |
| Site gets slow under load | Resize Droplet to 4 GB | +$6/month |
| Need CDN for images | DigitalOcean Spaces + CDN | +$5/month |
| Need staging environment | Second small Droplet | +$6/month |

---

## Security Checklist Before Going Live

- [ ] All `.env` secrets are unique and not committed to git (`.gitignore` already excludes `.env`)
- [ ] MongoDB is not exposed on a public port (covered by `docker-compose.prod.yml` override)
- [ ] Stripe is using **live** keys (not `sk_test_`)
- [ ] SSL certificates are installed and auto-renewing (`certbot renew --dry-run` passes)
- [ ] Admin route (`/admin`) is only accessible over HTTPS
- [ ] SendGrid domain verification is complete (emails won't land in spam)
- [ ] DigitalOcean firewall only allows ports 22, 80, 443
