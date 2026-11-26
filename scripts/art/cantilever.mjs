#!/usr/bin/env node
/**
 * cantilever.mjs — r368 slice 11: the procedural "cantilever scene" (original art).
 * A flat-field brutalist cantilever slab on columns in one-point perspective, a stair, a lone figure,
 * on a TRANSPARENT ground so the flat royal shapes sit behind it on paper.
 * Usage: node scripts/art/cantilever.mjs > frontend/src/assets/art-v2/cantilever.svg
 */
const W = 1000, H = 900;
const VP = [1250, 90];
const INK = '#26221c', MID = '#9a968c', LIGHT = '#d9d6cd', PALE = '#ebe8e0';
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const toward = (p, t) => lerp(p, VP, t);
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
const line = (a, b, w = 1, c = INK, o = 1) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`;
let s = '';
// ground: pale plane, perspective joints
const g0 = [[-40, 640], [W + 40, 640]];
s += poly([[ -330, 850], [W + 260, 520], [W + 260, 900], [-330, 900]], PALE);
for (let i = 0; i < 14; i++) { const x = -700 + i * 190; s += line([x, H], toward([x, H], 0.9), 1, MID, 0.45); }
for (let i = 1; i < 9; i++) { const y = 640 + i * i * 4.2; s += line([-330, y + 120], [W + 260, y - 60], 1, MID, 0.4); }
// stair (steps rising toward the slab, right side)
for (let i = 0; i < 9; i++) { const y = 760 - i * 11, x0 = 560 + i * 26; s += poly([[x0, y], [W, y - 18], [W, y - 6], [x0, y + 11]], i % 2 ? LIGHT : PALE) + line([x0, y], [W, y - 18], 1.2, INK, 0.7); }
// the cantilever slab: near corner far left, receding to the VP
const near = { top: [-330, 200], bot: [-330, 400] };
const T = 0.7; // depth of the far end
const farTop = toward(near.top, T), farBot = toward(near.bot, T);
// underside (shadowed)
const underNear = [near.bot[0], near.bot[1]], underFar = farBot;
s += poly([near.bot, farBot, [farBot[0], farBot[1] + 22], [near.bot[0], near.bot[1] + 40]], INK);
// fascia
s += poly([near.top, farTop, farBot, near.bot], LIGHT);
for (let i = 0; i < 12; i++) { const t = i / 12 * T; const a = toward([near.top[0], near.top[1] + 18], t), b = toward([near.bot[0], near.bot[1] - 14], t); s += line(a, b, 1, MID, 0.55); }
s += line(near.top, farTop, 3, INK) + line(near.bot, farBot, 3, INK);
// roof top face
const roofBack = (p) => [p[0], p[1] - 46];
const rtNear = near.top, rtFar = farTop;
s += poly([rtNear, rtFar, lerp(roofBack(rtFar), VP, 0.04), roofBack(rtNear)], PALE) + line(roofBack(rtNear), lerp(roofBack(rtFar), VP, 0.04), 2, INK);
// a second lower slab (podium)
const n2 = { top: [-330, 790], bot: [-330, 830] }, f2t = toward(n2.top, 0.74), f2b = toward(n2.bot, 0.74);
s += poly([n2.top, f2t, f2b, n2.bot], MID) + line(n2.top, f2t, 2, INK) + line(n2.bot, f2b, 2, INK);
// columns: vertical members standing between the slab underside line and the ground line (one-point perspective)
const yOn = (p0, x) => p0[1] + (x - p0[0]) * (VP[1] - p0[1]) / (VP[0] - p0[0]);
const slabBot = [-330, 400], groundL = [-330, 840];
for (const x of [-200, 20, 220, 390, 520, 620]) {
  const k = 1 - (x + 330) / (VP[0] + 330) * 0.85;
  const yt = yOn(slabBot, x), yb = yOn(groundL, x), wd = 150 * k * 0.8;
  s += poly([[x, yt], [x + wd, yt - 3 * k], [x + wd, yb - 3 * k], [x, yb]], INK);
  s += poly([[x - wd * 0.3, yt + 2], [x, yt], [x, yb], [x - wd * 0.3, yb + 3]], MID);
  for (let j = 1; j < 6; j++) s += line([x + 3, yt + (yb - yt) * j / 6], [x + wd - 3, yt + (yb - yt) * j / 6 - 3 * k], 1, MID, 0.35);
}
// hatching on the underside shade
for (let i = 0; i < 40; i++) { const t = i / 40 * T; const a = toward([near.bot[0], near.bot[1] + 6], t); s += line(a, [a[0] + 8, a[1] + 26], 1, PALE, 0.5); }
// lone figure on the stair
s += `<g fill="${INK}"><circle cx="760" cy="676" r="7"/><rect x="753" y="684" width="14" height="40" rx="3"/><rect x="754" y="722" width="5" height="30"/><rect x="761" y="722" width="5" height="30"/></g>`;
process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-250 170 1250 706" role="img" aria-label="">${s}</svg>\n`);
