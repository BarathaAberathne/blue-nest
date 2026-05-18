# Blog migration checklist

Source: 13 legacy Wix post slugs flagged in the Yell SEO audit.
Backend checked: `GET http://localhost:8080/api/v1/blog/posts` (Docker dev).

Current state in the new blog system: **only `test-blog` exists**. All 13 legacy posts need to be re-created in the admin panel so the existing `/post/<slug>` → `/blog/<slug>` 301 redirect (next.config.mjs) lands users on real content.

## Status

| # | Slug | Status | Priority |
|---|------|--------|----------|
| 1 | `what-is-the-best-age-for-my-child-to-start-nursery-school` | ✗ missing | **P1** (3,830 imp/mo per Yell) |
| 2 | `what-is-the-best-age-to-enrol-your-child-in-nursery` | ✗ missing | P1 (variant of #1) |
| 3 | `the-importance-of-socialisation-in-early-childhood` | ✗ missing | P1 |
| 4 | `starting-nursery-how-to-help-your-little-one-settle-in` | ✗ missing | P1 (high parent intent) |
| 5 | `what-is-forest-school-and-what-are-the-advantages` | ✗ missing | P1 (supports `/forest-school` rank 7) |
| 6 | `how-day-nursery-services-can-support-working-parents` | ✗ missing | P2 |
| 7 | `montessori-toys-a-comprehensive-overview-for-parents` | ✗ missing | P2 |
| 8 | `the-montessori-method-and-how-it-can-be-used-at-daycare` | ✗ missing | P2 |
| 9 | `key-milestones-for-children-s-language-development` | ✗ missing | P2 |
| 10 | `how-structured-routine-supports-early-childhood-development` | ✗ missing | P2 |
| 11 | `the-best-activities-to-enhance-early-childhood` | ✗ missing | P3 |
| 12 | `the-importance-of-child-participation-in-charity-events` | ✗ missing | P3 |
| 13 | `how-blue-nest-montessori-school-builds-confidence-before-primary-school` | ✗ missing | P3 |

## How to migrate

1. Open the admin panel → Blog → New post.
2. **Use the exact slug strings above** — the legacy URLs `/post/<slug>` are 301-redirected to `/blog/<slug>` by `next.config.mjs`, so the slugs must match character-for-character (including the apostrophe stand-in in `children-s` for `children's`).
3. Pull body copy + cover image from the archived Wix HTML or the prospectus content.
4. Set `published_at` to today so it appears in the dynamic sitemap immediately (handled by `frontend/app/sitemap.ts`).
5. Add internal links (per P6) inside each post body to: the matching branch page, `/why-montessori`, `/admission/our-fees`, `/contact`.

## Verification after migration

```bash
# Confirm a post lands at the new URL
curl -s -o /dev/null -w "%{http_code}\n" https://bluenest.uk/blog/what-is-the-best-age-for-my-child-to-start-nursery-school
# Confirm the legacy URL still 301s onto the new one
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" https://bluenest.uk/post/what-is-the-best-age-for-my-child-to-start-nursery-school
# Confirm sitemap picks the slug up (after the hourly revalidate or a deploy)
curl -s https://bluenest.uk/sitemap.xml | grep what-is-the-best-age
```

## Notes

- The Article JSON-LD on `frontend/app/blog/[slug]/page.tsx` already renders headline / author / dates / cover image when the API returns those fields, so no per-post schema work is required after publishing.
- The `/post/:slug` redirect in `next.config.mjs` is route-level, so it covers all 13 slugs without needing one rule per post.
