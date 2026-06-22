// Measure DOM GEOMETRY (not pixels) to expose icon-swap wrapping risk and the shim fix.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, "wrap-test.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);

const data = await page.evaluate(() => {
  const out = {};
  for (const id of ["sem", "lucraw", "lucshim"]) {
    const box = document.getElementById(id);
    const icon = box.querySelector("i, svg, .lucide-icon");
    const ir = icon.getBoundingClientRect();
    const style = getComputedStyle(icon);
    const mr = parseFloat(style.marginRight) || 0;
    out[id] = {
      boxHeight: Math.round(box.offsetHeight),
      // line boxes the box content occupies — >1 means it wrapped
      lineBoxes: box.getClientRects().length,
      iconW: +(ir.width).toFixed(1),
      iconH: +(ir.height).toFixed(1),
      footprint: +(ir.width + mr).toFixed(1), // width + right margin = horizontal cost
    };
  }
  return out;
});
await browser.close();

const r = (n, w) => String(n).padEnd(w);
console.log("\n  Icon swap geometry (container = 220px, 14px text)\n");
console.log(`  ${r("variant", 22)} ${r("iconW", 7)} ${r("iconH", 7)} ${r("footprint", 11)} ${r("boxH", 7)} wrapped?`);
console.log("  " + "-".repeat(70));
const label = { sem: "Semantic font icon", lucraw: "Lucide DEFAULT (naive)", lucshim: "Lucide + box shim" };
for (const id of ["sem", "lucraw", "lucshim"]) {
  const d = data[id];
  const wrapped = d.boxHeight > data.sem.boxHeight ? "YES  <-- taller" : "no";
  console.log(`  ${r(label[id], 22)} ${r(d.iconW, 7)} ${r(d.iconH, 7)} ${r(d.footprint, 11)} ${r(d.boxHeight, 7)} ${wrapped}`);
}
console.log("");
console.log(`  Semantic footprint: ${data.sem.footprint}px  |  Lucide naive: ${data.lucraw.footprint}px  |  shim: ${data.lucshim.footprint}px`);
console.log(`  Semantic box height: ${data.sem.boxHeight}px  |  naive: ${data.lucraw.boxHeight}px  |  shim: ${data.lucshim.boxHeight}px\n`);
