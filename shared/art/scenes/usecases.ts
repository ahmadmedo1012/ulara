/**
 * shared/art/scenes/usecases.ts — r359 role plates (A2).
 *
 * Six use-case rows: a role-specific plan/drawing under a hairline
 * instrument card (the reference's "screenshot-like composition over
 * a plan"), each with one royal accent and a title-block bar.
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, W, circ, label, line, path, rect,
  stipplePoly, tree,
} from '../grammar';

/* ── shared composition helpers ─────────────────────────────────── */

function drawRolePlate(w: number, h: number, key: string, title: string, code: string, nodes: ArtNode[]): ArtDoc {
  return {
    w, h, title,
    nodes: [
      ...nodes,
      line(70, h - 74, 550, h - 74, { stroke: C.ink, 'stroke-width': W.med }),
      label(70, h - 54, `${code} / USECASE`, { fill: C.ink }),
      label(550, h - 54, 'SCALE 1:150', { 'text-anchor': 'end' }),
      label(20, h - 16, `[${key.toUpperCase()}]`, { fill: C.ink }),
      label(w - 20, h - 16, `X:${w}PX / Y:${h}PX`, { 'text-anchor': 'end' }),
    ],
  };
}

/** hairline instrument card (top-right, floating) */
function card(x: number, y: number, w: number, h: number, head: string): ArtNode[] {
  return [
    rect(x, y, w, h, { fill: 'var(--r359-paper)', stroke: C.ink, 'stroke-width': W.fine }),
    rect(x, y, w, 24, { fill: C.ink, stroke: 'none' }),
    label(x + 10, y + 16, head, { fill: 'var(--r359-paper)' }),
  ];
}

/** mini plan base (role-specific rooms drawn per plate) */
function base(): ArtNode[] {
  return [rect(70, 70, 820, 420, { fill: 'none', stroke: C.ink, 'stroke-width': 4 })];
}

/* ═══════════════════ the six roles ═══════════════════════════════ */

function usecaseStudent(): ArtDoc {
  const nodes: ArtNode[] = base();
  // lecture room: tier rows
  for (let i = 0; i < 4; i++) {
    nodes.push(path(`M120 ${140 + i * 60}Q290 ${120 + i * 60} 460 ${140 + i * 60}`, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  }
  nodes.push(rect(220, 84, 140, 34, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  // mastery matrix card
  nodes.push(...card(520, 100, 320, 220, 'STUDENT / MASTERY'));
  const bars = [['DP', 0.82], ['GREEDY', 0.55], ['INDEX', 0.4], ['QUICK', 0.85]];
  bars.forEach(([nm, v], i) => {
    const by = 150 + i * 40;
    nodes.push(label(540, by + 10, String(nm), {}));
    nodes.push(rect(620, by, 180, 12, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(rect(620, by, 180 * Number(v), 12, { fill: i === 2 ? C.sig : C.ink, stroke: 'none', opacity: 0.85 }));
  });
  nodes.push(label(540, 306, 'NEXT: GREEDY — الخوارزميات الجشعة', { fill: C.ink }));
  // royal link from a seat to the matrix
  nodes.push(rect(266, 196, 16, 12, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine }));
  nodes.push(line(282, 202, 520, 180, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  return drawRolePlate(960, 640, 'usecase-student', 'حالة الطالب', 'STU-01', nodes);
}

function usecaseTeacher(): ArtDoc {
  const nodes: ArtNode[] = base();
  // classroom desks grid
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      nodes.push(rect(120 + c * 96, 120 + r * 90, 62, 34, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    }
  }
  nodes.push(rect(150, 400, 220, 40, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  // gradebook card
  nodes.push(...card(520, 100, 320, 240, 'TEACHER / GRADEBOOK'));
  const rows = [['A. MAHDI', '90', '66', '78'], ['S. RABII', '84', '74', '79'], ['K. OMRAN', '72', '88', '80'], ['N. SALEM', '88', '91', '89']];
  rows.forEach((r, i) => {
    const ry = 150 + i * 40;
    nodes.push(line(536, ry - 12, 824, ry - 12, { stroke: C.hair, 'stroke-width': W.hair }));
    nodes.push(label(540, ry, r[0]!, {}));
    nodes.push(label(716, ry, r[1]!, { 'text-anchor': 'end' }));
    nodes.push(label(758, ry, r[2]!, { 'text-anchor': 'end' }));
    nodes.push(label(806, ry, r[3]!, { 'text-anchor': 'end', fill: C.ink }));
  });
  nodes.push(label(540, 316, 'AVG 79% — 12 WAITING REVIEW', { fill: C.ink }));
  // flag one desk
  nodes.push(rect(312, 300, 62, 34, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 3' }));
  nodes.push(line(374, 317, 520, 220, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  return drawRolePlate(960, 640, 'usecase-teacher', 'حالة الأستاذ', 'TCH-02', nodes);
}

function usecaseAdmin(): ArtDoc {
  const nodes: ArtNode[] = base();
  // office partitions
  nodes.push(line(70, 280, 500, 280, { stroke: C.ink, 'stroke-width': 2 }));
  for (let i = 0; i < 3; i++) nodes.push(line(170 + i * 120, 70, 170 + i * 120, 280, { stroke: C.ink, 'stroke-width': 2 }));
  for (let i = 0; i < 5; i++) nodes.push(rect(96 + i * 82, 110, 54, 28, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  // roles card
  nodes.push(...card(520, 100, 320, 240, 'ADMIN / ROLES'));
  const roles = [['OWNER', 'ON'], ['SYS ADMIN', 'ON'], ['QUALITY', 'PEND'], ['AUDITOR', 'OFF']];
  roles.forEach((r, i) => {
    const ry = 152 + i * 42;
    nodes.push(label(540, ry, r[0]!, {}));
    // toggle: square track + royal knob
    nodes.push(rect(776, ry - 12, 40, 16, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    if (r[1] === 'ON') nodes.push(rect(776, ry - 12, 20, 16, { fill: C.sig, stroke: 'none' }));
    else if (r[1] === 'PEND') nodes.push(rect(790, ry - 12, 12, 16, { fill: C.ink, stroke: 'none', opacity: 0.4 }));
    else nodes.push(rect(796, ry - 12, 20, 16, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
  });
  nodes.push(label(540, 316, '22 MEMBERS · 4 ROLES · 1 PENDING', { fill: C.ink }));
  nodes.push(line(290, 210, 520, 200, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  nodes.push(rect(278, 202, 14, 14, { fill: C.sig, stroke: 'none' }));
  return drawRolePlate(960, 640, 'usecase-admin', 'حالة إدارة النظام', 'ADM-03', nodes);
}

function usecaseQuality(): ArtDoc {
  const nodes: ArtNode[] = base();
  // exam hall desks
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      nodes.push(rect(110 + c * 82, 110 + r * 80, 54, 30, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    }
  }
  nodes.push(circ(290, 90, 10, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  // audit card
  nodes.push(...card(520, 100, 320, 240, 'QUALITY / AUDIT'));
  const audits = [['QUIZ U2 — SE', 'PASS'], ['LAB 1 — DB', 'REVIEW'], ['FINAL — ALGO', 'PASS'], ['MID — NET', 'PASS']];
  audits.forEach((r, i) => {
    const ry = 152 + i * 42;
    nodes.push(label(540, ry, r[0]!, {}));
    const pass = r[1] === 'PASS';
    nodes.push(rect(772, ry - 12, 44, 16, { fill: 'none', stroke: pass ? C.ink : C.sig, 'stroke-width': W.fine }));
    nodes.push(label(794, ry, pass ? 'OK' : 'REV', { 'text-anchor': 'middle', fill: pass ? C.ink : C.sig }));
  });
  nodes.push(label(540, 316, '42 APPROVED · 5 IN REVIEW', { fill: C.ink }));
  // one desk flagged for review
  nodes.push(rect(192, 190, 54, 30, { fill: 'none', stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 3' }));
  nodes.push(line(246, 205, 520, 214, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  return drawRolePlate(960, 640, 'usecase-quality', 'حالة مكتب الجودة', 'QLT-04', nodes);
}

function usecaseOwner(): ArtDoc {
  const nodes: ArtNode[] = base();
  // mini campus: 3 poché blocks + trees
  const blocks: Array<[number, number, number, number, string]> = [
    [110, 100, 130, 90, 'A'], [280, 110, 110, 120, 'B'], [130, 260, 120, 100, 'C'],
  ];
  for (const [bx, by, bw, bh, id] of blocks) {
    nodes.push(rect(bx, by, bw, bh, { fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
    nodes.push(stipplePoly([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], 0.14, bx + by));
    nodes.push(label(bx + bw / 2, by + bh / 2 + 3, id, { 'text-anchor': 'middle', fill: C.ink }));
  }
  nodes.push(tree(430, 420, 90, { seed: 9, depth: 5 }));
  nodes.push(tree(100, 430, 70, { seed: 14, depth: 5 }));
  // portfolio card
  nodes.push(...card(520, 100, 320, 240, 'OWNER / PORTFOLIO'));
  for (let i = 0; i < 3; i++) {
    nodes.push(rect(540 + i * 104, 140, 88, 70, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair }));
    nodes.push(label(552 + i * 104, 168, ['7', '58', '1240'][i]!, { 'font-size': 22, fill: C.ink }));
    nodes.push(label(552 + i * 104, 188, ['SCHOOLS', 'COURSES', 'STUDENTS'][i]!, {}));
  }
  for (let i = 0; i < 3; i++) {
    nodes.push(rect(540, 236 + i * 30, 280, 18, { fill: 'none', stroke: C.hair, 'stroke-width': W.hair }));
    nodes.push(rect(540, 236 + i * 30, 90 + i * 60, 18, { fill: i === 1 ? C.sig : C.ink, stroke: 'none', opacity: 0.14 }));
  }
  nodes.push(label(540, 316, '7 ACTIVE / 9 REGISTERED', { fill: C.ink }));
  nodes.push(line(440, 200, 520, 190, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  return drawRolePlate(960, 640, 'usecase-owner', 'حالة مالك المؤسسة', 'OWN-05', nodes);
}

function usecaseInstitution(): ArtDoc {
  const nodes: ArtNode[] = base();
  // library shelving + reading zone
  for (let i = 0; i < 3; i++) {
    nodes.push(rect(100, 100 + i * 60, 220, 24, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(line(100, 112 + i * 60, 320, 112 + i * 60, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.5 }));
  }
  nodes.push(rect(120, 320, 180, 80, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  // institution tree card
  nodes.push(...card(520, 100, 320, 240, 'INSTITUTION / TREE'));
  const tree7: Array<[string, number, number]> = [['UNIVERSITY', 540, 150], ['— ENG', 570, 185], ['— SCI', 570, 215], ['— MED', 570, 245], ['· CAMPUS A', 610, 280]];
  tree7.forEach(([nm, tx, ty]) => {
    nodes.push(circ(tx - 8, ty - 4, 3, { fill: nm.startsWith('—') ? C.ink : C.sig, stroke: 'none' }));
    nodes.push(label(tx, ty, nm, {}));
  });
  nodes.push(path('M532 146V276M562 181V276M562 211V276M562 241V276', { stroke: C.hair, 'stroke-width': W.hair, fill: 'none' }));
  nodes.push(label(540, 316, '3 COLLEGES · 12 DEPTS · 1 CAMPUS', { fill: C.ink }));
  nodes.push(line(320, 240, 520, 220, { stroke: C.sig, 'stroke-width': W.fine, 'stroke-dasharray': '5 4' }));
  return drawRolePlate(960, 640, 'usecase-institution', 'حالة المؤسسة التعليمية', 'INS-06', nodes);
}

/* ── registry ───────────────────────────────────────────────────── */

export const SCENES: Record<string, ArtBuilder> = {
  'usecase-student': usecaseStudent,
  'usecase-teacher': usecaseTeacher,
  'usecase-admin': usecaseAdmin,
  'usecase-quality': usecaseQuality,
  'usecase-owner': usecaseOwner,
  'usecase-institution': usecaseInstitution,
};

export function sceneFor(key: string): ArtBuilder {
  const b = SCENES[key];
  if (!b) throw new Error(`r359 usecase scene missing: ${key}`);
  return b;
}
