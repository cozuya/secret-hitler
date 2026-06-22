// Screenshot the Lucide set under each theme preset and stack them vertically.
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const url = (p) => `${pathToFileURL(join(here, "lucide-themes.html")).href}?preset=${p}`;
const PRESETS = ["default-dark", "light", "low-contrast", "vibrant"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 820, height: 520 }, deviceScaleFactor: 2 });

const shots = {};
for (const p of PRESETS) {
  await page.goto(url(p), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const body = await page.$("body");
  shots[p] = PNG.sync.read(await body.screenshot());
  writeFileSync(join(outDir, `lucide-theme__${p}.png`), PNG.sync.write(shots[p]));
}
await browser.close();

const GAP = 10;
const width = Math.max(...PRESETS.map((p) => shots[p].width));
const height = PRESETS.reduce((h, p) => h + shots[p].height, 0) + GAP * (PRESETS.length - 1);
const sheet = new PNG({ width, height, fill: true });
sheet.data.fill(0x88); // grey gutter between presets
let y = 0;
for (const p of PRESETS) {
  const img = shots[p];
  PNG.bitblt(img, sheet, 0, 0, img.width, img.height, 0, y);
  y += img.height + GAP;
}
writeFileSync(join(outDir, "lucide-themes__compare.png"), PNG.sync.write(sheet));
console.log("wrote out/lucide-themes__compare.png  (4 presets stacked)");
