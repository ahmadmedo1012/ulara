#!/usr/bin/env node
/* plans-v2.mjs — r364 P1 · the thick-wall floor-plan generator.
 *
 * Emits ORIGINAL architectural plans in the reference's measured grammar
 * (docs/redesign/r350/reference: shot-map-1, shot-platform-1, shot-usecase):
 *   · faint hairline survey grid on paper (transparent bg — sections seat paper)
 *   · THICK filled-ink walls with real door openings + swing arcs
 *   · thin-line furniture (desk rows, chairs, stacks, benches, sinks)
 *   · dimension strings with oblique ticks + mono numerals
 *   · door tags (D1/D2…) + Arabic room tags
 *   · ROYAL #2540D9 callout squares with white mono digits + leader lines
 * Six plans: lecture hall, library, laboratory, exam hall, admin, campus site.
 *
 * Deterministic (no randomness). No dependencies. Build-time only — the
 * emitted SVGs are committed; this script is NOT part of any dev/build run.
 *
 * Usage: node scripts/art/plans-v2.mjs
 * Output: frontend/src/assets/art-v2/plans/*.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'frontend', 'src', 'assets', 'art-v2', 'plans');

/* ── grammar constants (r350 measured: ink #282828 family · hairline #b3b3af ·
   royal #2540D9 — the owner's signal seat) ─────────────────────────────── */
const INK = '#262019';
const INK_SOFT = '#4a4a48';
const HAIR = '#b3b3af';
const FAINT = '#d9d8d2';
const ROYAL = '#2540D9';
const MONO = `'Geist Mono','IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace`;
const ARABIC = `'IBM Plex Sans Arabic','Alexandria','Segoe UI',sans-serif`;

const W = 760;
const H = 740;

/* ── low-level pieces ─────────────────────────────────────────────────── */

/** The faint survey grid + frame. */
function grid() {
  let s = '';
  for (let x = 40; x < W; x += 40) s += `<line x1="${x}" y1="16" x2="${x}" y2="${H - 16}" stroke="${FAINT}" stroke-width="1"/>`;
  for (let y = 40; y < H; y += 40) s += `<line x1="16" y1="${y}" x2="${W - 16}" y2="${y}" stroke="${FAINT}" stroke-width="1"/>`;
  return `<g opacity="0.55">${s}</g>`;
}

/** Wall segment: x,y,w,h + door openings {at, w, side} carved along its run.
 *  side: 'h'|'v' — the wall run direction; openings are gaps. */
function wall(x, y, w, h, doors = []) {
  let out = '';
  if (h <= 12) {
    // horizontal run
    let cx = x;
    const ds = doors.slice().sort((a, b) => a.at - b.at);
    for (const d of ds) {
      const gx = x + d.at;
      if (gx - cx > 2) out += rect(cx, y, gx - cx, h);
      cx = gx + d.w;
    }
    if (x + w - cx > 2) out += rect(cx, y, x + w - cx, h);
    // door frame jamb ticks + swing
    for (const d of ds) {
      const gx = x + d.at;
      out += jambsH(gx, y, h, d.w);
      out += swing(gx, y + h / 2, d.w, d.swing || 'up');
    }
  } else {
    // vertical run
    let cy = y;
    const ds = doors.slice().sort((a, b) => a.at - b.at);
    for (const d of ds) {
      const gy = y + d.at;
      if (gy - cy > 2) out += rect(x, cy, w, gy - cy);
      cy = gy + d.w;
    }
    if (y + h - cy > 2) out += rect(x, cy, w, y + h - cy);
    for (const d of ds) {
      const gy = y + d.at;
      out += jambsV(x, gy, w, d.w);
      out += swing(x + w / 2, gy, d.w, d.swing || 'right');
    }
  }
  return out;
}

function rect(x, y, w, h) {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${INK}"/>`;
}

function jambsH(gx, y, h, w) {
  return rect(gx - 2, y - 1, 2.4, h + 2) + rect(gx + w - 0.4, y - 1, 2.4, h + 2);
}
function jambsV(x, gy, w, h) {
  return rect(x - 1, gy - 2, w + 2, 2.4) + rect(x - 1, gy + h - 0.4, w + 2, 2.4);
}

/** Door swing: quarter arc + leaf. dir: up/down (horizontal walls), left/right (vertical). */
function swing(x, y, w, dir) {
  const r = w;
  const leaf = { up: `M${x} ${y} L${x + r} ${y}`, down: `M${x - r} ${y} L${x} ${y}`, right: `M${x} ${y} L${x} ${y + r}`, left: `M${x} ${y} L${x} ${y - r}` }[dir];
  const arc = {
    up: `M${x} ${y + r * 0} A ${r} ${r} 0 0 1 ${x + r} ${y - r}`,
    down: `M${x - r} ${y} A ${r} ${r} 0 0 1 ${x} ${y + r}`,
    right: `M${x} ${y} A ${r} ${r} 0 0 0 ${x + r} ${y + r}`,
    left: `M${x} ${y} A ${r} ${r} 0 0 1 ${x - r} ${y - r}`,
  }[dir];
  return `<path d="${leaf}" stroke="${INK_SOFT}" stroke-width="1.6" fill="none"/>` +
         `<path d="${arc}" stroke="${INK_SOFT}" stroke-width="1" fill="none" stroke-dasharray="none"/>`;
}

/** Thin-line furniture: stroked rect. */
function furn(x, y, w, h, rx = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${INK_SOFT}" stroke-width="1.2"/>`;
}
/** Chair: small square with back tick. */
function chair(x, y, s = 13) {
  return furn(x, y, s, s) + `<line x1="${x}" y1="${y - 2.5}" x2="${x + s}" y2="${y - 2.5}" stroke="${INK_SOFT}" stroke-width="1.2"/>`;
}
/** Desk row: n desks with chairs above/below, along x. */
function deskRow(x, y, n, dw = 46, gap = 14, side = 'below') {
  let s = '';
  for (let i = 0; i < n; i++) {
    const dx = x + i * (dw + gap);
    s += furn(dx, y, dw, 22, 1);
    const cy = side === 'below' ? y + 26 : y - 24;
    s += chair(dx + dw / 2 - 6.5, cy);
  }
  return s;
}
/** Library stack: long double shelf. */
function stack(x, y, w) {
  return furn(x, y, w, 12) + furn(x, y + 7, w, 12) + `<line x1="${x}" y1="${y + 6}" x2="${x + w}" y2="${y + 6}" stroke="${HAIR}" stroke-width="1"/>`;
}
/** Lab bench with sink dots. */
function bench(x, y, w) {
  let s = furn(x, y, w, 26, 1);
  for (let i = 1; i < w / 90; i++) s += `<circle cx="${x + i * 90}" cy="${y + 13}" r="4" fill="none" stroke="${INK_SOFT}" stroke-width="1.2"/>`;
  return s;
}

/** Dimension string: extension lines + dim line + oblique ticks + numeral. */
function dimH(x1, x2, y, label) {
  return `<g stroke="${INK_SOFT}" stroke-width="1">` +
    `<line x1="${x1}" y1="${y - 26}" x2="${x1}" y2="${y + 6}"/>` +
    `<line x1="${x2}" y1="${y - 26}" x2="${x2}" y2="${y + 6}"/>` +
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>` +
    `</g>` +
    `<path d="M${x1 - 4} ${y + 4} L${x1 + 4} ${y - 4}" stroke="${INK}" stroke-width="1.4"/>` +
    `<path d="M${x2 - 4} ${y + 4} L${x2 + 4} ${y - 4}" stroke="${INK}" stroke-width="1.4"/>` +
    `<text x="${(x1 + x2) / 2}" y="${y - 6}" font-family="${MONO}" font-size="11" fill="${INK_SOFT}" text-anchor="middle">${label}</text>`;
}
function dimV(x, y1, y2, label) {
  return `<g stroke="${INK_SOFT}" stroke-width="1">` +
    `<line x1="${x - 26}" y1="${y1}" x2="${x + 6}" y2="${y1}"/>` +
    `<line x1="${x - 26}" y1="${y2}" x2="${x + 6}" y2="${y2}"/>` +
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>` +
    `</g>` +
    `<path d="M${x - 4} ${y1 + 4} L${x + 4} ${y1 - 4}" stroke="${INK}" stroke-width="1.4"/>` +
    `<path d="M${x - 4} ${y2 + 4} L${x + 4} ${y2 - 4}" stroke="${INK}" stroke-width="1.4"/>` +
    `<text x="${x - 6}" y="${(y1 + y2) / 2}" font-family="${MONO}" font-size="11" fill="${INK_SOFT}" text-anchor="middle" transform="rotate(-90 ${x - 6} ${(y1 + y2) / 2})">${label}</text>`;
}

/** Door tag D# */
function doorTag(x, y, n) {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="12" fill="${INK_SOFT}" text-anchor="middle">D${n}</text>`;
}
/** Arabic room tag */
function roomTag(x, y, ar, size = 13) {
  return `<text x="${x}" y="${y}" font-family="${ARABIC}" font-size="${size}" fill="${INK_SOFT}" text-anchor="middle">${ar}</text>`;
}

/** ROYAL callout square + white mono digit (+ optional leader to xy). */
function callout(x, y, n, leader) {
  let s = '';
  if (leader) s += `<line x1="${x + 10}" y1="${y + 10}" x2="${leader[0]}" y2="${leader[1]}" stroke="${ROYAL}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  return s + `<rect x="${x}" y="${y}" width="21" height="21" fill="${ROYAL}"/>` +
    `<text x="${x + 10.5}" y="${y + 14.5}" font-family="${MONO}" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="700">${String(n).padStart(2, '0')}</text>`;
}

/** North arrow + scale bar (site plan). */
function north(x, y) {
  return `<g transform="translate(${x} ${y})">` +
    `<circle r="16" fill="none" stroke="${INK_SOFT}" stroke-width="1.2"/>` +
    `<path d="M0 -12 L5 8 L0 4 L-5 8 Z" fill="${INK}"/>` +
    `<text y="-20" font-family="${MONO}" font-size="10" fill="${INK_SOFT}" text-anchor="middle">N</text></g>`;
}
function scaleBar(x, y) {
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += `<rect x="${x + i * 24}" y="${y}" width="${i % 2 ? 24 : 24}" height="6" fill="${i % 2 ? INK : 'none'}" stroke="${INK}" stroke-width="1"/>`;
  }
  return s + `<text x="${x + 48}" y="${y + 20}" font-family="${MONO}" font-size="10" fill="${INK_SOFT}" text-anchor="middle">0─50m</text>`;
}

function svg(id, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
<!-- r364 art v2 · original plan · scripts/art/plans-v2.mjs -->
<rect width="${W}" height="${H}" fill="none"/>
${grid()}
${body}
</svg>
`;
}

/* ── the six plans ────────────────────────────────────────────────────── */

const plans = {};

/* 1 — LECTURE HALL: big raked hall (desk arcs suggested by rows), front
   stage wall, rear control room, two entries, callouts on stage/exits. */
plans['plan-lecture-hall'] = () => {
  let b = '';
  // outer walls (thick 12)
  b += rect(118, 90, 544, 14); // top (r364 critique: the reference's wall weight)
  b += rect(118, 90, 14, 482); // left
  b += rect(646, 90, 14, 482); // right
  b += rect(118, 558, 544, 14); // bottom
  // stage (front = top): inner wall + platform outline
  b += rect(120, 150, 540, 10);
  b += `<rect x="210" y="100" width="340" height="50" fill="none" stroke="${INK}" stroke-width="3"/>`;
  b += furn(240, 112, 90, 26, 1); b += furn(350, 112, 90, 26, 1); b += furn(460, 112, 60, 26, 1);
  // raked desk rows (6 rows, one 9-desk zone, centre aisle dashed)
  const rows = [186, 240, 294, 348, 402, 456];
  for (const ry of rows) {
    b += deskRow(160, ry, 9, 44, 10);
  }
  // aisle centre line
  b += `<line x1="410" y1="170" x2="410" y2="550" stroke="${HAIR}" stroke-width="1" stroke-dasharray="8 6"/>`;
  // rear control room (inside bottom-right, clear of row 6 chairs)
  b += wall(480, 516, 156, 10, []);
  b += furn(500, 530, 50, 20, 1); b += furn(560, 530, 50, 20, 1);
  b += roomTag(558, 546, 'غرفة التحكم', 10);
  // entries: bottom-left door + top-right door
  b += wall(120, 558, 120, 12, [{ at: 30, w: 34, swing: 'down' }]);
  b += wall(560, 90, 100, 12, [{ at: 20, w: 34, swing: 'up' }]);
  b += doorTag(178, 590, 1); b += doorTag(595, 78, 2);
  // dims
  b += dimH(120, 660, 620, '24000');
  b += dimV(88, 90, 570, '15600');
  b += dimH(120, 660, 46, '24000');
  // room tag
  b += roomTag(390, 640, 'قاعة المحاضرات الكبرى', 15);
  // callouts: stage check, exits
  b += callout(210, 168, 1, [240, 140]);
  b += callout(600, 556, 2, [610, 540]);
  return svg('plan-lecture-hall', b, 'مخطط قاعة المحاضرات');
};

/* 2 — LIBRARY: stacks grid, reading tables, circulation desk, quiet room. */
plans['plan-library'] = () => {
  let b = '';
  b += rect(108, 84, 544, 14); b += rect(108, 84, 14, 502); b += rect(636, 84, 14, 502); b += rect(108, 572, 544, 14);
  // stacks: 5 double shelves left zone
  const sy = [140, 200, 260, 320, 380];
  for (const y of sy) b += stack(150, y, 180);
  b += roomTag(240, 122, 'المخازن', 13);
  // reading tables: 2 clusters right zone
  for (const ty of [150, 250]) {
    b += furn(420, ty, 150, 60, 2);
    b += chair(430, ty - 16); b += chair(470, ty - 16); b += chair(510, ty - 16);
    b += chair(430, ty + 66); b += chair(470, ty + 66); b += chair(510, ty + 66);
  }
  b += roomTag(495, 122, 'قراءة', 13);
  // circulation desk
  b += furn(420, 420, 160, 34, 1); b += furn(420, 420, 160, 8);
  b += roomTag(500, 410, 'الإدارة والاستعارة', 12);
  // quiet room bottom-left with door
  b += wall(150, 460, 220, 10, [{ at: 90, w: 32, swing: 'up' }]);
  b += roomTag(260, 500, 'القاعة الصامتة', 12);
  // entry bottom-right double door
  b += wall(430, 572, 220, 12, [{ at: 60, w: 60, swing: 'down' }]);
  b += doorTag(490, 606, 1);
  // dims
  b += dimH(110, 650, 632, '22800'); b += dimV(78, 84, 584, '21000');
  b += callout(560, 448, 1, [500, 440]);
  b += callout(330, 470, 2, [260, 470]);
  return svg('plan-library', b, 'مخطط المكتبة');
};

/* 3 — LABORATORY: island benches with sinks, fume wall, prep room. */
plans['plan-laboratory'] = () => {
  let b = '';
  b += rect(118, 84, 524, 14); b += rect(118, 84, 14, 492); b += rect(626, 84, 14, 492); b += rect(118, 562, 524, 14);
  // fume hood wall along top
  for (let i = 0; i < 4; i++) b += furn(160 + i * 120, 100, 100, 30, 1);
  b += roomTag(380, 74, 'دواخر السحب', 11);
  // island benches with sinks
  for (const by of [190, 300]) { b += bench(180, by, 400); b += bench(180, by + 40, 400); }
  // stools
  for (const by of [184, 294]) for (let i = 0; i < 5; i++) b += `<circle cx="${200 + i * 80}" cy="${by}" r="8" fill="none" stroke="${INK_SOFT}" stroke-width="1.2"/>`;
  // prep room right
  b += wall(500, 200, 128, 10, [{ at: 30, w: 32, swing: 'left' }]);
  b += furn(520, 240, 80, 40, 1);
  b += roomTag(560, 196, 'التحضير', 12);
  // teacher bench bottom
  b += bench(180, 470, 240);
  b += roomTag(300, 520, 'مختبر الأبحاث', 15);
  // door bottom-left + dims
  b += wall(120, 562, 140, 12, [{ at: 40, w: 34, swing: 'down' }]);
  b += doorTag(178, 596, 1);
  b += dimH(120, 640, 622, '21600'); b += dimV(88, 84, 574, '19800');
  b += callout(120, 214, 1, [180, 200]);
  b += callout(486, 226, 2, [520, 216]);
  return svg('plan-laboratory', b, 'مخطط المختبر');
};

/* 4 — EXAM HALL: long parallel single-desk rows, wide aisles, invigilator. */
plans['plan-exam-hall'] = () => {
  let b = '';
  b += rect(108, 84, 544, 14); b += rect(108, 84, 14, 502); b += rect(636, 84, 14, 502); b += rect(108, 572, 544, 14);
  // 5 columns of desk rows
  for (let c = 0; c < 4; c++) {
    const cx = 150 + c * 128;
    for (let r = 0; r < 5; r++) {
      b += furn(cx, 140 + r * 84, 26, 40, 1);
      b += chair(cx + 4, 140 + r * 84 + 44, 18);
    }
  }
  // invigilator desk + aisle arrows
  b += furn(300, 100, 160, 26, 1);
  b += roomTag(380, 92, 'منضدة المراقب', 11);
  b += `<line x1="560" y1="140" x2="560" y2="540" stroke="${HAIR}" stroke-width="1" stroke-dasharray="8 6"/>`;
  b += roomTag(570, 350, '', 1); // spacing
  b += roomTag(380, 640, 'قاعة الامتحانات', 15);
  // two entries
  b += wall(110, 572, 160, 12, [{ at: 50, w: 34, swing: 'down' }]);
  b += wall(470, 572, 180, 12, [{ at: 50, w: 34, swing: 'down' }]);
  b += doorTag(178, 606, 1); b += doorTag(538, 606, 2);
  b += dimH(110, 650, 632, '24000'); b += dimV(78, 84, 584, '21600');
  b += callout(640, 96, 1, [560, 120]);
  return svg('plan-exam-hall', b, 'مخطط قاعة الامتحان');
};

/* 5 — ADMIN: reception, offices row, meeting room, records vault. */
plans['plan-admin'] = () => {
  let b = '';
  // r367: the wall-weight pass — the reference's outer walls measure
  // ~14px at the 760px sheet width (the r364 critique's queued item);
  // admin was the last plan at 12, it joins the 14 register.
  b += rect(120, 90, 520, 14); b += rect(120, 90, 14, 480); b += rect(628, 90, 14, 480); b += rect(120, 558, 520, 14);
  // corridor
  b += `<line x1="132" y1="300" x2="628" y2="300" stroke="${HAIR}" stroke-width="1" stroke-dasharray="10 6"/>`;
  // offices top row (3 rooms with doors on corridor wall)
  b += wall(120, 180, 508, 10, [{ at: 60, w: 32, swing: 'up' }, { at: 210, w: 32, swing: 'up' }, { at: 360, w: 32, swing: 'up' }]);
  for (let i = 0; i < 3; i++) {
    const ox = 150 + i * 168;
    b += furn(ox, 110, 60, 30, 1); b += chair(ox + 22, 144);
  }
  b += roomTag(234, 100, 'شؤون الطلبة', 11); b += roomTag(402, 100, 'التسجيل', 11); b += roomTag(560, 100, 'القبول', 11);
  // meeting room bottom-right
  b += wall(448, 390, 180, 10, [{ at: 60, w: 32, swing: 'left' }]);
  b += furn(480, 430, 120, 50, 2);
  b += chair(490, 416); b += chair(530, 416); b += chair(570, 416);
  b += chair(490, 486); b += chair(530, 486); b += chair(570, 486);
  b += roomTag(540, 386, 'قاعة الاجتماعات', 11);
  // records vault bottom-left
  b += wall(160, 430, 130, 10, [{ at: 44, w: 32, swing: 'up' }]);
  b += stack(180, 460, 90);
  b += roomTag(225, 508, 'السجلات', 12);
  // reception desk near entry
  b += furn(280, 470, 110, 30, 1); b += roomTag(335, 456, 'الاستقبال', 11);
  // main entry bottom
  b += wall(320, 558, 130, 12, [{ at: 40, w: 40, swing: 'down' }]);
  b += doorTag(386, 592, 1);
  b += dimH(120, 640, 618, '21600'); b += dimV(88, 90, 570, '18000');
  b += callout(120, 318, 1, [160, 320]);
  return svg('plan-admin', b, 'مخطط الإدارة');
};

/* 6 — CAMPUS SITE: building footprints, paths, plaza, trees, north+scale. */
plans['plan-campus'] = () => {
  let b = '';
  // site boundary (thin)
  b += `<rect x="90" y="80" width="580" height="520" fill="none" stroke="${HAIR}" stroke-width="1.4"/>`;
  // north + scale
  b += north(130, 130); b += scaleBar(560, 580);
  // main building (thick outline, hatched roof hint)
  b += `<rect x="220" y="120" width="300" height="120" fill="none" stroke="${INK}" stroke-width="4"/>`;
  for (let x = 230; x < 520; x += 18) b += `<line x1="${x}" y1="124" x2="${x + 8}" y2="136" stroke="${FAINT}" stroke-width="1"/>`;
  b += roomTag(370, 186, 'المبنى الرئيسي', 12);
  // library
  b += `<rect x="470" y="300" width="150" height="100" fill="none" stroke="${INK}" stroke-width="4"/>`;
  b += roomTag(545, 356, 'المكتبة', 12);
  // labs wing
  b += `<rect x="130" y="300" width="180" height="110" fill="none" stroke="${INK}" stroke-width="4"/>`;
  b += roomTag(220, 362, 'أجنحة المختبرات', 11);
  // exam hall
  b += `<rect x="250" y="460" width="180" height="80" fill="none" stroke="${INK}" stroke-width="4"/>`;
  b += roomTag(340, 506, 'قاعة الامتحانات', 11);
  // paths
  b += `<line x1="370" y1="240" x2="370" y2="460" stroke="${INK_SOFT}" stroke-width="2"/>`;
  b += `<line x1="130" y1="355" x2="470" y2="355" stroke="${INK_SOFT}" stroke-width="2"/>`;
  b += `<line x1="370" y1="355" x2="545" y2="355" stroke="${INK_SOFT}" stroke-width="2"/>`;
  // plaza + trees (stipple circles)
  b += `<circle cx="370" cy="290" r="26" fill="none" stroke="${INK_SOFT}" stroke-width="1.4"/>`;
  for (const [tx, ty, r] of [[180, 200, 16], [600, 180, 14], [150, 480, 14], [590, 470, 16], [470, 520, 12], [220, 240, 10]]) {
    b += `<circle cx="${tx}" cy="${ty}" r="${r}" fill="none" stroke="${INK_SOFT}" stroke-width="1.2"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b += `<circle cx="${(tx + Math.cos(a) * r * 0.6).toFixed(1)}" cy="${(ty + Math.sin(a) * r * 0.6).toFixed(1)}" r="1.2" fill="${INK_SOFT}"/>`;
    }
  }
  // gate + callouts
  b += `<line x1="340" y1="560" x2="400" y2="560" stroke="${INK}" stroke-width="5"/>`;
  b += roomTag(370, 578, 'المدخل الرئيسي', 11);
  b += dimH(90, 670, 640, '180m'); b += dimV(58, 80, 600, '160m');
  b += callout(240, 128, 1, [280, 150]);
  b += callout(600, 556, 2, [560, 560]);
  return svg('plan-campus', b, 'مخطط الحرم الجامعي');
};

/* ── emit ─────────────────────────────────────────────────────────────── */
mkdirSync(OUT, { recursive: true });
for (const [id, fn] of Object.entries(plans)) {
  const p = join(OUT, `${id}.svg`);
  writeFileSync(p, fn(), 'utf8');
  console.log(`ok ${id}.svg`);
}
console.log(`done — ${Object.keys(plans).length} plans → ${OUT.replace(ROOT + '/', '')}`);
