// scripts/audit-thumbs.mjs
//
// Temporary helper used to audit a branch source folder.
//   • Generates 480px JPEG thumbnails for every .jpg/.jpeg in the source
//     folder, into /tmp/<branch>-audit/.
//   • Builds 30-up contact sheets (6 cols × 5 rows) into
//     /tmp/<branch>-sheets/sheet-NN.jpg.
//
// Usage:
//   node scripts/audit-thumbs.mjs <branch>
// where <branch> matches a key in the BRANCH_SOURCES map below.
//
// Delete this file (and the /tmp output folders) once the audit is done.

import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BRANCH_SOURCES = {
  harrow:      "/Users/barathaabeyrathne/Documents/Montessori Pictures 2026:05/harrow pic",
  pinner:      "/Users/barathaabeyrathne/Documents/Montessori Pictures 2026:05/pinner pic",
  borehamwood: "/Users/barathaabeyrathne/Documents/Montessori Pictures 2026:05/borhamwood",
};

const branch = process.argv[2];
if (!branch || !BRANCH_SOURCES[branch]) {
  console.error(`Usage: node scripts/audit-thumbs.mjs <branch>`);
  console.error(`  known: ${Object.keys(BRANCH_SOURCES).join(", ")}`);
  process.exit(1);
}

const SRC = BRANCH_SOURCES[branch];
const THUMBS = `/tmp/${branch}-audit`;
const SHEETS = `/tmp/${branch}-sheets`;
mkdirSync(THUMBS, { recursive: true });
mkdirSync(SHEETS, { recursive: true });

const files = readdirSync(SRC)
  .filter((f) => /\.jpe?g$/i.test(f))
  .sort();
console.log(`${branch}: ${files.length} JPGs in ${SRC}`);
console.log(`  thumbs -> ${THUMBS}`);
console.log(`  sheets -> ${SHEETS}`);

// ── Thumbnails ────────────────────────────────────────────────────────────────
let done = 0;
for (const f of files) {
  const src = join(SRC, f);
  const dst = join(THUMBS, f.replace(/\.jpe?g$/i, ".jpg"));
  if (!existsSync(dst)) {
    try {
      await sharp(src, { failOn: "none" })
        .rotate()
        .resize({ width: 480, withoutEnlargement: true })
        .jpeg({ quality: 70, mozjpeg: true })
        .toFile(dst);
    } catch (err) {
      console.error(`  skip (sharp error): ${f}  ${err.message}`);
      continue;
    }
  }
  done++;
  if (done % 50 === 0) console.log(`  thumbs ${done}/${files.length}`);
}
console.log(`  thumbs done: ${done}/${files.length}`);

// ── Contact sheets ────────────────────────────────────────────────────────────
const COLS = 6;
const PER  = 30;        // 5 rows × 6 cols
const CW   = 280;       // cell width
const CH   = 210;       // cell height
const LH   = 22;        // label height
const PAD  = 6;

const thumbs = readdirSync(THUMBS).filter((f) => /\.jpe?g$/i.test(f)).sort();

let sheetIdx = 0;
for (let i = 0; i < thumbs.length; i += PER) {
  const batch = thumbs.slice(i, i + PER);
  const rows = Math.ceil(batch.length / COLS);
  const W = COLS * (CW + PAD) + PAD;
  const H = rows * (CH + LH + PAD) + PAD;

  const composite = [];
  for (let j = 0; j < batch.length; j++) {
    const col = j % COLS;
    const row = Math.floor(j / COLS);
    const x = PAD + col * (CW + PAD);
    const y = PAD + row * (CH + LH + PAD);
    const buf = await sharp(join(THUMBS, batch[j]))
      .resize({ width: CW, height: CH, fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer();
    composite.push({ input: buf, top: y, left: x });

    // Short filename label (strip "DSC0" prefix + extension).
    const label = batch[j].replace(/^DSC[_0]*/i, "").replace(/\.jpe?g$/i, "");
    const svg = Buffer.from(
      `<svg width="${CW}" height="${LH}" xmlns="http://www.w3.org/2000/svg">
         <rect width="100%" height="100%" fill="#fff"/>
         <text x="6" y="16" font-family="sans-serif" font-size="14" fill="#000">${label}</text>
       </svg>`
    );
    composite.push({ input: svg, top: y + CH, left: x });
  }

  const out = `${SHEETS}/sheet-${String(sheetIdx).padStart(2, "0")}.jpg`;
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 240, g: 240, b: 240 } },
  })
    .composite(composite)
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out);
  console.log(`  ${out}  (${batch.length} thumbs: ${batch[0]} → ${batch[batch.length - 1]})`);
  sheetIdx++;
}

console.log(`done.`);
