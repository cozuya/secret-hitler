// Geometry gate for the Settings migration: close-X and header info icon.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, "settings-geom.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);

await page.screenshot({ path: join(here, "out", "settings-geom.png"), clip: { x: 0, y: 0, width: 420, height: 130 } });

const data = await page.evaluate(() => {
  const box = (sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  const oh = (id) => Math.round(document.getElementById(id).offsetHeight);
  return {
    oldRm: box("#oldrm i.remove"),
    newRm: box("#newrm .lucide-icon"),
    oldInfo: box("#oldhdr i.info"),
    newInfo: box("#newhdr .lucide-icon"),
    oldHdrH: oh("oldhdr"),
    newHdrH: oh("newhdr"),
    oldHdrW: Math.round(document.getElementById("oldhdr").getBoundingClientRect().width),
    newHdrW: Math.round(document.getElementById("newhdr").getBoundingClientRect().width),
  };
});
await browser.close();

const cmp = (label, a, b) => {
  const ok = Math.abs(a.w - b.w) < 0.6 && Math.abs(a.h - b.h) < 0.6;
  console.log(`  ${label.padEnd(20)} old ${a.w}x${a.h}   new ${b.w}x${b.h}   ${ok ? "MATCH" : "*** DIFF ***"}`);
  return ok;
};

console.log("\n  Settings icon geometry — old Semantic font vs new <Icon>\n");
const ok1 = cmp("close-X (remove)", data.oldRm, data.newRm);
const ok2 = cmp("header info", data.oldInfo, data.newInfo);
const okH = data.oldHdrH === data.newHdrH && data.oldHdrW === data.newHdrW;
console.log(`  header box           old ${data.oldHdrW}x${data.oldHdrH}   new ${data.newHdrW}x${data.newHdrH}   ${okH ? "MATCH" : "*** DIFF ***"}`);
console.log(`\n  ${ok1 && ok2 && okH ? "PASS — no footprint/size change" : "FAIL — geometry changed"}\n`);
