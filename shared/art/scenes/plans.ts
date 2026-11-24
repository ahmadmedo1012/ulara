/**
 * shared/art/scenes/plans.ts — the r359 floor-plan family (A2).
 *
 * Black-on-white presentation plans in the reference's voice:
 *   · poché: exterior walls as heavy solid ink runs (W.xw), interior
 *     partitions one step lighter (W.pw)
 *   · furniture as hairline outlines — never filled
 *   · doors: gap in the wall + leaf + quarter swing arc
 *   · windows: gap + double hairline
 *   · cabinetry/voids: X-in-box; plumbing: circled +
 *   · dimension lines with 45° slash ticks + mono text
 *   · ONE royal callout per plan (code + leader) + mono title strip
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, D, MONO, W, circ, dashRule, dimH, dimV, g, hatchPoly, label, line,
  path, rect, stairs, stipplePoly, tree,
} from '../grammar';

/* wall weights (plan scale: 1 unit = 1 px at 1200-wide viewBox) */
const XW = 10;   // exterior wall poché
const PW = 6;    // interior partition

/* ── plan furniture helpers ─────────────────────────────────────── */

/** wall run between two points as a poché stroke */
function wall(x1: number, y1: number, x2: number, y2: number, w = XW): ArtNode {
  return line(x1, y1, x2, y2, { stroke: C.ink, 'stroke-width': w, 'stroke-linecap': 'square' });
}

/** door: leaf + quarter swing arc, hinge at (x,y), reach r */
function door(x: number, y: number, r: number, a0: number): ArtNode {
  const a1 = a0 + Math.PI / 2;
  const ex = x + Math.cos(a0) * r;
  const ey = y + Math.sin(a0) * r;
  const arc = `M${(x + Math.cos(a0) * r).toFixed(1)} ${(y + Math.sin(a0) * r).toFixed(1)}A${r} ${r} 0 0 1 ${(x + Math.cos(a1) * r).toFixed(1)} ${(y + Math.sin(a1) * r).toFixed(1)}`;
  return g(
    {},
    line(x, y, ex, ey, { stroke: C.ink, 'stroke-width': W.fine }),
    path(arc, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.8 }),
  );
}

/** window: double hairline in a wall gap */
function window2(x1: number, y1: number, x2: number, y2: number): ArtNode {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 2.5, ny = (dx / len) * 2.5;
  return g(
    {},
    line(x1 - nx, y1 - ny, x2 - nx, y2 - ny, { stroke: C.ink, 'stroke-width': W.fine }),
    line(x1 + nx, y1 + ny, x2 + nx, y2 + ny, { stroke: C.ink, 'stroke-width': W.fine }),
    line(x1, y1, x2, y2, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.4 }),
  );
}

/** X-in-box fixture (cabinetry / void / counter) */
function xFix(x: number, y: number, w: number, h: number): ArtNode {
  return g(
    {},
    rect(x, y, w, h, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }),
    line(x, y, x + w, y + h, { stroke: C.ink, 'stroke-width': W.hair }),
    line(x + w, y, x, y + h, { stroke: C.ink, 'stroke-width': W.hair }),
  );
}

/** desk + chair (hairline) */
function desk(x: number, y: number, w = 52, h = 26, chair = true): ArtNode {
  const nodes: ArtNode[] = [
    rect(x, y, w, h, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }),
  ];
  if (chair) {
    nodes.push(rect(x + w / 2 - 7, y + h + 4, 14, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(path(`M${x + w / 2 - 7} ${y + h + 16}q7 5 14 0`, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  }
  return g({}, ...nodes);
}

/** callout tag (royal) with leader from (x,y) */
function callout(x: number, y: number, code: string, w = 132): ArtNode {
  const tagY = y - 30, h = 20;
  return g(
    {},
    line(x, y, x + 24, tagY + h / 2, { stroke: C.sig, 'stroke-width': W.fine }),
    line(x - 5, y - 5, x + 5, y + 5, { stroke: C.sig, 'stroke-width': W.fine }),
    line(x - 5, y + 5, x + 5, y - 5, { stroke: C.sig, 'stroke-width': W.fine }),
    rect(x + 24, tagY, w, h, { fill: C.sig, stroke: 'none' }),
    {
      t: 'text',
      a: {
        x: x + 24 + w / 2, y: tagY + 13.5, fill: 'var(--r359-paper)',
        'font-size': MONO, 'font-family': 'var(--font-mono)', 'text-anchor': 'middle', 'letter-spacing': '0.5',
      },
      s: code,
    },
  );
}

/** title block: rule + identity + GRAPHIC scale bar + sheet no */
function titleStrip(x: number, y: number, code: string, name: string): ArtNode {
  const bar: ArtNode[] = [];
  for (let i = 0; i < 4; i++) {
    bar.push(rect(x + 260 + i * 44, y + 8, 44, 6, i % 2 === 0 ? { fill: C.ink, stroke: 'none' } : { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  }
  return g(
    {},
    line(x, y, x + 480, y, { stroke: C.ink, 'stroke-width': W.med }),
    label(x, y + 16, `${code} / ${name}`, { fill: C.ink }),
    label(x + 260, y + 32, '0', {}),
    label(x + 430, y + 32, '10M', {}),
    label(x + 480, y + 16, 'SHT A-101', { 'text-anchor': 'end' }),
    ...bar,
  );
}

/** north arrow */
function north(x: number, y: number): ArtNode {
  return g(
    {},
    circ(x, y, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }),
    path(`M${x} ${y - 9}L${x + 4} ${y + 6}L${x} ${y + 2}L${x - 4} ${y + 6}Z`, { fill: C.ink, stroke: 'none' }),
    label(x, y + 24, 'N', { 'text-anchor': 'middle', fill: C.ink }),
  );
}

/** paper-cut opening through a poché wall (door gap) */
function opening(x: number, y: number, len: number, horiz: boolean, thick = XW + 2): ArtNode {
  return horiz
    ? rect(x, y - thick / 2, len, thick, { fill: C.paper, stroke: 'none' })
    : rect(x - thick / 2, y, thick, len, { fill: C.paper, stroke: 'none' });
}

/* ═══════════════════ shared plan shell ══════════════════════════ */

interface PlanSpec {
  key: string;
  title: string;
  code: string;
  name: string;
  draw: (x0: number, y0: number, w: number, h: number, nodes: ArtNode[]) => void;
}

function plan(spec: PlanSpec): ArtDoc {
  const W_ = 1200, H = 840;
  const x0 = 130, y0 = 90, w = 820, h = 560;
  const inner: ArtNode[] = [];
  spec.draw(x0, y0, w, h, inner);
  const nodes: ArtNode[] = [g({ opacity: 0.82 }, ...inner)];

  /* dimensions: overall + one bay */
  nodes.push(dimH(x0, x0 + w, y0 + h + 56, 70, 70, { label: `${(w * 0.05).toFixed(0)}000MM` }));
  nodes.push(dimV(y0, y0 + h, x0 - 64, 78, 78, { label: `${(h * 0.05).toFixed(0)}000MM` }));

  /* title strip + sheet furniture */
  nodes.push(titleStrip(x0, y0 + h + 108, spec.code, spec.name));
  nodes.push(north(x0 + w + 70, y0 + 70));
  nodes.push(label(W_ - 40, H - 22, `X:${W_}PX / Y:${H}PX`, { 'text-anchor': 'end' }));
  nodes.push(label(40, H - 28, `[${spec.key.toUpperCase()}]`, { fill: C.ink }));

  return { w: W_, h: H, title: spec.title, nodes };
}

/* ═══════════════════ the seven plans ════════════════════════════ */

function lectureHall(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  // footprint
  nodes.push(wall(x0, y0, x0 + w, y0), wall(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(wall(x0 + w, y0 + h, x0, y0 + h), wall(x0, y0 + h, x0, y0));
  // entrance vestibule bottom-left
  nodes.push(wall(x0 + 40, y0 + h - 110, x0 + 40, y0 + h, PW));
  nodes.push(wall(x0 + 240, y0 + h - 110, x0 + 240, y0 + h, PW));
  nodes.push(opening(x0 + 40, y0 + h, 60, false));
  nodes.push(door(x0 + 40, y0 + h - 40, 46, -Math.PI / 2));
  // stage (top) + board
  nodes.push(rect(x0 + 250, y0 + 16, 320, 70, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(line(x0 + 290, y0 + 30, x0 + 530, y0 + 30, { stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(label(x0 + 410, y0 + 62, 'STAGE / 80MM', { 'text-anchor': 'middle' }));
  // tiered rows (curved)
  for (let i = 0; i < 6; i++) {
    const ry = y0 + 130 + i * 58;
    const bow = 26 + i * 7;
    nodes.push(path(
      new D(x0 + 120, ry).q(x0 + w / 2, ry - bow, x0 + w - 120, ry).toString(),
      { fill: 'none', stroke: C.ink, 'stroke-width': W.fine },
    ));
    // seat ticks along the row
    for (let sx = x0 + 150; sx < x0 + w - 150; sx += 34) {
      const t = (sx - (x0 + 120)) / (w - 240);
      const cy = ry - bow * 4 * t * (1 - t) / 2;
      nodes.push(rect(sx - 9, cy - 5, 18, 10, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    }
  }
  // aisle stairs both sides
  nodes.push(stairs(x0 + 60, y0 + 130, x0 + 100, y0 + 470, 8));
  nodes.push(stairs(x0 + w - 100, y0 + 130, x0 + w - 60, y0 + 470, 8));
  // podium + projection desk (context elements)
  nodes.push(rect(x0 + 386, y0 + 104, 60, 30, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(rect(x0 + 250, y0 + 118, 34, 20, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  // callout: seating capacity
  nodes.push(callout(x0 + w - 190, y0 + 300, 'HALL-A/01 · 180 SEAT'));
}

function library(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  nodes.push(wall(x0, y0, x0 + w, y0), wall(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(wall(x0 + w, y0 + h, x0, y0 + h), wall(x0, y0 + h, x0, y0));
  // big window band on the top wall
  nodes.push(window2(x0 + 120, y0, x0 + w - 120, y0));
  // shelving runs (double-line bookcases) — left field
  for (let i = 0; i < 4; i++) {
    const sy = y0 + 60 + i * 74;
    nodes.push(rect(x0 + 56, sy, 300, 26, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(line(x0 + 56, sy + 13, x0 + 356, sy + 13, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.5 }));
  }
  // reading tables — center
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const tx = x0 + 420 + i * 190, ty = y0 + 90 + j * 170;
      nodes.push(rect(tx, ty, 130, 70, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
      for (const cx2 of [tx + 22, tx + 66, tx + 110]) {
        nodes.push(rect(cx2 - 7, ty - 16, 14, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
        nodes.push(rect(cx2 - 7, ty + 74, 14, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
      }
    }
  }
  // carrels right wall
  for (let i = 0; i < 5; i++) {
    nodes.push(xFix(x0 + w - 96, y0 + 70 + i * 84, 60, 44));
  }
  // issue desk near entrance
  nodes.push(rect(x0 + 420, y0 + h - 130, 180, 56, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(opening(x0 + w - 200, y0 + h, 64, true));
  nodes.push(door(x0 + w - 200, y0 + h, 52, Math.PI));
  // callout
  nodes.push(callout(x0 + 330, y0 + 210, 'LIB-A/02 · 42K VOLS'));
}

function lab(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  nodes.push(wall(x0, y0, x0 + w, y0), wall(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(wall(x0 + w, y0 + h, x0, y0 + h), wall(x0, y0 + h, x0, y0));
  // partition: prep room
  nodes.push(wall(x0, y0 + 200, x0 + 220, y0 + 200, PW));
  nodes.push(door(x0 + 150, y0 + 200, 46, Math.PI));
  // fume hood (X box) in prep room
  nodes.push(xFix(x0 + 30, y0 + 40, 150, 60));
  // long benches with stools — 3 islands
  for (let i = 0; i < 3; i++) {
    const by = y0 + 260 + i * 108;
    nodes.push(rect(x0 + 70, by, w - 200, 54, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
    // sink + tap (circled cross) on each bench
    nodes.push(circ(x0 + 130, by + 27, 8, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(path(`M${x0 + 124} ${by + 21}l12 12M${x0 + 136} ${by + 21}l-12 12`, { stroke: C.ink, 'stroke-width': W.hair, fill: 'none' }));
    // stools both sides
    for (let sx = x0 + 190; sx < x0 + w - 220; sx += 90) {
      nodes.push(circ(sx, by - 20, 9, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
      nodes.push(circ(sx, by + 74, 9, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    }
  }
  // equipment boxes right wall
  nodes.push(xFix(x0 + w - 90, y0 + 260, 56, 60));
  nodes.push(xFix(x0 + w - 90, y0 + 340, 56, 78));
  nodes.push(opening(x0 + 60, y0 + h, 60, true));
  nodes.push(door(x0 + 60, y0 + h, 48, Math.PI));
  nodes.push(callout(x0 + 640, y0 + 380, 'LAB-B/01 · 36 BENCH'));
}

function adminOffice(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  nodes.push(wall(x0, y0, x0 + w, y0), wall(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(wall(x0 + w, y0 + h, x0, y0 + h), wall(x0, y0 + h, x0, y0));
  // corridor spine
  nodes.push(wall(x0, y0 + 240, x0 + w, y0 + 240, PW));
  nodes.push(wall(x0, y0 + 320, x0 + w, y0 + 320, PW));
  // offices top row: partitions + desks
  for (let i = 0; i < 4; i++) {
    const ox = x0 + 205 * (i + 1);
    if (i < 3) nodes.push(wall(ox, y0, ox, y0 + 240, PW));
    nodes.push(desk(x0 + 205 * i + 70, y0 + 60));
    nodes.push(desk(x0 + 205 * i + 70, y0 + 150));
    nodes.push(door(Math.min(ox, x0 + w - 60) - 30, y0 + 240, 44, 0));
  }
  // meeting room bottom-left with big table
  nodes.push(wall(x0 + 340, y0 + 320, x0 + 340, y0 + h, PW));
  nodes.push(rect(x0 + 90, y0 + 400, 200, 84, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  for (const cx2 of [x0 + 122, x0 + 172, x0 + 222, x0 + 262]) {
    nodes.push(rect(cx2 - 7, y0 + 380, 14, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(rect(cx2 - 7, y0 + 492, 14, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  }
  // reception bottom-right
  nodes.push(rect(x0 + 480, y0 + 400, 160, 50, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(xFix(x0 + w - 120, y0 + 380, 70, 90));
  nodes.push(opening(x0 + w - 80, y0 + h, 58, true));
  nodes.push(door(x0 + w - 80, y0 + h, 46, Math.PI));
  nodes.push(callout(x0 + 560, y0 + 470, 'ADM-C/03 · 22 ROOMS'));
}

function campusSite(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  // site boundary (dash)
  nodes.push(dashRule(x0, y0, x0 + w, y0), dashRule(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(dashRule(x0 + w, y0 + h, x0, y0 + h), dashRule(x0, y0 + h, x0, y0));
  // central plaza hatch
  nodes.push(hatchPoly([[x0 + 280, y0 + 200], [x0 + 560, y0 + 200], [x0 + 560, y0 + 380], [x0 + 280, y0 + 380]], { angle: 45, pitch: 10, seed: 5 }));
  // buildings: poché blocks with mono ids
  const b = (bx: number, by: number, bw: number, bh: number, id: string): void => {
    nodes.push(rect(bx, by, bw, bh, { fill: 'none', stroke: C.ink, 'stroke-width': XW }));
    nodes.push(stipplePoly([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], 0.2, bx + by));
    nodes.push(label(bx + bw / 2, by + bh / 2 + 3, id, { 'text-anchor': 'middle', fill: C.ink }));
  };
  b(x0 + 60, y0 + 60, 180, 120, 'A');
  b(x0 + 620, y0 + 60, 150, 150, 'B');
  b(x0 + 320, y0 + 440, 240, 90, 'C');
  b(x0 + 640, y0 + 430, 130, 100, 'D');
  // paths (double hairline)
  nodes.push(path(`M${x0 + 240} ${y0 + 120}H${x0 + 620}M${x0 + 240} ${y0 + 132}H${x0 + 620}`,
    { stroke: C.ink, 'stroke-width': W.hair, fill: 'none' }));
  nodes.push(path(`M${x0 + 420} ${y0 + 190}V${y0 + 440}M${x0 + 432} ${y0 + 190}V${y0 + 440}`,
    { stroke: C.ink, 'stroke-width': W.hair, fill: 'none' }));
  // trees scattered
  const spots: Array<[number, number, number]> = [
    [x0 + 90, y0 + 260, 46], [x0 + 160, y0 + 320, 38], [x0 + 560, y0 + 470, 44],
    [x0 + 700, y0 + 300, 40], [x0 + 300, y0 + 90, 36], [x0 + 760, y0 + 200, 34],
  ];
  for (const [tx, ty, th] of spots) nodes.push(tree(tx, ty, th, { seed: tx + ty, depth: 5 }));
  // lawn stipple patches
  nodes.push(stipplePoly([[x0 + 60, y0 + 480], [x0 + 260, y0 + 480], [x0 + 260, y0 + h - 30], [x0 + 60, y0 + h - 30]], 0.08, 9));
  nodes.push(callout(x0 + 420, y0 + 300, 'SITE-00 · 4.2 HECT'));
}

function examHall(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  nodes.push(wall(x0, y0, x0 + w, y0), wall(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(wall(x0 + w, y0 + h, x0, y0 + h), wall(x0, y0 + h, x0, y0));
  // invigilator desk + clock (top)
  nodes.push(rect(x0 + w / 2 - 70, y0 + 26, 140, 34, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(circ(x0 + w / 2, y0 + 18, 8, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  // desk grid: 6 columns x 5 rows with gaps (walkways)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      const dx = x0 + 90 + c * 112 + (c > 2 ? 40 : 0);
      const dy = y0 + 110 + r * 86;
      nodes.push(rect(dx, dy, 58, 32, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
      nodes.push(rect(dx + 20, dy + 34, 16, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    }
  }
  // center walkway
  nodes.push(path(`M${x0 + w / 2} ${y0 + 90}V${y0 + h - 60}`, { stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '6 5', fill: 'none' }));
  // doors both ends
  nodes.push(opening(x0, y0 + h - 90, 62, false));
  nodes.push(door(x0, y0 + h - 90, 50, 0));
  nodes.push(opening(x0 + w, y0 + h - 90, 62, false));
  nodes.push(door(x0 + w, y0 + h - 90, 50, Math.PI));
  nodes.push(callout(x0 + 620, y0 + 240, 'EXM-D/02 · 30 SEAT'));
}

function researchLab(x0: number, y0: number, w: number, h: number, nodes: ArtNode[]): void {
  nodes.push(wall(x0, y0, x0 + w, y0), wall(x0 + w, y0, x0 + w, y0 + h));
  nodes.push(wall(x0 + w, y0 + h, x0, y0 + h), wall(x0, y0 + h, x0, y0));
  // write-up zone (top): desks
  for (let i = 0; i < 3; i++) nodes.push(desk(x0 + 80 + i * 240, y0 + 70, 150, 40));
  // partition
  nodes.push(wall(x0, y0 + 190, x0 + w, y0 + 190, PW));
  nodes.push(door(x0 + w / 2 + 60, y0 + 190, 46, Math.PI));
  // wet benches left
  for (let i = 0; i < 2; i++) {
    const by = y0 + 240 + i * 130;
    nodes.push(rect(x0 + 60, by, 320, 60, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
    nodes.push(circ(x0 + 110, by + 30, 7, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    for (let sx = x0 + 170; sx < x0 + 350; sx += 60) {
      nodes.push(circ(sx, by - 18, 8, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    }
  }
  // equipment row right: racks + microscope tables
  for (let i = 0; i < 3; i++) nodes.push(xFix(x0 + 480 + i * 110, y0 + 240, 84, 60));
  nodes.push(rect(x0 + 480, y0 + 380, 294, 50, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  // clean-room grid (small squares)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 5; c++) {
      nodes.push(rect(x0 + 480 + c * 60, y0 + 470 + r * 44, 48, 34, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    }
  }
  nodes.push(opening(x0 + w - 80, y0 + h, 60, true));
  nodes.push(door(x0 + w - 80, y0 + h, 48, Math.PI));
  nodes.push(callout(x0 + 420, y0 + 330, 'RSC-E/01 · 14 POS'));
}

/* ── registry ───────────────────────────────────────────────────── */

const SPECS: PlanSpec[] = [
  { key: 'plan-lecture-hall', title: 'مخطط قاعة المحاضرات', code: 'HALL-A/01', name: 'LECTURE HALL', draw: lectureHall },
  { key: 'plan-library', title: 'مخطط المكتبة', code: 'LIB-A/02', name: 'LIBRARY', draw: library },
  { key: 'plan-lab', title: 'مخطط المختبر', code: 'LAB-B/01', name: 'TEACHING LAB', draw: lab },
  { key: 'plan-admin-office', title: 'مخطط مكاتب الإدارة', code: 'ADM-C/03', name: 'ADMIN OFFICES', draw: adminOffice },
  { key: 'plan-campus-site', title: 'مخطط الموقع العام للحرم', code: 'SITE-00', name: 'CAMPUS SITE', draw: campusSite },
  { key: 'plan-exam-hall', title: 'مخطط قاعة الاختبارات', code: 'EXM-D/02', name: 'EXAM HALL', draw: examHall },
  { key: 'plan-research-lab', title: 'مخطط مختبر الأبحاث', code: 'RSC-E/01', name: 'RESEARCH LAB', draw: researchLab },
];

export const SCENES: Record<string, ArtBuilder> = {};
for (const sp of SPECS) SCENES[sp.key] = () => plan(sp);

export function sceneFor(key: string): ArtBuilder {
  const b = SCENES[key];
  if (!b) throw new Error(`r359 plans scene missing: ${key}`);
  return b;
}
