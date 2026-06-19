// Throwaway visual-regression runner: render gallery.html under Semantic 2.4.1 and
// Fomantic 2.9.4 in headless Chromium, screenshot each section, and pixel-diff them.
// Output: out/<section>__semantic.png, __fomantic.png, __diff.png + a summary table.
// Nothing here touches the app or a real browser. `rm -rf .semantic-visual-diff` to remove.

import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });

const galleryUrl = (variant) =>
  `${pathToFileURL(join(here, "gallery.html")).href}?css=${variant}`;

// Compare today's look (baseline) against the proposed refresh (candidate).
const BASELINE = "semantic"; // current production look
const CANDIDATE = "refresh"; // Fomantic base + subtle-modernization skin
const VIEWPORT = { width: 1200, height: 900 };

async function captureSections(page, variant) {
  await page.goto(galleryUrl(variant), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250); // settle web fonts / layout
  const sections = await page.$$("section[data-shot]");
  const shots = {};
  for (const el of sections) {
    const name = await el.getAttribute("data-shot");
    shots[name] = await el.screenshot();
  }
  return shots;
}

function diffPair(name, aBuf, bBuf) {
  const a = PNG.sync.read(aBuf);
  const b = PNG.sync.read(bBuf);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  // Pad both to a common canvas so size deltas (a real signal) still diff cleanly.
  const pad = (src) => {
    if (src.width === width && src.height === height) return src;
    const out = new PNG({ width, height });
    PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
    return out;
  };
  const pa = pad(a);
  const pb = pad(b);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(pa.data, pb.data, diff.data, width, height, {
    threshold: 0.1,
    alpha: 0.5,
    diffColor: [255, 0, 255],
  });
  writeFileSync(join(outDir, `${name}__current.png`), aBuf);
  writeFileSync(join(outDir, `${name}__refresh.png`), bBuf);
  writeFileSync(join(outDir, `${name}__diff.png`), PNG.sync.write(diff));
  const total = width * height;
  return {
    name,
    changedPx: changed,
    totalPx: total,
    pct: ((changed / total) * 100).toFixed(2),
    sizeDelta: a.width !== b.width || a.height !== b.height
      ? `${a.width}x${a.height} -> ${b.width}x${b.height}`
      : "",
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

const perVariant = {};
for (const v of [BASELINE, CANDIDATE]) perVariant[v] = await captureSections(page, v);
await browser.close();

const names = Object.keys(perVariant[BASELINE]);
const rows = names.map((n) => diffPair(n, perVariant[BASELINE][n], perVariant[CANDIDATE][n]));
rows.sort((x, y) => Number(y.pct) - Number(x.pct));

const pad = (s, n) => String(s).padEnd(n);
console.log("\n  CURRENT (Semantic 2.4.1)  ->  REFRESH (Fomantic + skin)   (per-section pixel delta)\n");
console.log(`  ${pad("section", 16)} ${pad("changed%", 10)} ${pad("size shift", 24)}`);
console.log("  " + "-".repeat(50));
for (const r of rows) {
  console.log(`  ${pad(r.name, 16)} ${pad(r.pct + "%", 10)} ${r.sizeDelta || "-"}`);
}
const totChanged = rows.reduce((a, r) => a + r.changedPx, 0);
const totAll = rows.reduce((a, r) => a + r.totalPx, 0);
console.log("  " + "-".repeat(50));
console.log(`  ${pad("OVERALL", 16)} ${pad(((totChanged / totAll) * 100).toFixed(2) + "%", 10)}`);
console.log(`\n  PNGs written to: ${outDir}`);
console.log(`  Open *__diff.png — magenta = pixels that changed between versions.\n`);

writeFileSync(join(outDir, "summary.json"), JSON.stringify(rows, null, 2));
