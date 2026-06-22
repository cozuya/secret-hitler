// Render the icon grid under three sets (Semantic / Fomantic / Lucide), screenshot
// each, and compose them horizontally into one aligned comparison sheet.
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const url = (v) => `${pathToFileURL(join(here, "icons.html")).href}?css=${v}`;
const VARIANTS = ["semantic", "fomantic", "lucide"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 520, height: 1600 }, deviceScaleFactor: 2 });

const shots = {};
for (const v of VARIANTS) {
  await page.goto(url(v), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const body = await page.$("body");
  shots[v] = PNG.sync.read(await body.screenshot());
  writeFileSync(join(outDir, `icons__${v}.png`), PNG.sync.write(shots[v]));
}
await browser.close();

// Compose horizontally with thin gutters.
const GAP = 6;
const height = Math.max(...VARIANTS.map((v) => shots[v].height));
const width = VARIANTS.reduce((w, v) => w + shots[v].width, 0) + GAP * (VARIANTS.length - 1);
const sheet = new PNG({ width, height, fill: true });
sheet.data.fill(0xdd); // light grey gutter
let x = 0;
for (const v of VARIANTS) {
  const img = shots[v];
  PNG.bitblt(img, sheet, 0, 0, img.width, img.height, x, 0);
  x += img.width + GAP;
}
writeFileSync(join(outDir, "icons__compare.png"), PNG.sync.write(sheet));
console.log("wrote out/icons__compare.png  (Semantic | Fomantic | Lucide)");
console.log("per-set: out/icons__semantic.png, icons__fomantic.png, icons__lucide.png");
