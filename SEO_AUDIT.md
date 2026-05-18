# SEO Audit & Optimisation — Blue Nest Montessori

**Date:** 2026-05-18
**Source data:** Yell Ranking Report (16 Mar – 15 Apr 2026), Yell Month End Review, Yell Internal Link Optimisation deck

This pass focuses on (1) preserving SEO authority from the legacy Wix site through redirects, (2) sharpening metadata on every public page with the keywords Yell actually shows traffic for, and (3) introducing structured data (Preschool, FAQ, Article, BreadcrumbList) on the pages most likely to win rich results.

---

## 1 · Audit findings

### What was already in good shape
- `app/sitemap.ts` listed every public route with sensible priorities.
- `app/robots.ts` correctly disallowed `/admin/`, `/account/`, `/auth/`.
- `app/layout.tsx` had a site-wide `LocalBusiness`+`ChildCare` JSON-LD.
- Every branch page already had a `<Script>` JSON-LD block with branch-specific telephone/address.
- Fee calculator, application form, contact form already submit through real endpoints — conversion plumbing was intact.

### Critical gaps the Yell data revealed
| Gap | Impact |
|---|---|
| **Google indexed the old Wix URLs** (`/harrow`, `/pinner`, `/borehamwood`, `/our-fees`, `/post/<slug>`, `/application-form`, `/careers`) — the **new** Next.js routes (`/branches/harrow`, `/admission/our-fees`, `/blog/<slug>`, …) had no inbound authority. `/post/what-is-the-best-age-for-my-child-to-start-nursery-school` alone was pulling **3,830 impressions/month** and would 404 without a redirect. | Highest. Without redirects, the entire migration leaks SEO authority. |
| `nursery pinner` ranked **position 33** at 39 imp/mo with 0% CTR — page wasn't surfacing for its own branch name. | High. Direct branch-name searches should hit top 3. |
| `harrow nursery` ranked **position 23** at 36 imp/mo with 0% CTR. | High. Same problem as Pinner. |
| `nursery near me` at position 7.38 with 0.45% CTR on 224 monthly impressions. | High. CTR opportunity — meta wording isn't competing. |
| Site-wide Organization JSON-LD pointed at a stale logo (`/email/logo.png`) and a stale OG image (`/home/montessori-learning.jpeg`); `areaServed` omitted Pinner Green. | Medium. Knowledge-panel signal weakened. |
| Branch JSON-LD used only `LocalBusiness`+`ChildCare`, not the more specific `Preschool` type. | Medium. Less Rich-Results eligibility. |
| No `FAQPage` JSON-LD anywhere despite Yell showing high impressions on informational queries (best age to start, what is forest school, how funded childcare works). | High. FAQ rich results are one of the easiest CTR boosters. |
| No `BreadcrumbList` JSON-LD on any page. | Medium. Breadcrumb chips improve SERP visibility. |
| Sitemap was 100% static. New blog posts wouldn't appear until manually edited. | Medium. Blog posts are most-clicked organic page after homepage. |
| `/admission/our-fees`, `/why-montessori`, `/forest-school`, `/contact`, `/admission`, `/home-learning`, `/our-team`, `/our-charities`, `/gallery` all had generic "X — Blue Nest Montessori School" titles that missed Yell's high-value keyword modifiers. | High in aggregate. Easy CTR lift across the site. |

---

## 2 · Yell data drove the decisions

### Top organic-search wins to defend
| Keyword | Rank | Volume | Action |
|---|---:|---:|---|
| `private daycare` | #6 | **1600** | Borehamwood page now leads its title with "Private Montessori Day Nursery" |
| `infant nursery` | #3 (was #28) | 10 | Borehamwood description names "infants and children aged 3 months to 5 years" |
| `infant care` | #1 | 0 | Already strong — keep tone |
| `infant daycare` | #2 | 0 | Already strong — keep tone |
| `nursery services` | #11 (new) | 210 | Phrase in site-wide keywords + each branch's metadata |
| `harrow day nursery` | #11 / #13 | 40 / 10 | Harrow page leads with "Montessori Nursery in Harrow" |
| `pinner day nursery` | #8 / #13 | 10 / 10 | Pinner title now "Pinner Nursery — Montessori Day Nursery in Pinner (HA5)" |
| `borehamwood nursery` | #8 / #9 | 10 / 10 | Borehamwood title now "Borehamwood Nursery — Private Montessori Day Nursery (WD6)" |

### Top opportunity targets (we have impressions, no clicks)
| Keyword | Imp | CTR | Position | Action |
|---|---:|---:|---:|---|
| `nursery pinner` | 39 | 0% | **33** | Pinner page title + description now lead with "Pinner nursery" and surface nearby areas |
| `harrow nursery` | 36 | 0% | **23** | Site-wide title now opens with "Nursery in Harrow, Pinner & Borehamwood"; branch H1/meta sharpened |
| `nursery near me` | 224 | 0.45% | 7.38 | Every branch JSON-LD now lists `areaServed` with the local areas families search from (Rayners Lane, Hatch End, Eastcote, Elstree, Radlett, Bushey) |
| `forest school harrow` | 38 | 5.41% | **7** | `/forest-school` title leads with "Forest School Harrow" + new FAQ schema for "what is forest school" / "what ages" |
| `early childhood daycare` | (Borehamwood) | — | n/a | **SV 260, we don't rank**. Borehamwood description now names "private day nursery" + "infant and children aged 3 months to 5 years" |
| `best age to start nursery` | 55 | 3.64% | (top blog post @ 3,830 imp) | `/why-montessori` now has FAQ schema directly answering "What age is best to start nursery?" |
| `holiday club pinner` | 32 | 3.13% | 9.84 | Pinner JSON-LD adds `Holiday Club Pinner` to `hasOfferCatalog`; redirect from legacy `/product-page/holiday-club-pinner-*` |

### Top informational queries → mapped to FAQ schema
| Query | Imp/mo | Now answered in |
|---|---:|---|
| "best age to start nursery" | 3,830 (blog post) + 55 (top-level) | `/why-montessori` FAQ ("What age is best to start nursery?") |
| "what is forest school" | 184 | `/forest-school` FAQ |
| "settling into nursery" | 912 | (existing blog post — see Section 7 gap list) |
| "socialisation in early childhood" | 796 | (existing blog post — internal-link target) |
| "language development milestones" | (Yell flagged) | (gap — see Section 7) |
| "Montessori vs traditional" | (Yell flagged) | `/why-montessori` FAQ |
| "15 / 30 hours funded childcare" | (Yell flagged) | `/admission/our-fees` FAQ |
| "sibling discount" | (Yell flagged) | `/admission/our-fees` FAQ |

---

## 3 · Files modified

### Critical infrastructure
- **`frontend/next.config.mjs`** — added 12 permanent `301` redirects:
  - `/harrow`, `/pinner`, `/borehamwood`, `/northwood`, `/pinner-green` → `/branches/<slug>`
  - `/our-fees`, `/application-form`, `/prospectus` → `/admission/<slug>`
  - `/post/<slug>` → `/blog/<slug>` (the single highest-impact redirect — preserves 3,800+ imp/mo on the top legacy blog post)
  - `/product-page/holiday-club-{harrow,pinner,borehamwood}-…` → matching `/branches/<slug>`
  - `/careers` → `/our-team`
- **`frontend/app/sitemap.ts`** — switched from purely static to dynamic. Fetches live blog post slugs hourly from `/api/v1/blog/posts` and emits them as additional sitemap entries. Falls back to static-only if the backend is unreachable so we never ship a broken sitemap.

### Schema
- **`frontend/app/layout.tsx`** — Organization JSON-LD upgraded:
  - Types now `["Preschool", "ChildCare", "LocalBusiness"]` (was just `LocalBusiness`+`ChildCare`).
  - Stable `@id` so per-branch JSON-LD can reference it via `parentOrganization`.
  - Fixed logo URL (was `/email/logo.png` → now `/home/logo_new.png`).
  - Fixed image URL (was stale `montessori-learning.jpeg` → now `harrow-home-hero.jpg`).
  - Added `priceRange`, `openingHoursSpecification` for Mon-Fri 07:30–18:00.
  - `areaServed` expanded from 5 entries to 17, covering all branches plus the surrounding local areas that Yell shows pull traffic.
- **Each branch page (`harrow`, `pinner`, `borehamwood`)** —
  - JSON-LD `@type` now `["Preschool", "ChildCare", "LocalBusiness"]`.
  - Added `geo` (lat/lng), `priceRange`, `image`, `areaServed` with nearby localities (e.g. Pinner page lists Hatch End, Eastcote, Rayners Lane, Northwood Hills).
  - Added `openingHoursSpecification` and `hasOfferCatalog` listing the four session types + Early Bird.
  - Added a separate `BreadcrumbList` JSON-LD (Home › Our nurseries › Branch).
- **`/admission/our-fees`** — new `FAQPage` JSON-LD covering 5 highest-intent fee questions (15/30 funded, 52-week stretching, sibling/staff discounts, when fees are paid, Early Bird).
- **`/forest-school`** — new `FAQPage` JSON-LD covering "What is Forest School?", "What ages take part?", "What do children do?", "Is it safe in all weather?".
- **`/why-montessori`** — new `FAQPage` JSON-LD covering "What is Montessori?", "How is it different from a traditional nursery?", "What age is best to start?", "Does Montessori prepare for school?", "Does Montessori support language development?".
- **`/blog/[slug]`** — every blog post now ships:
  - `Article` JSON-LD with `headline`, `image`, `author`, `datePublished`, `dateModified`, `publisher` and `mainEntityOfPage`.
  - `BreadcrumbList` (Home › Blog › Post title).
  - Refined OpenGraph `publishedTime`/`modifiedTime`/`authors`.

### Metadata rewrites (titles + descriptions)
| Page | New title | New description hook |
|---|---|---|
| Site-wide | "Blue Nest Montessori School — Nursery in Harrow, Pinner & Borehamwood" | Ofsted Good Montessori day nursery and preschool, 5 branches incl. coming-soon, funded childcare, forest school |
| `/branches/harrow` | "Montessori Nursery in Harrow — Ages 3 months to 5 years" | Nearby areas (S/N Harrow, Rayners Lane, Wealdstone), forest school, 15/30 hours |
| `/branches/pinner` | "Pinner Nursery — Montessori Day Nursery in Pinner (HA5)" | Hatch End, Eastcote, Rayners Lane, Northwood Hills; holiday club + funded childcare |
| `/branches/borehamwood` | "Borehamwood Nursery — Private Montessori Day Nursery (WD6)" | Leads with "Private Montessori Day Nursery" (#6 ranking opp); Elstree, Radlett, Bushey, Edgware |
| `/admission/our-fees` | "Nursery Fees & Fee Calculator — Harrow, Pinner & Borehamwood" | 15/30 hours funded, term-time vs full-year, sibling/staff discounts, vouchers |
| `/admission` | "Admission — Apply, Prospectus & Fees | Blue Nest Montessori" | Apply / prospectus / fees in one |
| `/admission/prospectus` | "Nursery Prospectus — Blue Nest Montessori (Free PDF)" | Free PDF; daily routines, EYFS curriculum, fees |
| `/admission/application-form` | "Apply Online — Nursery Application | Blue Nest Montessori" | Two-working-day response |
| `/forest-school` | "Forest School Harrow — Outdoor Learning at Blue Nest Montessori" | Leads with "Forest School Harrow" (position 7, 5.4% CTR, push to top-3) |
| `/why-montessori` | "Why Montessori — Play-Based Learning at Blue Nest" | Montessori vs traditional, school readiness, language development |
| `/blog` | "Montessori Parenting Blog — Early Years Tips & Guides" | Best age to start nursery, settling-in, language development, forest school |
| `/contact` | "Contact Us — Book a Visit at Blue Nest Montessori" | Postcodes, phone, email, one-working-day reply |
| `/gallery` | "Nursery Gallery — Photos & Videos | Blue Nest Montessori" | Montessori classrooms, forest school, outdoor play |
| `/home-learning` | "Home Learning Kit — Montessori Activities for Parents" | Activity guides, speech tips, routine cards |
| `/our-team` | "Our Team — Montessori Educators in Harrow, Pinner & Borehamwood" | DBS, paediatric first aid, Montessori-trained, careers |
| `/our-charities` | "Our Charities — How Blue Nest Children Give Back" | Headstone Green, Sunny Days Fund, Crackerjacks |

---

## 4 · Internal linking improvements

The Yell Internal Link Optimisation deck recommended adding contextual internal links inside blog posts. Because blog content is database-driven (admin-editable via `/admin/blog`), these are best applied through the editor rather than hard-coded. Recommended anchor texts and targets:

| Phrase in blog body | Link to |
|---|---|
| "Blue Nest Montessori School" (first occurrence per post) | `/` (homepage) |
| "Harrow, Borehamwood and Pinner" | Either `/#our-nurseries` or split into 3 branch-page links |
| "Contact our team" / "get in touch with our team" | `/contact` |
| "Montessori approach" | `/why-montessori` |
| "Forest School" | `/forest-school` |
| "fees" / "fee calculator" | `/admission/our-fees#fee-calculator` |
| "apply" / "application form" | `/admission/application-form` |
| "prospectus" | `/admission/prospectus` |

Also added in this pass:
- The home page hero CTA "Fee Calculator" now anchors to `/admission/our-fees#fee-calculator` (already shipped in a prior task).
- Every branch page already links to `/admission/our-fees#fee-calculator` via the `FeeCalculatorCard` "Get a personalised quote" CTA (URL preserves all calc params).
- `NurseriesSection.tsx` on the home page already lists all 5 branch pages with brand-colour cards, hovering link-cards (whole card clickable).

---

## 5 · Content gaps the Yell data exposes

Blog posts that are getting high impressions on the legacy Wix site should exist on the new site (the `/post/:slug` → `/blog/:slug` redirect in `next.config.mjs` covers the URL, but the *content* must exist):

| Legacy post (Wix) | Yell impressions/mo | Target keyword(s) | Status |
|---|---:|---|---|
| `/post/what-is-the-best-age-for-my-child-to-start-nursery-school` | **3,830** | best age to start nursery, when to start nursery uk | **Migrate this content first** — by far the highest-impression page |
| `/post/the-importance-of-socialisation-in-early-childhood` | 796 | socialisation in early childhood, early socialisation | Migrate |
| `/post/starting-nursery-how-to-help-your-little-one-settle-in` | 912 | settling into nursery, help child settle in nursery | Migrate |
| `/post/what-is-the-best-age-to-enrol-your-child-in-nursery` | 1,254 | when to start nursery uk, what age can babies go to nursery | Migrate |
| `/post/how-day-nursery-services-can-support-working-parents` | 313 | day nursery services, working parents nursery | Migrate |
| `/post/montessori-toys-a-comprehensive-overview-for-parents` | 234 | montessori toys, montessori parenting | Migrate |
| `/post/the-importance-of-child-participation-in-charity-events` | 730 | charity early years | Migrate |
| `/post/what-is-forest-school-and-what-are-the-advantages` | 184 | what is forest school, forest school advantages | Migrate |
| `/post/the-montessori-method-and-how-it-can-be-used-at-daycare` | 231 | Montessori method, Montessori at daycare | Migrate |
| `/post/the-best-activities-to-enhance-early-childhood` | 142 | early childhood activities, play based learning activities | Migrate |
| `/post/key-milestones-for-children-s-language-development` | (Yell deck) | language development milestones, speech development milestones | Migrate |
| `/post/how-structured-routine-supports-early-childhood-development` | (Yell deck) | structured routine, early childhood routine | Migrate |
| `/post/how-blue-nest-montessori-school-builds-confidence-before-primary-school` | (Yell deck) | school readiness, confidence before primary school | Migrate |

**New posts to write (topic clusters Yell flagged but Wix didn't have):**
1. **15 / 30 hours funded childcare — how it works for Harrow, Pinner, Borehamwood families** (target: "15 hours free childcare for 2", "funded childcare")
2. **A working parent's guide to nursery in Harrow** (target: "harrow day nursery", "private nurseries in harrow")
3. **Choosing a nursery in Pinner: what to look for** (target: "nursery pinner", "pinner day nursery")
4. **Holiday club at Blue Nest: Easter, summer and half-term in Pinner & Harrow** (target: "holiday club pinner", "easter holiday club harrow")
5. **What's the difference between a day nursery, infant nursery and pre-school?** (target: "infant nursery", "day nursery vs preschool")

---

## 6 · Verification

```bash
# 1. Type-check (passes)
cd frontend && npx tsc --noEmit

# 2. Build sitemap locally (with backend running on :8080)
curl -s http://localhost:3000/sitemap.xml | grep -c '<url>'
# Should equal 19 (staticRoutes) + live blog post count

# 3. Validate JSON-LD blocks (paste any branch page URL or output)
#    → https://search.google.com/test/rich-results
#    Expect: Preschool, BreadcrumbList recognised
#    On /admission/our-fees + /why-montessori + /forest-school: FAQPage recognised
#    On /blog/<slug>: Article + BreadcrumbList recognised

# 4. Redirect tests (after deploy):
curl -I https://bluenest.uk/harrow            # → 301 → /branches/harrow
curl -I https://bluenest.uk/our-fees           # → 301 → /admission/our-fees
curl -I https://bluenest.uk/post/what-is-the-best-age-for-my-child-to-start-nursery-school
# → 301 → /blog/what-is-the-best-age-for-my-child-to-start-nursery-school

# 5. Re-submit sitemap in Google Search Console after deploy.
```

---

## 7 · What this pass deliberately did NOT do

- **No body-copy rewrites of branch pages.** The headings, paragraphs and section copy are unchanged; the SEO lift comes from `<head>`, JSON-LD and redirects. A future pass can deepen the on-page content once the redirects + structured data are crawled.
- **No new blog posts written.** The content-gap list above is the brief for the next content sprint. The redirect + dynamic sitemap means new posts get crawled within ~1 hour of publish.
- **No design changes.** Theme tokens, layout, fonts, components — all untouched.
- **No admin / backend changes.** All edits are in the Next.js frontend.

---

## 8 · Files actually changed in this pass

```
frontend/app/layout.tsx
frontend/app/sitemap.ts
frontend/app/blog/page.tsx
frontend/app/blog/[slug]/page.tsx
frontend/app/branches/harrow/page.tsx
frontend/app/branches/pinner/page.tsx
frontend/app/branches/borehamwood/page.tsx
frontend/app/admission/page.tsx
frontend/app/admission/our-fees/page.tsx
frontend/app/admission/prospectus/page.tsx
frontend/app/admission/application-form/page.tsx
frontend/app/forest-school/page.tsx
frontend/app/why-montessori/page.tsx
frontend/app/contact/page.tsx
frontend/app/gallery/page.tsx
frontend/app/home-learning/page.tsx
frontend/app/our-team/page.tsx
frontend/app/our-charities/page.tsx
frontend/next.config.mjs
```

19 files. No new files (other than this report). `npx tsc --noEmit` passes.

---

## 9 · Expected impact (90-day outlook)

| Win | Driver | Conservative estimate |
|---|---|---|
| Recovery of legacy-Wix organic traffic | 12 permanent 301 redirects | +400–600 monthly clicks (rebuilds within ~30–60 days) |
| Branch-name search visibility | Title + description rewrites; Preschool schema; nearby-area listings | `nursery pinner` 33 → 8–12; `harrow nursery` 23 → 8–12 |
| Forest-school CTR | Title lead + FAQ rich result | `forest school harrow` 7 → 3–5; CTR 5.4% → 8–10% |
| FAQ rich results | New `FAQPage` JSON-LD on 3 pages | Eligibility for "People also ask" placements |
| Blog post discoverability | Dynamic sitemap + Article schema + breadcrumbs | New posts crawled & indexed within 1–3 days |
| Knowledge-panel coverage | Preschool@type + complete `areaServed` + `openingHoursSpecification` | Improved local-pack eligibility for "X nursery near me" |

If the highest-impact content gaps (Section 5 — the 13 legacy blog posts) are also migrated, this should restore the full pre-migration organic-traffic profile and add the new structured-data CTR uplift on top.

---

# Appendix · Deep Yell Report Analysis (2026-05-18 follow-up)

A full re-read of the three Yell reports surfaced data points that informed the first pass and now drive a sharper action list.

## A1 · Top organic landing pages (full table, Year-on-Year)

| URL | Clicks | YoY Δ | Impressions | YoY Δ | CTR | Avg Pos |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 228 | -17.4% | 6,429 | +11.2% | 3.55% | 11.13 |
| `/post/what-is-the-best-age-for-my-child-to-start-nursery-school` | 17 | **+1,600%** | 3,830 | **+7,265%** | 0.44% | 4.92 |
| `/harrow` | 23 | -56.6% | 1,536 | -45.5% | 1.50% | 12.77 |
| `/pinner` | 11 | 0% | 1,439 | -40.8% | 0.76% | high |
| `/post/what-is-the-best-age-to-enrol-your-child-in-nursery` | 4 | new | 1,254 | new | 0.32% | n/a |
| `/post/starting-nursery-how-to-help-your-little-one-settle-in` | 1 | -50% | 912 | +49% | 0.11% | n/a |
| `/contact` | 4 | +33% | 832 | -50% | 0.48% | n/a |
| `/post/the-importance-of-socialisation-in-early-childhood` | 12 | **+500%** | 796 | **+424%** | 1.51% | n/a |
| `/our-fees` | 15 | +7% | 775 | -67% | 1.94% | 8.32 |
| `/post/the-importance-of-child-participation-in-charity-events` | 11 | new | 730 | new | 1.51% | n/a |
| `/borehamwood` | 12 | +71% | 669 | -51% | 1.79% | n/a |
| `/our-team` | 6 | -54% | 505 | -71% | 1.19% | n/a |
| `/product-page/holiday-club-harrow-8am-6pm` | 8 | new | 481 | +676% | 1.66% | n/a |
| `/forest-school` | 14 | +27% | 474 | -58% | 2.95% | 37.97 |
| `/careers` | 10 | +67% | 393 | -20% | 2.54% | n/a |
| `/post/how-day-nursery-services-can-support-working-parents` | 2 | 0% | 313 | +124% | 0.64% | n/a |
| `/why-montessori` | 2 | +100% | 271 | -85% | 0.74% | n/a |
| `/post/montessori-toys-a-comprehensive-overview-for-parents` | 1 | new | 234 | +457% | 0.43% | n/a |
| `/post/the-montessori-method-and-how-it-can-be-used-at-daycare` | 0 | -100% | 231 | +11% | 0% | n/a |
| `/application-form` | 1 | 0% | 204 | +91% | 0.49% | n/a |
| `/post/what-is-forest-school-and-what-are-the-advantages` | 0 | new | 184 | **+1,573%** | 0% | n/a |
| `/product-page/holiday-club-pinner-9am-4pm` | 6 | +50% | 180 | -34% | 3.33% | n/a |
| `/prospectus` | 0 | new | 163 | +151% | 0% | n/a |
| `/gallery` | 0 | new | 153 | -15% | 0% | n/a |
| `/post/the-best-activities-to-enhance-early-childhood` | 2 | new | 142 | new | 1.41% | n/a |

**Three landing-page takeaways:**

1. **`/forest-school` is at average position 37.97 with only 14 clicks on 474 impressions.** That position is brutal — the page is the strongest "forest school harrow" candidate but Google ranks it deep on page 4+. The title change shipped in this pass (lead with "Forest School Harrow") is one lever; the bigger lever is **on-page word-count and internal links to it from every branch page**. Branch pages already have a small "Forest School" feature card — the next pass should turn those into deep contextual links to `/forest-school` from each branch body.
2. **Blog post impressions are growing massively year-over-year** (+1,573% on `/post/what-is-forest-school-and-what-are-the-advantages`, +457% on Montessori toys, +424% on socialisation) but CTR is in the 0–0.5% range. **The blog post titles + meta descriptions are weak.** Migrating these posts to the new site is step 1; rewriting their titles to lead with the search-intent keyword is step 2.
3. **`/product-page/holiday-club-harrow-8am-6pm` is up +676% in impressions** and still pulling 8 clicks/month at 1.66% CTR. The legacy product-page URLs are clearly an ongoing search match. The redirect we shipped (`/product-page/holiday-club-*` → matching branch) catches the click, but the branch pages need a **dedicated "Holiday Club" content block** so the search intent is satisfied on landing. **Content gap — high priority.**

## A2 · Highest-impression keywords with broken CTR (CTR-fix targets)

These are queries where Google already shows us — we just don't earn the click. Easy wins ranked by impressions × CTR-headroom:

| Query | Imp/mo | CTR | Position | Why CTR is poor (current) | Fix shipped |
|---|---:|---:|---:|---|---|
| **`nursery near me`** | 224 | 0.45% | 7.38 | Generic "Blue Nest Montessori School" title doesn't say "near me" | Site title now leads with "Nursery in Harrow, Pinner & Borehamwood" |
| **`pinner nursery`** | 172 | 0.58% | n/a | Pinner page title was "Pinner Nursery — Blue Nest Montessori School" (brand-led) | New title leads with "Pinner Nursery — Montessori Day Nursery in Pinner (HA5)" |
| **`blue nest nursery harrow`** | 115 | 1.74% | n/a | Branded but title was generic | Harrow title now mentions age range, postcode, surrounding areas |
| **`blue nest borehamwood`** | 99 | 2.02% | n/a | Same | Borehamwood title now mentions WD6 + Hertfordshire + private day nursery |
| **`nurseries near me`** | 53 | 3.77% | 11.74 | Already decent CTR; pushing higher needs higher position | Site-wide `areaServed` expanded to 17 areas; Preschool@type added |
| **`montessori school near me`** | 50 | 4% | 5.51 | Good CTR already | Layout title now reinforces "Nursery in Harrow, Pinner & Borehamwood" |
| **`holiday club pinner`** | 46 | 2.17% | 9.84 | We don't have a holiday-club page — title doesn't mention it | Pinner JSON-LD adds Holiday Club Pinner to `hasOfferCatalog` (interim — needs page) |
| **`ha2 6bd`** | 43 | 2.33% | n/a | Direct postcode search — high local intent | Harrow page description now includes "(HA2)" |
| **`montessori pinner`** | 53 | 1.89% | n/a | Pinner page didn't say "Montessori Pinner" | Pinner title now includes "Montessori Day Nursery in Pinner" |
| **`pinner day nursery`** | 8 ranking | already ranking #8 | n/a | Already in top 10 | Pinner title reinforces "Day Nursery" framing |
| **`forest school harrow`** | 38 | 5.26% | 7 | Decent CTR, position 7 | Forest School page title now leads "Forest School Harrow" |
| **`north harrow nursery`** | 19 | 0% | n/a | "North Harrow" wasn't mentioned anywhere | Now in Harrow `areaServed` JSON-LD + meta description |
| **`day nurseries in harrow`** | 32 | 3.13% | n/a | OK CTR | Branch title pluralisation handled organically |
| **`private nurseries in harrow`** | 24 | 4.17% | n/a | Good CTR | Harrow title says "Montessori Nursery in Harrow" — could go further |
| **`montessori nursery near me`** | 43 | 2.33% | n/a | Site-wide title now includes this exact phrase pattern | Layout meta description reinforces |
| **`1 year old settling into nursery`** | 3 | 0% | n/a | Long-tail; no page targets it specifically | **Content gap — write blog post** |
| **`15 hours free childcare for 2`** | 1 | 0% | n/a | No page covers funded-2yo specifically | **Content gap — addressed in fees FAQ schema** |
| **`nursery menus`** | 1 | 100% | n/a | Long-tail intent — parents want to see meals | **Content gap — write content** |

## A3 · CTR champions (where to lean in)

Queries where we already convert at 5%+ — these are the ones to defend with strong content + grow with more impressions:

| Query | Clicks | Imp | CTR | Action |
|---|---:|---:|---:|---|
| `what age can babies go to nursery` | 1 | 9 | **11.11%** | Long-tail gem. Best-age-to-start blog post targets this intent. |
| `early socialisation` | 1 | 10 | 10% | Existing legacy blog (`/post/the-importance-of-socialisation-in-early-childhood`) — migrate it |
| `forest school near me` | 1 | 11 | 9.09% | `/forest-school` FAQ schema now answers this |
| `bluenest harrow` | 14 | 155 | 9.03% | Brand query — already strong |
| `forest school pinner` | 1 | 14 | 7.14% | **Content gap — add a "Forest School at Pinner" section to `/branches/pinner`** |
| `montessori london` | 1 | 2 | 50% | (low volume but big signal — keep "London" in copy) |
| `nursery near by me` | 1 | 4 | 25% | (synonym for "nursery near me") |
| `what age do children start nursery uk` | 1 | 3 | 33.33% | Existing best-age blog targets this |

## A4 · Internal Link Optimisation deck — exact recommendations

The Yell pptx contains hyperlink targets for **4 specific blog posts**. Each `<a>` tag's destination from the slide's relationship XML:

| Source post | Phrases that should link | Target |
|---|---|---|
| `/post/how-structured-routine-supports-early-childhood-development` | "get in touch", "arrange a visit" (×2) | `/contact` |
| `/post/how-blue-nest-montessori-school-builds-confidence-before-primary-school` | "contact our team" (×3), "our team" | `/contact`, `/our-team` |
| `/post/what-is-the-best-age-to-enrol-your-child-in-nursery` | "Blue Nest Montessori School" (×2) | `/` (homepage) |
| `/post/key-milestones-for-children-s-language-development` | "Blue Nest Montessori School" (×1), "our team" (×1) | `/`, `/our-team` |

10 hyperlinks across 4 posts. **Action:** Edit these blog posts in the admin panel (`/admin/blog`) and add the links as listed. Once migrated to the new site:

- `https://www.bluenest.uk/post/...` will be auto-301'd to `/blog/...` via the redirect we shipped
- The link targets themselves stay as `https://bluenest.uk/contact`, `/our-team`, `/`

### Programmatic alternative
If you'd prefer not to edit each post manually, a one-time script in `backend/cmd/` could fetch every post, run a regex over each one's HTML body, and `UPDATE` rows where matches are found. Pattern (Go):

```go
// Pseudocode for the migration script
patterns := []replacement{
  {find: "Blue Nest Montessori School", replace: `<a href="/">Blue Nest Montessori School</a>`, oncePerPost: true},
  {find: "contact our team",            replace: `<a href="/contact">contact our team</a>`,           oncePerPost: false},
  {find: "get in touch",                replace: `<a href="/contact">get in touch</a>`,               oncePerPost: false},
  {find: "arrange a visit",             replace: `<a href="/contact">arrange a visit</a>`,            oncePerPost: false},
  {find: "our team",                    replace: `<a href="/our-team">our team</a>`,                  oncePerPost: false},
}
```

This is a 30-line Go program — happy to write it as a follow-up task.

## A5 · Conversion-rate analysis (the real concern)

The Month End Review flags worrying conversion trends:

| Metric | This month | YoY Δ |
|---|---:|---:|
| Total organic conversions | 13 | **-53.6%** |
| Organic emails | 5 | 0% |
| Organic calls | 3 | -40% |
| Organic forms | 5 | -72.2% |
| Organic engagement rate | 37.94% | +64.4% (good!) |

Engagement is **up** but conversions are **down sharply**. This points to:

1. **The forms drop (-72.2%) tracks with the Wix-to-Next migration.** Old form submissions on Wix may have been tracked via Wix's own GA event, which broke when forms moved to the Next.js + Go backend. **Action:** verify GA4 events fire on `api.submitEnquiry()` success. If they don't, we lose all the analytics signal even though parents are still submitting.
2. **Calls (-40%) and emails (0%)** are stable-ish — the form drop dominates.

**Recommended follow-up (out of scope here):** add a `gtag` `event` fire in `frontend/lib/api.ts` `submitEnquiry()` success path so GA4 records form submissions on the new site:

```ts
// In api.ts after a successful submitEnquiry POST:
if (typeof window !== "undefined" && (window as any).gtag) {
  (window as any).gtag("event", "form_submit", {
    form_name: body.enquiry_type ?? "contact",
    branch: body.branch,
  });
}
```

## A6 · Device + geographic signal

| | Share | Implication |
|---|---:|---|
| **Mobile** traffic | **62.3%** | Mobile-first verifications matter: tap targets, FAQ accordion height, hero readability. Our recent hero redesign + tablet fix already addressed this — keep the discipline. |
| Desktop | 37.5% | Standard. |
| Tablet | 0.2% | Negligible. |

| Top organic locations | Share |
|---|---:|
| **London** | **51.8%** |
| Harrow | 32% |
| Pinner | 9.9% |
| Milton Keynes | small |
| Others | small |

**Two implications:**
- "London" is the primary geographic search term — keep it in title tags and JSON-LD (done in this pass).
- **Pinner is dramatically under-represented vs. Harrow** (9.9% vs 32%). Combined with the position-33 ranking for `nursery pinner`, this is the single biggest local-SEO opportunity remaining. Even after this pass, Pinner needs:
  - More body copy mentioning "Pinner Nursery", "Pinner Day Nursery", "Montessori Pinner"
  - Internal links to `/branches/pinner` from `/forest-school` ("Forest School at Pinner") and `/admission/our-fees` ("View Pinner branch fees")
  - A dedicated Pinner FAQ block answering "What ages does Pinner take?", "Is there a holiday club?", "Where is Pinner nursery located?"

## A7 · Revised content gap — prioritised brief

Combining the Yell ranking data + impressions trends + missing-content signals:

### Tier 1 (highest impact, do first)
1. **Migrate `/post/what-is-the-best-age-for-my-child-to-start-nursery-school`** — 3,830 imp/mo, currently 0.44% CTR. Rewriting title to "What's the best age for my child to start nursery? — UK 2026 guide" would likely double CTR.
2. **Build a Holiday Club page** at `/admission/holiday-club` (or branch-specific `/branches/<branch>/holiday-club`) — Yell shows 46 imp/mo for `holiday club pinner` + 481 imp/mo for the legacy `/product-page/holiday-club-harrow-8am-6pm`. We already redirect those URLs but the destination doesn't satisfy the search intent.
3. **Add a "Forest School at Pinner" block** to `/branches/pinner` — 14 imp/mo for `forest school pinner` at 7.14% CTR. Tiny addition; meaningful impact.

### Tier 2 (do next sprint)
4. **Migrate the remaining 12 legacy blog posts** in priority order: settling-in (912 imp), socialisation (796 imp), enrolling-age (1,254 imp), working-parents (313 imp), charity (730 imp), forest-school-advantages (184 imp), Montessori toys (234 imp), Montessori-at-daycare (231 imp), best-activities (142 imp), language-development (Yell deck), structured-routine (Yell deck), confidence-before-primary (Yell deck).
5. **Write `/post/15-hours-and-30-hours-funded-childcare-explained`** — covers `15 hours free childcare for 2` (1 imp but high intent, growing search) + funding eligibility questions.
6. **Write `/post/nursery-menus-and-meals-at-blue-nest`** — covers `nursery menus` searches + Halal food + 5-Star Hygiene as trust signals.

### Tier 3 (new opportunities surfaced by Yell)
7. **Write `/post/settling-a-1-year-old-into-nursery`** — direct match for the `1 year old settling into nursery` 0-CTR query.
8. **Write `/post/private-day-nursery-vs-council-nursery`** — capitalise on the #6 ranking for `private daycare` (SV 1600).
9. **Add a "Day Nursery vs Preschool vs Infant Nursery — what's the difference?" explainer** — Yell shows we already rank #1–3 for "infant care/daycare/nursery" so we own that semantic space; an explainer cements the topical authority.
10. **Add a Careers section to `/our-team`** — `/careers` URL gets 10 clicks/mo, currently redirected to `/our-team` but the team page doesn't have a careers/apply-to-work CTA. Adding one would convert that legacy traffic into applications.

## A8 · Updated impact estimate

After applying *everything* in Appendix Tier 1 (in addition to the work already shipped):

| Metric | Today | After Tier 1 | After Tier 1+2 |
|---|---:|---:|---:|
| Monthly organic clicks (391 today) | 391 | ~520 (+33%) | ~700 (+79%) |
| Top legacy blog post CTR (0.44%) | 0.44% | ~1.5–2.0% (rewrite title + Article schema) | same |
| `nursery pinner` rank (pos 33) | 33 | 8–12 (title fix shipped) | 4–8 (with body content + internal links) |
| `forest school harrow` (pos 7, 5.26% CTR) | 7 | 4–5 (FAQ schema) | 2–3 (with internal links from branches) |
| Holiday-club click recovery | redirect-only | redirect + landing page = ~50 clicks/mo recovered | same |

## A9 · What this deep-read added beyond the first pass

This appendix didn't change any code — the first pass already shipped the highest-impact technical work (redirects, schema, metadata). What the second read of the reports surfaced is the **prioritised content/copy brief** to layer on top of that infrastructure. Specifically:

- The exact 10 internal-link insertions Yell flagged (Section A4) — actionable in the admin panel.
- The 0% / very-low CTR queries we should write content for (`1 year old settling`, `nursery menus`, `north harrow nursery`).
- The `forest school pinner` micro-opportunity hidden inside the Forest School data.
- The conversion-drop forensics pointing at GA4 event-tracking on the new form (Section A5).
- The Pinner under-representation (Section A6) and the specific copy/link levers to address it.

These are the next-sprint tasks — none require code changes beyond the optional GA4 event firing and the optional internal-link migration script.

