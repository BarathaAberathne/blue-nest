# Image pipelines

Two scripts. They do different jobs.

## `optimize-images.mjs`

In-place sweep over `public/`. For every `.jpg` / `.jpeg` / `.png`:
- emits a `.webp` sibling
- re-saves the original at sane quality if smaller
- skips files already smaller than 80 KB
- skips files where a fresh `.webp` sibling already exists

```bash
npm run optimize:images:dry   # see what it would do
npm run optimize:images       # actually write
```

Use after dropping a new asset into `public/` so it gets a webp sibling.

## `build-branch-images.mjs`

Builds the curated branch-image set used by the website. Reads raw camera
files from `.claude/site-images/<branch>-iphone/` and writes optimised
slot-named outputs to `public/home/branches/<branch>/`.

```bash
npm run build:branch-images harrow
```

### Naming convention

Each slot writes both `.webp` and `.jpg`:

| Filename                            | Where it's used                              | Preset width |
|-------------------------------------|----------------------------------------------|--------------|
| `<branch>-hero.{webp,jpg}`          | `BranchHero` right pane image                | 1920         |
| `<branch>-office.{webp,jpg}`        | `NurseriesSection` home card                 | 1200 (4:3)   |
| `<branch>-welcome.{webp,jpg}`       | Branch-page welcome `StickerCard`            | 1200 (4:5)   |
| `<branch>-daily.{webp,jpg}`         | Branch-page daily-life `StickerCard`         | 1200 (4:5)   |
| `<branch>-gallery-NN.{webp,jpg}`    | Branch-page `LightboxGallery`                | 1400         |
| `<branch>-home-hero.{webp,jpg}`     | `HeroSection` on the home page               | 1920         |
| `<branch>-feature-*.{webp,jpg}`     | `FeatureCardsSection` 4 cards on home page   | 1200         |
| `<branch>-preview-NN.{webp,jpg}`    | `GalleryPreviewSection` 6 tiles on home page | 1400         |

The home-page slots (`home-hero`, `feature-*`, `preview-*`) live under the
branch folder because they're sourced from that branch's photo library.
If you later want to mix branches on the home page, just change the
import paths in `HeroSection.tsx`, `FeatureCardsSection.tsx`, and
`GalleryPreviewSection.tsx` to point at a different branch's slots.

The `.webp` is the primary payload. The `.jpg` is kept as a fallback for
email, OG/Twitter previewers, and `<img>` tags without srcset support.

### Adding a new branch

1. Drop the source iPhone exports into
   `.claude/site-images/<branch>-iphone/`.
2. In `build-branch-images.mjs`, add a `BRANCHES[<branch>]` entry mapping
   each slot to the chosen source filename (see the `harrow` entry).
3. `npm run build:branch-images <branch>` — writes one `.webp` + one
   `.jpg` per slot to `public/home/branches/<branch>/` (50 files total
   for the Harrow set).
4. Wire the paths into the branch page (`app/branches/<branch>/page.tsx`)
   and the matching entry in `components/sections/NurseriesSection.tsx`.
   Use the `.webp` paths; `next/image` handles negotiation.

### Quality settings

`build-branch-images.mjs` writes assets at the same quality target as
`optimize-images.mjs` (`webpQ: 75`, `jpegQ: 78`, mozjpeg, progressive),
so running `npm run optimize:images` after the build is a no-op for the
newly written files — they're recognised as "already optimised" and
skipped. Run `optimize:images` periodically to catch any other assets
dropped directly into `public/`.

### Notes
- Source files in `.claude/` are **not** served. They're the raw library
  the script reads from. Only the optimised outputs in `public/` reach
  production.
- The script handles either `.JPG` or `.jpg` source extensions and applies
  EXIF rotation via `sharp.rotate()` so portrait shots come out the right
  way up.
