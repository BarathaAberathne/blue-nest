# Blue Nest Montessori — Platform

Production-ready monorepo for the Blue Nest Montessori school website: a pastel-design public marketing site, parent-facing eCommerce store, blog, contact/enquiry system, and admin dashboard. Supports four branches (Harrow, Borehamwood, Pinner, Northwood).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React |
| Backend | Go 1.22, Chi router, REST API |
| Database | MongoDB 7 |
| Payments | Stripe (scaffolded — session + webhook) |
| Auth | JWT (`golang-jwt`) — backend wired, frontend guards in place |
| Email | SMTP via `platform/email` (SendGrid-compatible) |
| Containers | Docker, Docker Compose |

---

## Project Structure

```
blue-nest-montessori/
├── backend/
│   ├── cmd/api/main.go             # Entry point
│   ├── internal/
│   │   ├── config/                 # Env-based config
│   │   ├── handler/                # HTTP handlers (thin layer)
│   │   │   ├── admin/              # Admin-only: blog, products, orders, categories, users, enquiries
│   │   │   └── webhooks/           # Stripe webhook handler
│   │   ├── middleware/             # CORS, logger, JWT auth
│   │   ├── models/                 # MongoDB domain models + DTOs
│   │   │   └── (blog, branch, cart, comment, enquiry, order, payment, product, user)
│   │   ├── platform/
│   │   │   ├── email/              # SMTP email sender
│   │   │   ├── logger/             # slog wrapper
│   │   │   ├── mongo/              # MongoDB connection
│   │   │   └── stripe/             # Stripe SDK init
│   │   ├── repository/             # DB query interfaces + Mongo implementations
│   │   ├── routes/                 # Route registration
│   │   ├── server/                 # Server setup + dependency injection
│   │   └── service/                # Business logic
│   ├── pkg/
│   │   ├── response/               # JSON envelope helpers
│   │   └── validator/              # JSON decode + validation
│   ├── Dockerfile
│   └── go.mod
│
├── frontend/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Home
│   │   ├── layout.tsx              # Root layout — fonts, global metadata, metadataBase
│   │   ├── why-montessori/
│   │   ├── forest-school/
│   │   ├── gallery/                # Photo/video/updates gallery with like, share, comments
│   │   ├── our-team/               # Staff profiles grouped by site → role category
│   │   ├── our-charities/
│   │   ├── home-learning/
│   │   ├── contact/
│   │   ├── nursery-store/
│   │   ├── blog/
│   │   │   ├── page.tsx            # Post listing
│   │   │   └── [slug]/             # Individual post — async OG metadata, likes, share, comments
│   │   ├── branches/               # harrow | borehamwood | pinner | pinner-green | northwood
│   │   ├── admission/              # overview + our-fees + prospectus + application-form
│   │   ├── login/ | register/
│   │   ├── account/ | account/orders/
│   │   ├── cart/
│   │   ├── checkout/success | cancel
│   │   └── admin/                  # login | dashboard | orders | products | blog | categories | users
│   │
│   ├── components/
│   │   ├── layout/                 # Header, Footer, PublicLayout, AdminLayout, AccountLayout
│   │   ├── sections/               # HeroSection, IntroSection, VirtualTourStrip, FeatureCardsSection,
│   │   │                           #   NurseriesSection, ValuesSection, GalleryPreviewSection,
│   │   │                           #   LearningPathSection, FeesCTASection
│   │   ├── blog/                   # BlogClient (listing + search)
│   │   ├── contact/                # ContactPageClient, BranchMap, LeafletMap
│   │   ├── gallery/                # GalleryPageClient (tabs, filters, MediaPreview, comments)
│   │   ├── store/                  # StoreClient, ProductDetailClient
│   │   └── ui/                     # Design-system primitives:
│   │                               #   PastelButton, Badge, StickerCard, PolaroidCard,
│   │                               #   PaperSection, ZigzagBand, SectionDivider, SectionWrapper,
│   │                               #   PageWrapper, Motion (Reveal), Doodle, LightboxGallery,
│   │                               #   ChatBotCard, ChatBotFAB, FeeCalculatorCard, BreakIllustration
│   │
│   ├── lib/
│   │   ├── api.ts                  # Typed API client (all backend calls)
│   │   ├── auth.ts                 # JWT token helpers
│   │   ├── store-cart.ts           # localStorage cart state + helpers
│   │   ├── gallery-data.ts         # Static gallery items (photos, videos, updates)
│   │   ├── fee-data.json           # Branch fee schedules (read by FeeCalculatorCard)
│   │   └── useAuthGuard.ts         # Auth redirect hook
│   │
│   ├── types/index.ts              # Shared TypeScript types
│   ├── public/
│   │   ├── home/                   # Hero images, logo, brand assets
│   │   │   └── branches/           # Branch office photos (harrow, borehamwood, pinner, northwood)
│   │   ├── team/                   # Staff profile photos — naming: firstname-lastname.jpg
│   │   ├── doodles/                # Decorative hand-drawn PNGs
│   │   └── site-images/            # Badges, accreditations, section imagery
│   ├── styles/globals.css          # Tailwind + CSS design tokens
│   ├── tailwind.config.ts
│   ├── Dockerfile
│   └── package.json
│
├── docs/api.md                     # API endpoint reference
├── scripts/                        # Image processing utilities (Python)
├── .env.example
├── docker-compose.yml
├── Makefile
└── swagger.yaml
```

---

## Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

---

## Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your secrets:

| Variable | Description |
|---|---|
| `APP_SECRET` | App secret (32 chars) |
| `JWT_SECRET` | JWT signing secret (64 chars) |
| `JWT_EXPIRY_HOURS` | Access token lifetime (default: 24) |
| `JWT_REFRESH_EXPIRY_DAYS` | Refresh token lifetime (default: 30) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same key for Next.js |
| `NEXT_PUBLIC_API_URL` | Backend URL seen by the browser (default: `http://localhost:8080`) |
| `FRONTEND_URL` | Allowed CORS origin (default: `http://localhost:3000`) |
| `SMTP_HOST` | SMTP host — leave blank to skip sending in local dev |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials |
| `SMTP_FROM` | Sender address |
| `SMTP_ADMIN_TO` | Admin recipient for enquiry emails |

MongoDB has sensible defaults (`mongodb://localhost:27017`, DB `blue_nest_montessori`).

---

## Local Development

### Option A — Docker (recommended for first run)

```bash
make setup      # install deps + copy .env.example → .env
make docker-up  # start MongoDB + Go API + Next.js
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8080 |
| MongoDB | mongodb://localhost:27017 |

### Option B — Native dev servers (hot-reload)

Requires MongoDB running (run `docker compose up mongodb` if needed).

```bash
make install      # download Go modules + npm install
make dev          # start both backend and frontend concurrently
```

Or individually:

```bash
make dev-backend   # Go API (go run ./cmd/api)
make dev-frontend  # Next.js dev server (npm run dev)
```

---

## Makefile Reference

| Command | Description |
|---|---|
| `make setup` | First-time setup: install deps + create `.env` |
| `make dev` | Start both dev servers concurrently |
| `make build` | Build Go binary + Next.js production bundle |
| `make run` | Build then run both production servers |
| `make test` | Go tests + frontend tests |
| `make lint` | `go vet` + Next.js ESLint |
| `make install` | Go `mod download` + `npm install` |
| `make docker-up` | Start all Docker services |
| `make docker-down` | Stop all Docker services |
| `make docker-build` | Rebuild Docker images |
| `make docker-logs` | Stream logs from all containers |
| `make docker-restart` | Rebuild images and restart containers |
| `make mongo-shell` | Open `mongosh` in the running MongoDB container |
| `make clean` | Remove build artifacts (`backend/bin`, `.next`, `out`) |

---

## Frontend Pages

### Public

| Route | Description |
|---|---|
| `/` | Home — pastel scrapbook landing page with hero, fee calculator, virtual-tour CTA, nurseries strip, and values section |
| `/why-montessori` | Montessori philosophy and principles |
| `/forest-school` | Forest School programme with SEO breadcrumb |
| `/gallery` | Photos, videos, and updates — tabbed with branch/category filters, like, share (deep-link), and per-item comments |
| `/our-team` | Staff profiles from live staff data, grouped by site → role category, with photos and qualifications |
| `/our-charities` | Charity partnerships |
| `/home-learning` | Home learning resources |
| `/nursery-store` | Product listing with localStorage cart |
| `/contact` | Branch contacts + enquiry form with fee-quote email |
| `/blog` | Blog post listing with search and tag filters |
| `/blog/[slug]` | Individual blog post — like, share, comments, reading progress bar, async OG metadata |

### Admission

| Route | Description |
|---|---|
| `/admission` | Admissions overview |
| `/admission/our-fees` | Fee schedule |
| `/admission/prospectus` | School prospectus |
| `/admission/application-form` | Online application form |

### Branch Pages

| Route | Status |
|---|---|
| `/branches/harrow` | Active |
| `/branches/borehamwood` | Active |
| `/branches/pinner` | Active |
| `/branches/pinner-green` | Active |
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
| `/admin/categories` | Category management |
| `/admin/blog` | Blog post management |
| `/admin/users` | User management |

---

## API Overview

Base URL: `http://localhost:8080`

| Group | Endpoints |
|---|---|
| Health | `GET /api/v1/health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` |
| Products | `GET /products`, `GET /products/:id`, `GET /categories` |
| Cart | `GET /cart`, `POST /cart/items`, `PUT /cart/items/:id`, `DELETE /cart/items/:id` |
| Checkout | `POST /checkout/session` |
| Webhooks | `POST /webhooks/stripe` |
| Orders | `GET /orders/me`, `GET /orders/:id` |
| Blog | `GET /blog/posts`, `GET /blog/posts/:slug` |
| Comments | `GET /blog/posts/:slug/comments`, `POST /blog/posts/:slug/comments` |
| Branches | `GET /branches`, `GET /branches/:slug` |
| Contact | `POST /contact` |
| Admin — Orders | `GET /admin/orders`, `PATCH /admin/orders/:id` |
| Admin — Products | `GET/POST/PUT/DELETE /admin/products/:id` |
| Admin — Categories | `GET/POST/PUT/DELETE /admin/categories/:id` |
| Admin — Blog | `GET/POST/PUT/DELETE /admin/blog/posts/:id` |
| Admin — Users | `GET /admin/users`, `PATCH /admin/users/:id` |
| Admin — Enquiries | `GET /admin/enquiries` |

See [docs/api.md](docs/api.md) for full request/response contracts.

---

## Design System

The frontend uses a hand-crafted pastel design system defined in `styles/globals.css` and `tailwind.config.ts`.

### Colour Tokens

| Token | Hex | Usage |
|---|---|---|
| `--paper` | `#f9f4ee` | Page background |
| `--soft-white` | `#fffdf9` | Card background |
| `--blush` | `#f6d5df` | Header strip, pink accent |
| `--mint` | `#aee6dd` | Button variant, section fills |
| `--aqua` | `#7fd8d2` | Primary brand teal — icons, CTAs |
| `--lavender` | `#bfa6e8` | Accent |
| `--butter` | `#f7d774` | Doodle accent |
| `--ink` | `#5a4a42` | All body text (never pure black) |
| `--rose-ink` | `#cf7d9c` | Headings, kicker text |

### Fonts

- **Heading:** Amatic SC 700 (`--font-heading`)
- **Body:** Roboto 300/400/500/700 (`--font-body`)

### Key UI Components

| Component | Location | Purpose |
|---|---|---|
| `PastelButton` | `ui/PastelButton` | Chunky rounded CTA buttons (blush, mint, sage, lavender, butter variants) |
| `ZigzagBand` | `ui/ZigzagBand` | Coloured section dividers |
| `PolaroidCard` | `ui/PolaroidCard` | Scrapbook-style image cards with accent tint |
| `StickerCard` | `ui/StickerCard` | Feature cards with icon badges |
| `PaperSection` | `ui/PaperSection` | Paper-texture section wrapper |
| `Doodle` | `ui/Doodle` | Floating hand-drawn decorations (absolutely positioned, decorative only) |
| `Reveal` | `ui/Motion` | Scroll-triggered fade-up animation wrapper |
| `FeeCalculatorCard` | `ui/FeeCalculatorCard` | Interactive fee calculator — reads from `lib/fee-data.json` |
| `ChatBotCard` | `ui/ChatBotCard` | Hero chatbot UI panel (visual only — not yet connected) |
| `ChatBotFAB` | `ui/ChatBotFAB` | Sticky floating chatbot button in `PublicLayout` |
| `LightboxGallery` | `ui/LightboxGallery` | Full-screen image lightbox (used in branch pages) |

---

## Homepage Architecture (Conversion-First)

The homepage follows a conversion-first layout optimised for "Book a Visit" conversions and Montessori nursery SEO (Harrow / Pinner / Borehamwood).

**Section order:** Hero → QuickInfoStrip → FeatureCards → About → Nurseries → GalleryPreview → FeesCTA → FinalCTA

**Rules that must be maintained:**
- The Hero must stay minimal — no calculator, no contact block, no inline chatbot. Exactly **2 CTAs** only.
- The **H1 must appear exactly once** per page (in `HeroSection`) and contain the target keywords.
- The chatbot is a **sticky FAB** (`ChatBotFAB` in `PublicLayout`) — never embedded inline in a section.
- Doodles are **decorative only**: always `absolute` positioned, `hidden lg:block`, max 2 per section. They must never affect layout height or spacing.
- **Cards must maintain equal height** across all pages — use `flex` on the `Reveal` wrapper and `h-full w-full` on the card element.
- **Avoid duplicate CTAs** across sections — only one "Book a Visit" is the primary action. Supporting CTAs (fees, gallery, nurseries) are secondary.
- All headings use `text-[var(--ink)]` — no bright accent colors on section titles.
- Triangle page-breakers and `ZigzagBand` are **removed** from the homepage.

---

## Our Team Page

Staff data lives in `frontend/app/our-team/page.tsx` in the `ALL_STAFF` array, sourced from the staff spreadsheet. Each entry is grouped by `branch` (Harrow / Borehamwood / Pinner) and `category` (MD / Manager / Deputy / Academic / Support / BA).

### Adding a staff photo

1. Drop the image into `frontend/public/team/`
2. Name it `firstname-lastname.jpg` (lowercase, hyphens — e.g. `dolvy-colaco.jpg`)
3. Un-comment the `photo:` line for that person in `ALL_STAFF`

### Staff currently without photos (16)

**Harrow**
- Jyoti Kothari — Nursery Practitioner
- Priyanthi Mala Wijesekara — Nursery Practitioner
- Resmi Pathirattil Thankappan — Nursery Practitioner
- Habeeba Fyzer — Nursery Assistant
- Hansanee Priyalakshika — Nursery Assistant
- Imali Nissanka — SENCO Assistant
- Kurukulasuriya Lorage Adithya Parindhini Fernando — Nursery Assistant
- Ram Kumar Shrestha — Maintenance
- Thisaruni Widanapathirana — Nursery Assistant
- Baratha Abeyrathne — Business Analyst
- Thilina Obeysinghe Arachchige — Business Analyst

**Borehamwood**
- Dulanga Dilrangi Wijesekara — Nursery Assistant

**Pinner**
- Star Amber Mercedes Takelove — Deputy Manager
- Deepthi Yarasani — Nursery Practitioner
- Amelie Marie Hogberg — Bank Staff
- Sanduni Mudiyanselage — Bank Staff

---

## Cart Architecture

The store cart is currently **localStorage-based** (`lib/store-cart.ts`), decoupled from the Go API cart endpoints. This was done to ship the store UI without requiring auth.

Migration path when ready:
1. Replace `store-cart.ts` functions with calls to `lib/api.ts` cart endpoints
2. The API cart endpoints are already implemented and ready

---

## Fee Data

**Location:** `frontend/lib/fee-data.json`

The fee calculator (`components/ui/FeeCalculatorCard`) reads all prices directly from this file — no hardcoded values anywhere in the component.

### Structure

```
branches.<branch>.ageGroups.<ageGroup>.<session>.daily   // daily rate £
branches.<branch>.ageGroups.<ageGroup>.<session>.weekly  // 5-day weekly rate £
branches.<branch>.earlyBird                              // early bird surcharge £/day
meta.note                                                // disclaimer shown in calculator
```

Branches: `harrow`, `pinner`, `borehamwood`, `pinner green`, `northwood`  
Age groups: `0-2`, `2-3`, `3-5` (pinner has no `0-2` — the UI auto-selects the next group)  
Sessions: `full_day`, `morning`, `afternoon`, `school`

### How to update prices

Edit the relevant values in `frontend/lib/fee-data.json`. No code changes required — the calculator picks them up automatically.

### Calculation logic

```
base        = (days === 5) ? rates.weekly : rates.daily × days
earlyBird   = earlyBirdToggled ? branch.earlyBird × days : 0
weekly      = base + earlyBird
monthly     = weekly × 4.33
```

### Adding a calculator to a page

```tsx
import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";

// Full size (hero column)
<FeeCalculatorCard defaultBranch="harrow" />

// Compact (mobile / inline)
<FeeCalculatorCard compact defaultBranch="pinner" />
```

Valid `defaultBranch` values: `"harrow"` | `"pinner"` | `"borehamwood"` | `"pinner-green"` | `"northwood"`

---

## Branch Architecture

Each branch (`harrow`, `borehamwood`, `pinner`, `northwood`) has:

- A frontend page at `/branches/:slug`
- A `Branch` MongoDB document with `slug`, `name`, `status`, `contact`, and `admissions` fields
- `status` is either `active` or `coming_soon`

Products, blog posts, and orders carry `branch_slugs` for future per-branch filtering — no schema migration needed to scope content.

To add a new branch: create the DB document, add the frontend page, and add it to header navigation.

---

## Next Steps (Priority Order)

1. **Seed data** — run `SeedBranches()` to populate the branches collection; add product seed from `catalog_products.csv`
2. **MongoDB indexes** — unique indexes on `users.email`, `products.slug`, `blog_posts.slug`, `branches.slug`
3. **JWT auth end-to-end** — frontend already has `useAuthGuard`; connect `/login` and `/register` pages to the API and store token in an httpOnly cookie
4. **Cart migration** — swap `lib/store-cart.ts` for API-backed calls once auth is wired
5. **Stripe checkout** — implement `POST /checkout/session`, handle `checkout.session.completed` webhook to mark orders paid and send confirmation email
6. **Product image upload** — integrate Cloudinary or S3; hook into admin products page
7. **Blog rich text editor** — connect admin blog to API; add Tiptap or Slate
8. **ChatBot** — connect `ChatBotCard` / `ChatBotFAB` to a real AI endpoint or third-party (Tidio / Crisp)
9. **SEO metadata** — ✅ Done for gallery, blog index, and blog posts (async OG + Twitter). Remaining: branch pages, admission, why-montessori, forest-school
10. **Gallery comments API** — current gallery comments are localStorage-only (per device); wire to a real backend endpoint so comments persist and are shareable
11. **Staff photos** — 16 staff members still need profile photos (see Our Team page — commented-out `photo:` lines)
12. **Analytics** — PostHog or Plausible (GDPR-compliant)
13. **Refresh tokens** — implement `/auth/refresh` endpoint + client-side token refresh

---

## Scalability Notes

- **Layered architecture** — handler → service → repository with interfaces throughout; each layer can be extracted to a microservice without rewriting business logic
- **Interface-driven** — auth, Stripe, email, and all repositories are behind interfaces; swap implementations (Redis cart, S3 storage) by satisfying the interface
- **Branch-aware data model** — `branch_slugs` on products, blog posts, and users is additive; no migrations needed for branch scoping
- **Decoupled frontend** — all API calls go through `lib/api.ts`; no page is coupled to mock data structures
- **Env-first config** — the same binary runs in development, staging, and production
