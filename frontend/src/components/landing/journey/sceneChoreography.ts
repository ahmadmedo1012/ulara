/**
 * sceneChoreography — the journey's ONE scrubbed timeline (the
 * home-scroll-choreography round → R342-final: the house scrub engine).
 *
 * The R342-04 scene drove its choreography from fragmented per-element
 * opacity writes inside a useSheetScroll tick (layer windows, plaque
 * windows, art register, camera keys — four hand-rolled systems on
 * one driver). The home-scroll-choreography round rebuilt the WHOLE
 * floor-plan choreography as ONE timeline in scrub units (t 0→5.52),
 * scrubbed by ONE window over the CSS-sticky pin. R342-final swaps the
 * gsap engine for the house scrubTimeline (lib/motion/scrubTimeline.ts
 * — the same set/fromTo/keyframes/stagger/ease semantics on ~200
 * lines instead of a 45.2 KB gz tweening engine; JourneyScene wires
 * it to the shared conductor through useSheetScroll), reversible by
 * construction:
 *
 *   0.00  the statement plaque 1 stands over the ghost plan (rest)
 *   0.35  THE WALLS ASSEMBLE — the wall masses solidify out of the
 *         ghost in drafting order (exterior poché → papers → the
 *         corridor bands → the partitions), staggered, each settling
 *         onto the sheet; the shell's openings and the service
 *         texture ink with them
 *   0.85  the lecture hall's furniture arrives (the reading start)
 *   1.00  plaque 1 exits (the measured recipe: fade + −2.5px + 4% shrink)
 *   1.30  the rooms build in narration order — checkpoint, exam,
 *         library + reception, mastery — furniture and doors
 *   1.60  plaque 2 enters at its own seat (fade + 24px rise + settle
 *         scale) — the two sentences EXCHANGE seats and scale
 *   2.50  plaque 2 exits
 *   2.60  THE DIMENSIONS + LABELS — room names, areas, the dimension
 *         chains, the north arrow and the section-cut flags ink
 *   3.02  THE VIOLATION REGISTER — the journey route's door swings,
 *         the leaders and the station tags ink (the measured T-09e
 *         seats, now on the timeline); the wash era lights the chips
 *         and zones per finding (the attr machine — CSS, unchanged)
 *   5.00  THE ANNOTATION CARDS — the three callouts rise last
 *   5.52  the closing column opens (the attr machine's stage 5)
 *
 * THE GHOST CONTRACT (r325 Y1, test-pinned): at scroll progress 0
 * every `[data-xl]` layer group stands at its 18% ghost floor and the
 * plaques ride their measured seats (plaque 1 visible, plaque 2's
 * wrapper at opacity 0). The timeline therefore NEVER pre-renders a
 * from-state: every ghost-continuation tween uses `immediateRender:
 * false`, so the pre-beat state IS the CSS ghost, and each layer swap
 * exchanges the ghost seat atomically (`set(group, 1)` +
 * `set(batch, 0.18)` — the same effective 18% on both sides of the
 * swap: no flicker, no opacity-multiplication trap, reversible in
 * both directions).
 *
 * OWNERSHIP of properties (do not cross these lines):
 *  · the timeline owns — layer-group opacity, element opacity/transform
 *    for elements WITHOUT their own CSS opacity rule, the plaque seats,
 *    the annotation cards' arrival, the ≤991 camera proxy.
 *  · the attr machine (CSS, `[data-stage]`/`[data-wash]`/`[data-finding]`)
 *    owns — the chips' opacity, the zones' fill-opacity, the wash
 *    pigment flips, the intro card, the counters, the closing column.
 *    Zones and chips are therefore excluded from every batch (their
 *    base states — fill-opacity 0 / opacity 0 — are invisible in the
 *    ghost, so excluding them cannot pop).
 */
import { createScrubTimeline, type ScrubTimeline, type ScrubToVars } from '../../../lib/motion/scrubTimeline';

/* ── the choreography beats (t-units of the scene clock — JourneyScene
 *    owns the clock constants (SEQ_DUR_S 5.52, the pin windows and the
 *    ≤991 warp) and the camera keys (camRectAt — test-pinned); this
 *    module only places the plan's beats on that clock. */
/* ── the choreography beats (t-units) ──────────────────────────────── */
const WALLS_AT = 0.35;
const OPENINGS_AT = 0.57;
const TEXTURE_AT = 0.78;
const LECTURE_AT = 0.85;
const ROOMS_AT = [1.3, 1.64, 1.98, 2.32] as const;
const LABELS_AT = 2.6;
const ANNOS_AT = 5.0;

/** The ghost seat every batch swaps at its beat start (the [data-xl]
 *  floor — journey.css). */
const GHOST = 0.18;

/* T-09e — the measured art register (the census-paired route overlay
 * + annotation groups) — unchanged from the R341 driver. The route
 * paths are the door-swing arcs from the exam hall onward; their ink
 * beat rides ART_REVEAL. The hidden/tint groups are the frame's
 * column-grid bubbles (the first twelve `g` descendants of the plan). */
const ART_ROUTE_PATHS: readonly [number, number] = [8, 20];
const ART_HIDDEN_GROUPS: readonly number[] = [1, 5, 9];
const ART_TINT_GROUPS: readonly number[] = [2, 6, 10];
const ART_TINT = 0.24;
const ART_REVEAL: readonly [number, number] = [3.02, 3.52];

function all<T extends Element>(scope: HTMLElement, sel: string): T[] {
  return Array.from(scope.querySelectorAll<T>(sel));
}

/** The ink-and-settle grammar: the element solidifies out of the ghost
 *  while lifting a breath and landing (starts AT rest — no boundary
 *  jump; `immediateRender: false` keeps the pre-beat state the CSS
 *  ghost). */
function inkSettleVars(lift: number, ink: number): ScrubToVars {
  return {
    keyframes: [
      { vars: { opacity: ink, y: lift }, duration: 0.16, ease: 'power2.out' },
      { vars: { opacity: 1, y: 0 }, duration: 0.22, ease: 'power2.in' },
    ],
    immediateRender: false,
  };
}

/** Build the plan choreography timeline (paused; scrub units 0→5.52 —
 *  the scene clock JourneyScene owns). The ≤991 camera is NOT on the
 *  timeline: the viewBox writes stay on the test-pinned camRectAt
 *  tables (JourneyScene) — one interpolation implementation for both
 *  scrub paths. */
export function buildPlanTimeline(scope: HTMLElement): ScrubTimeline {
  const tl = createScrubTimeline();

  /* ── the batch inventory (fresh queries per context build) ─────── */

  // the door-swing paths, split by the measured art register: the
  // route (exam hall onward) inks at ART_REVEAL; the earlier doors
  // ink with their own beats.
  const doorPaths = all(scope, '.jt-plan path');
  const route = doorPaths.slice(ART_ROUTE_PATHS[0], ART_ROUTE_PATHS[1] + 1);

  // the wall masses in drafting order (DOM order = exterior, papers,
  // corridor bands, partitions).
  const walls = all(scope, '.jt-plan .pl-wall, .jt-plan .pl-paper');
  // the shell's own strokes (windows, service strip, the envelope's
  // entry door) — the room doors ink with their rooms.
  const shellStrokes = [
    ...all(scope, '.jt-plan .pl-win-g line'),
    ...all(scope, '.jt-plan .pl-strip'),
    ...all(scope, ".jt-plan [data-xl='1'] .pl-door-g path"),
  ];
  const texture = [...all(scope, '.jt-plan .pl-hatch'), ...all(scope, '.jt-plan .pl-dot')];

  // the frame's column-grid bubbles (the art register's measured
  // hidden/tint seats ride the annotation era).
  const bubbles = all<SVGGElement>(scope, '.jt-plan .pl-l-frame g.bp-hair');

  // the lecture hall (layer 1's second group — the envelope group
  // carries no bp-* furniture).
  const layer1Groups = all<SVGGElement>(scope, ".jt-plan [data-xl='1']");
  const lectureGroup = layer1Groups[1] ?? layer1Groups[0] ?? null;
  const lectureFurniture = lectureGroup
    ? Array.from(lectureGroup.children).filter((el) => el.matches('.bp-fill, .bp-ink, .bp-hair'))
    : [];
  const lectureLabels = lectureGroup
    ? Array.from(lectureGroup.children).filter((el) => el.matches('.pl-name, .bp-micro'))
    : [];

  // per-room batches: furniture + door groups + labels + route paths
  // (route paths are nested in the rooms' door groups — membership
  // via contains, never child indexes). A layer may carry MULTIPLE
  // groups (layer 4 = the library wing + the entry reception) — every
  // group of the layer swaps and inks with the room's beat.
  const roomBatches = ([2, 3, 4, 5] as const).map((n) => {
    const groups = all<SVGGElement>(scope, `.jt-plan [data-xl='${n}']`);
    const children = groups.flatMap((g) => Array.from(g.children));
    return {
      group: groups[0] ?? null,
      allGroups: groups,
      furniture: children.filter((el) => el.matches('.bp-fill, .bp-ink, .bp-hair')),
      doors: children.filter((el) => el.matches('.pl-door-g')),
      labels: children.filter((el) => el.matches('.pl-name, .bp-micro')),
      routeEls: groups.length ? route.filter((p) => groups.some((g) => g.contains(p))) : [],
    };
  });

  // the drawing's annotation ink (the labels + dimensions beats) —
  // the chips container stays attr-owned.
  const annotGroup = scope.querySelector<SVGGElement>('.jt-plan .pl-l-annot');
  const annotChildren = annotGroup ? Array.from(annotGroup.children) : [];
  const journeyPath = annotChildren.filter((el) => el.matches('.bp-dash, .bp-ink'));
  const dimGroups = annotChildren.filter((el) => el.matches('g.bp-hair'));
  const dimTexts = annotChildren.filter(
    (el) => el.matches('.bp-micro') && !el.classList.contains('pl-station'),
  );
  const leaders = annotChildren.filter((el) => el.classList.contains('pl-leader'));
  const stations = annotChildren.filter((el) => el.classList.contains('pl-station'));

  // the annotation cards (HTML) — the last reveal.
  const annos = all(scope, '.jt-anno');

  /* ── the ghost-seat swap: group → 1, batch → 0.18 at beat start ──
   * Both writes land on the same scrub tick, so the effective 18%
   * is continuous across the swap (no flicker, fully reversible).
   * The set sits a hair BEFORE the batch's fromTos so its end-state
   * render always loses to them. */
  const swapGhost = (group: Element | null, els: Element[], at: number) => {
    const seat = Math.max(0, at - 0.001);
    if (group) tl.set(group, { opacity: 1 }, seat);
    if (els.length) tl.set(els, { opacity: GHOST }, seat);
  };

  /* ── 0.35 · THE WALLS ASSEMBLE ────────────────────────────────────
   * Both layer-1 groups (envelope + lecture) swap; the masses
   * solidify in drafting order, each settling onto the sheet. */
  swapGhost(
    layer1Groups[0] ?? null,
    [...walls, ...shellStrokes, ...texture, ...lectureFurniture, ...lectureLabels],
    WALLS_AT,
  );
  swapGhost(lectureGroup, [], WALLS_AT);
  walls.forEach((w, i) => {
    tl.fromTo(w, { opacity: GHOST, y: 0 }, inkSettleVars(-7, 0.75), WALLS_AT + i * 0.028);
  });
  if (shellStrokes.length) {
    tl.fromTo(
      shellStrokes,
      { opacity: GHOST, y: 0 },
      { ...inkSettleVars(-4, 0.6), stagger: 0.014 },
      OPENINGS_AT,
    );
  }
  if (texture.length) {
    tl.fromTo(
      texture,
      { opacity: GHOST },
      { opacity: 1, duration: 0.3, stagger: 0.004, ease: 'power1.out', immediateRender: false },
      TEXTURE_AT,
    );
  }

  /* ── 0.85 · the lecture hall's furniture (the reading start) ───── */
  if (lectureFurniture.length) {
    tl.fromTo(
      lectureFurniture,
      { opacity: GHOST, y: 0 },
      { ...inkSettleVars(-4, 0.6), stagger: 0.016 },
      LECTURE_AT,
    );
  }

  /* ── 1.0–3.0 · the two sentences exchange seats and scale ────────
   * The measured recipe: plaque 1 stands from rest, exits with fade +
   * −2.5px + 4% shrink; plaque 2's wrapper carries the opacity-0
   * from-state and its plate rises 24px with a settle scale. */
  const card1 = scope.querySelector<HTMLElement>('.jt-card1');
  const card2w = scope.querySelector<HTMLElement>('.jt-card2w');
  const plate2 = scope.querySelector<HTMLElement>('.jt-card2 .jt-card-plate');
  if (card1) {
    /* plaque 1 STANDS from rest (the spec's captured state) — the
     * from-seat is explicit (the house timeline has no implicit to) */
    tl.fromTo(
      card1,
      { autoAlpha: 1, y: 0, scale: 1 },
      { autoAlpha: 0, y: -2.5, scale: 0.96, duration: 0.4, ease: 'power2.in', immediateRender: false },
      1.0,
    );
  }
  if (card2w) {
    tl.fromTo(
      card2w,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.4, ease: 'power2.out', immediateRender: false },
      1.6,
    );
    tl.fromTo(
      card2w,
      { autoAlpha: 1 },
      { autoAlpha: 0, duration: 0.5, ease: 'power2.in', immediateRender: false },
      2.5,
    );
  }
  if (plate2) {
    tl.fromTo(
      plate2,
      { y: 24, scale: 0.965 },
      { y: 0, scale: 1, duration: 0.4, ease: 'power2.out', immediateRender: false },
      1.6,
    );
    tl.fromTo(
      plate2,
      { y: 0, scale: 1 },
      { y: -2.5, scale: 0.96, duration: 0.5, ease: 'power2.in', immediateRender: false },
      2.5,
    );
  }

  /* ── 1.3–2.66 · the rooms build in narration order ─────────────── */
  roomBatches.forEach((batch, i) => {
    const at = ROOMS_AT[i]!;
    if (!batch.allGroups.length) return;
    swapGhost(batch.group, [...batch.furniture, ...batch.doors, ...batch.labels, ...batch.routeEls], at);
    /* the layer's other groups (layer 4's entry reception) swap too —
     * their children are already in the batch lists. */
    for (const g of batch.allGroups.slice(1)) {
      tl.set(g, { opacity: 1 }, Math.max(0, at - 0.001));
    }
    if (batch.furniture.length) {
      tl.fromTo(
        batch.furniture,
        { opacity: GHOST, y: 0 },
        { ...inkSettleVars(-4, 0.6), stagger: 0.014 },
        at,
      );
    }
    if (batch.doors.length) {
      tl.fromTo(
        batch.doors,
        { opacity: GHOST },
        { opacity: 1, duration: 0.26, stagger: 0.02, ease: 'power2.out', immediateRender: false },
        at + 0.1,
      );
    }
  });

  /* ── 2.6 · THE DIMENSIONS + LABELS ────────────────────────────────
   * The names ink first, then their areas, then the chains — the
   * sheet completes as a measured drawing. The annot group's ghost
   * seat swaps here (its batches span the dims + violations beats). */
  swapGhost(annotGroup, [...dimGroups, ...dimTexts, ...leaders, ...stations, ...journeyPath], LABELS_AT);
  const names = [...roomBatches.flatMap((b) => b.labels), ...lectureLabels].filter((el) =>
    el.matches('.pl-name'),
  );
  const areas = [...roomBatches.flatMap((b) => b.labels), ...lectureLabels].filter((el) =>
    el.matches('.bp-micro'),
  );
  if (names.length) {
    tl.fromTo(names, { opacity: GHOST, y: 0 }, { ...inkSettleVars(-5, 0.6), stagger: 0.05 }, LABELS_AT);
  }
  if (areas.length) {
    tl.fromTo(
      areas,
      { opacity: GHOST },
      { opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out', immediateRender: false },
      LABELS_AT + 0.16,
    );
  }
  if (dimGroups.length) {
    tl.fromTo(
      dimGroups,
      { opacity: GHOST, y: 0 },
      { ...inkSettleVars(-4, 0.6), stagger: 0.05 },
      LABELS_AT + 0.28,
    );
  }
  if (dimTexts.length) {
    tl.fromTo(
      dimTexts,
      { opacity: GHOST },
      { opacity: 1, duration: 0.28, stagger: 0.03, ease: 'power2.out', immediateRender: false },
      LABELS_AT + 0.38,
    );
  }
  if (journeyPath.length) {
    tl.fromTo(
      journeyPath,
      { opacity: GHOST, strokeDasharray: 1, strokeDashoffset: 1 },
      {
        opacity: 1,
        strokeDashoffset: 0,
        duration: 0.34,
        stagger: 0.02,
        ease: 'power2.out',
        immediateRender: false,
      },
      LABELS_AT + 0.2,
    );
  }

  /* ── 3.02 · THE VIOLATION REGISTER (the measured art seats) ──────
   * The journey route's door swings, the leaders and the station
   * tags ink over the completed plan (the route keeps its measured
   * filter transition — assigned at register time in the scene). */
  if (route.length) {
    tl.fromTo(
      route,
      { opacity: GHOST },
      {
        opacity: 1,
        duration: ART_REVEAL[1] - ART_REVEAL[0],
        stagger: 0.02,
        ease: 'power2.out',
        immediateRender: false,
      },
      ART_REVEAL[0],
    );
  }
  if (leaders.length) {
    tl.fromTo(
      leaders,
      { opacity: GHOST, strokeDasharray: 1, strokeDashoffset: 1 },
      {
        opacity: 1,
        strokeDashoffset: 0,
        duration: 0.3,
        stagger: 0.03,
        ease: 'power2.out',
        immediateRender: false,
      },
      ART_REVEAL[0] + 0.1,
    );
  }
  if (stations.length) {
    tl.fromTo(
      stations,
      { opacity: GHOST },
      { opacity: 1, duration: 0.26, stagger: 0.03, ease: 'power2.out', immediateRender: false },
      ART_REVEAL[0] + 0.22,
    );
  }

  /* the art register's measured bubble seats — the hidden three
   * hold opacity 0 from rest (the measured from-state renders at
   * build), the tinted three rest at the 24% whisper. */
  for (const i of ART_HIDDEN_GROUPS) {
    const g = bubbles[i];
    if (g) {
      tl.fromTo(
        g,
        { opacity: 0 },
        {
          opacity: 1,
          duration: ART_REVEAL[1] - ART_REVEAL[0],
          ease: 'power2.out',
        },
        ART_REVEAL[0],
      );
    }
  }
  for (const i of ART_TINT_GROUPS) {
    const g = bubbles[i];
    if (g) {
      tl.fromTo(
        g,
        { opacity: ART_TINT },
        { opacity: 1, duration: ART_REVEAL[1] - ART_REVEAL[0], ease: 'power2.out' },
        ART_REVEAL[0],
      );
    }
  }

  /* ── 5.0 · THE ANNOTATION CARDS — the last reveal ─────────────────
   * The cards' visibility normally rides the attr machine's stage 4;
   * the timeline owns the arrival (inline opacity wins the cascade,
   * the CSS stage rules stay as the no-timeline fallback). */
  if (annos.length) {
    tl.fromTo(
      annos,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.36,
        stagger: 0.12,
        ease: 'power3.out',
        immediateRender: false,
      },
      ANNOS_AT,
    );
  }

  return tl;
}
