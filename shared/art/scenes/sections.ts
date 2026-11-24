/**
 * shared/art/scenes/sections.ts — r359 section plates (A2).
 *
 * why-*         : the Observe/Advise/Act/Learn steps — a plan fragment
 *                 + the step's signal instrument (node graph, route,
 *                 fix marks, feedback loop)
 * section-problem-*: the four university pains as plan-language diagrams
 * section-solution-*: product blocks (chat widget / dashboard) floating
 *                 as hairline UI cards over a plan base
 * section-intro : the wide intro band with [01]–[04] zones
 * cta-sketch    : the closing collage — elevation fragment, royal
 *                 circle + slab, plan corner with dashed learn-path
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, D, W, circ, dashRule, dimH, hatchPoly, label, line,
  path, rect, stairs, stipplePoly, tree,
} from '../grammar';

/* ── shared bits ────────────────────────────────────────────────── */

function plateShell(w: number, h: number, key: string, title: string, nodes: ArtNode[]): ArtDoc {
  return {
    w, h, title,
    nodes: [
      ...nodes,
      label(20, h - 16, `[${key.toUpperCase()}]`, { fill: C.ink }),
      label(w - 20, h - 16, `X:${w}PX / Y:${h}PX`, { 'text-anchor': 'end' }),
    ],
  };
}

/** signal node (small royal square) — the learned-pattern voice */
function node2(x: number, y: number, s = 7): ArtNode {
  return rect(x - s / 2, y - s / 2, s, s, { fill: C.sig, stroke: 'none' });
}

/** dashed royal connector between nodes */
function link(x1: number, y1: number, x2: number, y2: number): ArtNode {
  return line(x1, y1, x2, y2, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' });
}

/** a small plan fragment (rooms) used as the base of why plates */
function planFragment(x: number, y: number, w: number, h: number, seed: number): ArtNode[] {
  const out: ArtNode[] = [];
  out.push(rect(x, y, w, h, { fill: 'none', stroke: C.ink, 'stroke-width': 3 }));
  out.push(line(x + w * 0.55, y, x + w * 0.55, y + h, { stroke: C.ink, 'stroke-width': 2 }));
  out.push(line(x, y + h * 0.45, x + w * 0.55, y + h * 0.45, { stroke: C.ink, 'stroke-width': 2 }));
  // furniture hints
  const r = seed * 13;
  for (let i = 0; i < 5; i++) {
    const fx = x + 18 + ((r * (i + 3) * 37) % Math.max(1, w - 70));
    const fy = y + 18 + ((r * (i + 5) * 53) % Math.max(1, h - 60));
    out.push(rect(fx, fy, 26, 14, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.7 }));
  }
  out.push(dashRule(x - 14, y + h * 0.5, x - 2, y + h * 0.5));
  return out;
}

/** hairline UI card (the product-block voice) */
function uiCard(x: number, y: number, w: number, h: number, head: string): ArtNode[] {
  return [
    rect(x, y, w, h, { fill: 'var(--r359-paper)', stroke: C.ink, 'stroke-width': W.fine }),
    rect(x, y, w, 26, { fill: C.ink, stroke: 'none' }),
    label(x + 10, y + 17, head, { fill: 'var(--r359-paper)' }),
  ];
}

/* ═══════════════════ why-* (720×540) ════════════════════════════ */

function whyObserve(): ArtDoc {
  const nodes: ArtNode[] = [];
  nodes.push(...planFragment(70, 90, 340, 300, 3));
  // the observation graph: signal nodes + dashed links over the plan
  const pts: Array<[number, number]> = [[120, 150], [240, 130], [330, 210], [210, 260], [130, 330], [300, 340]];
  for (let i = 0; i < pts.length - 1; i++) {
    nodes.push(link(pts[i]![0], pts[i]![1], pts[i + 1]![0], pts[i + 1]![1]));
  }
  nodes.push(link(pts[5]![0], pts[5]![1], pts[0]![0], pts[0]![1]));
  for (const [px, py] of pts) nodes.push(node2(px, py));
  // instrument labels
  nodes.push(label(470, 120, 'SIGNALS 06', { fill: C.ink }));
  nodes.push(label(470, 140, 'LATENCY 4MS', {}));
  nodes.push(label(470, 160, 'SOURCE LMS/A', {}));
  for (let i = 0; i < 3; i++) {
    nodes.push(circ(478, 196 + i * 26, 3, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine }));
  }
  nodes.push(dimH(70, 410, 430, 40, 40, { label: 'OBSERVE / 01' }));
  return plateShell(720, 540, 'why-observe', 'راقب', nodes);
}

function whyAdvise(): ArtDoc {
  const nodes: ArtNode[] = [];
  nodes.push(...planFragment(70, 90, 340, 300, 7));
  // the recommended route: royal arrowed polyline through rooms
  const route = new D(110, 140);
  route.l(200, 140).l(200, 250).l(330, 250).l(330, 350);
  nodes.push(path(route.toString(), { fill: 'none', stroke: C.sig, 'stroke-width': 2.5 }));
  // arrowheads
  nodes.push(path('M330 350l-7 -10h14z', { fill: C.sig, stroke: 'none' }));
  nodes.push(path('M110 140l10 -7v14z', { fill: C.sig, stroke: 'none' }));
  // decision diamonds
  for (const [dx, dy] of [[200, 140], [200, 250], [330, 250]] as Array<[number, number]>) {
    nodes.push(path(`M${dx} ${dy - 9}l9 9l-9 9l-9 -9z`, { fill: 'var(--r359-paper)', stroke: C.sig, 'stroke-width': W.fine }));
  }
  nodes.push(label(470, 120, 'PATH 3 OF 9', { fill: C.ink }));
  nodes.push(label(470, 140, 'CONF 0.87', {}));
  nodes.push(label(470, 160, 'RULES 12', {}));
  nodes.push(dimH(70, 410, 430, 40, 40, { label: 'ADVISE / 02' }));
  return plateShell(720, 540, 'why-advise', 'وجّه', nodes);
}

function whyAct(): ArtDoc {
  const nodes: ArtNode[] = [];
  nodes.push(...planFragment(70, 90, 340, 300, 11));
  // execution marks: X fixes at points + check ticks
  const spots: Array<[number, number]> = [[140, 160], [260, 140], [320, 240], [180, 300], [290, 330]];
  for (const [fx, fy] of spots) {
    nodes.push(node2(fx, fy, 9));
    nodes.push(path(`M${fx - 4} ${fy - 4}l8 8M${fx + 4} ${fy - 4}l-8 8`, { stroke: 'var(--r359-paper)', 'stroke-width': W.fine, fill: 'none' }));
  }
  // strike-through task list (right)
  nodes.push(label(470, 120, 'QUEUE 05', { fill: C.ink }));
  for (let i = 0; i < 4; i++) {
    const ly = 148 + i * 30;
    nodes.push(rect(470, ly - 10, 170, 16, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(line(470, ly - 10, 640, ly + 6, { stroke: C.ink, 'stroke-width': W.hair, opacity: i < 3 ? 0.85 : 0 }));
  }
  nodes.push(dimH(70, 410, 430, 40, 40, { label: 'ACT / 03' }));
  return plateShell(720, 540, 'why-act', 'نفّذ', nodes);
}

function whyLearn(): ArtDoc {
  const nodes: ArtNode[] = [];
  nodes.push(...planFragment(70, 90, 340, 300, 17));
  // the feedback loop: dashed royal circuit with 4 stations
  const cx = 240, cy = 240, rx = 118, ry = 96;
  nodes.push(circ(cx, cy, 8, { fill: C.sig, stroke: 'none' }));
  nodes.push(circ(cx, cy, 26, { fill: 'none', stroke: C.sig, 'stroke-width': W.hair, 'stroke-dasharray': '4 3' }));
  const loop = `M${cx + rx} ${cy}A${rx} ${ry} 0 1 1 ${cx - rx} ${cy}A${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`;
  nodes.push(path(loop, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '7 5' }));
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    nodes.push(node2(px, py, 10));
  }
  nodes.push(label(470, 120, 'EPOCH 42', { fill: C.ink }));
  nodes.push(label(470, 140, 'GAIN +3.1%', {}));
  nodes.push(label(470, 160, 'MSE 0.018', {}));
  // small mastery bar ladder
  for (let i = 0; i < 4; i++) {
    nodes.push(rect(470, 200 + i * 22, 30 + i * 26, 10, { fill: i === 3 ? C.sig : 'none', stroke: C.ink, 'stroke-width': W.hair }));
  }
  nodes.push(dimH(70, 410, 430, 40, 40, { label: 'LEARN / 04' }));
  return plateShell(720, 540, 'why-learn', 'تعلّم', nodes);
}

/* ═══════════════ section-problem-1..4 (640×480) ═════════════════ */

function problem1(): ArtDoc {
  // scattered lectures: drifting document boxes off a broken stack
  const nodes: ArtNode[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const bx = 320 + Math.cos(a) * (60 + (i % 3) * 52);
    const by = 220 + Math.sin(a) * (46 + (i % 2) * 40);
    nodes.push(rect(bx, by, 74, 52, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine, opacity: 0.9 }));
    nodes.push(line(bx + 10, by + 16, bx + 60, by + 16, { stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(line(bx + 10, by + 26, bx + 52, by + 26, { stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(line(bx + 10, by + 36, bx + 58, by + 36, { stroke: C.ink, 'stroke-width': W.hair }));
  }
  // dashed ghost of where the stack should be
  nodes.push(rect(288, 196, 84, 58, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  nodes.push(label(60, 60, 'LECTURES: 7 SOURCES', { fill: C.ink }));
  nodes.push(label(60, 424, '[01] SCATTER', { fill: C.ink }));
  return plateShell(640, 480, 'section-problem-1', 'لوحة المشكلة الأولى', nodes);
}

function problem2(): ArtDoc {
  // invisible mastery gaps: a matrix with hatched unknown cells
  const nodes: ArtNode[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      const gx = 110 + c * 72, gy = 90 + r * 58;
      const unknown = (r * 6 + c) % 7 === 3 || (r * 6 + c) % 11 === 5;
      nodes.push(rect(gx, gy, 62, 48, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
      if (unknown) {
        nodes.push(hatchPoly([[gx, gy], [gx + 62, gy], [gx + 62, gy + 48], [gx, gy + 48]], { angle: 45, pitch: 6, seed: r + c }));
        nodes.push(node2(gx + 62, gy, 8));
      } else if ((r + c) % 3 === 0) {
        nodes.push(stipplePoly([[gx, gy], [gx + 62, gy], [gx + 62, gy + 48], [gx, gy + 48]], 0.12, r * c + 2));
      }
    }
  }
  nodes.push(label(60, 60, 'MASTERY MATRIX / 30 CELLS · 9 UNKNOWN', { fill: C.ink }));
  nodes.push(label(60, 424, '[02] GAPS', { fill: C.ink }));
  return plateShell(640, 480, 'section-problem-2', 'لوحة المشكلة الثانية', nodes);
}

function problem3(): ArtDoc {
  // exam chaos: skewed paper stack + clock pressure
  const nodes: ArtNode[] = [];
  for (let i = 0; i < 5; i++) {
    const ox = 150 + i * 14, oy = 150 + i * 20;
    nodes.push(rect(ox, oy, 210, 140, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine, opacity: 1 - i * 0.12 }));
    nodes.push(line(ox + 16, oy + 30, ox + 180, oy + 30, { stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(line(ox + 16, oy + 50, ox + 150, oy + 50, { stroke: C.ink, 'stroke-width': W.hair }));
  }
  // the clock: heavy circle + hands
  nodes.push(circ(450, 220, 64, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(circ(450, 220, 4, { fill: C.ink, stroke: 'none' }));
  nodes.push(line(450, 220, 450, 178, { stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(line(450, 220, 486, 232, { stroke: C.sig, 'stroke-width': 2.5 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    nodes.push(line(450 + Math.cos(a) * 56, 220 + Math.sin(a) * 56, 450 + Math.cos(a) * 60, 220 + Math.sin(a) * 60, { stroke: C.ink, 'stroke-width': W.hair }));
  }
  nodes.push(label(60, 60, 'EXAM WEEK / 5 SECTIONS', { fill: C.ink }));
  nodes.push(label(60, 424, '[03] CHAOS', { fill: C.ink }));
  return plateShell(640, 480, 'section-problem-3', 'لوحة المشكلة الثالثة', nodes);
}

function problem4(): ArtDoc {
  // institutional silos: disconnected buildings, no paths
  const nodes: ArtNode[] = [];
  const blocks: Array<[number, number, number, number]> = [
    [90, 100, 120, 90], [330, 90, 140, 110], [520, 250, 90, 120], [180, 300, 130, 100], [420, 380, 120, 70],
  ];
  for (const [bx, by, bw, bh] of blocks) {
    nodes.push(rect(bx, by, bw, bh, { fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
    nodes.push(stipplePoly([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], 0.14, bx + by));
  }
  // the missing connections: dashed royal lines that never arrive (broken)
  nodes.push(path('M210 145H330M470 145L560 250M520 310H310M330 400H250', { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '4 6', fill: 'none', opacity: 0.9 }));
  for (const [bx, by, bw, bh] of blocks) {
    nodes.push(circ(bx + bw / 2, by + bh / 2, 3.5, { fill: C.sig, stroke: 'none' }));
  }
  nodes.push(label(60, 60, 'CAMPUS / 5 SILOS · 0 BRIDGES', { fill: C.ink }));
  nodes.push(label(60, 424, '[04] SILOS', { fill: C.ink }));
  return plateShell(640, 480, 'section-problem-4', 'لوحة المشكلة الرابعة', nodes);
}

/* ═══════ section-solution-* (960×640) ═══════════════════════════ */

function solutionLearning(): ArtDoc {
  const nodes: ArtNode[] = [];
  // plan base
  nodes.push(rect(70, 80, 820, 460, { fill: 'none', stroke: C.ink, 'stroke-width': 3 }));
  nodes.push(line(520, 80, 520, 540, { stroke: C.ink, 'stroke-width': 2 }));
  nodes.push(stairs(90, 100, 150, 200, 6));
  for (let i = 0; i < 6; i++) nodes.push(rect(560 + (i % 3) * 90, 120 + Math.floor(i / 3) * 120, 64, 44, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.7 }));
  // the chat widget card (floating)
  nodes.push(...uiCard(360, 150, 380, 300, 'ULARA · LEARNING CHAT'));
  nodes.push(rect(386, 200, 220, 44, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  nodes.push(label(398, 226, 'سؤال الطالب عن مفهوم الخوارزميات', { 'font-size': 11 }));
  nodes.push(rect(500, 260, 220, 58, { fill: C.sig, stroke: 'none' }));
  nodes.push(label(512, 286, 'إجابة مرشَّحة من مصفوفة إتقانك', { fill: 'var(--r359-paper)', 'font-size': 11 }));
  nodes.push(rect(386, 340, 300, 40, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  nodes.push(rect(660, 348, 18, 24, { fill: C.ink, stroke: 'none' }));
  // checkpoint bubble on the plan
  nodes.push(node2(200, 380, 12));
  nodes.push(link(200, 380, 360, 300));
  nodes.push(label(80, 580, 'SOLUTION 01 / LEARNING — المحادثة ترشد الطالب', { fill: C.ink }));
  return plateShell(960, 640, 'section-solution-learning', 'الحل — منصة التعلّم', nodes);
}

function solutionInstitution(): ArtDoc {
  const nodes: ArtNode[] = [];
  nodes.push(rect(70, 80, 820, 460, { fill: 'none', stroke: C.ink, 'stroke-width': 3 }));
  nodes.push(line(70, 300, 890, 300, { stroke: C.ink, 'stroke-width': 2 }));
  for (let i = 0; i < 5; i++) nodes.push(rect(100 + i * 150, 110, 110, 70, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.6 }));
  // the dashboard card
  nodes.push(...uiCard(300, 220, 420, 300, 'ULARA · INSTITUTION DASH'));
  // stat tiles
  for (let i = 0; i < 3; i++) {
    nodes.push(rect(326 + i * 128, 270, 112, 70, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(label(336 + i * 128, 296, ['1,240', '58', '7'][i]!, { 'font-size': 20, fill: C.ink }));
    nodes.push(label(336 + i * 128, 316, ['STUDENTS', 'COURSES', 'SCHOOLS'][i]!, {}));
  }
  // table rows
  for (let i = 0; i < 4; i++) {
    nodes.push(line(326, 366 + i * 30, 694, 366 + i * 30, { stroke: C.hair, 'stroke-width': W.hair }));
    nodes.push(label(336, 384 + i * 30, `ROW ${i + 1} · SECTION 0${i + 1}`, {}));
    nodes.push(rect(668, 372 + i * 30, 18, 12, { fill: i === 1 ? C.sig : 'none', stroke: C.ink, 'stroke-width': W.hair }));
  }
  nodes.push(node2(760, 480, 12));
  nodes.push(link(760, 480, 720, 520));
  nodes.push(label(80, 580, 'SOLUTION 02 / INSTITUTION — لوحة المؤسسة', { fill: C.ink }));
  return plateShell(960, 640, 'section-solution-institution', 'الحل — إدارة المؤسسة', nodes);
}

/* ═══════════════ section-intro (1440×460) ═══════════════════════ */

function sectionIntro(): ArtDoc {
  const nodes: ArtNode[] = [];
  // four zones with registration + drawn motif per zone
  const zones: Array<[string, (x: number) => ArtNode[]]> = [
    ['01', (x) => {
      const out: ArtNode[] = [tree(x + 90, 240, 190, { seed: 4, depth: 6 })];
      out.push(line(x, 250, x + 190, 250, { stroke: C.ink, 'stroke-width': 4 }));
      return out;
    }],
    ['02', (x) => {
      const out: ArtNode[] = [rect(x + 20, 100, 160, 160, { fill: 'none', stroke: C.ink, 'stroke-width': 3 })];
      out.push(...Array.from({ length: 4 }, (_, i) => line(x + 20, 132 + i * 40, x + 180, 132 + i * 40, { stroke: C.ink, 'stroke-width': 1.5 })));
      return out;
    }],
    ['03', (x) => {
      const out: ArtNode[] = [stairs(x + 20, 240, x + 180, 110, 7, 'elev', { 'stroke-width': W.med })];
      out.push(hatchPoly([[x + 20, 240], [x + 180, 240], [x + 180, 252], [x + 20, 252]], { angle: 45, pitch: 6, seed: 3 }));
      return out;
    }],
    ['04', (x) => {
      const out: ArtNode[] = [circ(x + 100, 170, 72, { fill: 'none', stroke: C.ink, 'stroke-width': 3 })];
      out.push(node2(x + 100, 170, 10));
      out.push(circ(x + 100, 170, 26, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '4 3' }));
      return out;
    }],
  ];
  zones.forEach((z, i) => {
    const x = 60 + i * 350;
    nodes.push(...frame4(x, i));
    nodes.push(label(x + 14, 70, `[${z[0]}]`, { 'font-size': 13, fill: C.ink }));
    nodes.push(...z[1](x));
  });
  function frame4(x: number, _i: number): ArtNode[] {
    return [
      line(x, 40, x, 300, { stroke: C.hair, 'stroke-width': W.hair }),
      line(x + 20, 40, x + 20, 300, { stroke: C.hair, 'stroke-width': W.hair, opacity: 0.5 }),
    ];
  }
  nodes.push(label(60, 380, 'SECTION / INTRO — أربع محطات في رحلة الحرم', { fill: C.ink }));
  nodes.push(dashRule(60, 400, 1380, 400));
  nodes.push(label(60, 430, '[SCROLL TO CONTINUE]', { fill: C.sig }));
  return plateShell(1440, 460, 'section-intro', 'لوحة المقدمة', nodes);
}

/* ═══════════════ cta-sketch (1200×630) ══════════════════════════ */

function ctaSketch(): ArtDoc {
  const nodes: ArtNode[] = [];
  // the royal circle (sun) + slab — flat, zero-stroke, no gradient
  nodes.push(circ(330, 220, 150, { fill: C.sig, stroke: 'none' }));
  nodes.push(rect(180, 420, 300, 56, { fill: C.sig, stroke: 'none' }));
  // paper echo disc
  nodes.push(circ(520, 320, 54, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  // elevation fragment rising left-to-right (ink)
  const nodes2: ArtNode[] = [];
  nodes2.push(rect(560, 300, 220, 180, { fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
  nodes2.push(rect(580, 330, 60, 44, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  nodes2.push(rect(660, 330, 100, 60, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  nodes2.push(stipplePoly([[560, 300], [780, 300], [780, 480], [560, 480]], 0.12, 5));
  nodes2.push(tree(830, 480, 210, { seed: 12, depth: 6 }));
  nodes.push(...nodes2);
  // plan corner with dashed learn-path (upper right)
  nodes.push(rect(880, 90, 260, 170, { fill: 'none', stroke: C.ink, 'stroke-width': 2 }));
  for (let i = 0; i < 3; i++) nodes.push(line(880, 132 + i * 42, 1140, 132 + i * 42, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.6 }));
  nodes.push(path('M900 220L980 140L1080 200', { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '6 5' }));
  nodes.push(node2(1080, 200, 9));
  // ground line
  nodes.push(line(140, 500, 1060, 500, { stroke: C.ink, 'stroke-width': 6 }));
  nodes.push(label(140, 560, 'SEE WHAT ULARA CAN DO — شاهد ما تصنعه أُلارا', { fill: C.ink }));
  nodes.push(label(140, 584, 'CTA / A-460', {}));
  return plateShell(1200, 630, 'cta-sketch', 'رسم الدعوة الختامية', nodes);
}

/* ── registry ───────────────────────────────────────────────────── */

export const SCENES: Record<string, ArtBuilder> = {
  'why-observe': whyObserve,
  'why-advise': whyAdvise,
  'why-act': whyAct,
  'why-learn': whyLearn,
  'section-problem-1': problem1,
  'section-problem-2': problem2,
  'section-problem-3': problem3,
  'section-problem-4': problem4,
  'section-solution-learning': solutionLearning,
  'section-solution-institution': solutionInstitution,
  'section-intro': sectionIntro,
  'cta-sketch': ctaSketch,
};

export function sceneFor(key: string): ArtBuilder {
  const b = SCENES[key];
  if (!b) throw new Error(`r359 sections scene missing: ${key}`);
  return b;
}
