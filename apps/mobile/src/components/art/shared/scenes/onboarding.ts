/**
 * shared/art/scenes/onboarding.ts — r359 mobile onboarding + splash (A2).
 *
 * Portrait plates (390×520) in the same drafting grammar: one big
 * drawn motif per step, bracketed index, mono progress readout, ONE
 * royal accent. splash-mark-motion draws the ULARA mark as a
 * construction sheet (the mark geometry itself is reproduced
 * faithfully, never altered — logo gate stays green).
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, W, circ, dashRule, hatchPoly, label, line, path, rect,
  stipplePoly, tree,
} from '../grammar';

function obShell(w: number, h: number, idx: string, title: string, nodes: ArtNode[]): ArtDoc {
  return {
    w, h, title,
    nodes: [
      ...nodes,
      label(22, 42, `[${idx}]`, { 'font-size': 13, fill: C.ink }),
      label(w - 22, 42, `${idx} / 04`, { 'text-anchor': 'end' }),
      dashRule(22, 56, w - 22, 56),
      label(22, h - 22, `X:${w}PX / Y:${h}PX`, {}),
    ],
  };
}

function onboarding1(): ArtDoc {
  const nodes: ArtNode[] = [];
  // organized learning: an elevation fragment + tiered rows
  nodes.push(line(30, 380, 360, 380, { stroke: C.ink, 'stroke-width': 5 }));
  nodes.push(rect(70, 210, 250, 170, { fill: 'none', stroke: C.ink, 'stroke-width': 3.5 }));
  for (const fy of [265, 320]) nodes.push(line(70, fy, 320, fy, { stroke: C.ink, 'stroke-width': 2 }));
  nodes.push(rect(88, 228, 42, 26, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(stipplePoly([[70, 210], [320, 210], [320, 380], [70, 380]], 0.1, 3));
  nodes.push(tree(46, 380, 120, { seed: 2, depth: 5 }));
  nodes.push(tree(348, 380, 132, { seed: 7, depth: 5 }));
  // lecture rows motif above
  for (let i = 0; i < 3; i++) {
    nodes.push(path(`M90 ${130 + i * 26}Q195 ${120 + i * 26} 300 ${130 + i * 26}`, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  }
  nodes.push(rect(160, 84, 70, 22, { fill: C.sig, stroke: 'none' }));
  nodes.push(label(195, 99, 'LECTURE', { fill: 'var(--r359-paper)', 'text-anchor': 'middle' }));
  return obShell(390, 520, '01', 'الترحيب — تعلّم منظّم', nodes);
}

function onboarding2(): ArtDoc {
  const nodes: ArtNode[] = [];
  // mastery matrix: grid with graded fills + one gap flagged
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const gx = 60 + c * 68, gy = 110 + r * 62;
      nodes.push(rect(gx, gy, 58, 52, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
      const v = (r * 4 + c) % 5;
      if (v === 0) nodes.push(stipplePoly([[gx, gy], [gx + 58, gy], [gx + 58, gy + 52], [gx, gy + 52]], 0.4, r + c));
      else if (v < 3) nodes.push(stipplePoly([[gx, gy], [gx + 58, gy], [gx + 58, gy + 52], [gx, gy + 52]], 0.14, r + c + 3));
      if (v === 4) {
        nodes.push(hatchPoly([[gx, gy], [gx + 58, gy], [gx + 58, gy + 52], [gx, gy + 52]], { angle: 45, pitch: 6, seed: r }));
        nodes.push(rect(gx + 48, gy, 10, 10, { fill: C.sig, stroke: 'none' }));
      }
    }
  }
  nodes.push(label(60, 92, 'MASTERY / 16 CONCEPTS · 1 GAP', { fill: C.ink }));
  nodes.push(label(60, 420, 'الفجوة تُرصد قبل الاختبار', { 'font-size': 13 }));
  return obShell(390, 520, '02', 'الترحيب — مصفوفة الإتقان', nodes);
}

function onboarding3(): ArtDoc {
  const nodes: ArtNode[] = [];
  // exams: desk grid + timer
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      nodes.push(rect(70 + c * 88, 130 + r * 84, 58, 32, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    }
  }
  nodes.push(rect(70, 390, 234, 36, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(label(82, 412, 'INVIGILATOR', {}));
  // timer: heavy circle + royal hand
  nodes.push(circ(300, 120, 44, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(circ(300, 120, 3, { fill: C.ink, stroke: 'none' }));
  nodes.push(line(300, 120, 300, 92, { stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(line(300, 120, 326, 130, { stroke: C.sig, 'stroke-width': 2.5 }));
  nodes.push(label(60, 92, 'EXAM / 29:55 REMAINING', { fill: C.ink }));
  nodes.push(label(70, 460, 'كل ثانية محسوبة وموثّقة', { 'font-size': 13 }));
  return obShell(390, 520, '03', 'الترحيب — الاختبارات', nodes);
}

function onboarding4(): ArtDoc {
  const nodes: ArtNode[] = [];
  // your institution: mini campus + join seal
  nodes.push(dashRule(40, 90, 350, 90), dashRule(350, 90, 350, 380), dashRule(350, 380, 40, 380), dashRule(40, 380, 40, 90));
  const blocks: Array<[number, number, number, number, string]> = [
    [66, 116, 96, 70, 'A'], [220, 116, 100, 90, 'B'], [90, 250, 90, 80, 'C'], [230, 280, 84, 60, 'D'],
  ];
  for (const [bx, by, bw, bh, id] of blocks) {
    nodes.push(rect(bx, by, bw, bh, { fill: 'none', stroke: C.ink, 'stroke-width': 3.5 }));
    nodes.push(stipplePoly([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], 0.13, bx + by));
    nodes.push(label(bx + bw / 2, by + bh / 2 + 3, id, { 'text-anchor': 'middle', fill: C.ink }));
  }
  nodes.push(tree(320, 372, 64, { seed: 5, depth: 4 }));
  // the join seal: royal square + dashed ring
  nodes.push(rect(170, 200, 40, 40, { fill: C.sig, stroke: 'none' }));
  nodes.push(circ(190, 220, 38, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  nodes.push(label(60, 420, 'مؤسستك تُدار من مخطط واحد', { 'font-size': 13 }));
  return obShell(390, 520, '04', 'الترحيب — مؤسستك', nodes);
}

/* ═══════════════════ splash-mark-motion (480×480) ═══════════════ */

function splashMark(): ArtDoc {
  const nodes: ArtNode[] = [];
  const cx = 240, cy = 252, S = 12; // mark at 12× on the 480 sheet
  // construction furniture (the logo construction sheet)
  nodes.push(dashRule(60, 84, 420, 84));
  nodes.push(dashRule(60, 420, 420, 420));
  nodes.push(label(60, 74, 'GRID 8PX · CAP ROUND · W 1.5@32', {}));
  // the mark, redrawn faithfully at scale (U arc + royal square)
  // the U arc in mark coords: (9,7) → (9,19) Q(9,27)(16,27) Q(23,27)(23,19) → (23,7)
  const mx = (v: number): number => cx - 16 * S + v * S;
  const my = (v: number): number => cy - 14.5 * S + v * S;
  nodes.push(path(
    `M${mx(9)} ${my(7)}L${mx(9)} ${my(19)}Q${mx(9)} ${my(27)} ${mx(16)} ${my(27)}Q${mx(23)} ${my(27)} ${mx(23)} ${my(19)}L${mx(23)} ${my(7)}`,
    { fill: 'none', stroke: C.ink, 'stroke-width': 1.5 * S * 0.42, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-a': 'draw' },
  ));
  // the royal cornerstone (21,3,4×4)
  nodes.push(rect(mx(21), my(3), 4 * S, 4 * S, { fill: C.sig, stroke: 'none', 'data-a': 'pulse' }));
  // construction circles + centers for the arc quadrants
  nodes.push(circ(mx(9), my(19), 8 * S, { fill: 'none', stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '4 4' }));
  nodes.push(circ(mx(23), my(19), 8 * S, { fill: 'none', stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '4 4' }));
  nodes.push(circ(mx(9), my(19), 2.4, { fill: C.ink, stroke: 'none' }));
  nodes.push(circ(mx(23), my(19), 2.4, { fill: C.ink, stroke: 'none' }));
  // dimension callouts to the square
  nodes.push(line(mx(23), my(3), mx(29), my(-4), { stroke: C.sig, 'stroke-width': W.fine }));
  nodes.push(rect(mx(29), my(-11), 96, 20, { fill: C.sig, stroke: 'none' }));
  nodes.push(label(mx(29) + 48, my(2.5), 'STONE 4×4', { fill: 'var(--r359-paper)', 'text-anchor': 'middle' }));
  // base rule
  nodes.push(line(96, 420, 384, 420, { stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(label(96, 444, 'ULARA / SPLASH — أُلارا', { fill: C.ink }));
  return { w: 480, h: 480, title: 'شعار أُلارا المتحرّك', nodes };
}

/* ── registry ───────────────────────────────────────────────────── */

export const SCENES: Record<string, ArtBuilder> = {
  'onboarding-1': onboarding1,
  'onboarding-2': onboarding2,
  'onboarding-3': onboarding3,
  'onboarding-4': onboarding4,
  'splash-mark-motion': splashMark,
};

export function sceneFor(key: string): ArtBuilder {
  const b = SCENES[key];
  if (!b) throw new Error(`r359 onboarding scene missing: ${key}`);
  return b;
}
