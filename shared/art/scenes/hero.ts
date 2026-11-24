/**
 * shared/art/scenes/hero.ts — the flagship hero elevations (r359 A2).
 *
 * A university building — modernist concrete-and-glass campus block —
 * drawn as a frontal orthographic ink elevation, the reference's hero
 * voice re-keyed to ULARA:
 *   · three concrete cores flanking a recessed double-height glazed
 *     bay; a colonnade walks the ground floor; an entry stair steps
 *     up at its left; courtyard walls extend both wings
 *   · board-formed concrete = seeded stipple tone (sun 0.2 / shade
 *     0.55 / recess 0.65) + panel joints + formwork tie-holes
 *   · glazing = paper panes, SOLID ink mullion bars, lighter interior
 *     linework, diagonal reflection hairlines
 *   · cast shadows = hard-edged stipple polygons (light upper-left)
 *   · bare winter trees flank the mass (foreground ink + ghost echo)
 *   · ONE heavy ground line wider than the building; two royal
 *     signal squares pinned to the facade (the survey anchors A1's
 *     drag-reveal hooks onto)
 * The drawing is frameless and full-bleed (the page frame is the
 * landing's chrome, not the art's).
 */
import type { ArtBuilder, ArtDoc, ArtNode } from '../grammar';
import {
  C, MONO, W, circ, g, hatchPoly, label, line, path, rect, stairs,
  stipplePoly, tree,
} from '../grammar';

/* ── shared micro-helpers ───────────────────────────────────────── */

/** vertical board-form joints at ~spacing, hairline */
function jointsV(x: number, y: number, w: number, h: number, spacing: number): ArtNode {
  let d = '';
  for (let jx = x + spacing; jx < x + w - 2; jx += spacing) {
    d += `M${jx} ${y}V${y + h}`;
  }
  return path(d, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.55 });
}

/** formwork tie-holes: sparse dot grid */
function tieHoles(x: number, y: number, w: number, h: number, seed: number): ArtNode {
  const nodes: ArtNode[] = [];
  for (let jx = x + 34; jx < x + w - 12; jx += 62) {
    for (let jy = y + 30; jy < y + h - 14; jy += 58) {
      nodes.push(circ(jx, jy, 1.2, { fill: C.ink, stroke: 'none', opacity: 0.7 }));
    }
  }
  void seed;
  return g({}, ...nodes);
}

/** diagonal glazing reflections (light from upper-left) */
function reflections(x: number, y: number, w: number, h: number): ArtNode {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const rx = x + 18 + i * (w / 5.4);
    const ry = y + h - 6;
    const len = 40 + (i % 3) * 22;
    d += `M${rx} ${ry}l${len} ${-len * 0.62}`;
  }
  return path(d, { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.4 });
}

/** signal survey square (the drag-reveal anchor) */
function surveyMark(x: number, y: number, s = 9): ArtNode {
  return g(
    {},
    rect(x - s / 2, y - s / 2, s, s, { fill: C.sig, stroke: 'none' }),
  );
}

/* ═════════════════════ desktop elevation (1440×810) ═════════════ */

/** double-line mullion: filled bar + hairline shadow offset */
function mullion(x: number, y: number, h: number, w = 2.2): ArtNode[] {
  return [
    rect(x, y, w, h, { fill: C.ink, stroke: 'none' }),
    line(x + w + 1.2, y + 1, x + w + 1.2, y + h - 1, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.5 }),
  ];
}

/** graded stipple — density ramps from topD to botD over horizontal bands */
function stippleGraded(x: number, y: number, w: number, h: number, topD: number, botD: number, seed: number, bands = 4): ArtNode[] {
  const out: ArtNode[] = [];
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const d = topD + ((botD - topD) * i) / (bands - 1);
    out.push(stipplePoly(
      [[x, y + i * bh], [x + w, y + i * bh], [x + w, y + (i + 1) * bh], [x, y + (i + 1) * bh]],
      Math.max(0.03, d),
      seed * 37 + i * 13,
    ));
  }
  return out;
}

export function buildHeroElevation(): ArtDoc {
  const W_ = 1440, H = 810;
  const GY = 640;                          // ground line
  // massing — the building reads at ~50% of the canvas
  const LX1 = 400, LX2 = 540;              // left core
  const RX1 = 900, RX2 = 1040;             // right core
  const CT = 262;                          // recessed bay head
  const BT = 230;                          // cores' roofline
  const FB1 = 372, FB2 = 506;              // floor bands
  const nodes: ArtNode[] = [];

  /* ground + courtyard walls (the site walls ground the composition) */
  nodes.push(line(90, GY, 1350, GY, { stroke: C.ink, 'stroke-width': W.heavy, 'stroke-linecap': 'butt' }));
  const WLX = 298, WRX = 1142;             // wall ends
  for (const [w1, w2] of [[WLX, LX1], [RX2, WRX]] as Array<[number, number]>) {
    nodes.push(rect(w1, 576, w2 - w1, GY - 576, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }));
    nodes.push(line(w1, 576, w2, 576, { stroke: C.ink, 'stroke-width': W.med }));
    nodes.push(jointsV(w1 + 5, 582, w2 - w1 - 10, GY - 582, 40));
  }

  /* concrete cores: outline + floor bands */
  for (const [x1, x2] of [[LX1, LX2], [RX1, RX2]] as Array<[number, number]>) {
    nodes.push(rect(x1, BT, x2 - x1, GY - BT, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }));
    for (const fy of [FB1, FB2]) {
      nodes.push(line(x1, fy, x2, fy, { stroke: C.ink, 'stroke-width': W.med }));
    }
  }
  /* directional tone: sun upper-left — graded ramp, dark under the
   * roof shadow fading to near-paper at the lit base; per-panel jitter */
  nodes.push(...stippleGraded(LX1 + 2, BT + 2, LX2 - LX1 - 4, GY - BT - 4, 0.17, 0.05, 3));
  nodes.push(...stippleGraded(RX1 + 2, BT + 2, RX2 - RX1 - 4, GY - BT - 4, 0.21, 0.07, 4));
  /* slab shadows: hard stipple strips under every floor band */
  for (const [x1, x2] of [[LX1, LX2], [RX1, RX2]] as Array<[number, number]>) {
    for (const fy of [FB1, FB2]) {
      nodes.push(stipplePoly([[x1, fy + 1], [x2, fy + 1], [x2, fy + 10], [x1, fy + 10]], 0.3, x1 + fy));
    }
  }
  /* texture furniture */
  nodes.push(jointsV(LX1 + 6, BT + 4, LX2 - LX1 - 12, GY - BT - 8, 45));
  nodes.push(jointsV(RX1 + 6, BT + 4, RX2 - RX1 - 12, GY - BT - 8, 45));
  nodes.push(tieHoles(LX1, BT, LX2 - LX1, GY - BT, 21));
  nodes.push(tieHoles(RX1, BT, RX2 - RX1, GY - BT, 22));
  /* recessed core windows (2 per floor): hairline + ink lintel reveal */
  for (const [x1] of [[LX1], [RX1]] as Array<[number]>) {
    const wx = x1 + 32, ww = 40, wh = 52;
    for (const wy of [FB1 + 30, FB2 + 30]) {
      for (const off of [0, 66]) {
        nodes.push(rect(wx + off, wy, ww, wh, { fill: C.paper, stroke: C.ink, 'stroke-width': W.fine }));
        nodes.push(stipplePoly([[wx + off, wy], [wx + off + ww, wy], [wx + off + ww, wy + wh], [wx + off, wy + wh]], 0.2, wx + wy + off));
        nodes.push(line(wx + off, wy, wx + off + ww, wy, { stroke: C.ink, 'stroke-width': W.med }));
        // reveal shade: left edge of each recess
        nodes.push(stipplePoly([[wx + off, wy], [wx + off + 5, wy], [wx + off + 5, wy + wh], [wx + off, wy + wh]], 0.4, wx + wy + off + 9));
      }
    }
  }

  /* roof slab (heavy, projecting) + stair tower + parapet fins + cast shadow */
  nodes.push(line(388, BT, 1052, BT, { stroke: C.ink, 'stroke-width': W.heavy }));
  // stair tower punching the skyline (the vertical accent)
  nodes.push(rect(468, 198, 74, GY - 198, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }));
  nodes.push(line(462, 198, 548, 198, { stroke: C.ink, 'stroke-width': W.heavy }));
  nodes.push(...stippleGraded(470, 200, 70, GY - 200, 0.2, 0.06, 6));
  nodes.push(jointsV(474, 204, 62, GY - 208, 30));
  // narrow slit windows up the tower
  for (const sy of [246, 316, 386, 456]) {
    nodes.push(rect(492, sy, 26, 34, { fill: C.paper, stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(stipplePoly([[492, sy], [518, sy], [518, sy + 34], [492, sy + 34]], 0.22, sy));
  }
  // parapet fins along the right core
  for (const fx of [946, 986, 1026]) {
    nodes.push(rect(fx, BT - 13, 9, 13, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(line(fx, BT - 13, fx + 9, BT - 13, { stroke: C.ink, 'stroke-width': W.med }));
  }
  nodes.push(rect(416, BT - 15, 24, 15, { fill: 'none', stroke: C.ink, 'stroke-width': W.fine }));
  for (const fx of [946, 986, 1026]) {
    // each fin drops a small 45° shadow onto the core face below
    nodes.push(stipplePoly([[fx, BT + 1], [fx + 9, BT + 1], [fx + 19, BT + 11], [fx + 10, BT + 11]], 0.42, fx));
  }
  // slab shadow cast onto the bay — hard-edged diagonal, deeper
  nodes.push(stipplePoly([[640, CT], [898, CT], [898, CT + 26], [668, CT + 26]], 0.5, 31));
  // the stair tower casts a long diagonal onto the bay's left field
  nodes.push(stipplePoly([[548, CT + 6], [652, CT + 6], [762, CT + 130], [548, CT + 130]], 0.36, 32));
  // THE signature diagonal: one bold 45° shadow sweeping the glass volume
  nodes.push(stipplePoly([[560, CT + 150], [898, CT + 150], [898, CT + 176], [586, CT + 176]], 0.3, 35));
  nodes.push(stipplePoly([[640, 480], [898, 480], [898, 506], [666, 506]], 0.3, 36));
  // sun-side: the right tree ghosts a faint diagonal on the right core
  nodes.push(stipplePoly([[RX1, 236], [RX1 + 74, 236], [RX1 + 30, 452], [RX1 - 20, 452]], 0.16, 34));

  /* the glazed bay — clean paper glass, recessed with depth cues */
  const BX1 = 550, BX2 = 890, BY1 = CT, BY2 = 540;
  nodes.push(line(LX2, BT, BX1, BY1, { stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(line(RX1, BT, BX2, BY1, { stroke: C.ink, 'stroke-width': W.fine }));
  nodes.push(rect(BX1, BY1, BX2 - BX1, BY2 - BY1, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  /* the left core casts a vertical shade onto the bay's left edge */
  nodes.push(...stippleGraded(BX1 + 2, BY1 + 26, 16, BY2 - BY1 - 28, 0.34, 0.16, 44));
  /* interior hints: slab edge + balustrade, faint */
  nodes.push(path(`M${BX1 + 8} ${BY1 + 118}H${BX2 - 8}M${BX1 + 8} ${BY1 + 252}H${BX2 - 8}`,
    { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.35 }));
  nodes.push(path(`M${BX1 + 96} ${BY1 + 118}V${BY1 + 252}M${BX1 + 102} ${BY1 + 118}V${BY1 + 252}`,
    { fill: 'none', stroke: C.ink, 'stroke-width': W.hair, opacity: 0.3 }));
  /* interior value alternation: bays read at 3 tones behind glass */
  for (let bi = 0; bi < 5; bi++) {
    const bx = BX1 + 17 + bi * 68;
    const tone = [0.1, 0.04, 0.07, 0.02, 0.09][bi]!;
    if (tone > 0.04) {
      nodes.push(stipplePoly([[bx + 4, BY1 + 4], [bx + 60, BY1 + 4], [bx + 60, BY2 - 4], [bx + 4, BY2 - 4]], tone, 60 + bi));
    }
  }
  /* mullions: SOLID ink bars with hairline shadow, every 68 */
  for (let mx = BX1 + 17; mx <= BX2 - 17; mx += 68) {
    nodes.push(...mullion(mx, BY1 + 2, BY2 - BY1 - 4));
  }
  /* spandrel band (solid ink) + transoms: the horizontal spine is the
   * heavier weight (reference glazing law) */
  nodes.push(rect(BX1 + 2, 402, BX2 - BX1 - 4, 13, { fill: C.ink, stroke: 'none' }));
  for (const py of [BY1 + 56, BY1 + 118, BY1 + 180, BY1 + 252, BY1 + 314]) {
    nodes.push(line(BX1 + 4, py, BX2 - 4, py, { stroke: C.ink, 'stroke-width': W.fine, opacity: 0.6 }));
  }
  /* glazing reflections: three long diagonal groups, sparse + crisp */
  nodes.push(reflections(BX1 + 24, BY1 + 64, 150, 120));
  nodes.push(reflections(BX1 + 220, BY1 + 200, 150, 120));
  nodes.push(reflections(BX1 + 120, BY1 + 330, 130, 100));

  /* colonnade: the ground floor walks */
  const CY1 = 552;
  nodes.push(rect(BX1 - 8, CY1 - 13, BX2 - BX1 + 16, 13, { fill: C.ink, stroke: 'none' }));  // lintel
  nodes.push(stipplePoly([[BX1, CY1], [BX2, CY1], [BX2, GY], [BX1, GY]], 0.72, 51));          // recess shade
  for (let i = 0; i < 6; i++) {
    const cx = BX1 + 20 + i * ((BX2 - BX1 - 40) / 5);
    nodes.push(rect(cx - 4.5, CY1, 9, GY - CY1, { fill: C.paper, stroke: C.ink, 'stroke-width': W.med }));
    nodes.push(line(cx - 7, CY1 - 4, cx + 7, CY1 - 4, { stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(line(cx - 8, GY, cx + 8, GY, { stroke: C.ink, 'stroke-width': W.fine }));
    nodes.push(line(cx + 5.5, CY1 + 2, cx + 5.5, GY - 2, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.4 }));
    // each column casts a soft stripe onto the recess floor (sun upper-left)
    nodes.push(stipplePoly([[cx + 5, CY1 + 4], [cx + 14, CY1 + 4], [cx + 19, GY - 2], [cx + 10, GY - 2]], 0.34, cx));
  }
  /* tall door behind the colonnade — the near-black value anchor */
  nodes.push(rect(700, 586, 44, GY - 586, { fill: C.ink, stroke: 'none', opacity: 0.88 }));
  nodes.push(line(722, 586, 722, GY, { stroke: C.paper, 'stroke-width': W.hair, opacity: 0.5 }));

  /* entry stair (left of the colonnade) + its shadow hatch */
  nodes.push(stairs(452, GY, 546, 612, 5, 'elev', { 'stroke-width': W.med }));
  nodes.push(hatchPoly([[452, GY], [546, GY], [546, GY - 9], [452, GY - 2]], { angle: 45, pitch: 6, seed: 61 }));

  /* cast shadows — ONE sun, upper-left, 45°: the right site wall and
   * ground sit in the building's diagonal shadow; hard edges */
  nodes.push(stipplePoly([[RX2, 560], [1104, 560], [WRX + 26, GY], [RX2, GY]], 0.44, 71));
  nodes.push(stipplePoly([[RX2, GY], [WRX + 120, GY], [WRX + 120, GY + 14], [RX2, GY + 14]], 0.3, 77));
  nodes.push(stipplePoly([[LX1, GY], [WLX - 20, GY], [WLX - 20, GY + 12], [LX1, GY + 12]], 0.22, 78));
  /* contact shadows at every base */
  nodes.push(stipplePoly([[LX1 - 6, GY - 8], [RX2 + 6, GY - 8], [RX2 + 6, GY], [LX1 - 6, GY]], 0.34, 72));
  nodes.push(stipplePoly([[WLX, GY - 6], [LX1, GY - 6], [LX1, GY], [WLX, GY]], 0.3, 73));
  nodes.push(stipplePoly([[RX2, GY - 6], [WRX, GY - 6], [WRX, GY], [RX2, GY]], 0.3, 74));
  /* tree ground-shadow pools (wider, softer) */
  nodes.push(stipplePoly([[188, GY - 5], [276, GY - 5], [292, GY + 8], [172, GY + 8]], 0.22, 75));
  nodes.push(stipplePoly([[1168, GY - 5], [1256, GY - 5], [1272, GY + 8], [1152, GY + 8]], 0.22, 76));

  /* trees: ghost echoes overlapping the cores, ink foreground flanking */
  nodes.push(tree(508, GY - 4, 300, { seed: 21, opacity: 0.16, depth: 5, limbs: 2 }));
  nodes.push(tree(934, GY - 4, 320, { seed: 33, opacity: 0.16, depth: 5, limbs: 2 }));
  nodes.push(tree(232, GY, 400, { seed: 3, depth: 7, limbs: 2, lean: -0.05, trunk: 0.6 }));
  nodes.push(tree(1212, GY, 436, { seed: 8, depth: 7, limbs: 3, lean: 0.06, trunk: 0.6 }));

  /* the two royal survey anchors (A1's drag-reveal hooks) */
  nodes.push(surveyMark(470, 522));
  nodes.push(surveyMark(1092, 600));

  return { w: W_, h: H, title: 'واجهة الحرم الجامعي — رسم معماري', nodes };
}

/* ═════════════════════ mobile elevation (390×560) ═══════════════ */

export function buildHeroElevationMobile(): ArtDoc {
  const W_ = 390, H = 560;
  const GY = 430;
  const LX1 = 62, LX2 = 122, RX1 = 268, RX2 = 328;
  const BT = 208, CT = 232, FB1 = 292;
  const nodes: ArtNode[] = [];

  nodes.push(line(16, GY, 374, GY, { stroke: C.ink, 'stroke-width': W.heavy, 'stroke-linecap': 'butt' }));

  // courtyard walls
  for (const [w1, w2] of [[24, LX1], [RX2, 366]] as Array<[number, number]>) {
    nodes.push(rect(w1, 378, w2 - w1, GY - 378, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }));
    nodes.push(line(w1, 378, w2, 378, { stroke: C.ink, 'stroke-width': W.med }));
  }

  // cores
  for (const [x1, x2] of [[LX1, LX2], [RX1, RX2]] as Array<[number, number]>) {
    nodes.push(rect(x1, BT, x2 - x1, GY - BT, { fill: 'none', stroke: C.ink, 'stroke-width': W.wall }));
    nodes.push(line(x1, FB1, x2, FB1, { stroke: C.ink, 'stroke-width': W.med }));
  }
  nodes.push(stipplePoly([[LX1, BT], [LX2, BT], [LX2, GY], [LX1, GY]], 0.14, 81));
  nodes.push(stipplePoly([[RX1, BT], [RX2, BT], [RX2, GY], [RX1, GY]], 0.2, 82));
  nodes.push(jointsV(LX1 + 5, BT + 4, LX2 - LX1 - 10, GY - BT - 8, 22));
  nodes.push(jointsV(RX1 + 5, BT + 4, RX2 - RX1 - 10, GY - BT - 8, 22));

  // roof slab + shadow band on bay
  nodes.push(line(LX1 - 8, BT, RX2 + 8, BT, { stroke: C.ink, 'stroke-width': W.heavy }));
  nodes.push(stipplePoly([[196, CT], [264, CT], [264, CT + 14], [208, CT + 14]], 0.42, 83));

  // glazed bay (smaller, same voice)
  const BX1 = 128, BX2 = 262, BY1 = CT, BY2 = 372;
  nodes.push(line(LX2, BT, BX1, BY1, { stroke: C.ink, 'stroke-width': W.hair }));
  nodes.push(line(RX1, BT, BX2, BY1, { stroke: C.ink, 'stroke-width': W.hair }));
  nodes.push(rect(BX1, BY1, BX2 - BX1, BY2 - BY1, { fill: 'none', stroke: C.ink, 'stroke-width': W.med }));
  nodes.push(stipplePoly([[BX1, BY1], [BX2, BY1], [BX2, BY2], [BX1, BY2]], 0.1, 84));
  for (let mx = BX1 + 12; mx <= BX2 - 12; mx += 34) {
    nodes.push(rect(mx - 1.2, BY1 + 2, 2.4, BY2 - BY1 - 4, { fill: C.ink, stroke: 'none' }));
  }
  nodes.push(rect(BX1 + 2, 296, BX2 - BX1 - 4, 9, { fill: C.ink, stroke: 'none' }));
  nodes.push(line(BX1 + 3, BY1 + 40, BX2 - 3, BY1 + 40, { stroke: C.ink, 'stroke-width': W.hair, opacity: 0.6 }));
  nodes.push(reflections(BX1 + 12, BY1 + 150, BX2 - BX1 - 24, 60));

  // colonnade
  const CY1 = 378;
  nodes.push(rect(BX1 - 4, CY1 - 9, BX2 - BX1 + 8, 9, { fill: C.ink, stroke: 'none' }));
  nodes.push(stipplePoly([[BX1, CY1], [BX2, CY1], [BX2, GY], [BX1, GY]], 0.72, 85));
  for (let i = 0; i < 5; i++) {
    const cx = BX1 + 10 + i * ((BX2 - BX1 - 20) / 4);
    nodes.push(rect(cx - 3, CY1, 6, GY - CY1, { fill: C.paper, stroke: C.ink, 'stroke-width': W.med }));
  }

  // entry stair
  nodes.push(stairs(96, GY, 148, 412, 4, 'elev', { 'stroke-width': W.med }));

  // contact shadows
  nodes.push(stipplePoly([[LX1 - 4, GY - 5], [RX2 + 4, GY - 5], [RX2 + 4, GY], [LX1 - 4, GY]], 0.36, 86));

  // trees
  nodes.push(tree(150, GY - 4, 190, { seed: 91, opacity: 0.22, depth: 5 }));
  nodes.push(tree(252, GY - 4, 208, { seed: 92, opacity: 0.22, depth: 5 }));
  nodes.push(tree(38, GY, 240, { seed: 5, depth: 6 }));
  nodes.push(tree(360, GY, 262, { seed: 11, depth: 6 }));

  // survey anchors
  nodes.push(surveyMark(104, 300, 8));
  nodes.push(surveyMark(310, 396, 8));

  // tiny mono plate stamp (sheet convention, bottom-right of the sky)
  nodes.push(label(W_ - 24, 40, 'ULARA / ELEV-A', { 'text-anchor': 'end', 'font-size': MONO }));

  return { w: W_, h: H, title: 'واجهة الحرم الجامعي — نسخة الجوال', nodes };
}

export const SCENES: Record<string, ArtBuilder> = {
  'hero-elevation': buildHeroElevation,
  'hero-elevation-mobile': buildHeroElevationMobile,
};

export function sceneFor(key: string): ArtBuilder {
  const b = SCENES[key];
  if (!b) throw new Error(`r359 hero scene missing: ${key}`);
  return b;
}
