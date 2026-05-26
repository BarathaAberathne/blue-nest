// One-off: crop the nest + birds + flowers icon out of the horizontal logo
// (logo_new.png, 674x370) into a square, transparent, retina mark used ONLY
// in the mobile nav drawer. Run: node scripts/crop-logo-mark.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "public", "home", "logo_new.png");
const OUT_WEBP = join(HERE, "..", "public", "home", "logo-mark.webp");
const OUT_PNG = join(HERE, "..", "public", "home", "logo-mark.png");

// Icon bounding box within the 674x370 source (nest+birds+flowers, no wordmark).
const EXTRACT = { left: 20, top: 48, width: 272, height: 284 };
const TARGET = 200; // retina long-edge for an ~80px display

const meta = await sharp(SRC).metadata();
console.log(`source: ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha} format=${meta.format}`);

// Source already has alpha — just extract the icon region and fit it into a
// square transparent canvas. The EXTRACT box defines the crop.
let pipe = sharp(SRC)
  .extract(EXTRACT)
  .ensureAlpha()
  .resize({ width: TARGET, height: TARGET, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true });

const webpBuf = await pipe.clone().webp({ quality: 90, alphaQuality: 100 }).toBuffer();
const pngBuf = await pipe.clone().png({ compressionLevel: 9 }).toBuffer();

await sharp(webpBuf).toFile(OUT_WEBP);
await sharp(pngBuf).toFile(OUT_PNG);

const w = await sharp(webpBuf).metadata();
console.log(`logo-mark.webp: ${w.width}x${w.height}  ${(webpBuf.length / 1024).toFixed(1)} KB`);
const p = await sharp(pngBuf).metadata();
console.log(`logo-mark.png : ${p.width}x${p.height}  ${(pngBuf.length / 1024).toFixed(1)} KB`);
