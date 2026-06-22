// Geometry gate for the Gamenotes migration: old font icons vs new <Icon> markup must
// occupy the same footprint and not change the header height.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, "notes-geom.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 300 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);

await page.screenshot({ path: join(here, "out", "notes-geom.png"), clip: { x: 0, y: 0, width: 320, height: 80 } });

const data = await page.evaluate(() => {
  const grab = (sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  const headerH = (id) => Math.round(document.getElementById(id).offsetHeight);
  return {
    oldBan: grab("#old i.ban"),
    newBan: grab("#new .lucide-icon:nth-of-type(1)"),
    oldMin: grab("#old i.window"),
    newMin: grab("#new .lucide-icon:nth-of-type(2)"),
    oldHeader: headerH("old"),
    newHeader: headerH("new"),
  };
});
await browser.close();

const cmp = (label, a, b) => {
  const ok = Math.abs(a.w - b.w) < 0.6 && Math.abs(a.h - b.h) < 0.6;
  console.log(`  ${label.padEnd(22)} old ${a.w}x${a.h}   new ${b.w}x${b.h}   ${ok ? "MATCH" : "*** DIFF ***"}`);
  return ok;
};

console.log("\n  Gamenotes icon geometry — old Semantic font vs new <Icon>\n");
const ok1 = cmp("ban (clear)", data.oldBan, data.newBan);
const ok2 = cmp("window-minus (collapse)", data.oldMin, data.newMin);
const okH = data.oldHeader === data.newHeader;
console.log(`  header height            old ${data.oldHeader}px   new ${data.newHeader}px   ${okH ? "MATCH" : "*** DIFF ***"}`);
console.log(`\n  ${ok1 && ok2 && okH ? "PASS — no footprint/height change" : "FAIL — geometry changed"}\n`);
