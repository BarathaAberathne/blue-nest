// scripts/preview-source.mjs — temporary audit helper.
// Generates a 1100px JPEG preview of a source image so the human/AI
// auditor can confirm framing/quality before slotting it. Delete after audit.
//
// Usage:
//   node scripts/preview-source.mjs <branch> <filename>
//
// e.g.   node scripts/preview-source.mjs pinner DSC01066.JPG

import { argv } from "node:process";
import sharp from "sharp";

const SOURCES = {
  harrow:      "/Users/barathaabeyrathne/Documents/Montessori Pictures 2026:05/harrow pic",
  pinner:      "/Users/barathaabeyrathne/Documents/Montessori Pictures 2026:05/pinner pic",
  borehamwood: "/Users/barathaabeyrathne/Documents/Montessori Pictures 2026:05/borhamwood",
};

const branch = argv[2];
const file   = argv[3];
if (!branch || !file || !SOURCES[branch]) {
  console.error(`Usage: node scripts/preview-source.mjs <branch> <filename>`);
  process.exit(1);
}

const src = `${SOURCES[branch]}/${file}`;
const dst = `/tmp/preview-${branch}-${file.replace(/\.jpe?g$/i, "")}.jpg`;

await sharp(src, { failOn: "none" })
  .rotate()
  .resize({ width: 1100, withoutEnlargement: true })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(dst);

console.log(dst);
