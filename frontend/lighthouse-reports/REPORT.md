# Lighthouse Audit & Optimization — Blue Nest Montessori

**Date:** 2026-05-19
**Tool:** `@lhci/cli@0.15.1` against `next start` (Next.js 16.2.6) on `localhost:3000`
**Form factors:** Mobile (Moto G4-equivalent: 390×844, 3× DPR, 4× CPU slowdown,
RTT 150 ms, throughput 1.6 Mbps) and Desktop (1350×940, no CPU slowdown,
RTT 40 ms, throughput 10 Mbps).
**Routes audited:** 20 public routes, auto-discovered by walking `app/`
(excludes admin / account / cart / checkout / login / register / auth and all
dynamic `[slug]` / `[id]` segments — see `scripts/lh-discover-routes.cjs`).

> **Gotcha noted during the audit:** the repo's `docker-compose` stack was
> running and `blue-nest-web` was bound to port 3000, so the first few LHCI
> runs silently audited the stale Docker-served image instead of the local
> `next start`. After stopping `blue-nest-web`, all numbers below were
> produced against the local build. If you re-run, make sure
> `docker ps | grep blue-nest-web` is empty first.

---

## How to run

```bash
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8080 \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder \
  npm run build

npm run lh:routes      # prints the 20 URLs the audits will hit
npm run lh:mobile      # mobile audit → lighthouse-reports/mobile/
npm run lh:desktop     # desktop audit → lighthouse-reports/desktop/
npm run lh:all         # both, mobile first
```

The `@lhci/cli` binary is installed at the repo root; the frontend scripts
shell out to `../node_modules/.bin/lhci`. Configs live at
`frontend/lighthouserc.{mobile,desktop}.cjs`.

---

## Scoreboard

### Desktop — average **100 / 96 / 100 / 100** (Perf / A11y / BP / SEO)

| Route | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 97 | 96 | 100 | 100 | 1208 ms | 0.000 | 0 ms |
| /admission | 100 | 96 | 100 | 100 | 728 ms | 0.000 | 0 ms |
| /admission/application-form | 100 | 96 | 100 | 100 | 758 ms | 0.000 | 0 ms |
| /admission/holiday-club | 100 | 96 | 100 | 100 | 678 ms | 0.000 | 0 ms |
| /admission/our-fees | 100 | 96 | 100 | 100 | 722 ms | 0.000 | 0 ms |
| /admission/prospectus | 100 | 96 | 100 | 100 | 772 ms | 0.000 | 0 ms |
| /blog | 100 | 96 | 100 | 100 | 685 ms | 0.000 | 0 ms |
| /branches/borehamwood | 100 | 96 | 100 | 100 | 734 ms | 0.000 | 0 ms |
| /branches/harrow | 100 | 96 | 100 | 100 | 742 ms | 0.000 | 0 ms |
| /branches/northwood | 100 | 96 | 100 | 100 | 715 ms | 0.000 | 0 ms |
| /branches/pinner | 100 | 96 | 100 | 100 | 712 ms | 0.000 | 0 ms |
| /branches/pinner-green | 100 | 96 | 100 | 100 | 742 ms | 0.000 | 0 ms |
| /contact | 100 | 97 | 100 | 100 | 644 ms | 0.000 | 0 ms |
| /forest-school | 99 | 96 | 100 | 100 | 861 ms | 0.000 | 0 ms |
| /gallery | 100 | 96 | 100 | 100 | 652 ms | 0.000 | 0 ms |
| /home-learning | 100 | 96 | 100 | 100 | 746 ms | 0.000 | 0 ms |
| /nursery-store | 100 | 96 | 100 | 100 | 642 ms | 0.000 | 0 ms |
| /our-charities | 100 | 96 | 100 | 100 | 799 ms | 0.000 | 0 ms |
| /our-team | 100 | 96 | 100 | 100 | 735 ms | 0.000 | 0 ms |
| /why-montessori | 99 | 96 | 100 | 100 | 965 ms | 0.000 | 0 ms |

### Mobile — average **89 / 96 / 99 / 100** (Perf / A11y / BP / SEO)

| Route | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| / | 80 | 96 | 100 | 100 | 5511 ms | 0.000 | 7 ms |
| /admission | 90 | 96 | 100 | 100 | 3615 ms | 0.000 | 7 ms |
| /admission/application-form | 91 | 93 | 100 | 100 | 3494 ms | 0.000 | 9 ms |
| /admission/holiday-club | 86 | 96 | 100 | 100 | 4129 ms | 0.000 | 6 ms |
| /admission/our-fees | 88 | 96 | 100 | 100 | 3869 ms | 0.000 | 7 ms |
| /admission/prospectus | 89 | 96 | 100 | 100 | 3718 ms | 0.000 | 7 ms |
| /blog | 92 | 96 | 100 | 100 | 3386 ms | 0.000 | 6 ms |
| /branches/borehamwood | 90 | 96 | 100 | 100 | 3598 ms | 0.000 | 7 ms |
| /branches/harrow | 90 | 96 | 100 | 100 | 3640 ms | 0.000 | 6 ms |
| /branches/northwood | 91 | 96 | 100 | 100 | 3527 ms | 0.000 | 7 ms |
| /branches/pinner | 89 | 96 | 100 | 100 | 3686 ms | 0.000 | 6 ms |
| /branches/pinner-green | 90 | 96 | 100 | 100 | 3671 ms | 0.000 | 7 ms |
| /contact | 92 | 97 | 96 | 100 | 3413 ms | 0.000 | 4 ms |
| /forest-school | 78 | 96 | 100 | 100 | 6022 ms | 0.000 | 8 ms |
| /gallery | 91 | 93 | 96 | 100 | 3444 ms | 0.000 | 11 ms |
| /home-learning | 89 | 96 | 100 | 100 | 3685 ms | 0.000 | 6 ms |
| /nursery-store | 92 | 96 | 96 | 100 | 3417 ms | 0.000 | 6 ms |
| /our-charities | 88 | 96 | 100 | 100 | 3912 ms | 0.000 | 7 ms |
| /our-team | 86 | 96 | 100 | 100 | 4174 ms | 0.000 | 10 ms |
| /why-montessori | 89 | 96 | 100 | 100 | 3683 ms | 0.000 | 7 ms |

### Before vs after (averages, against the same fresh local build)

| Metric | Mobile before | Mobile after | Desktop before | Desktop after |
|---|---:|---:|---:|---:|
| Performance | 88 | **89** | 99 | **100** |
| Accessibility | 94 | **96** | 94 | **96** |
| Best Practices | 99 | **99** | 100 | **100** |
| SEO | 100 | **100** | 95 | **100** |
| Worst-case CLS | 0.276 (/nursery-store) | **0.000** | 0.108 | **0.000** |

---

## Fixes shipped

All edits scoped to the public site — no admin / account / API code touched.

| Issue | File(s) | Change |
|---|---|---|
| Decorative `<img>` flagged for missing `aria-hidden` | `app/forest-school/page.tsx` | Added `aria-hidden="true"` |
| Toggle switch with no accessible name (6 routes) | `components/ui/FeeCalculatorCard.tsx` | Added `aria-label="Toggle early bird 7:30am drop-off"` |
| `<table>` data cells missing row/column header association | `app/admission/application-form/ApplicationFormClient.tsx` | First col now `<th scope="row">`; column heads now `scope="col"`; empty cell gets `sr-only` "Session" label |
| "Pick size" button — visible label differed from `aria-label` | `components/store/StoreClient.tsx` | `aria-label="Pick a size first"` → `"Pick size first"` (now starts with visible text, satisfies accessible-name-must-contain-visible-label) |
| Like button — touch target 16×16, below 24×24 minimum | `components/blog/BlogClient.tsx` | Wrapper now `h-10 w-10` with `-m-2` so the visible icon size is unchanged but the hit area is 40×40 |
| /contact, /footer — 404 spam in console from prefetching `/privacy`, `/terms`, `/trading-terms` | `components/contact/ContactPageClient.tsx`, `components/layout/Footer.tsx` | Added `prefetch={false}` on Links to unbuilt routes |
| /nursery-store — CLS 0.276 mobile / 0.108 desktop (product grid loading shifted footer down) | `components/store/StoreClient.tsx` | Reserved space with `min-h-[40rem]` on the product-grid section |
| Site-wide low-contrast text (`#988c86`, `#887a73`, `#7e7068`, `#b9aea7`, etc.) — 31 nodes failing | `styles/globals.css` (`--muted: 0.55 → 0.85`), 20 component files | Bumped every `text-[rgba(90,74,66,0.X)]` where X < 0.85 to 0.85 (139 occurrences) — keeps the same hue, just enough opacity for AA |
| Header trust-bar tagline (`"in London"` etc.) failing contrast | `components/layout/Header.tsx` | `text-[rgba(90,74,66,0.62)]` → `text-[#6e5a4e]` (solid, ~6.5:1) |
| Workspace-root warning ("multiple lockfiles") | `next.config.mjs` | Added `outputFileTracingRoot: __dirname` |
| Image optimization | 120 new `.webp` siblings under `public/` (originals retained) | Ran `npm run optimize:images` after user-approved dry-run |

### New infrastructure (not visible in the UI)

- `frontend/scripts/lh-discover-routes.cjs` — filesystem walk of `app/`
  emitting the 20-URL list, with `(group)` segments stripped and
  `/admin|/account|/cart|/checkout|/login|/register|/auth` plus all
  dynamic segments excluded.
- `frontend/scripts/lh-urls.cjs` — wraps the discovery in
  `buildUrls()` (used by both LHCI configs).
- `frontend/scripts/lh-summarize.cjs` — prints score tables from the JSON
  reports.
- `frontend/scripts/lh-failures.cjs` — surfaces failing audits across all
  routes, sorted by how many routes each affects.
- `frontend/scripts/lh-audit-details.cjs` — drills into a single audit on
  a single report (full `details.items` JSON).
- `frontend/lighthouserc.mobile.cjs` / `frontend/lighthouserc.desktop.cjs`
  — replace the old hardcoded `lighthouserc.json` (which had `/cart`,
  `/login`, `/register` in its URL list).
- `frontend/package.json` — `lh:routes`, `lh:mobile`, `lh:desktop`,
  `lh:all`.

---

## Remaining issues (documented, not fixed)

These are real, but none can be fixed safely without changing the design or
adding pages outside the audit's scope.

1. **Color-contrast still affects 19/20 mobile routes** — but only on
   *brand-coloured* text (the cyan, salmon-pink and gold accents:
   `#5fc8c7`, `#cf7d9c`, `#ef8cab`, `#f0bd55`, `#7fd8d2` on the cream
   background). Each of these is part of the Montessori pastel system and
   used as decorative or hierarchical accent — changing them would shift
   the brand. The earlier large-population offenders (muted ink text) are
   fixed; what remains is the brand-colour long tail. The A11y average
   plateau at 96 reflects this trade-off.

2. **`font-size` flagged on /contact, /gallery, /nursery-store** — the
   fee-calculator pill labels and footer fine print use 10.4 px / 10.9 px
   text. These are intentional secondary-info sizes; bumping them site-
   wide changes the visual hierarchy.

3. **`target-size` on /admission/application-form, /contact, /gallery** —
   the application-form checkboxes (`h-3.5 w-3.5`), Leaflet's marker
   icons on the contact map (third-party, 36 px but partially obscured by
   the cluster), and a tag chip on /gallery. The like-button fix on /blog
   is in; these three are deeper UI changes.

4. **/forest-school mobile LCP ~6 s** — the largest contentful element on
   that page is a paragraph of intro copy below a tall hero. Pushing this
   below 2.5 s would require splitting the page into a smaller
   above-the-fold shell — out of scope.

5. **`/privacy`, `/terms`, `/trading-terms` are 404** — referenced from
   the footer and contact form. The current fix silences the audit (no
   prefetch), but the links still 404 if clicked. Stubs should be created
   when content is ready.

6. **`legacy-javascript` / `unused-css` / `unused-javascript`** — these
   are diagnostic-only Lighthouse callouts and don't reduce the
   Performance score directly. They reflect Next 16's default browserslist
   and Tailwind's full CSS bundle. Mitigating them properly means a
   browserslist tightening and per-route CSS extraction — substantial
   work, deferred.

---

## Files changed

```
frontend/app/admission/application-form/ApplicationFormClient.tsx
frontend/app/blog/[slug]/BlogPostClient.tsx
frontend/app/cart/CartClient.tsx
frontend/app/forest-school/page.tsx
frontend/app/home-learning/ContactForm.tsx
frontend/app/home-learning/LightboxGallery.tsx
frontend/app/home-learning/page.tsx
frontend/app/admission/holiday-club/page.tsx
frontend/app/admission/page.tsx
frontend/app/our-team/page.tsx
frontend/app/nursery-store/[slug]/ProductDetailClient.tsx
frontend/components/blog/BlogClient.tsx
frontend/components/contact/BranchMap.tsx
frontend/components/contact/ContactPageClient.tsx
frontend/components/gallery/GalleryPageClient.tsx
frontend/components/layout/Footer.tsx
frontend/components/layout/Header.tsx
frontend/components/store/StoreClient.tsx
frontend/components/ui/FeeCalculatorCard.tsx
frontend/components/ui/LightboxGallery.tsx
frontend/components/ui/chat/ChatBotInput.tsx
frontend/components/ui/chat/ChatBotLeadForm.tsx
frontend/lighthouserc.desktop.cjs           # new
frontend/lighthouserc.mobile.cjs            # new
frontend/lighthouserc.json                  # deleted
frontend/next.config.mjs
frontend/package.json
frontend/public/**/*.webp                   # 120 new sibling files
frontend/scripts/lh-audit-details.cjs       # new
frontend/scripts/lh-discover-routes.cjs     # new
frontend/scripts/lh-failures.cjs            # new
frontend/scripts/lh-summarize.cjs           # new
frontend/scripts/lh-urls.cjs                # new
frontend/styles/globals.css
```

---

## Recommended follow-ups

1. **Stub the `/privacy`, `/terms`, `/trading-terms` routes** even with
   placeholder content — closes the footer link gap and lets us drop the
   `prefetch={false}` workaround.
2. **Audit the brand accent colours** (`#5fc8c7`, `#cf7d9c`, `#ef8cab`,
   `#f0bd55`) on cream — either darken them ~10 % or only use them at
   ≥18 pt / bold (where 3:1 satisfies AA). This is the only way to push
   A11y past 96.
3. **Critical-CSS extraction or per-route Tailwind purge** — would cut
   render-blocking CSS and pull mobile LCP under 2.5 s on the heavy
   pages (homepage, forest-school, our-team).
4. **Tighten the browserslist** to drop modern-browser legacy polyfills
   from the bundle — silences `legacy-javascript`.
5. **Wire `npm run lh:all` into CI** (run against a built artefact, fail
   the job if Perf or A11y drops below a threshold).
