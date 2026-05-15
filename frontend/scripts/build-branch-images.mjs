// scripts/build-branch-images.mjs
//
// Build the optimised branch-image set for a single branch.
//
// Reads from:   .claude/site-images/<branch>-iphone/<source>.JPG
// Writes to:    frontend/public/home/branches/<branch>/<slot>.{webp,jpg}
//
// For each slot we emit BOTH:
//   • a .webp        (primary payload — Next/Image will serve this to ~95% of browsers)
//   • a .jpg sibling (fallback for OG/Twitter cards, email, no-srcset fallbacks)
//
// Sizes:
//   hero   — 1920 wide   (landscape, used at full pane width on big screens)
//   card   — 1200 wide   (4:3 home nurseries card)
//   sticker— 1200 wide   (4:5 portrait StickerCards on the branch page)
//   gallery— 1400 wide   (gallery images sit in a 3-col grid, browsers crop)
//
// Idempotent: re-running just overwrites the outputs.
//
// Usage:
//   node scripts/build-branch-images.mjs harrow

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const SRC_ROOT = resolve(
  new URL("..", import.meta.url).pathname,
  "..",
  ".claude",
  "site-images",
);
const OUT_ROOT = new URL("../public/home/branches", import.meta.url).pathname;

// ── Per-branch picks ──────────────────────────────────────────────────────────
//
// Each entry maps a slot filename to a source iPhone file and a sharp pipeline.
// Adding a new slot is just another row.

// Quality settings match scripts/optimize-images.mjs so the assets this
// script emits are already at the same quality level that `npm run
// optimize:images` would target. Running optimize:images afterwards is a
// no-op for these files (skipped as "already optimised").
const PRESETS = {
  hero:    { width: 1920, jpegQ: 78, webpQ: 75 },
  card:    { width: 1200, jpegQ: 78, webpQ: 75 },
  sticker: { width: 1200, jpegQ: 78, webpQ: 75 },
  gallery: { width: 1400, jpegQ: 78, webpQ: 75 },
};

const BRANCHES = {
  harrow: {
    sourceDir: "harrow-iphone",
    slots: [
      { name: "harrow-hero",       src: "IMG_2614.JPG", preset: "hero"    },
      { name: "harrow-office",     src: "IMG_2800.jpg", preset: "card"    },
      { name: "harrow-welcome",    src: "IMG_2796.JPG", preset: "sticker" },
      { name: "harrow-daily",      src: "IMG_2789.JPG", preset: "sticker" },
      { name: "harrow-gallery-01", src: "IMG_2645.JPG", preset: "gallery" },
      { name: "harrow-gallery-02", src: "IMG_2783.JPG", preset: "gallery" },
      { name: "harrow-gallery-03", src: "IMG_2712.JPG", preset: "gallery" },
      { name: "harrow-gallery-04", src: "IMG_2774.JPG", preset: "gallery" },
      { name: "harrow-gallery-05", src: "IMG_2740.JPG", preset: "gallery" },
      { name: "harrow-gallery-06", src: "IMG_2671.JPG", preset: "gallery" },
      // Additional branch gallery tiles
      { name: "harrow-gallery-07", src: "IMG_2603.JPG", preset: "gallery" },
      { name: "harrow-gallery-08", src: "IMG_2701.JPG", preset: "gallery" },
      { name: "harrow-gallery-09", src: "IMG_2769.JPG", preset: "gallery" },
      { name: "harrow-gallery-10", src: "IMG_2782.JPG", preset: "gallery" },
      // Home-page hero (used by HeroSection)
      { name: "harrow-home-hero", src: "IMG_2762.JPG", preset: "hero"    },
      // Home-page "what makes Blue Nest special" feature cards
      { name: "harrow-feature-learning", src: "IMG_2725.JPG", preset: "card" },
      { name: "harrow-feature-forest",   src: "IMG_2606.JPG", preset: "card" },
      { name: "harrow-feature-food",     src: "IMG_2683.JPG", preset: "card" },
      { name: "harrow-feature-safe",     src: "IMG_2697.JPG", preset: "card" },
      // Home-page gallery preview tiles
      { name: "harrow-preview-01", src: "IMG_2615.JPG", preset: "gallery" },
      { name: "harrow-preview-02", src: "IMG_2730.JPG", preset: "gallery" },
      { name: "harrow-preview-03", src: "IMG_2719.JPG", preset: "gallery" },
      { name: "harrow-preview-04", src: "IMG_2787.JPG", preset: "gallery" },
      { name: "harrow-preview-05", src: "IMG_2790.JPG", preset: "gallery" },
      { name: "harrow-preview-06", src: "IMG_2654.JPG", preset: "gallery" },
    ],
  },
};

// ── Runner ────────────────────────────────────────────────────────────────────

const branchKey = process.argv[2];
if (!branchKey || !BRANCHES[branchKey]) {
  console.error(`Usage: node scripts/build-branch-images.mjs <branch>`);
  console.error(`  Known branches: ${Object.keys(BRANCHES).join(", ")}`);
  process.exit(1);
}

const branch    = BRANCHES[branchKey];
const sourceDir = join(SRC_ROOT, branch.sourceDir);
const outDir    = join(OUT_ROOT, branchKey);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

function fmtKb(n) { return `${(n / 1024).toFixed(0)} KB`; }

let totalBytes = 0;
for (const slot of branch.slots) {
  const preset = PRESETS[slot.preset];
  const srcPath = join(sourceDir, slot.src);
  if (!existsSync(srcPath)) {
    // iPhone exports inconsistently capitalise the extension. Try the other case.
    const alt = srcPath.replace(/\.JPG$/, ".jpg").replace(/\.jpg$/, ".JPG");
    if (existsSync(alt)) {
      slot.src = slot.src.replace(/\.JPG$/i, alt.endsWith(".JPG") ? ".JPG" : ".jpg");
    } else {
      console.error(`  MISSING: ${srcPath}`);
      continue;
    }
  }

  const input = readFileSync(join(sourceDir, slot.src));
  const meta  = await sharp(input, { failOn: "none" }).rotate().metadata();
  const baseW = Math.min(preset.width, meta.width || preset.width);

  const webpPath = join(outDir, `${slot.name}.webp`);
  const jpegPath = join(outDir, `${slot.name}.jpg`);

  // Encode directly to file (no intermediate sharp(buf) round-trip, which
  // would double-encode and lose ~10% file-size savings).
  //
  // Write JPEG first, then WebP — this keeps webp.mtime > jpg.mtime, which
  // means `npm run optimize:images` correctly recognises this pair as
  // "already optimised" and skips it on subsequent sweeps.
  const jpegInfo = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: baseW, withoutEnlargement: true })
    .jpeg({ quality: preset.jpegQ, mozjpeg: true, progressive: true })
    .toFile(jpegPath);

  const webpInfo = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: baseW, withoutEnlargement: true })
    .webp({ quality: preset.webpQ })
    .toFile(webpPath);

  totalBytes += webpInfo.size + jpegInfo.size;
  console.log(
    `  ${slot.name}  ←  ${slot.src}  (${meta.width}×${meta.height} → ${baseW}px)` +
    `  webp ${fmtKb(webpInfo.size)}  jpg ${fmtKb(jpegInfo.size)}`,
  );
}

console.log(`\nWrote ${branch.slots.length * 2} files to ${outDir}`);
console.log(`Total payload: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
