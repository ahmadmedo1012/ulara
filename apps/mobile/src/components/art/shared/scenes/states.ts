/**
 * shared/art/scenes/states.ts — r359 state graphics + utility marks (A2).
 *
 * empty-* / error-* / maintenance: the same drafting grammar at small
 * scale — a paper sheet, hairline furniture, ONE royal accent, mono
 * micro-captions. Never cute, never colored beyond the signal.
 *
 * marks: the exact callout-tag / dimension-line / registration-cross
 * anatomy the pages compose from.
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, MONO, W, circ, dashRule, hatchPoly, label, line,
  path, rect, stipplePoly, tree,
} from '../grammar';

/** signal node (small royal square) */
function node2(x: number, y: number, s = 7): ArtNode {
  return rect(x - s / 2, y - s / 2, s, s, { fill: C.sig, stroke: 'none' });
}

/* ── shell for state plates ─────────────────────────────────────── */

function stateShell(w: number, h: number, key: string, title: string, nodes: ArtNode[]): ArtDoc {
  return {
    w, h, title,
    nodes: [
      ...nodes,
      label(14, h - 12, `[${key.toUpperCase()}]`, { 'font-size': MONO, fill: C.ink }),
    ],
  };
}

/* a shared "sheet" motif: two overlapping paper sheets, hairline */
function sheets(cx: number, cy: number, s: number): ArtNode[] {
  return [
    rect(cx - s * 0.62, cy - s * 0.5, s * 0.86, s * 1.1, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine, opacity: 0.55 }),
    rect(cx - s * 0.3, cy - s * 0.62, s * 0.86, s * 1.1, { fill: 'var(--r359-paper)', stroke: C.ink, 'stroke-width': W.fine }),
  ];
}

function contentLines(cx: number, cy: number, s: number, n = 3): ArtNode[] {
  const out: ArtNode[] = [];
  for (let i = 0; i < n; i++) {
    out.push(line(cx - s * 0.14, cy - s * 0.3 + i * s * 0.22, cx + s * 0.4, cy - s * 0.3 + i * s * 0.22,
      { stroke: C.ink, 'stroke-width': W.hair }));
  }
  return out;
}

/* ═══════════════════ empties (320×320) ══════════════════════════ */

function emptyCourses(): ArtDoc {
  const nodes: ArtNode[] = [];
  nodes.push(...sheets(160, 148, 120));
  nodes.push(...contentLines(160, 148, 120));
  // the missing course seat: dashed royal outline
  nodes.push(rect(118, 196, 84, 56, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '6 4' }));
  nodes.push(line(112, 258, 208, 258, { stroke: C.ink, 'stroke-width': 3 }));
  nodes.push(node2(160, 224, 10));
  return stateShell(320, 320, 'empty-courses', 'لا مقرّرات بعد', nodes);
}

function emptyNotifications(): ArtDoc {
  const nodes: ArtNode[] = [];
  // a signal-flag on a hairline pole — nothing arrived
  nodes.push(line(160, 62, 160, 220, { stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(rect(160, 62, 84, 54, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(node2(236, 70, 12));
  nodes.push(line(176, 84, 228, 84, { stroke: C.ink, 'stroke-width': W.hair }));
  nodes.push(line(176, 98, 214, 98, { stroke: C.ink, 'stroke-width': W.hair }));
  // ground rule + empty tray
  nodes.push(line(96, 226, 224, 226, { stroke: C.ink, 'stroke-width': 3 }));
  nodes.push(rect(120, 226, 80, 26, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.7 }));
  nodes.push(dashRule(96, 262, 224, 262));
  return stateShell(320, 320, 'empty-notifications', 'لا إشعارات', nodes);
}

function emptySearch(): ArtDoc {
  const nodes: ArtNode[] = [];
  // the surveyor's lens: circle + crosshair + empty result lines
  nodes.push(circ(160, 140, 64, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(line(160, 60, 160, 220, { stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '5 4' }));
  nodes.push(line(80, 140, 240, 140, { stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '5 4' }));
  nodes.push(line(196, 176, 232, 212, { stroke: C.ink, 'stroke-width': W.heavy }));
  // result rows: dashed empties
  for (let i = 0; i < 3; i++) {
    nodes.push(rect(96, 238 + i * 22, 128, 12, { fill: 'none', stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '4 3' }));
  }
  nodes.push(node2(160, 140, 8));
  return stateShell(320, 320, 'empty-search', 'لا نتائج للبحث', nodes);
}

function emptyInstitution(): ArtDoc {
  const nodes: ArtNode[] = [];
  // an unpopulated site: boundary + one poché block + a vacant plot
  nodes.push(dashRule(70, 80, 250, 80), dashRule(250, 80, 250, 240), dashRule(250, 240, 70, 240), dashRule(70, 240, 70, 80));
  nodes.push(rect(92, 104, 74, 58, { fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
  nodes.push(stipplePoly([[92, 104], [166, 104], [166, 162], [92, 162]], 0.16, 3));
  nodes.push(rect(176, 104, 56, 58, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '6 4' }));
  nodes.push(tree(216, 236, 44, { seed: 6, depth: 4 }));
  nodes.push(node2(204, 132, 9));
  return stateShell(320, 320, 'empty-institution', 'لا مؤسسات', nodes);
}

function emptyResearch(): ArtDoc {
  const nodes: ArtNode[] = [];
  // an open notebook with an empty graph axis
  nodes.push(...sheets(160, 140, 110));
  nodes.push(line(120, 190, 208, 190, { stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(line(120, 190, 120, 116, { stroke: C.ink, 'stroke-width': W.fine }));
  // the missing curve: dashed royal with a single plotted point
  nodes.push(path('M120 180Q150 150 208 130', { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '6 4' }));
  nodes.push(node2(164, 158, 9));
  nodes.push(line(96, 214, 224, 214, { stroke: C.ink, 'stroke-width': 3 }));
  return stateShell(320, 320, 'empty-research', 'لا أبحاث', nodes);
}

/* ═══════════════════ errors (480×360) ═══════════════════════════ */

function error404(): ArtDoc {
  const nodes: ArtNode[] = [];
  // huge hairline 404 with a surveyed gap
  const d = (x: number): ArtNode[] => [
    line(x, 110, x, 250, { stroke: C.ink, 'stroke-width': 10 }),
  ];
  nodes.push(...d(150));
  nodes.push(circ(240, 180, 62, { fill: 'none', stroke: C.ink, 'stroke-width': 10 }));
  nodes.push(node2(240, 180, 12));
  nodes.push(...d(330));
  // registration + dashed rule
  nodes.push(dashRule(90, 292, 390, 292));
  nodes.push(label(90, 316, 'PAGE NOT SURVEYED — الصفحة خارج المخطط', { fill: C.ink }));
  return stateShell(480, 360, 'error-404', 'الصفحة غير موجودة', nodes);
}

function error500(): ArtDoc {
  const nodes: ArtNode[] = [];
  // the crane collapsed: broken structure lines
  nodes.push(rect(110, 130, 120, 120, { fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
  nodes.push(path('M240 250L300 170L360 250', { fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
  // the fault: signal zigzag
  nodes.push(path('M250 110l20 26l-26 16l22 26', { fill: 'none', stroke: C.sig, 'stroke-width': 3 }));
  nodes.push(line(90, 270, 390, 270, { stroke: C.ink, 'stroke-width': 5 }));
  nodes.push(stipplePoly([[110, 250], [230, 250], [230, 262], [110, 262]], 0.3, 8));
  nodes.push(label(90, 306, 'STRUCTURAL FAULT — عطل في البنية', { fill: C.ink }));
  return stateShell(480, 360, 'error-500', 'خطأ في الخادم', nodes);
}

function error403(): ArtDoc {
  const nodes: ArtNode[] = [];
  // the locked gate: heavy portal + royal seal
  nodes.push(rect(150, 100, 180, 160, { fill: 'none', stroke: C.ink, 'stroke-width': 6 }));
  nodes.push(line(150, 180, 330, 180, { stroke: C.ink, 'stroke-width': 4 }));
  nodes.push(rect(196, 148, 40, 64, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  // the seal
  nodes.push(circ(240, 148, 22, { fill: C.sig, stroke: 'none' }));
  nodes.push(path('M232 148h16M240 140v16', { stroke: 'var(--r359-paper)', 'stroke-width': W.fine, fill: 'none' }));
  // hatched denial zone
  nodes.push(hatchPoly([[150, 260], [330, 260], [330, 292], [150, 292]], { angle: 45, pitch: 7, seed: 4 }));
  nodes.push(label(150, 316, 'ACCESS NOT GRANTED — الدخول غير مسموح', { fill: C.ink }));
  return stateShell(480, 360, 'error-403', 'غير مسموح بالوصول', nodes);
}

function maintenance(): ArtDoc {
  const nodes: ArtNode[] = [];
  // scaffolding against a facade under repair
  nodes.push(rect(120, 90, 240, 170, { fill: 'none', stroke: C.ink, 'stroke-width': 3 }));
  for (let i = 0; i < 4; i++) nodes.push(line(120, 120 + i * 40, 360, 120 + i * 40, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.6 }));
  // scaffold: verticals + ledgers + diagonal brace
  for (const sx of [140, 200, 280, 340]) nodes.push(line(sx, 260, sx, 300, { stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(line(132, 276, 348, 276, { stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(path('M140 300L200 276M280 300L340 276', { stroke: C.ink, 'stroke-width': W.fine, fill: 'none' }));
  // the works tag
  nodes.push(rect(196, 60, 96, 22, { fill: C.sig, stroke: 'none' }));
  nodes.push(label(244, 75, 'WIP-007', { fill: 'var(--r359-paper)', 'text-anchor': 'middle' }));
  nodes.push(stipplePoly([[120, 260], [360, 260], [360, 272], [120, 272]], 0.28, 6));
  nodes.push(label(120, 326, 'UNDER CONSTRUCTION — تحت الصيانة', { fill: C.ink }));
  return stateShell(480, 360, 'maintenance', 'الموقع تحت الصيانة', nodes);
}

/* ═══════════════════ marks (exact anatomy) ══════════════════════ */

function calloutTag(): ArtDoc {
  // the canonical callout anatomy, labelled
  const nodes: ArtNode[] = [
    // anchor cross + square
    line(30, 60, 90, 60, { stroke: C.hair, 'stroke-width': W.hair }),
    line(60, 30, 60, 90, { stroke: C.hair, 'stroke-width': W.hair }),
    rect(54, 54, 12, 12, { fill: C.sig, stroke: 'none' }),
    // leader
    line(66, 60, 104, 44, { stroke: C.sig, 'stroke-width': W.fine }),
    // 0-radius tag, signal fill, white mono
    rect(104, 34, 128, 22, { fill: C.sig, stroke: 'none' }),
    label(168, 48.5, 'ULARA-001', { fill: 'var(--r359-paper)', 'text-anchor': 'middle' }),
    // spec captions
    label(16, 108, 'ANCHOR 12PX · LEADER 0.75 · TAG H22 · R0 · MONO 9', {}),
  ];
  return { w: 260, h: 120, title: 'وسم توضيحي', nodes };
}

function dimensionLine(): ArtDoc {
  const nodes: ArtNode[] = [
    // extension lines
    line(24, 16, 24, 52, { stroke: C.hair, 'stroke-width': W.hair }),
    line(296, 16, 296, 52, { stroke: C.hair, 'stroke-width': W.hair }),
    // the dim line + 45° slash ticks
    line(24, 44, 296, 44, { stroke: C.ink, 'stroke-width': W.fine }),
    line(20, 48, 28, 40, { stroke: C.ink, 'stroke-width': W.fine }),
    line(292, 48, 300, 40, { stroke: C.ink, 'stroke-width': W.fine }),
    label(160, 34, '14400MM', { 'text-anchor': 'middle', fill: C.ink }),
    label(16, 68, 'EXT HAIR · DIM 1.25 · TICK 45° · MONO 9', {}),
  ];
  return { w: 320, h: 80, title: 'خط الأبعاد', nodes };
}

function registrationCross(): ArtDoc {
  const nodes: ArtNode[] = [
    line(8, 24, 40, 24, { stroke: C.hair, 'stroke-width': W.hair }),
    line(24, 8, 24, 40, { stroke: C.hair, 'stroke-width': W.hair }),
    circ(24, 24, 3, { fill: C.ink, stroke: 'none' }),
  ];
  return { w: 48, h: 48, title: 'علامة تسجيل', nodes };
}

/* ── registry ───────────────────────────────────────────────────── */

export const SCENES: Record<string, ArtBuilder> = {
  'empty-courses': emptyCourses,
  'empty-notifications': emptyNotifications,
  'empty-search': emptySearch,
  'empty-institution': emptyInstitution,
  'empty-research': emptyResearch,
  'error-404': error404,
  'error-500': error500,
  'error-403': error403,
  maintenance,
  'callout-tag': calloutTag,
  'dimension-line': dimensionLine,
  'registration-cross': registrationCross,
};

export function sceneFor(key: string): ArtBuilder {
  const b = SCENES[key];
  if (!b) throw new Error(`r359 states scene missing: ${key}`);
  return b;
}
