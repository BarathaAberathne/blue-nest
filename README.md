# Blue Nest Montessori School — Platform

A production-ready monorepo for the Blue Nest Montessori School website platform, covering:

- Public nursery marketing site
- Parent-facing eCommerce store
- Blog
- Simple admin dashboard
- Multi-branch architecture (Harrow, Borehamwood, Pinner, Northwood)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React |
| Backend | Go 1.22, Chi router, REST API |
| Database | MongoDB 7 |
| Payments | Stripe (scaffolded) |
| Auth | JWT (scaffolded via `golang-jwt`) |
| Containers | Docker, Docker Compose |
| CI | GitHub Actions |

---

## Monorepo Structure

```
blue-nest-montessori/
├── backend/                    # Go API
│   ├── cmd/api/                # Entry point (main.go)
│   ├── internal/
│   │   ├── config/             # Config loading from env
│   │   ├── handler/            # HTTP handlers (thin)
│   │   │   ├── admin/          # Admin-only handlers
│   │   │   └── webhooks/       # Stripe webhook handler
│   │   ├── middleware/         # CORS, logger, JWT auth
│   │   ├── models/             # MongoDB domain models + DTOs
│   │   ├── platform/
│   │   │   ├── logger/         # slog wrapper
│   │   │   ├── mongo/          # MongoDB connection
│   │   │   └── stripe/         # Stripe SDK init
│   │   ├── repository/         # DB queries (interfaces + mongo impls)
│   │   ├── routes/             # Route registration
│   │   ├── server/             # Server setup, DI wiring
│   │   └── service/            # Business logic
│   ├── pkg/
│   │   ├── response/           # JSON envelope helpers
│   │   └── validator/          # JSON decoding
│   ├── Dockerfile
│   └── go.mod
├── frontend/                   # Next.js app
│   ├── app/                    # App Router pages
│   ├── components/
│   │   ├── layout/             # Header, Footer, layouts
│   │   ├── sections/           # Landing-page sections and marketing modules
│   │   └── ui/                 # Buttons, cards, motion, decorative primitives
│   ├── features/               # Domain feature components
│   │   ├── blog/
│   │   ├── branches/
│   │   └── store/
│   ├── hooks/                  # Custom React hooks
│   ├── lib/api.ts              # Typed API client
│   ├── public/home/            # Homepage imagery and brand assets
│   ├── styles/globals.css      # Tailwind + design tokens
│   ├── types/index.ts          # Shared TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── api.md                  # API reference
├── .github/workflows/ci.yml    # GitHub Actions CI
├── .env.example
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- (Optional) [golangci-lint](https://golangci-lint.run/) for linting

---

## Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and fill in your secrets:

| Variable | Description |
|---|---|
| `APP_SECRET` | Application secret (32 chars) |
| `JWT_SECRET` | JWT signing secret (64 chars) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same key for frontend |

MongoDB and API URLs have sensible defaults for local development.

---

## Local Development

### Option A — Full stack with Docker (recommended for first run)

```bash
make setup       # copy .env.example → .env
make docker-up   # start MongoDB + API + Next.js
```

Services:
- **Web** → http://localhost:3000
- **API** → http://localhost:8080
- **MongoDB** → localhost:27017

### Option B — Native dev servers (hot-reload)

Requires MongoDB running locally or via `docker compose up mongodb`.

```bash
make install      # install Go modules + Node packages
make dev          # starts both backend and frontend concurrently
```

Or individually:

```bash
make dev-backend  # Go API with go run (hot-reload via air if installed)
make dev-frontend # Next.js dev server
```

---

## Docker Usage

```bash
make docker-up      # start all services in background
make docker-down    # stop all services
make docker-build   # rebuild images
make docker-logs    # stream logs from all containers
make docker-restart # restart all containers
make mongo-shell    # open mongosh in the running MongoDB container
```

---

## Makefile Commands

| Command | Description |
|---|---|
| `make setup` | First-time setup: install deps and copy `.env.example` |
| `make build` | Build Go binary + Next.js production bundle |
| `make dev` | Start both dev servers concurrently |
| `make run` | Build then run both production servers |
| `make test` | Run Go tests + frontend tests |
| `make lint` | Run `go vet` + Next.js ESLint |
| `make install` | Download Go modules + install npm packages |
| `make docker-up` | Start all Docker services |
| `make docker-down` | Stop all Docker services |
| `make clean` | Remove build artifacts |

---

## Frontend Pages

### Public
| Route | Description |
|---|---|
| `/` | Home — pastel scrapbook-style landing page with animated hero, virtual-tour CTA, gallery cards and values strip |
| `/why-montessori` | Montessori philosophy and principles |
| `/forest-school` | Forest School programme |
| `/admission` | Admissions process and funding info |
| `/gallery` | Photo gallery |
| `/our-team` | Team profiles |
| `/our-charities` | Charity partnerships |
| `/home-learning` | Home learning resources |
| `/nursery-store` | Product listing |
| `/contact` | Branch contacts + enquiry form |
| `/blog` | Blog post listing |
| `/blog/[slug]` | Individual blog post |

### Branch Pages
| Route | Status |
|---|---|
| `/branches/harrow` | Active |
| `/branches/borehamwood` | Active |
| `/branches/pinner` | Active |
| `/branches/northwood` | Coming Soon |

### Auth & Account
| Route | Description |
|---|---|
| `/login` | Sign in |
| `/register` | Create account |
| `/account` | Account details |
| `/account/orders` | Order history |
| `/cart` | Shopping cart |
| `/checkout/success` | Order confirmed |
| `/checkout/cancel` | Checkout cancelled |

### Admin
| Route | Description |
|---|---|
| `/admin/login` | Admin sign in |
| `/admin/dashboard` | Stats overview |
| `/admin/orders` | All orders list |
| `/admin/orders/[id]` | Order detail + status update |
| `/admin/products` | Product management |
| `/admin/blog` | Blog post management |

---

## API Overview

Base URL: `http://localhost:8080`

| Group | Endpoints |
|---|---|
| Health | `GET /api/v1/health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` |
| Products | `GET /products`, `GET /products/:id`, `GET /categories` |
| Cart | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id` |
| Checkout | `POST /checkout/session`, `POST /webhooks/stripe` |
| Orders | `GET /orders/me`, `GET /orders/:id` |
| Blog | `GET /blog/posts`, `GET /blog/posts/:slug` |
| Branches | `GET /branches`, `GET /branches/:slug` |
| Admin | `GET/PATCH /admin/orders`, `GET/POST/PUT/DELETE /admin/products`, `GET/POST/PUT /admin/blog/posts` |

See [docs/api.md](docs/api.md) for full request/response contracts.

---

## Branch Architecture

Each branch (`harrow`, `borehamwood`, `pinner`, `northwood`) has:

- A dedicated frontend page at `/branches/:slug`
- A `Branch` MongoDB document with `slug`, `name`, `status`, `contact`, and `admissions` fields
- `status` is either `active` or `coming_soon` — Northwood ships as `coming_soon`
- Products, blog posts, and orders can be tagged with `branch_slugs` for future filtering

To add a new branch: create the branch document, add a frontend page, and add it to the header navigation. No architectural changes required.

---

## Next Implementation Steps (Priority Order)

1. **JWT auth end-to-end** — wire login/register into the frontend, store token in httpOnly cookie, add auth guards on account/admin routes
2. **MongoDB indexes** — add unique indexes on `users.email`, `products.slug`, `blog_posts.slug`, `branches.slug`
3. **Branch seed script** — populate the `branches` collection with the four starter branches from `models.SeedBranches()`
4. **Stripe checkout** — implement `POST /checkout/session` to create a Stripe checkout session, handle `checkout.session.completed` webhook to mark orders paid
5. **Product management** — connect admin products page to the API, add image upload (Cloudinary recommended)
6. **Blog CMS** — connect admin blog page to the API, add a rich text editor (Tiptap or Slate)
7. **Cart state** — implement frontend cart state (Zustand or React Context), connect to `/api/v1/cart`
8. **Email notifications** — send order confirmation emails via Resend or SendGrid on payment success
9. **SEO metadata** — add per-branch and per-post `generateMetadata` with real content
10. **Image uploads** — integrate Cloudinary or S3 for product images, gallery, and blog covers
11. **Analytics** — add PostHog or Plausible for GDPR-compliant analytics
12. **Refresh tokens** — implement the `/auth/refresh` endpoint and client-side token refresh logic
13. **Branch manager role** — scope admin access by `branch_slugs` on the JWT claims

---

## Scalability Decisions

**Modular monolith** — The Go backend uses a clean layered architecture (handler → service → repository) with interfaces throughout. Each layer can be extracted to a separate service later without rewriting business logic.

**Interface-driven** — Auth, Stripe, and all repositories are behind interfaces. Swapping implementations (e.g. Redis cart, S3 storage) requires only a new struct that satisfies the interface.

**Branch-aware data model** — `branch_slugs` on products, blog posts, and users means branch filtering is additive — no schema migration needed to scope content to a specific branch.

**Decoupled frontend** — The Next.js app communicates with the API exclusively through `lib/api.ts`. No page is bound to mock data structures; all data shapes match the Go DTOs.

**Env-first config** — All secrets and environment-specific values come from environment variables. The same binary runs in development, staging, and production.
