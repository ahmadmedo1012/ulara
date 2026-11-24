/**
 * shared/art/scenes/stubs.ts — r359 M0 scaffolding.
 *
 * FIRST-PASS builders for every contract key: an on-grammar plate
 * (frame + registration crosses + mono key code + a family mark).
 * Keys graduate to their family modules (scenes/<family>.ts) in
 * impact order — hero first, states last — and this table shrinks
 * until it is deleted.
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, D, W, callout, coord, dashRule, dimH,
  frame, g, hatchPoly, label, line, path, rect, stairs, stippleRect, tree,
} from '../grammar';
import { ART_KEYS, type ArtKeyMeta } from '../manifest';

interface Kind {
  hero: [number, number];
  plan: [number, number];
  plate: [number, number];
  marker: [number, number];
  state: [number, number];
  portrait: [number, number];
}

const SIZE: Record<ArtKeyMeta['family'], Kind[keyof Kind]> = {
  hero: [1440, 810],
  plans: [1200, 840],
  sections: [640, 480],
  why: [720, 540],
  usecases: [960, 640],
  cta: [1200, 630],
  marks: [320, 120],
  states: [480, 360],
  onboarding: [390, 520],
};

const KIND: Record<ArtKeyMeta['family'], keyof Kind> = {
  hero: 'hero',
  plans: 'plan',
  sections: 'plate',
  why: 'plate',
  usecases: 'plate',
  cta: 'plate',
  marks: 'marker',
  states: 'state',
  onboarding: 'portrait',
};

const OVERRIDE: Record<string, [number, number]> = {
  'hero-elevation-mobile': [390, 560],
  'section-intro': [1440, 460],
  'section-solution-learning': [960, 640],
  'section-solution-institution': [960, 640],
  'callout-tag': [260, 120],
  'dimension-line': [320, 80],
  'registration-cross': [48, 48],
  'empty-courses': [320, 320],
  'empty-notifications': [320, 320],
  'empty-search': [320, 320],
  'empty-institution': [320, 320],
  'empty-research': [320, 320],
  'splash-mark-motion': [480, 480],
};

export const STUBS: Record<string, ArtBuilder> = {};
for (const meta of ART_KEYS) {
  STUBS[meta.key] = () => {
    const [w, h] = OVERRIDE[meta.key] ?? SIZE[meta.family]!;
    return stubPlate(meta.key, meta.title, w, h, KIND[meta.family]!);
  };
}

/** accessor for generated wrappers — throws loudly on a missing key. */
export function stubFor(key: string): ArtBuilder {
  const b = STUBS[key];
  if (!b) throw new Error(`r359 stub missing: ${key}`);
  return b;
}

function stubPlate(key: string, title: string, w: number, h: number, kind: keyof Kind): ArtDoc {
  const nodes: ArtNode[] = [...frame(w, h)];
  if (kind === 'marker') nodes.push(markerAnatomy(key, w, h));
  else if (kind === 'state') nodes.push(stateAnatomy(w, h));
  else if (kind === 'plan') nodes.push(planAnatomy(w, h, key));
  else if (kind === 'hero') nodes.push(heroAnatomy(w, h));
  else if (kind === 'portrait') nodes.push(portraitAnatomy(w, h));
  else nodes.push(plateAnatomy(w, h));

  nodes.push(label(24, h - 22, `[${key.toUpperCase()}]`, { fill: C.ink }));
  nodes.push(coord(w - 24, h - 22, w, h, { 'text-anchor': 'end' }));
  return { w, h, title, nodes };
}

/* ── family anatomies (first pass) ─────────────────────────────── */

function heroAnatomy(w: number, h: number): ArtNode {
  const groundY = h * 0.78;
  return g(
    {},
    line(48, groundY, w - 48, groundY, { stroke: C.ink, 'stroke-width': W.heavy }),
    rect(w * 0.3, groundY - h * 0.34, w * 0.4, h * 0.34, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }),
    rect(w * 0.34, groundY - h * 0.26, w * 0.32, h * 0.18, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }),
    tree(w * 0.18, groundY, h * 0.3, { seed: 3 }),
    tree(w * 0.84, groundY, h * 0.36, { seed: 8 }),
    dashRule(48, h * 0.16, w - 48, h * 0.16),
  );
}

function planAnatomy(w: number, h: number, key: string): ArtNode {
  const x = w * 0.16, y = h * 0.18, pw = w * 0.5, ph = h * 0.52;
  return g(
    {},
    rect(x, y, pw, ph, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }),
    rect(x + 18, y + 18, pw - 36, ph - 36, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }),
    stippleRect(x + 18, y + 18, 16, ph - 36, 0.32, 42),
    stairs(x + pw - 90, y + 24, x + pw - 30, y + 96, 6),
    hatchPoly([[x, y + ph], [x + pw * 0.35, y + ph], [x + pw * 0.22, y + ph + 26]], { angle: 45, pitch: 7 }),
    dimH(x, x + pw, y + ph + 60, 66, 66, { label: '12000MM' }),
    callout(x + pw * 0.72, y + ph * 0.4, codeFor(key)),
  );
}

function plateAnatomy(w: number, h: number): ArtNode {
  const cx = w / 2, cy = h / 2;
  return g(
    {},
    rect(cx - w * 0.2, cy - h * 0.16, w * 0.4, h * 0.32, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }),
    hatchPoly([[cx - w * 0.2, cy + h * 0.16], [cx + w * 0.2, cy + h * 0.16], [cx + w * 0.2, cy + h * 0.16 - 18]], { angle: 45 }),
    line(cx - w * 0.26, cy + h * 0.16, cx + w * 0.26, cy + h * 0.16, { stroke: C.ink, 'stroke-width': W.med }),
  );
}

function portraitAnatomy(w: number, h: number): ArtNode {
  const groundY = h * 0.82;
  return g(
    {},
    line(36, groundY, w - 36, groundY, { stroke: C.ink, 'stroke-width': W.heavy }),
    rect(w * 0.28, groundY - h * 0.3, w * 0.44, h * 0.3, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }),
    tree(w * 0.16, groundY, h * 0.26, { seed: 5 }),
    tree(w * 0.88, groundY, h * 0.3, { seed: 11 }),
  );
}

function stateAnatomy(w: number, h: number): ArtNode {
  const cx = w / 2, cy = h / 2;
  return g(
    {},
    path(new D(cx - 46, cy - 30).l(cx, cy - 30).l(cx, cy + 30).l(cx + 46, cy + 30).l(cx + 46, cy - 6).l(cx, cy - 6).toString(),
      { fill: 'none', stroke: C.ink, 'stroke-width': W.med, 'stroke-linejoin': 'miter' }),
    line(cx - 46, cy - 30, cx - 46, cy + 12, { stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '3 3' }),
    line(cx + 46, cy - 6, cx + 18, cy - 6, { stroke: C.hair, 'stroke-width': W.hair, 'stroke-dasharray': '3 3' }),
    rect(cx - 6, cy + 8, 12, 12, { fill: C.sig, stroke: 'none' }),
  );
}

function markerAnatomy(key: string, w: number, h: number): ArtNode {
  if (key === 'registration-cross') {
    return g(
      {},
      line(w / 2 - 14, h / 2, w / 2 + 14, h / 2, { stroke: C.hair, 'stroke-width': W.hair }),
      line(w / 2, h / 2 - 14, w / 2, h / 2 + 14, { stroke: C.hair, 'stroke-width': W.hair }),
    );
  }
  if (key === 'dimension-line') {
    return g(
      {},
      line(16, h * 0.55, w - 16, h * 0.55, { stroke: C.ink, 'stroke-width': W.fine }),
      line(13, h * 0.55 + 3, 19, h * 0.55 - 3, { stroke: C.ink, 'stroke-width': W.fine }),
      line(w - 19, h * 0.55 + 3, w - 13, h * 0.55 - 3, { stroke: C.ink, 'stroke-width': W.fine }),
      label(w / 2, h * 0.55 - 6, '7200MM', { 'text-anchor': 'middle' }),
    );
  }
  return callout(w / 2, h / 2 + 8, 'ULARA-001');
}

const codeFor = (key: string): string => {
  const codes: Record<string, string> = {
    'plan-lecture-hall': 'HALL-A/01',
    'plan-library': 'LIB-A/02',
    'plan-lab': 'LAB-B/01',
    'plan-admin-office': 'ADM-C/03',
    'plan-campus-site': 'SITE-00',
    'plan-exam-hall': 'EXM-D/02',
    'plan-research-lab': 'RSC-E/01',
  };
  return codes[key] ?? 'ULARA-000';
};
