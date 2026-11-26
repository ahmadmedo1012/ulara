#!/usr/bin/env node
/**
 * elevation-flat.mjs — r368 slice 03: original flat hero elevation (procedural, no raster, no reference art).
 * A two-storey exposed-concrete frame with glazed bays, a deep roof slab, a podium with steps, two line-drawn trees.
 * Transparent ground (it multiplies onto paper). Usage: node scripts/art/elevation-flat.mjs > frontend/src/assets/art-v2/hero-elevation-flat.svg
 */
const W = 1440, H = 700;
const INK = '#26221c', MID = '#8d8a82', LIGHT = '#cfccc3', PALE = '#e4e1d8';
let seed = 368;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const f = (n) => n.toFixed(1);
const rect = (x, y, w, h, fill, st = INK, sw = 1.4) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" stroke="${st}" stroke-width="${sw}"/>`;
const ln = (x1, y1, x2, y2, sw = 1, c = INK, o = 1) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${sw}" opacity="${o}"/>`;
let s = '';
const gy = 600;
// ground line + shadow
s += ln(0, gy, W, gy, 2, INK);
for (let i = 0; i < 70; i++) s += ln(120 + rnd() * 1200, gy + 4 + rnd() * 40, 160 + rnd() * 1200, gy + 4 + rnd() * 40, 1, MID, 0.3);
// podium + steps
s += rect(300, 540, 840, 60, PALE);
for (let i = 0; i < 7; i++) s += rect(560 + i * 3, 600 - (i + 1) * 8.5, 320 - i * 6, 8.5, i % 2 ? LIGHT : PALE, INK, 1);
// body: ground floor recess, upper volume
s += rect(340, 360, 760, 180, '#f4f2ec');
// roof slab
s += rect(300, 180, 840, 46, LIGHT, INK, 2);
s += rect(300, 226, 840, 14, INK, INK, 1);
// columns (two storeys)
for (let i = 0; i <= 8; i++) { const x = 340 + i * 95; s += rect(x - 9, 240, 18, 300, LIGHT, INK, 1.6); }
// glazed bays upper + lower with mullions
for (let i = 0; i < 8; i++) {
  const x = 340 + i * 95 + 9, w = 77;
  s += rect(x, 252, w, 100, '#8f948f', INK, 1);
  s += rect(x, 372, w, 150, '#8f948f', INK, 1);
  for (let m = 1; m < 4; m++) { s += ln(x + (w * m) / 4, 252, x + (w * m) / 4, 352, 1, INK, 0.7); s += ln(x + (w * m) / 4, 372, x + (w * m) / 4, 522, 1, INK, 0.7); }
  for (let r = 1; r < 5; r++) s += ln(x, 372 + r * 30, x + w, 372 + r * 30, 1, INK, 0.5);
  s += ln(x, 302, x + w, 302, 1, INK, 0.6);
}
// cast shadow: a diagonal wedge across the facade and a deep roof-soffit shade
s += `<polygon points="640,240 1100,240 1100,540 900,540" fill="${INK}" opacity="0.22"/>`;
s += `<rect x="340" y="240" width="760" height="16" fill="${INK}" opacity="0.5"/>`;
// floor slab between storeys
s += rect(330, 352, 780, 20, LIGHT, INK, 1.6);
// side wing (solid wall block, right)
s += rect(1100, 300, 140, 240, PALE, INK, 1.6);
for (let i = 0; i < 9; i++) s += ln(1100, 320 + i * 24, 1240, 320 + i * 24, 1, MID, 0.5);
// trees: trunk + procedural line canopy
const tree = (cx, base, h, r) => {
  let t = ln(cx, base, cx, base - h * 0.55, 3);
  for (let i = 0; i < 14; i++) t += ln(cx, base - h * 0.4, cx + (rnd() - 0.5) * r, base - h * 0.75, 1.4);
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
    const x = cx + Math.cos(a) * d, y = base - h * 0.78 + Math.sin(a) * d * 1.15;
    t += ln(x, y, x + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20, 1.2, INK, 0.9);
  }
  return t;
};
s += tree(190, gy, 470, 120);
s += tree(1300, gy, 430, 105);
// a lone figure at the steps
s += `<g stroke="${INK}" stroke-width="2.2" fill="none"><circle cx="700" cy="560" r="4"/>${ln(700, 564, 700, 584, 2.2)}${ln(700, 584, 695, 600, 2.2)}${ln(700, 584, 705, 600, 2.2)}</g>`;
process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>\n`);
