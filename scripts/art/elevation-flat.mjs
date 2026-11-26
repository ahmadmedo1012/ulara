#!/usr/bin/env node
/**
 * elevation-flat.mjs — r368 slice 03: original flat hero elevation (procedural, no raster, no reference art).
 * Stacked exposed-concrete massing: two solid piers (left, right) carrying a roof slab, a recessed two-storey glazed core
 * with deep mullions, a heavy solid podium wall under it with a long diagonal cast shadow, side steps, two bare branching trees.
 * Transparent ground (multiplies onto paper). Usage: node scripts/art/elevation-flat.mjs > frontend/src/assets/art-v2/hero-elevation-flat.svg
 */
const W = 1440, H = 700;
const INK = '#26221c', MID = '#8d8a82', LIGHT = '#cfccc3', PALE = '#e6e3da', GLASS = '#a9aeaa';
let seed = 368;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const f = (n) => n.toFixed(1);
const rect = (x, y, w, h, fill, st = INK, sw = 1.4, o = 1) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" stroke="${st}" stroke-width="${sw}" opacity="${o}"/>`;
const ln = (x1, y1, x2, y2, sw = 1, c = INK, o = 1) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${sw}" opacity="${o}" stroke-linecap="round"/>`;
const poly = (pts, fill, o = 1) => `<polygon points="${pts.map((p) => p.map(f).join(',')).join(' ')}" fill="${fill}" opacity="${o}"/>`;
let s = '';
const gy = 612;
// ground + hatching under the building
s += ln(150, gy, 1290, gy, 2.2);
for (let i = 0; i < 90; i++) { const x = 300 + rnd() * 860; s += ln(x, gy + 4 + rnd() * 30, x + 30 + rnd() * 60, gy + 4 + rnd() * 30, 1, MID, 0.28); }
// podium: heavy solid wall, textured
s += rect(420, 470, 640, 142, LIGHT, INK, 2);
for (let i = 0; i < 14; i++) s += ln(420, 486 + i * 9, 1060, 486 + i * 9, 1, MID, 0.35);
for (let i = 0; i < 150; i++) { const x = 425 + rnd() * 630, y = 475 + rnd() * 132; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + rnd() * 1.1)}" fill="${INK}" opacity="0.5"/>`; }
// left steps up to a terrace
for (let i = 0; i < 8; i++) s += rect(280 + i * 16, gy - (i + 1) * 9, 140 - i * 16, 9, i % 2 ? LIGHT : PALE, INK, 1);
// glazed core, recessed: two storeys
s += rect(500, 232, 460, 238, GLASS, INK, 2);
for (let i = 1; i < 6; i++) s += ln(500 + i * 77, 232, 500 + i * 77, 470, 3, INK);
s += ln(500, 350, 960, 350, 5, INK);
for (let i = 1; i < 4; i++) { s += ln(500, 232 + i * 30, 960, 232 + i * 30, 1, INK, 0.5); s += ln(500, 350 + i * 30, 960, 350 + i * 30, 1, INK, 0.5); }
// glass depth: dark interior, floor plates, ceiling beams, furniture silhouettes, sky reflection gradient
for (let r = 0; r < 2; r++) { const y0 = 232 + r * 118; s += rect(504, y0 + 4, 452, 112, INK, INK, 0, 0.32); s += rect(504, y0 + 100, 452, 8, INK, INK, 0, 0.55); s += rect(504, y0 + 4, 452, 10, INK, INK, 0, 0.5);
  for (let i = 0; i < 9; i++) { const x = 515 + rnd() * 410, w = 18 + rnd() * 40, h = 14 + rnd() * 30; s += rect(x, y0 + 100 - h, w, h, INK, INK, 0, 0.3 + rnd() * 0.25); }
  for (let i = 0; i < 40; i++) { const x = 505 + rnd() * 450; s += ln(x, y0 + 6, x + 50 + rnd() * 40, y0 + 112, 0.8, '#ffffff', 0.14); } }
// light reflections in glass
s += poly([[540, 232], [600, 232], [520, 350], [500, 350], [500, 300]], '#ffffff', 0.18);
s += poly([[760, 350], [830, 350], [740, 470], [690, 470]], '#ffffff', 0.18);
// piers (solid concrete carrying the roof)
s += rect(430, 190, 70, 280, PALE, INK, 2.2);
s += rect(960, 190, 70, 280, PALE, INK, 2.2);
for (let i = 0; i < 12; i++) { s += ln(430, 206 + i * 22, 500, 206 + i * 22, 1, MID, 0.4); s += ln(960, 206 + i * 22, 1030, 206 + i * 22, 1, MID, 0.4); }
// roof slab, deep fascia and soffit shadow
s += rect(400, 150, 660, 46, LIGHT, INK, 2.4);
s += rect(400, 196, 660, 10, INK, INK, 1);
s += poly([[500, 206], [960, 206], [960, 262], [500, 262]], INK, 0.55);
// tall outer fins (the reference-style projecting stair towers, drawn as our own slender piers)
s += rect(360, 120, 36, 492, LIGHT, INK, 2);
s += rect(1064, 120, 36, 492, LIGHT, INK, 2);
s += ln(378, 120, 378, 612, 1, MID, 0.5); s += ln(1082, 120, 1082, 612, 1, MID, 0.5);
// cast shadow wedge across podium and glass
s += poly([[620, 262], [960, 262], [1060, 470], [1060, 612], [800, 612]], INK, 0.14) + poly([[620, 262], [960, 262], [1060, 470], [1060, 612], [800, 612]], 'url(#st1)', 0.9);
s += poly([[430, 470], [620, 470], [560, 612], [420, 612]], 'url(#st2)', 0.8);
s += poly([[500, 206], [960, 206], [960, 262], [500, 262]], 'url(#st1)', 0.9) + poly([[430, 196], [1060, 196], [1060, 206], [430, 206]], 'url(#st1)', 1);
s += poly([[470, 190], [500, 190], [500, 470], [470, 470]], 'url(#st2)', 0.9) + poly([[1000, 190], [1030, 190], [1030, 470], [1000, 470]], 'url(#st2)', 0.9);
// r368 texture pass: formwork joints + board-form hatching + speckle on the concrete masses, corner plus marks
const hatch = (x, y, w, h, n, o) => { let t = ''; for (let i = 0; i < n; i++) { const yy = y + rnd() * h, xx = x + rnd() * w; t += ln(xx, yy, Math.min(x + w, xx + 14 + rnd() * 40), yy + (rnd() - 0.5) * 2, 0.9, INK, o); } return t; };
const joints = (x, y, w, h, cols, rows) => { let t = ''; for (let i = 1; i < cols; i++) t += ln(x + (w / cols) * i, y, x + (w / cols) * i, y + h, 0.8, INK, 0.45); for (let j = 1; j < rows; j++) t += ln(x, y + (h / rows) * j, x + w, y + (h / rows) * j, 0.8, INK, 0.45); return t; };
const speck = (x, y, w, h, n) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${f(x + rnd() * w)}" cy="${f(y + rnd() * h)}" r="${f(0.5 + rnd() * 0.9)}" fill="${INK}" opacity="${f(0.25 + rnd() * 0.35)}"/>`; return t; };
const plus = (x, y, r = 9) => ln(x - r, y, x + r, y, 1.6) + ln(x, y - r, x, y + r, 1.6);
s += hatch(400, 150, 660, 46, 79, 0.4) + joints(400, 150, 660, 46, 11, 1) + speck(400, 150, 660, 46, 60);
s += hatch(430, 190, 70, 280, 68, 0.4) + hatch(960, 190, 70, 280, 68, 0.4) + joints(430, 190, 70, 280, 1, 8) + joints(960, 190, 70, 280, 1, 8);
s += hatch(360, 120, 36, 492, 101, 0.4) + hatch(1064, 120, 36, 492, 101, 0.4) + joints(360, 120, 36, 492, 1, 14) + joints(1064, 120, 36, 492, 1, 14);
s += joints(420, 470, 640, 142, 8, 1) + hatch(420, 470, 640, 142, 180, 0.35);
s += speck(360, 120, 36, 492, 70) + speck(1064, 120, 36, 492, 70) + speck(430, 190, 70, 280, 60) + speck(960, 190, 70, 280, 60);
// stepped upper massing + roof-edge parapet ticks
s += rect(520, 120, 420, 30, PALE, INK, 2) + joints(520, 120, 420, 30, 9, 1) + hatch(520, 120, 420, 30, 45, 0.4);
s += rect(600, 96, 260, 24, LIGHT, INK, 2) + joints(600, 96, 260, 24, 6, 1);
// deeper mullion shadows on the glass
for (let i = 1; i < 6; i++) s += rect(500 + i * 77 + 1.5, 232, 7, 238, INK, INK, 0, 0.18);
// corner plus marks (survey grid)
s += plus(60, 40) + plus(1380, 40) + plus(60, 660) + plus(1380, 660);
// bare branching trees
const branch = (x, y, len, ang, depth, sw, col = INK, op = 0.95) => {
  if (depth === 0 || len < 4) return '';
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  let t = ln(x, y, x2, y2, sw, col, op);
  const n = depth > 4 ? 2 : 3;
  for (let i = 0; i < n; i++) t += branch(x2, y2, len * (0.7 + rnd() * 0.14), ang + (rnd() - 0.5) * 1.2 + (i - (n - 1) / 2) * 0.35, depth - 1, Math.max(0.8, sw * 0.68), col, op);
  return t;
};
const tree = (cx, base, h, col = INK, op = 0.95, d = 8) => ln(cx, base, cx, base - h * 0.28, col === INK ? 5 : 3, col, op) + branch(cx, base - h * 0.28, h * 0.27, -Math.PI / 2, d, col === INK ? 4.4 : 2.6, col, op);
// lighter back trees for depth (the reference layers a grey tree behind the dark ones)
s += tree(150, gy, 330, MID, 0.5, 6) + tree(1290, gy, 320, MID, 0.5, 6);
s += tree(215, gy, 400) + tree(285, gy, 300);
s += tree(1215, gy, 380) + tree(1150, gy, 290);
// a lone figure
s += `<g stroke="${INK}" stroke-width="2.4" fill="none"><circle cx="700" cy="${gy - 40}" r="4.2"/>${ln(700, gy - 35, 700, gy - 14, 2.4)}${ln(700, gy - 14, 695, gy, 2.4)}${ln(700, gy - 14, 705, gy, 2.4)}</g>`;
const mb = process.argv.includes('--mobile'); // tighter crop for the phone fold
const vb = mb ? '110 60 1220 640' : `0 0 ${W} ${H}`;
const dots = (n, rmax) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${f(rnd() * 32)}" cy="${f(rnd() * 32)}" r="${f(0.35 + rnd() * rmax)}"/>`; return t; };
const defs = `<defs><pattern id="st1" width="32" height="32" patternUnits="userSpaceOnUse" fill="${INK}">${dots(110, 0.8)}</pattern><pattern id="st2" width="32" height="32" patternUnits="userSpaceOnUse" fill="${INK}">${dots(45, 0.7)}</pattern></defs>`;
process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${mb ? 1220 : W}" height="${mb ? 640 : H}">${defs}${s}</svg>\n`);
