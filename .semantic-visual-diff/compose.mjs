// Stack current (top) + refresh (bottom) per section into one comparison PNG.
import { PNG } from "pngjs";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "out");
const GAP = 16;
const sections = process.argv.slice(2);

for (const name of sections) {
  const a = PNG.sync.read(readFileSync(join(out, `${name}__current.png`)));
  const b = PNG.sync.read(readFileSync(join(out, `${name}__refresh.png`)));
  const width = Math.max(a.width, b.width);
  const height = a.height + GAP + b.height;
  const canvas = new PNG({ width, height, fill: true });
  canvas.data.fill(0xff); // white background
  PNG.bitblt(a, canvas, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, canvas, 0, 0, b.width, b.height, 0, a.height + GAP);
  writeFileSync(join(out, `compare__${name}.png`), PNG.sync.write(canvas));
  console.log(`compare__${name}.png  (top=current, bottom=refresh)`);
}
