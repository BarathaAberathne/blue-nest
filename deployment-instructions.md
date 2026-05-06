# Deployment Instructions — Blue Nest Montessori

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

### 7 — Create a production Docker Compose override

Create `docker-compose.prod.yml` alongside the existing `docker-compose.yml`:

```bash
cat > docker-compose.prod.yml << 'EOF'
services:
  mongodb:
    # Remove public port exposure in production
    ports: []

  backend:
    environment:
      APP_ENV: production
      FRONTEND_URL: https://bluenest.uk
      MONGODB_URI: ${MONGODB_URI}
    # Remove public port exposure — Nginx proxies to this container
    ports: []

  frontend:
    build:
      args:
        NEXT_PUBLIC_API_URL: https://api.bluenest.uk
    environment:
      NODE_ENV: production
    # Remove public port exposure
    ports: []
EOF
```

> **Why this file?** The base `docker-compose.yml` exposes ports for local dev. In production, only Nginx should be publicly reachable. The override removes those port bindings.

---

### 8 — Build and start the containers

```bash
cd /home/deploy/app

# Build images (takes 3–5 minutes on first run)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in the background
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check all three containers are running
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

Paste this config:

```nginx
# ── Frontend (Next.js) ───────────────────────────────────────────────────────
server {
    listen 80;
    server_name bluenest.uk www.bluenest.uk;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# ── Go API ───────────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name api.bluenest.uk;

    location / {
        proxy_pass         http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Allow large file uploads (product images)
        client_max_body_size 20M;
    }
}
```

```bash
# Enable and test
ln -s /etc/nginx/sites-available/bluenest /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
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
