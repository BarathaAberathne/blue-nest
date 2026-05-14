// scripts/optimize-images.mjs
//
// One-shot image optimiser for /public.
//
//   • Resizes anything wider than MAX_WIDTH down to MAX_WIDTH
//   • Produces a .webp sibling for every .jpg/.jpeg/.png it processes
//   • Re-saves the original .jpg/.jpeg/.png with sane quality (mozjpeg / pngquant via sharp)
//   • Skips files that are already smaller than MIN_SIZE_KB (no point rewriting tiny icons)
//   • Idempotent: if a .webp already exists and is newer than its source, it's skipped
//
// Usage:  cd frontend && node scripts/optimize-images.mjs [--dry]
//
// Why both .webp and re-saved original?
//   Next.js Image will negotiate to .webp for clients that support it (almost everyone)
//   but we keep the original so:
//     1. Emails (Gmail strips srcset)            — still get a sensible-sized JPEG
//     2. <img src> fallbacks anywhere            — still work
//     3. Social previewers (OG/Twitter cards)    — most reliably consume JPEG/PNG
//
// Conservatism: we never delete files. The script only writes new bytes.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";
import sharp from "sharp";

const ROOT       = new URL("../public", import.meta.url).pathname;
const DRY        = process.argv.includes("--dry");
const MAX_WIDTH  = 1920;   // Retina-ready hero ceiling; nothing on the site needs more
const MIN_SIZE_KB = 80;    // Don't bother with already-small files
const JPEG_Q     = 78;     // sweet spot: visually lossless, ~60% smaller than camera default
const PNG_LEVEL  = 9;
const WEBP_Q     = 75;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function fmtKb(bytes) { return `${(bytes / 1024).toFixed(0)} KB`; }

const targets = walk(ROOT).filter((p) => /\.(jpe?g|png)$/i.test(p));
let totalSavedBytes = 0;
let processed = 0, skippedSmall = 0, skippedFresh = 0;

for (const file of targets) {
  const stat = statSync(file);
  if (stat.size < MIN_SIZE_KB * 1024) { skippedSmall++; continue; }

  const ext   = extname(file).toLowerCase();
  const webp  = file.replace(/\.(jpe?g|png)$/i, ".webp");

  // Idempotency: skip if the .webp already exists and is at least as new as the source
  // AND the source is at our target dimensions.
  if (existsSync(webp) && statSync(webp).mtimeMs >= stat.mtimeMs) {
    const meta = await sharp(file).metadata();
    if (!meta.width || meta.width <= MAX_WIDTH) { skippedFresh++; continue; }
  }

  const input = readFileSync(file);
  const img   = sharp(input, { failOn: "none" });
  const meta  = await img.metadata();
  const targetW = meta.width && meta.width > MAX_WIDTH ? MAX_WIDTH : meta.width;

  // .webp sibling — main payload for Next/Image
  const webpBuf = await sharp(input, { failOn: "none" })
    .resize({ width: targetW, withoutEnlargement: true })
    .webp({ quality: WEBP_Q })
    .toBuffer();

  // Re-saved original (smaller dim + good quality) — fallback for non-webp consumers
  let originalBuf;
  if (ext === ".png") {
    originalBuf = await sharp(input, { failOn: "none" })
      .resize({ width: targetW, withoutEnlargement: true })
      .png({ compressionLevel: PNG_LEVEL, adaptiveFiltering: true, palette: true })
      .toBuffer();
  } else {
    originalBuf = await sharp(input, { failOn: "none" })
      .resize({ width: targetW, withoutEnlargement: true })
      .jpeg({ quality: JPEG_Q, mozjpeg: true, progressive: true })
      .toBuffer();
  }

  // Only replace the original if our re-encoded version is actually smaller.
  // Some hand-tuned assets are already optimal — no point rewriting them.
  const wroteOriginal = originalBuf.length < input.length;

  const oldSize = stat.size;
  const newSize = wroteOriginal ? originalBuf.length : input.length;
  const saved   = oldSize - newSize + (existsSync(webp) ? 0 : 0); // webp is additive, doesn't replace

  console.log(
    `  ${file.replace(ROOT, "/public")}` +
    `  ${meta.width}x${meta.height}` +
    `  ${fmtKb(oldSize)} → ${fmtKb(newSize)}` +
    `  +webp ${fmtKb(webpBuf.length)}` +
    (wroteOriginal ? "" : "  (kept original)")
  );

  if (!DRY) {
    writeFileSync(webp, webpBuf);
    if (wroteOriginal) writeFileSync(file, originalBuf);
  }

  totalSavedBytes += saved;
  processed++;
}

console.log(
  `\n${DRY ? "DRY RUN — " : ""}Processed: ${processed}` +
  `   skipped (small): ${skippedSmall}` +
  `   skipped (already optimised): ${skippedFresh}` +
  `\nTotal saved on originals: ${(totalSavedBytes / 1024 / 1024).toFixed(1)} MB` +
  `\nWebP siblings are additive — they'll be served automatically by Next/Image.`
);
