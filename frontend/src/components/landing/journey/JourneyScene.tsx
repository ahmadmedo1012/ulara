import { PREFERS_REDUCED_MOTION } from '../../../lib/motion-media';
import { LECTURE_INTERACTIVE, MASTERY_SCORE_LINE } from '../copy';
/**
 * JourneyScene — R308 «رحلة التعلّم» · R322 the map transplant ·
 * **home-scroll-choreography — THE ONE SCRUBBED SCENE**.
 *
 * The R342-04 measured-seat rebuild kept the six-state story but drove
 * it from a useSheetScroll tick that hand-rolled four systems per
 * frame (layer windows, plaque windows, the art register, the camera
 * keys). This rebuild hands the WHOLE scene to one authoritative
 * lifecycle on the motion engine (lib/motion/engine.ts):
 *
 * ```
 * useLayoutEffect — the ONE scene lifecycle (build → refresh → revert)
 * ├─ reduced motion: the static final sheet — NO engine, NO smooth
 * │   scroll, every layer ON (the attr machine's RM state)
 * ├─ geometry-less environment (unit jsdom, empty rects — the
 * │   deterministic fallback): the LEGACY CONDUCTOR CORE below — the
 * │   R342 driver verbatim (layer windows, plaque recipes, camRectAt,
 * │   the state machine) on the shared conductor clock. Deterministic
 * │   under empty geometry (the pin metric clamps to the close) and
 * │   source-pinned by tests/unit/r312-mobile-camera.test.tsx.
 * └─ browser: the GSAP engine —
 *     ├─ buildPlanTimeline (sceneChoreography.ts) — the ONE scrubbed
 *     │   timeline: walls assemble → furniture → dimensions/labels →
 *     │   violations + annotation cards, staggered, reversible
 *     ├─ ScrollTrigger «journey-drift» (≥992) — the entrance runway:
 *     │   the plan stack descends one frame height before the pin
 *     ├─ ScrollTrigger «journey-sequence» — the scene clock: scrubs
 *     │   the t 0→5.52 timeline over the measured pin window
 *     │   ([−0.082, 0.952] of the track span; the ≤991 clock keeps
 *     │   the R330 front-load warp t = 5.52·u^0.55)
 *     └─ onUpdate — the DISCRETE machine (data-stage/finding/wash +
 *         the closing column + the agent line) derives from t exactly
 *         as the R342 driver did (test-pinned thresholds, unchanged)
 * ```
 *
 * The PIN stays the reference's own architecture — CSS sticky (the
 * frame sticks; ScrollTrigger owns the scrub windows and the resize
 * refresh, never a second scroll engine). The track height is the
 * DELIBERATE duration (journey.css `--jt-scrub`, derived from the
 * reference's measured pin scrub + this scene's beat count) — no
 * arbitrary 700dvh block. ScrollTrigger's functional start/end derive
 * from the same box, so the sticky release and the scrub end coincide
 * exactly — no dead zones, no trapped scrolling; reverse scrolling
 * follows the real scroll position both ways. The frame clock is the
 * ONE shared conductor: sheetLenis drives Lenis on the conductor's
 * rAF (never gsap's ticker — engine.ts parks it) and every Lenis
 * scroll event syncs the scrubber (ScrollTrigger.update via
 * engineSync — the engine contract, lib/motion/sheetLenis.ts).
 *
 * THE STATE MACHINE (kept — the R322 semantics): `data-stage` 0..5,
 * `data-finding` 1..5/done, `data-wash` the bounded room highlight,
 * `data-rm` the reduced-motion static sheet.
 */
import { useLayoutEffect, useRef } from 'react';
import { LearningPlanDrawing, PLAN_VB } from '../LearningPlanDrawing';
import { Icon } from '../../Icon';
import {
  Presentation,
  CircleCheck,
  FileCheck2,
  Grid3x3,
} from 'lucide-react';
import { gsap, ScrollTrigger, bindFontRefresh, ensureMotionEngine } from '../../../lib/motion/engine';
import { bindScrubSync } from '../../../lib/motion/engineSync';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { clamp, setSheetVar } from '../../../lib/motion/sheetConductor';
import { buildPlanTimeline } from './sceneChoreography';

/* ── The copy (our own words, honest, Arabic RTL) ────────────────────
 * Plaque 1 is the r315 statement (kept verbatim — it IS the map's own
 * thesis). Plaque 2 is a SECOND distinct ~20-char statement derived
 * from the journey's own copy. The findings are the four stations'
 * own texts + the assistant note (the r168b truthfulness pins ride
 * finding 5 verbatim). The closing column carries the section head
 * (chip + h2 + lede-grade copy) — the funnel itself stays frozen:
 * no link is added here (the register row further down the sheet
 * owns the conversion). */
const STATEMENT_1_AR = 'الرحلة مرسومة على مسطح واحد';
const STATEMENT_2_AR = 'لكل فصل غرفته وبابه الذي يفتحه';

const INTRO_TITLE_AR = 'مقدمة';
const FINDINGS_AR = [
  {
    key: 'lecture',
    title: LECTURE_INTERACTIVE,
    text: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضور يُحتسب تلقائيًا عند الإكمال.',
    foot: 'الباب [01] — قاعة المحاضرات',
  },
  {
    key: 'checkpoint',
    title: 'نقاط الفحص',
    text: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
    foot: 'الباب [02] — نقطة الفحص',
  },
  {
    key: 'exam',
    title: 'الاختبارات الإلكترونية',
    text: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
    foot: 'الباب [03] — قاعة الاختبارات',
  },
  {
    key: 'mastery',
    title: 'مصفوفة الإتقان',
    text: MASTERY_SCORE_LINE,
    foot: 'الباب [05] — غرفة الإتقان',
  },
  {
    key: 'assistant',
    title: 'المساعد الأكاديمي',
    text: 'يعمل الآن داخل المنصّة، ويقترح شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.',
    foot: 'المساعد — يعمل اليوم داخل المنصّة',
  },
] as const;

/* the closing column — the section's own head (the reference's home-map
 * content column: label chip + h2 + body + the cms ledger). The h2
 * keeps id="chapters-title" (the aria-labelledby contract) and the
 * D2 display rung. The copy is the honest ledger summary. */
const CLOSE_CHIP_L1_AR = 'الفصول';
const CLOSE_CHIP_L2_AR = '[04]';
const CLOSE_TITLE_AR = 'الرحلة — أربعة فصول تتحرك أمامك';
const CLOSE_COPY_AR =
  'مرّر لتشاهد الرحلة تُبنى على مسطح واحد: لا لقطات مُجمّلة ولا وعودًا قادمة. كل غرفة في هذا المسطح ميزة تعمل اليوم داخل المنصّة — من قاعة المحاضرات إلى غرفة الإتقان — وإنشاء الحساب في نهاية الصفحة. المسطح رسم أصلي لأُلارا، والغرف تتّسع مع كل فصل جديد.';

/* the four-station ledger rows (the cms block): each row = hairline +
 * station line + icon — the journey's own chapters, mirroring the
 * drawing's four doors. */
const LEDGER_AR = [
  { key: 'lecture', text: 'المحاضرة التفاعلية — شرح مسجَّل بنقاط فحص وحضور يُحتسب', icon: Presentation },
  { key: 'checkpoint', text: 'نقاط الفحص داخل المحاضرة تصحّح الفهم فورًا', icon: CircleCheck },
  { key: 'exam', text: 'الاختبارات الإلكترونية بأنواعها وقوالبها الجاهزة', icon: FileCheck2 },
  { key: 'mastery', text: 'مصفوفة الإتقان والمراجعة حسب أدائك الفعلي', icon: Grid3x3 },
] as const;

/* the three plan annotation cards (the reference's demo cards): orange-ruled
 * callouts on the drawing — title in the accent mono voice + one
 * honest line. Positioned at the measured seats (journey.css). */
const ANNOTATIONS_AR = [
  { key: 'exam', title: '[03] قاعة الاختبارات', text: 'بنك أسئلة بأربعة أنواع وتصحيح تلقائي فوري.' },
  { key: 'library', title: '[04] المكتبة', text: 'مراجع ومصادر لكل فصل.' },
  { key: 'research', title: 'البحث والمراجعة', text: 'رفع البحوث ومتابعة تقييمها داخل المنصّة.' },
] as const;

/* the [nn/05] counter rows — static text, opacity-only progression
 * (they never change copy during the story; the flip is CSS). */
const COUNTERS = ['[01/05]', '[02/05]', '[03/05]', '[04/05]', '[05/05]'] as const;

/* ══ THE SCENE CLOCK (the measured constants — source-pinned by
 *    tests/unit/r312-mobile-camera.test.tsx; the choreography's beat
 *    grid and the ScrollTrigger windows both read this clock) ══════ */

const ENTRANCE_START_PIN = -0.167; /* the measured entrance runway */
const SEQ_START_PIN = -0.082;
const SEQ_END_PIN = 0.952;
const SEQ_SPAN_PIN = SEQ_END_PIN - SEQ_START_PIN;
const SEQ_DUR_S = 5.52;

/** the ≤991 clock warp exponent: t = SEQ_DUR · seqU^0.55 (the R330
 *  mobile front-load — the camera test pins stage 3 / wash exam at
 *  pin 0.5 under it). */
const MOBILE_WARP_EXP = 0.55;

/* the six progressive layer windows (t-units) — the GHOST crossfade
 * register (the legacy core's writes; the browser path re-expresses
 * the same eras as element-level batches in sceneChoreography). */
const LAYER_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [0.35, 0.85], // 1 · the envelope (the walls ink in AT the intro) + the lecture hall
  [1.02, 1.52], // 2 · the checkpoint kiosk
  [1.52, 2.02], // 3 · the exam hall
  [2.02, 2.52], // 4 · the library wing + the entry reception
  [2.52, 3.02], // 5 · the mastery room
  [3.02, 3.52], // 6 · the annotations (the journey path, stations, dims)
];

const XL_GHOST = 0.18;

/* T-09e — the measured art register (the census-paired route overlay
 * + annotation groups) — unchanged from the R341 driver. */
const ART_ROUTE_PATHS: readonly [number, number] = [8, 20];
const ART_HIDDEN_GROUPS: readonly number[] = [1, 5, 9];
const ART_TINT_GROUPS: readonly number[] = [2, 6, 10];
const ART_TINT = 0.24;
const ART_REVEAL: readonly [number, number] = [3.02, 3.52];

type ArtRegister = { route: SVGPathElement[]; hidden: SVGGElement[]; tint: SVGGElement[] };

function resolveArtRegister(track: HTMLElement): ArtRegister {
  const paths = Array.from(track.querySelectorAll<SVGPathElement>('.jt-plan path'));
  const groups = Array.from(track.querySelectorAll<SVGGElement>('.jt-plan g'));
  const route = paths.slice(ART_ROUTE_PATHS[0], ART_ROUTE_PATHS[1] + 1);
  for (const el of route) {
    el.style.transition = 'filter var(--jt-t-art) var(--jt-e-art)';
  }
  return {
    route,
    hidden: ART_HIDDEN_GROUPS.map((i) => groups[i]).filter((el): el is SVGGElement => !!el),
    tint: ART_TINT_GROUPS.map((i) => groups[i]).filter((el): el is SVGGElement => !!el),
  };
}

/* the finding rotation: 5 equal 0.6s windows over t 2.5→5.5. */
const FINDING_SPAN_S = 0.6;
const FINDING_START_S = 2.5;
const FINDING_END_S = 5.5;

/* power2.out — the reference's scrub ease. */
function p2o(x: number): number {
  const u = x < 0 ? 0 : x > 1 ? 1 : x;
  return 1 - (1 - u) * (1 - u);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/* ── The ≤991 camera (the R312 camera family — two crop families) ── */
type CamRect = readonly [number, number, number, number];
const CAM_FULL: CamRect = [0, 0, PLAN_VB.w, PLAN_VB.h];
const CAM_KEYS_SHEET: ReadonlyArray<readonly [number, CamRect]> = [
  [2.2, CAM_FULL],
  [2.8, [640, 54, 560, 355]],
  [3.4, [640, 390, 560, 355]],
  [4.0, [308, 54, 560, 355]],
  [4.6, [85, 342, 660, 418]],
  [5.0, [0, 54, 560, 355]],
  [5.52, CAM_FULL],
];
const CAM_KEYS_PHONE: ReadonlyArray<readonly [number, CamRect]> = [
  [2.2, CAM_FULL],
  [2.8, [713, 0, 460, 600]],
  [3.4, [713, 160, 460, 600]],
  [4.0, [358, 0, 460, 600]],
  [4.6, [298, 160, 460, 600]],
  [5.0, [15, 0, 460, 600]],
  [5.52, [15, 0, 460, 600]],
];

function camRectAt(t: number, phone: boolean): CamRect {
  const keys = phone ? CAM_KEYS_PHONE : CAM_KEYS_SHEET;
  if (t <= keys[0]![0]) return keys[0]![1];
  const last = keys[keys.length - 1]!;
  if (t >= last[0]) return last[1];
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i += 1;
  const [t0, a] = keys[i]!;
  const [t1, b] = keys[i + 1]!;
  const u = clamp01((t - t0) / (t1 - t0));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
    a[3] + (b[3] - a[3]) * u,
  ];
}

const camSvgByTrack = new WeakMap<HTMLElement, SVGSVGElement>();

function camSvgFor(track: HTMLElement): SVGSVGElement | null {
  const hit = camSvgByTrack.get(track);
  if (hit) return hit;
  const svg = track.querySelector<SVGSVGElement>('.jt-window .bp-svg');
  if (svg) camSvgByTrack.set(track, svg);
  return svg;
}

function writeCamBox(track: HTMLElement, r: CamRect): void {
  const svg = camSvgFor(track);
  if (!svg) return;
  const vb = `${Math.round(r[0])} ${Math.round(r[1])} ${Math.round(r[2])} ${Math.round(r[3])}`;
  if (svg.getAttribute('viewBox') !== vb) {
    svg.setAttribute('viewBox', vb);
  }
}

function restoreCam(track: HTMLElement): void {
  writeCamBox(track, CAM_FULL);
}

/* ── Reading-environment probes (kept from the R312/R318 machinery) ── */
let mobileQuery: MediaQueryList | null = null;
let phoneQuery: MediaQueryList | null = null;
let reducedQuery: MediaQueryList | null = null;
let mmSource: typeof window.matchMedia | null = null;

function viewportState(): { mobile: boolean; phone: boolean; reduced: boolean } {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { mobile: false, phone: false, reduced: false };
  }
  if (mmSource !== window.matchMedia) {
    mmSource = window.matchMedia;
    mobileQuery = window.matchMedia('(max-width: 991px)');
    phoneQuery = window.matchMedia('(max-width: 767px)');
    reducedQuery = window.matchMedia(PREFERS_REDUCED_MOTION);
  }
  return {
    mobile: !!mobileQuery?.matches,
    phone: !!phoneQuery?.matches,
    reduced: !!reducedQuery?.matches,
  };
}

/* the statement plaques' in/out recipe — the measured one: fade +
 * 24px rise in; fade + −2.5px rise + 4% shrink out. Plaque 1 stands
 * VISIBLE from t 0 (the spec's captured rest state); plaque 2 rides
 * its opacity-0 wrapper. (The legacy core's writes — the browser path
 * re-expresses the same recipe as timeline tweens.) */
function writeCard(
  el: HTMLElement | null,
  t: number,
  tIn0: number,
  tIn1: number,
  tOut0: number,
  tOut1: number,
): void {
  if (!el) return;
  let o: number;
  let ty: number;
  let sc = 1;
  if (t <= tIn0) {
    o = 0;
    ty = 24;
  } else if (t < tIn1) {
    const u = p2o((t - tIn0) / (tIn1 - tIn0));
    o = u;
    ty = 24 * (1 - u);
  } else if (t < tOut0) {
    o = 1;
    ty = 0;
  } else if (t < tOut1) {
    const u = p2o((t - tOut0) / (tOut1 - tOut0));
    o = 1 - u;
    ty = -2.5 * u;
    sc = 1 - 0.04 * u;
  } else {
    o = 0;
    ty = -2.5;
    sc = 0.96;
  }
  setSheetVar(el.style, 'opacity', o.toFixed(3));
  setSheetVar(el.style, 'transform', `translateY(${ty.toFixed(1)}px) scale(${sc.toFixed(3)})`);
  setSheetVar(el.style, 'visibility', o <= 0 ? 'hidden' : 'visible');
}

/* the plaque-2 WRAPPER fade — opacity-only: the wrapper is the
 * measured from-state SEAT (its own boxes rest at opacity 1; the
 * hiding lives here) — no rise, no scale on the wrapper itself. */
function writeFade(
  el: HTMLElement | null,
  t: number,
  tIn0: number,
  tIn1: number,
  tOut0: number,
  tOut1: number,
): void {
  if (!el) return;
  let o: number;
  if (t <= tIn0) o = 0;
  else if (t < tIn1) o = p2o((t - tIn0) / (tIn1 - tIn0));
  else if (t < tOut0) o = 1;
  else if (t < tOut1) o = 1 - p2o((t - tOut0) / (tOut1 - tOut0));
  else o = 0;
  setSheetVar(el.style, 'opacity', o.toFixed(3));
  setSheetVar(el.style, 'visibility', o <= 0 ? 'hidden' : 'visible');
}

/* the entrance drift magnitude — the measured transform: one frame
 * height minus 1rem (the fluid root), i.e. the stack rests exactly
 * one sticky-frame above its seat before the descent. */
function driftMagnitude(vh: number, fs: number): number {
  return Math.max(0, vh - fs);
}

/* the discrete machine writes — one place, idempotent. */
function writeAttrs(
  track: HTMLElement,
  stage: string,
  finding: string,
  wash: string,
  rm: string,
  open: string,
): void {
  if (track.dataset.stage !== stage) track.dataset.stage = stage;
  if (track.dataset.finding !== finding) track.dataset.finding = finding;
  if (track.dataset.wash !== wash) track.dataset.wash = wash;
  if (track.dataset.rm !== rm) track.dataset.rm = rm;
  const close = track.querySelector<HTMLElement>('.jt-close');
  if (close && close.dataset.open !== open) close.dataset.open = open;

  const statusMsg = track.querySelector<HTMLElement>('.jt-agent-msg');
  if (statusMsg) {
    const msgs: Record<string, string> = {
      none: 'مسح الهيكل الإنشائي للحرم وقاعات التعلم المعتمدة...',
      lecture: 'تدقيق قاعة المحاضرات: ضبط الحضور التلقائي ومزامنة نقاط الفحص التفاعلية...',
      checkpoint: 'معايرة نقاط الفحص: التحقق من سرعة التصحيح الفوري وتثبيت المفاهيم...',
      exam: 'فحص قاعة الاختبارات: معايرة بنك الأسئلة والتصحيح الآلي للأسئلة الموضوعية...',
      library: 'فهرسة جناح المكتبة: ربط المصادر الأكاديمية ونظام مراجعة البحوث...',
      mastery: 'اكتمال الربط الأكاديمي: مصفوفة الإتقان نشطة ومتاحة لجميع مسارات التعلم.',
    };
    const text = msgs[wash] ?? msgs.none ?? '';
    if (statusMsg.textContent !== text) statusMsg.textContent = text;
  }
}

/** the scene-clock derivation shared by BOTH scrub paths: the stage
 *  ternary (the closing owns the scrub end — stage 5), the finding
 *  rotation and the wash windows. */
function sceneClock(t: number, pRaw: number): { stage: number; finding: string; wash: string } {
  const stage =
    pRaw >= SEQ_END_PIN
      ? 5
      : t < 1.5
        ? 0
        : t < 2.5
          ? 1
          : t < 3.0
            ? 2
            : t < 5
              ? 3
              : 4;
  const finding =
    t >= FINDING_END_S
      ? 'done'
      : t < FINDING_START_S
        ? '0'
        : String(
            Math.min(
              FINDINGS_AR.length,
              Math.max(1, Math.floor((t - FINDING_START_S) / FINDING_SPAN_S) + 1),
            ),
          );
  const wash =
    t < 3.0
      ? 'none'
      : t < 3.52
        ? 'lecture'
        : t < 4.02
          ? 'checkpoint'
          : t < 4.52
            ? 'exam'
            : t < 5.02
              ? 'library'
              : 'mastery';
  return { stage, finding, wash };
}

export function JourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const mapInRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const card1Ref = useRef<HTMLDivElement | null>(null);
  const card2Ref = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLDivElement | null>(null);
  const colElRef = useRef<HTMLElement | null>(null);
  /* the drift unit — the band scaffold rung (fs-body per bp), read
   * once per epoch (never a per-frame layout read). */
  const driftFsRef = useRef(0);
  const layerElsRef = useRef<SVGGElement[][]>([]);
  const camDirtyRef = useRef(false);

  function resolveLayers(track: HTMLElement): SVGGElement[][] {
    if (layerElsRef.current.length === 0) {
      layerElsRef.current = [1, 2, 3, 4, 5, 6].map((n) =>
        Array.from(track.querySelectorAll<SVGGElement>(`.jt-plan [data-xl='${n}']`)),
      );
    }
    return layerElsRef.current;
  }

  /* ── the ONE scroll driver (zero React renders per tick) ──────────
   * The legacy conductor core: the R342 driver verbatim, kept as the
   * scene's deterministic fallback (geometry-less environments) AND
   * as the source-pinned contract. In the browser the GSAP path below
   * owns the scrub; this hook stays mounted but sleeps — its kick
   * listener is armed only when the fallback is active. */
  const legacyArmedRef = useRef(false);
  useSheetScroll(
    trackRef,
    ({ vh, rect, pin }) => {
      if (!legacyArmedRef.current) return;
      const track = trackRef.current;
      if (!track) return;
      const { mobile, phone, reduced } = viewportState();

      let pRaw: number;
      if (mobile) {
        const col =
          colElRef.current ??
          (colElRef.current = track.querySelector<HTMLElement>('.jt-map-col'));
        const mapIn = mapInRef.current;
        let geo: { top: number; height: number; winH: number; stickyTop: number } | null = null;
        if (col && mapIn) {
          const cRect = col.getBoundingClientRect();
          if (cRect.height > 1) {
            geo = {
              top: cRect.top + window.scrollY,
              height: cRect.height,
              winH: mapIn.getBoundingClientRect().height,
              stickyTop: parseFloat(getComputedStyle(mapIn).top) || 0,
            };
          }
        }
        pRaw =
          geo && geo.height > geo.winH + 1
            ? (window.scrollY - geo.top + geo.stickyTop) / (geo.height - geo.winH)
            : pin;
      } else {
        pRaw = rect.height > vh + 1 ? -rect.top / (rect.height - vh) : pin;
      }

      const art = resolveArtRegister(track);

      /* the static end-state under reduced motion. */
      if (reduced) {
        for (const n of [1, 2, 3, 4, 5, 6]) {
          for (const el of track.querySelectorAll<SVGGElement>(`.jt-plan [data-xl='${n}']`)) {
            setSheetVar(el.style, 'opacity', '1');
          }
        }
        for (const el of [...art.route, ...art.hidden, ...art.tint]) {
          setSheetVar(el.style, 'opacity', '1');
        }
        if (card1Ref.current) setSheetVar(card1Ref.current.style, 'opacity', '0');
        if (card2Ref.current) setSheetVar(card2Ref.current.style, 'opacity', '0');
        if (stackRef.current) {
          setSheetVar(stackRef.current.style, 'transform', 'translateY(0.0px)');
        }
        if (mobile) writeCamBox(track, CAM_FULL);
        writeAttrs(track, '4', 'all', 'mastery', 'on', 'on');
        return;
      }

      /* 1 · the entrance descent (≥992 only — the STACK drifts, the
       * window's chrome stays: the measured architecture). */
      const stackEl = stackRef.current;
      if (!mobile) {
        if (!driftFsRef.current && track) {
          driftFsRef.current = parseFloat(getComputedStyle(track).fontSize) || 0;
        }
        const u = (pRaw - ENTRANCE_START_PIN) / -ENTRANCE_START_PIN;
        const y = -driftMagnitude(vh, driftFsRef.current) * (1 - p2o(u));
        if (stackEl) setSheetVar(stackEl.style, 'transform', `translateY(${y.toFixed(1)}px)`);
      } else if (stackEl) {
        setSheetVar(stackEl.style, 'transform', 'none');
      }

      /* 2 · the sequence clock — the 5.52s movie (mobile front-load). */
      const seqU = clamp01((pRaw - SEQ_START_PIN) / SEQ_SPAN_PIN);
      const t = mobile ? SEQ_DUR_S * Math.pow(seqU, MOBILE_WARP_EXP) : SEQ_DUR_S * seqU;

      /* 3 · the six progressive layers — ghost→full crossfades. */
      const groups = resolveLayers(track);
      for (let i = 0; i < LAYER_WINDOWS.length; i += 1) {
        const [a, b] = LAYER_WINDOWS[i]!;
        const o = XL_GHOST + (1 - XL_GHOST) * p2o((t - a) / (b - a));
        for (const el of groups[i] ?? []) {
          setSheetVar(el.style, 'opacity', o.toFixed(3));
        }
      }

      /* 3b · the measured art register reveal. */
      const artRev = p2o((t - ART_REVEAL[0]) / (ART_REVEAL[1] - ART_REVEAL[0]));
      for (const el of art.route) setSheetVar(el.style, 'opacity', artRev.toFixed(3));
      for (const el of art.hidden) setSheetVar(el.style, 'opacity', artRev.toFixed(3));
      for (const el of art.tint) {
        setSheetVar(el.style, 'opacity', (ART_TINT + (1 - ART_TINT) * artRev).toFixed(3));
      }

      /* 4 · the statement plaques — plaque 1 VISIBLE from t 0 (the
       * spec's rest state), out at 1.0–1.4; plaque 2 in 1.6–2.0 (the
       * 0.2s dead gap keeps one voice at a time), out 2.5–3.0. */
      writeCard(card1Ref.current, t, -1, -1, 1.0, 1.4);
      writeFade(card2Ref.current, t, 1.6, 2.0, 2.5, 3.0);

      /* 5 · the discrete machine — unchanged semantics. */
      pRaw = clamp(pRaw, 0, 1);
      const { stage, finding, wash } = sceneClock(t, pRaw);
      writeAttrs(track, String(stage), finding, wash, 'off', stage === 5 ? 'on' : 'off');

      /* 6 · the ≤991 camera. */
      if (mobile) {
        writeCamBox(track, camRectAt(t, phone));
        camDirtyRef.current = true;
      } else if (camDirtyRef.current) {
        restoreCam(track);
        camDirtyRef.current = false;
      }
    },
    {
      onRefresh: () => {
        driftFsRef.current = 0;
        layerElsRef.current = [];
      },
    },
  );

  /* ── the ONE scene lifecycle (build → refresh → revert) ─────────── */
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof window === 'undefined') return undefined;
    const { reduced } = viewportState();

    /* the static end-state paint (RM / no motion): all layers ON, the
     * findings readable, the camera at the full overview, the machine
     * at its final stage. Idempotent — the CSS belt holds the same
     * outcome for the no-JS case. */
    const paintFinal = () => {
      for (const g of track.querySelectorAll<SVGGElement>('.jt-plan [data-xl]')) {
        setSheetVar(g.style, 'opacity', '1');
      }
      const art = resolveArtRegister(track);
      for (const el of [...art.route, ...art.hidden, ...art.tint]) {
        setSheetVar(el.style, 'opacity', '1');
      }
      if (card1Ref.current) setSheetVar(card1Ref.current.style, 'opacity', '0');
      if (card2Ref.current) setSheetVar(card2Ref.current.style, 'opacity', '0');
      if (stackRef.current) {
        setSheetVar(stackRef.current.style, 'transform', 'translateY(0.0px)');
      }
      const { mobile } = viewportState();
      if (mobile) writeCamBox(track, CAM_FULL);
      writeAttrs(track, '4', 'all', 'mastery', 'on', 'on');
    };

    if (reduced) {
      paintFinal();
      return undefined;
    }

    /* the geometry probe: without real layout (unit jsdom, empty
     * rects) ScrollTrigger's windows would be garbage — the scene
     * stands on the deterministic legacy core instead (the pin metric
     * clamps to the close; every unit-test contract rides it). */
    const probe = track.getBoundingClientRect();
    const docHasLayout =
      probe.height > 2 && document.documentElement.scrollHeight > window.innerHeight * 0.5;
    if (!docHasLayout) {
      legacyArmedRef.current = true;
      /* the prime frame (the useSheetScroll contract) */
      const prime = window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      return () => {
        window.cancelAnimationFrame(prime);
        legacyArmedRef.current = false;
      };
    }

    ensureMotionEngine();
    /* the scrub windows derive from the track box — re-measure once
     * the real font metrics land (the fluid root re-rungs). */
    bindFontRefresh();
    /* the canonical Lenis↔ScrollTrigger integration lands HERE (the
     * landing chunk — the heavy gsap half never rides the entry):
     * every Lenis scroll event updates the scrubber. */
    bindScrubSync(() => {
      ScrollTrigger.update();
    });
    let camTouched = false;

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: '(min-width: 992px)',
        mobile: '(max-width: 991px)',
        phone: '(max-width: 767px)',
        reduce: PREFERS_REDUCED_MOTION,
      },
      (ctx) => {
        const { desktop, mobile, phone, reduce } = ctx.conditions as {
          desktop: boolean;
          mobile: boolean;
          phone: boolean;
          reduce: boolean;
        };
        if (reduce) {
          paintFinal();
          return () => undefined;
        }

        const stack = stackRef.current;

        /* the ONE scrubbed timeline. */
        const content = buildPlanTimeline(track);
        content.pause(0);

        /* the scene clock: t = SEQ_DUR · seqU^(warp) — the ≤991
         * front-load is the R330 mobile warp (test-pinned). */
        const warp = (seqU: number) =>
          mobile ? Math.pow(clamp(seqU, 0, 1), MOBILE_WARP_EXP) : clamp(seqU, 0, 1);

        /* the sequence driver — ScrollTrigger scrubbs it; its onUpdate
         * renders the timeline and derives the discrete machine. */
        const seq = { u: 0 };
        const seqDriver = gsap.fromTo(
          seq,
          { u: 0 },
          {
            u: 1,
            duration: 1,
            ease: 'none',
            onUpdate: () => {
              const seqU = clamp(seq.u, 0, 1);
              const t = SEQ_DUR_S * warp(seqU);
              content.time(t);

              /* the ≤991 camera: the pinned camRectAt tables — one
               * interpolation implementation for both scrub paths. */
              if (mobile) {
                writeCamBox(track, camRectAt(t, phone));
                camTouched = true;
              }

              /* the discrete machine — thresholds byte-identical to
               * the R342 driver (pRaw from the scrub window). */
              const pRaw = SEQ_START_PIN + seqU * SEQ_SPAN_PIN;
              const { stage, finding, wash } = sceneClock(t, pRaw);
              writeAttrs(track, String(stage), finding, wash, 'off', stage === 5 ? 'on' : 'off');
            },
          },
        );
        seqDriver.pause(0);

        /* the sequence window — the measured pin span ([−0.082, 0.952]
         * of the track/col traversal), as functional values so every
         * ScrollTrigger.refresh re-derives them from the DELIBERATE
         * track height (journey.css --jt-scrub). */
        let seqTrigger: ScrollTrigger;
        if (desktop) {
          const span = () => Math.max(1, track.offsetHeight - window.innerHeight);
          seqTrigger = ScrollTrigger.create({
            id: 'journey-sequence',
            trigger: track,
            start: () => `top ${(-SEQ_START_PIN * span()).toFixed(1)}px`,
            end: () => `bottom ${(window.innerHeight + (1 - SEQ_END_PIN) * span()).toFixed(1)}px`,
            scrub: true,
            animation: seqDriver,
          });
        } else {
          const col =
            colElRef.current ??
            (colElRef.current = track.querySelector<HTMLElement>('.jt-map-col'));
          const geo = () => {
            const stickyTop = mapInRef.current
              ? parseFloat(getComputedStyle(mapInRef.current).top) || 0
              : 0;
            const winH = mapInRef.current ? mapInRef.current.offsetHeight : window.innerHeight;
            const spanM = Math.max(1, (col?.offsetHeight ?? 0) - winH);
            return { stickyTop, winH, spanM };
          };
          seqTrigger = ScrollTrigger.create({
            id: 'journey-sequence',
            trigger: col ?? track,
            start: () => {
              const g = geo();
              return `top ${(g.stickyTop + -SEQ_START_PIN * g.spanM).toFixed(1)}px`;
            },
            end: () => {
              const g = geo();
              return `bottom ${(g.stickyTop + g.winH + (1 - SEQ_END_PIN) * g.spanM).toFixed(1)}px`;
            },
            scrub: true,
            animation: seqDriver,
          });
        }

        /* the entrance drift (≥992 only — the measured architecture:
         * the STACK descends one frame height before the pin; the
         * window's chrome stays). The p2o curve rides the tween's
         * ease; the write keeps the exact translateY string the
         * contract tests pin. */
        let driftTrigger: ScrollTrigger | null = null;
        if (desktop && stack) {
          const drift = { u: 0 };
          const span = () => Math.max(1, track.offsetHeight - window.innerHeight);
          const driftDriver = gsap.fromTo(
            drift,
            { u: 0 },
            {
              u: 1,
              duration: 1,
              /* power1.out IS the driver's p2o (1−(1−u)²) — the exact
               * measured curve; gsap's power2 is cubic and would land
               * the descent ahead of the pinned positions. */
              ease: 'power1.out',
              onUpdate: () => {
                if (!driftFsRef.current && track) {
                  driftFsRef.current = parseFloat(getComputedStyle(track).fontSize) || 0;
                }
                const y = -driftMagnitude(window.innerHeight, driftFsRef.current) * (1 - drift.u);
                if (stackRef.current) {
                  setSheetVar(
                    stackRef.current.style,
                    'transform',
                    `translateY(${y.toFixed(1)}px)`,
                  );
                }
              },
            },
          );
          driftDriver.pause(0);
          driftTrigger = ScrollTrigger.create({
            id: 'journey-drift',
            trigger: track,
            start: () => `top ${(-ENTRANCE_START_PIN * span()).toFixed(1)}px`,
            end: 'top top',
            scrub: true,
            animation: driftDriver,
            onRefresh: () => {
              driftFsRef.current = 0;
            },
          });
        }

        /* cleanup — the camera's viewBox restore is consumed ONCE per
         * mobile epoch (the ≥992 crossing contract, r312). */
        return () => {
          seqTrigger.kill();
          driftTrigger?.kill();
          seqDriver.kill();
          content.kill();
          if (mobile && camTouched) {
            restoreCam(track);
          }
        };
      },
    );

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <div
      className="jt"
      ref={trackRef}
      data-stage="0"
      data-finding="0"
      data-wash="none"
      data-rm="off"
    >
      <div className="jt-pin">
        {/* the PLAN COLUMN — measured per bp; the ≤991 scroll track */}
        <div className="jt-map-col">
          {/* the stack seat @≥992 · the STICKY WINDOW @≤991 */}
          <div className="jt-map-in" ref={mapInRef}>
            <div className="jt-window" ref={windowRef}>
              {/* the four registration rails — the frame's inset
                  spacers (the measured window chrome; invisible
                  layout seats exactly like the reference's) */}
              <div className="jt-rail jt-rail-t" aria-hidden="true" />
              <div className="jt-rail jt-rail-b" aria-hidden="true" />
              <div className="jt-rail jt-rail-s" aria-hidden="true" />
              <div className="jt-rail jt-rail-e" data-spec="map.raile" aria-hidden="true" />

              {/* the four corner marks — crosshair registration svgs
                  (one vertical + one horizontal stroke each, the
                  drawing-frame grammar) */}
              <div className="jt-mark jt-mark-a" data-spec="map.marka" aria-hidden="true">
                <div className="jt-mark-in" data-spec="map.markain">
                  <svg className="jt-mark-svg" data-spec="map.markasvg" viewBox="0 0 10 10" aria-hidden="true">
                    <path data-spec="map.markap1" d="M5 0V10" />
                    <path data-spec="map.markap2" d="M0 5H10" />
                  </svg>
                </div>
              </div>
              <div className="jt-mark jt-mark-b" data-spec="map.markb" aria-hidden="true">
                <div className="jt-mark-in" data-spec="map.markbin">
                  <svg className="jt-mark-svg" data-spec="map.markbsvg" viewBox="0 0 10 10" aria-hidden="true">
                    <path data-spec="map.markbp1" d="M5 0V10" />
                    <path data-spec="map.markbp2" d="M0 5H10" />
                  </svg>
                </div>
              </div>
              <div className="jt-mark jt-mark-c" data-spec="map.markc" aria-hidden="true">
                <div className="jt-mark-in" data-spec="map.markcin">
                  <svg className="jt-mark-svg" data-spec="map.markcsvg" viewBox="0 0 10 10" aria-hidden="true">
                    <path data-spec="map.markcp1" d="M5 0V10" />
                    <path data-spec="map.markcp2" d="M0 5H10" />
                  </svg>
                </div>
              </div>
              <div className="jt-mark jt-mark-d" data-spec="map.markd" aria-hidden="true">
                <div className="jt-mark-in" data-spec="map.markdin">
                  <svg className="jt-mark-svg" data-spec="map.markdsvg" viewBox="0 0 10 10" aria-hidden="true">
                    <path data-spec="map.markdp1" d="M5 0V10" />
                    <path data-spec="map.markdp2" d="M0 5H10" />
                  </svg>
                </div>
              </div>

              {/* the drifting plan stack — the entrance descent's
                  target (the measured transform: one frame height
                  minus 1rem up at rest). The svg letterboxes its
                  1200×760 sheet inside; the plaques + the annotation
                  cards ride the drift with it. */}
              <div className="jt-stack" ref={stackRef}>
                <LearningPlanDrawing />

                {/* the plaque band + the plaque-2 wrapper — the two
                    statements: plaque 1 rides the band (VISIBLE from
                    frame one — the spec's captured rest state, the
                    section's entry statement); plaque 2 rides its own
                    from-state wrapper (opacity 0, one notch larger —
                    the measured gsap seat), and the scrubbed timeline
                    EXCHANGES the two (exit shrink ∓ the measured
                    recipe; enter rise + settle scale). One seat per
                    statement, never stacked. */}
                <div className="jt-cards" data-spec="map.plaques">
                  <div className="jt-card jt-card1" ref={card1Ref} data-spec="map.plaque1o">
                    <div className="jt-card-plate" data-spec="map.plaque1i">
                      {STATEMENT_1_AR}
                    </div>
                  </div>
                </div>
                <div className="jt-card2w" ref={card2Ref} data-spec="map.card2w">
                  <div className="jt-card jt-card2" data-spec="map.plaque2o">
                    <div className="jt-card-plate" data-spec="map.plaque2i">
                      {STATEMENT_2_AR}
                    </div>
                  </div>
                </div>

                {/* the three annotation cards — the plan's own
                    callouts (orange-ruled, mono titles), revealed
                    last by the scrubbed timeline (the attr machine's
                    stage rules stay as the fallback). */}
                <div className="jt-anno jt-anno-1" data-spec="map.anno1">
                  <div className="jt-anno-tw" data-spec="map.anno1tw">
                    <div className="jt-anno-t" data-spec="map.anno1t">{ANNOTATIONS_AR[0].title}</div>
                  </div>
                  <div className="jt-anno-bw" data-spec="map.anno1bw">
                    <div className="jt-anno-b" data-spec="map.anno1b">{ANNOTATIONS_AR[0].text}</div>
                  </div>
                </div>
                <div className="jt-anno jt-anno-2" data-spec="map.anno2">
                  <div className="jt-anno-tw" data-spec="map.anno2tw">
                    <div className="jt-anno-t" data-spec="map.anno2t">{ANNOTATIONS_AR[1].title}</div>
                  </div>
                  <div className="jt-anno-bw" data-spec="map.anno2bw">
                    <div className="jt-anno-b" data-spec="map.anno2b">{ANNOTATIONS_AR[1].text}</div>
                  </div>
                </div>
                <div className="jt-anno jt-anno-3" data-spec="map.anno3">
                  <div className="jt-anno-tw" data-spec="map.anno3tw">
                    <div className="jt-anno-t" data-spec="map.anno3t">{ANNOTATIONS_AR[2].title}</div>
                  </div>
                  <div className="jt-anno-bw" data-spec="map.anno3bw">
                    <div className="jt-anno-b" data-spec="map.anno3b">{ANNOTATIONS_AR[2].text}</div>
                  </div>
                </div>
              </div>

              {/* the [nn/05] counter rows — our mono furniture (the
                  reference carries its counters inside the svg art) */}
              <div className="jt-idx" aria-hidden="true">
                {COUNTERS.map((c) => (
                  <span key={c} className="fo-mono" dir="ltr">
                    {c}
                  </span>
                ))}
              </div>

              {/* The live agent diagnostic status line */}
              <div className="jt-agent-status" aria-hidden="true">
                <span className="jt-agent-dot" />
                <span className="jt-agent-tag fo-mono" dir="ltr">[ULARA AGENT]</span>
                <span className="jt-agent-msg">مسح الهيكل الإنشائي للحرم وقاعات التعلم المعتمدة...</span>
              </div>
            </div>

            {/* the INTRODUCTION card — the measured corner card:
                paper ground, 1px hairline, the DARK head chip with
                the white mono label, five findings ONE at a time
                (each body + its mono foot), collapsed to the head
                outside the card era. Rests at opacity 0 (the spec's
                captured state); flips on with stage 2. */}
            <aside className="jt-intro" aria-label={INTRO_TITLE_AR}>
              <div className="jt-intro-headchip" data-spec="map.introhead">
                <div className="jt-intro-labelw" data-spec="map.introlabelw">
                  <div className="jt-intro-head" data-spec="map.introlabel">{INTRO_TITLE_AR}</div>
                </div>
              </div>
              <div className="jt-intro-body" data-spec="map.introbody">
                <div className="jt-intro-findings" data-spec="map.findings">
                  {FINDINGS_AR.map((f, i) => (
                    <div key={f.key} className="jt-intro-finding" data-spec={`map.finding${i + 1}`}>
                      <div className="jt-f-bw" data-spec={`map.finding${i + 1}bw`}>
                        <div className="jt-f-b" data-spec={`map.finding${i + 1}b`}>
                          <strong>{f.title}</strong> — {f.text}
                        </div>
                      </div>
                      {i < 4 && (
                        <div className="jt-f-fw" data-spec={`map.finding${i + 1}fw`}>
                          <div className="jt-f-f" dir="auto" data-spec={`map.finding${i + 1}f`}>{f.foot}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* the closing column — the section's own head + the
            four-station ledger. VISIBLE from frame one (the frozen
            spec records every element at opacity 1 at rest — the
            R341 reserved-empty column was a misreading). The h2
            keeps the aria contract (id=chapters-title). */}
        <span className="jt-close-vrule" aria-hidden="true" />
        <div className="jt-close" ref={closeRef} data-open="off">
          <div className="jt-close-inner" data-spec="map.closein">
            <div className="jt-close-chiprow">
              <div className="jt-close-chip" data-spec="map.chip">
                <div className="jt-close-chip-in" data-spec="map.chipin">
                  {CLOSE_CHIP_L1_AR}
                  <br data-spec="map.br" />
                  <span dir="ltr">{CLOSE_CHIP_L2_AR}</span>
                </div>
              </div>
            </div>
            <div className="jt-close-chiprule" data-spec="map.chiprule" aria-hidden="true" />
            <div className="jt-close-main" data-spec="map.main">
              <div className="jt-close-titlew" data-spec="map.h2o">
                <h2 className="jt-close-title" id="chapters-title" data-spec="map.title">
                  {CLOSE_TITLE_AR}
                </h2>
              </div>
              <div className="jt-close-copyw" data-spec="map.copyo">
                <div className="jt-close-copy" data-spec="map.copy">{CLOSE_COPY_AR}</div>
              </div>
            </div>
            <div className="jt-close-cms" data-spec="map.cms">
              <div className="jt-close-cms-in" data-spec="map.cmsin">
                {LEDGER_AR.map((row, i) => (
                  <div key={row.key} className="jt-cms-row" data-spec={`map.row${i + 1}`}>
                    <div className="jt-cms-rule" data-spec={`map.row${i + 1}rule`} aria-hidden="true" />
                    <div className="jt-cms-textcell" data-spec={`map.row${i + 1}tc`}>
                      <div className="jt-cms-text" data-spec={`map.row${i + 1}t`}>{row.text}</div>
                    </div>
                    <div className="jt-cms-vrule" data-spec={`map.row${i + 1}vr`} aria-hidden="true" />
                    <div className="jt-cms-ico" data-spec={`map.row${i + 1}ico`}>
                      <div className="jt-cms-ico-in" data-spec={`map.row${i + 1}icoi`}>
                        <div className="jt-cms-ico-in2" data-spec={`map.row${i + 1}icoi2`}>
                          <Icon icon={row.icon} size={27} strokeWidth={1.5} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
