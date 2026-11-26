/**
 * IsoJourneyScene — r346 «الرحلة» · the isometric assembly · THE ONE
 * SCRUBBED SCENE on the house engine.
 *
 * THE PORT (r346, task 2-a): the JOURNEY band's 2D architectural
 * floor-plan artwork retires FROM THE MOUNT (JourneyScene.tsx stays
 * on disk for rollback, per the house convention — its r312 source
 * pins keep reading it); the window now carries the ISOMETRIC CAMPUS
 * SHEET (IsoCampusSheet — the e4c84e7 plate grammar re-composed onto
 * the band's own 1200×760 sheet), and the band's story gains the
 * r346 sandbox's assembly choreography: the plate's thirteen
 * `data-frag` volumes fly in from off-canvas vectors and assemble as
 * the scroll advances, the numbered system markers pop, the
 * capability panel unfolds, its rows stagger after.
 *
 * THE CONTRACTS (test law — every one preserved verbatim):
 *   · r312 (e2e + unit): the `.jt` dataset machine
 *     (data-stage/finding/wash/rm), the sticky `.jt-map-in` window,
 *     the ONE svg.bp-svg with its viewBox/preserveAspectRatio, the
 *     `.jt-pin`/`.jt-close` seats, the ≤991 column clock + the two
 *     camera crop families, the ≥992 crossing restore, the entrance
 *     drift on `.jt-stack`, the six-state sweep, the RM static sheet
 *     (8 `[data-xl]` layers at opacity 1, the findings readable).
 *   · r325: the ghost floor at progress 0 (every `[data-xl]` ≥ its
 *     18% CSS floor), the unboxed plaque overlays, the clip gate (no
 *     text line escapes its container at any probed beat — the panel
 *     therefore unfolds its FRAME first and settles its TEXT only
 *     after the clip stands full).
 *   · r306: no new @keyframes (everything here is scrub-driven).
 *
 * THE ENGINE (R342-final's law, kept): NO GSAP, no second frame
 * system — the WHOLE scene rides ONE useSheetScroll frame on the
 * shared conductor clock, and every write is a DIRECT idempotent
 * style write (setSheetVar — the perf-baseline §7-1 contract: no
 * custom property is written during scroll, so no inherited var walk
 * can return). The R342-final timeline branch itself retires with
 * this port: the browser now rides the SAME direct-write render path
 * the deterministic fallback always owned (the legacy core WAS the
 * R342 driver — one implementation, zero divergence between jsdom
 * and the browser).
 *
 * THE SCRUB GRAMMAR (two clocks, one frame):
 *   · the SCENE CLOCK (t, 0→5.52s over the pin windows −0.082→0.952,
 *     front-loaded ≤991 by the ^0.55 warp) — the layer crossfades,
 *     the plaque exchange, the discrete machine and the camera;
 *   · the ASSEMBLY CLOCK (band progress pRaw, 0→1) — the r346
 *     sandbox's own windows: the caption exits 0→0.10, the thirteen
 *     fragments stagger in over 0.04→~0.59 (power2.out flights),
 *     the markers pop 0.55→0.67 (back.out(2)), the plate yields to
 *     the panel 0.62→0.80, the panel frame unfolds 0.62→0.85, its
 *     header + rows settle 0.85→1. Both derive from the same measured
 *     geometry per frame — reversible by construction.
 *
 * JS-OFF SAFETY (the r346 law): the plate, the markers, the panel
 * and the caption are AUTHORED at their settled states in CSS; the
 * scrub-only hidden states live under the `.jt-live` armed class
 * (added by the layout effect before the first paint, removed on
 * unmount and under reduced motion) — a dead JS pass renders the
 * assembled plate with every seat visible, and the armed class alone
 * can never outlive the driver that owns it.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { PREFERS_REDUCED_MOTION } from '../../../lib/motion-media';
import { LECTURE_INTERACTIVE, MASTERY_SCORE_LINE } from '../copy';
import { Icon } from '../../Icon';
import { Presentation, CircleCheck, FileCheck2, Grid3x3 } from 'lucide-react';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { clamp, setSheetVar } from '../../../lib/motion/sheetConductor';
import { IsoCampusSheet, FRAG_VECTORS, PLAN_VB } from './IsoCampusSheet';
import { RegCross } from '../../patterns/RegCross';
import { PlanPlate, DarkCard } from '../plates/PlanPlate';

/* ── The copy (our own words, honest, Arabic RTL — the r312/r322
 *    contract carried verbatim; the findings/ledger keep their
 *    truthfulness pins) ─────────────────────────────────────────── */
const STATEMENT_1_AR = 'الرحلة مرسومة على مسطح واحد';
const STATEMENT_2_AR = 'لكل فصل غرفته وبابه الذي يفتحه';

const INTRO_TITLE_AR = 'مقدمة';
const FINDINGS_AR = [
  {
    key: 'lecture',
    title: LECTURE_INTERACTIVE,
    text: 'محاضرة مسجَّلة بنقاط فحص وحضور تلقائي.',
    foot: 'الباب [01]',
  },
  {
    key: 'checkpoint',
    title: 'نقاط الفحص',
    text: 'سؤال داخل المحاضرة يُصحَّح فورًا.',
    foot: 'الباب [02]',
  },
  {
    key: 'exam',
    title: 'الاختبارات الإلكترونية',
    text: 'بنك أسئلة وتصحيح تلقائي للموضوعي.',
    foot: 'الباب [03]',
  },
  {
    key: 'mastery',
    title: 'مصفوفة الإتقان',
    text: MASTERY_SCORE_LINE,
    foot: 'الباب [05]',
  },
  {
    key: 'assistant',
    title: 'المساعد الأكاديمي',
    /* r168b/r191 pin: the honest local-completion wording rides VERBATIM */
    text: 'يعمل اليوم داخل المنصّة — شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.',
    foot: 'يعمل اليوم',
  },
] as const;

/* the closing column — the section's own head (kept verbatim: the
 * aria-labelledby contract rides id="chapters-title"). */
const CLOSE_CHIP_L1_AR = 'الفصول';
const CLOSE_CHIP_L2_AR = '[04]';
const BIG_PLAN_SRC = new URL('../../../assets/art-v2/plans/plan-library.svg', import.meta.url).href;
const CLOSE_TITLE_AR = 'الرحلة — أربعة فصول تتحرك أمامك';
/* R349 (D5 · the closing copy's diet): the retired three-sentence
 * block restated the funnel hint («وإنشاء الحساب في نهاية الصفحة» —
 * the register CTA already rides five pinned surfaces) and the
 * artwork-provenance aside; the two honest claims that carry the
 * section's truth (no prettified captures · every room works today)
 * stay, in half the words. */
const CLOSE_COPY_AR =
  'مرّر لتشاهد الرحلة تُبنى على مسطح واحد — كل غرفة ميزة تعمل اليوم.';

/* the four-station ledger rows (the cms block — the truth set keeps,
 * the sentence length rides the r351 copy cut). */
const LEDGER_AR = [
  { key: 'lecture', text: 'المحاضرة التفاعلية بنقاط الفحص', icon: Presentation },
  { key: 'checkpoint', text: 'تصحيح فوري داخل المحاضرة', icon: CircleCheck },
  { key: 'exam', text: 'اختبارات وقوالب جاهزة', icon: FileCheck2 },
  { key: 'mastery', text: 'المراجعة حسب أدائك الفعلي', icon: Grid3x3 },
] as const;

/* the [nn/05] counter rows — static text, opacity-only progression. */
const COUNTERS = ['[01/05]', '[02/05]', '[03/05]', '[04/05]', '[05/05]'] as const;

/* ── the r346 copy (the sandbox's assembly furniture, ported; the
 *    marker 3 label fixes the sandbox's «البحووث» typo →
 *    «البحوث») ──────────────────────────────────────────────────── */
const CAPTION_KICKER_AR = 'الرحلة';
const CAPTION_LINE_AR = 'المنظومة تتجمع';
const CAPTION_SCROLL_LBL = '[SCROLL]';

const MARKERS_AR = [
  {
    n: '01',
    label: 'الكليات',
    detail: 'كليات كل مؤسسة من بياناتها هي.',
    seat: 'a',
  },
  {
    n: '02',
    label: 'المقرّرات',
    detail: 'فصول مقلوبة بإدماجيات وتتبّع حضور.',
    seat: 'b',
  },
  {
    n: '03',
    label: 'البحوث',
    detail: 'من الإرسال إلى النشر في المكتبة.',
    seat: 'c',
  },
] as const;

const PANEL_ARIA_AR = 'قدرات المنظومة';
const PANEL_TITLE_LBL = 'SYSTEM/CAPABILITIES';
const PANEL_ROWS_AR = [
  { n: '01', title: 'مساحة معزولة لكل مؤسسة' },
  { n: '02', title: 'خلية إتقان لكل مفهوم' },
  { n: '03', title: 'سجلّ لكل فعل' },
  { n: '04', title: 'مقعد لكل دور' },
] as const;

/* ══ THE SCENE CLOCK (the measured constants — r312's source pins
 *    read the retired JourneyScene.tsx; the VALUES here are the same
 *    law, re-seated on the iso sheet) ═════════════════════════════ */

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
 * register, re-keyed to the campus drafting order (site → tower +
 * wings → far wings → satellites → routes + trees → furniture +
 * labels; see IsoCampusSheet's [data-xl] seats). */
const LAYER_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [0.35, 0.85], // 1 · the site: the ground lattice + the diamond plinth
  [1.02, 1.52], // 2 · the tower + the first wings
  [1.52, 2.02], // 3 · the far wings
  [2.02, 2.52], // 4 · the satellites: observatory, plaza, field
  [2.52, 3.02], // 5 · the data routes + the tree ring
  [3.02, 3.52], // 6 · the drafting furniture + the leader labels
];

const XL_GHOST = 0.18;

/* the finding rotation: 5 equal 0.6s windows over t 2.5→5.5. */
const FINDING_SPAN_S = 0.6;
const FINDING_START_S = 2.5;
const FINDING_END_S = 5.5;

/* power2.out — the reference's scrub ease. */
function p2o(x: number): number {
  const u = x < 0 ? 0 : x > 1 ? 1 : x;
  return 1 - (1 - u) * (1 - u);
}

/** back.out(2) — the marker pop's overshoot (the r346 sandbox's own
 *  ease; the c1=2/c3=3 cubic exactly). */
function back2(x: number): number {
  const u = x < 0 ? 0 : x > 1 ? 1 : x;
  const v = u - 1;
  return 1 + 3 * v * v * v + 2 * v * v;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/* ── the ≤991 camera (the R312 camera family — two crop families,
 *    verbatim: the tables crop the 1200×760 SHEET, whichever drawing
 *    lives on it) ────────────────────────────────────────────────── */
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

/* the statement plaques' in/out recipe — the measured one (kept
 * verbatim from the R322/R342 driver; the r325 belt pins both
 * seats' authored rest states). */
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

/* the plaque-2 WRAPPER fade — opacity-only (kept verbatim). */
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

/* the entrance drift magnitude — the measured transform (kept). */
function driftMagnitude(vh: number, fs: number): number {
  return Math.max(0, vh - fs);
}

/* the discrete machine writes — one place, idempotent (kept; the
 * wash narration reads the CAMPUS now — the r346 art's own story). */
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

/** the scene-clock derivation (kept verbatim — the test-pinned
 *  thresholds: the closing owns the scrub end). */
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

/* ══ THE ASSEMBLY CLOCK (r346 — the sandbox's scrub windows, in band
 *    progress units; every write a pure function of pRaw, so the
 *    whole choreography scrubs both ways) ═════════════════════════ */

/* the caption exits over the first 10% of the band — 2.5% ≤991
 * (R349: the R330 mobile clock front-loads the plaque era into the
 * first ~8% of the band, so the caption's exit and plaque 2's
 * entrance read as ONE stacked collision on the short phone window;
 * the phone exits the caption in the first quarter of that span,
 * clearing the band for the plaque before it enters). */
const CAPTION_EXIT_SPAN = 0.1;
const CAPTION_EXIT_SPAN_MOBILE = 0.025;
/* the thirteen fragments: start = 0.04 + (i/13)·0.42, dur 0.16 — the
 * last flight settles at ~0.59 (the first ~55–60% of the band). */
const FRAG_START = 0.04;
const FRAG_STAGGER_SPAN = 0.42;
const FRAG_DUR = 0.16;
/* the leader labels dim to the 0.22 drafting underlay when the panel
 * era opens. */
const LABELS_DIM_AT: readonly [number, number] = [0.62, 0.08];
/* the markers pop 0.55 + i·0.035 (dur 0.05 — back.out(2)). */
const MARKER_AT = 0.55;
const MARKER_STEP = 0.035;
const MARKER_DUR = 0.05;
/* the plate yields to the panel over 0.62→0.80. */
const YIELD_AT: readonly [number, number] = [0.62, 0.18];
/* the panel: the frame appears 0.62→0.66, unfolds 0.62→0.74, then
 * the header 0.76→0.82 and the rows stagger 0.78+ (the r325 clip
 * gate: no visible text ever rides the unfolding clip).
 * R349 (the blank-box belt): the retired 0.62→0.85 clip held a
 * near-empty paper box over the yielding plate for ~23% of the
 * band (~1,115px @1440 · ~918px @390) while the header waited at
 * 0.85 — the audit's «blank white media box». The unfold now
 * completes by 74% and every row settles by ~0.92, so the seat
 * carries INK through its own growth instead of dead paper. */
const PANEL_BOX_AT: readonly [number, number] = [0.62, 0.04];
const PANEL_W_AT: readonly [number, number] = [0.62, 0.12];
const PANEL_HEAD_AT: readonly [number, number] = [0.76, 0.06];
const PANEL_ROW_AT = 0.78;
const PANEL_ROW_STEP = 0.03;
const PANEL_ROW_DUR = 0.05;

export function IsoJourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const mapInRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const card1Ref = useRef<HTMLDivElement | null>(null);
  const card2Ref = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLDivElement | null>(null);
  const colElRef = useRef<HTMLElement | null>(null);
  /* the r346 seats */
  const captionRef = useRef<HTMLDivElement | null>(null);
  const panelSeatRef = useRef<HTMLElement | null>(null);
  const panelClipRef = useRef<HTMLDivElement | null>(null);
  const panelHeadRef = useRef<HTMLDivElement | null>(null);
  const panelPctRef = useRef<HTMLSpanElement | null>(null);
  /* the marker detail cards' hover/focus state (interaction state,
   * never a per-frame write). */
  const [hover, setHover] = useState<string | null>(null);

  /* the drift unit — the band scaffold rung (fs-body per bp), read
   * once per epoch (never a per-frame layout read). */
  const driftFsRef = useRef(0);
  const layerElsRef = useRef<SVGGElement[][]>([]);
  const fragElsRef = useRef<SVGGElement[]>([]);
  const markerElsRef = useRef<HTMLElement[]>([]);
  const rowElsRef = useRef<HTMLElement[]>([]);
  const camDirtyRef = useRef(false);
  /* the ≤991 sticky-column geometry cache — re-measured only on the
   * refresh epochs; steady frames derive from scrollY (free). */
  const colGeoRef = useRef<{ top: number; height: number; winH: number; stickyTop: number } | null>(null);
  /* the panel's unfolded width — the seat's own resolved box, read
   * once per epoch (the clip's target; the seat never animates, so
   * the measure is stable across the scrub). */
  const panelWRef = useRef(0);

  function resolveLayers(track: HTMLElement): SVGGElement[][] {
    if (layerElsRef.current.length === 0) {
      layerElsRef.current = [1, 2, 3, 4, 5, 6].map((n) =>
        Array.from(track.querySelectorAll<SVGGElement>(`.jt-plan [data-xl='${n}']`)),
      );
    }
    return layerElsRef.current;
  }

  function resolveFrags(track: HTMLElement): SVGGElement[] {
    if (fragElsRef.current.length === 0) {
      fragElsRef.current = Array.from(track.querySelectorAll<SVGGElement>('.jt-plan [data-frag]'));
    }
    return fragElsRef.current;
  }

  function resolveMarkers(track: HTMLElement): HTMLElement[] {
    if (markerElsRef.current.length === 0) {
      markerElsRef.current = Array.from(track.querySelectorAll<HTMLElement>('.jt-mk'));
    }
    return markerElsRef.current;
  }

  function resolveRows(track: HTMLElement): HTMLElement[] {
    if (rowElsRef.current.length === 0) {
      rowElsRef.current = Array.from(track.querySelectorAll<HTMLElement>('.map-panel-row'));
    }
    return rowElsRef.current;
  }

  /* ── the r346 assembly — the sandbox's scrubbed timeline,
   *    re-expressed as direct writes on the ONE driver frame (band
   *    progress windows; power2.out flights, back.out(2) pops). ── */
  function writeAssembly(track: HTMLElement, pRaw: number, mobile: boolean): void {
    /* a · the caption exits over the first 10% of the band (2.5% ≤991 —
     *     the front-loaded phone clock, see CAPTION_EXIT_SPAN_MOBILE);
     *     fade + an 18%-of-self rise — the sandbox's yPercent −18). */
    const cap = captionRef.current;
    if (cap) {
      const u = clamp01(pRaw / (mobile ? CAPTION_EXIT_SPAN_MOBILE : CAPTION_EXIT_SPAN));
      const o = 1 - u;
      setSheetVar(cap.style, 'opacity', o.toFixed(3));
      setSheetVar(cap.style, 'translate', `0 ${(-18 * u).toFixed(2)}%`);
      setSheetVar(cap.style, 'visibility', o <= 0 ? 'hidden' : 'visible');
    }

    /* b · the thirteen fragment flights — each volume eases off its
     *     off-canvas vector onto the sheet (staggered, reversible). */
    const frags = resolveFrags(track);
    for (let i = 0; i < frags.length; i += 1) {
      const f = frags[i]!;
      const v = FRAG_VECTORS[f.dataset.frag ?? ''];
      if (!v) continue;
      const start = FRAG_START + (i / frags.length) * FRAG_STAGGER_SPAN;
      const u = p2o(clamp01((pRaw - start) / FRAG_DUR));
      setSheetVar(
        f.style,
        'transform',
        `translate(${(v[0] * (1 - u)).toFixed(1)}px, ${(v[1] * (1 - u)).toFixed(1)}px)`,
      );
      let o = u;
      if (f.dataset.frag === 'labels') {
        /* the leader labels dim to a drafting underlay once the
         * panel era opens (the sandbox's 0.22 whisper). */
        const d = p2o(clamp01((pRaw - LABELS_DIM_AT[0]) / LABELS_DIM_AT[1]));
        o = u * (1 - 0.78 * d);
      }
      setSheetVar(f.style, 'opacity', o.toFixed(3));
    }

    /* c · the plate yields to the panel: ≥992 a 7% drift + a breath
     *     of scale away from the panel's inline-start seat; ≤991 it
     *     rises and shrinks for the bottom sheet (the sandbox's own
     *     two recipes). */
    const svg = camSvgFor(track);
    if (svg) {
      const u = p2o(clamp01((pRaw - YIELD_AT[0]) / YIELD_AT[1]));
      setSheetVar(
        svg.style,
        'transform',
        u <= 0
          ? 'none'
          : mobile
            ? `translateY(${(-20 * u).toFixed(2)}%) scale(${(1 - 0.32 * u).toFixed(3)})`
            : `translateX(${(-7 * u).toFixed(2)}%) scale(${(1 - 0.08 * u).toFixed(3)})`,
      );
    }

    /* d · the three numbered markers pop (back.out(2) — the
     *     overshoot; visibility gates the tab order until popped). */
    const mks = resolveMarkers(track);
    for (let i = 0; i < mks.length; i += 1) {
      const m = mks[i]!;
      const u = back2(clamp01((pRaw - (MARKER_AT + i * MARKER_STEP)) / MARKER_DUR));
      const o = Math.min(1, u);
      setSheetVar(m.style, 'opacity', o.toFixed(3));
      setSheetVar(m.style, 'transform', u >= 1 ? 'none' : `scale(${u.toFixed(3)})`);
      setSheetVar(m.style, 'visibility', o <= 0 ? 'hidden' : 'visible');
    }

    /* e · the capability panel: the FRAME unfolds (the seat fades in,
     *     the clip widens 0→the seat's own width over 62→85%), then
     *     the header + the staggered rows settle INSIDE the standing
     *     clip — no text ever rides the unfolding edge (r325). */
    const seat = panelSeatRef.current;
    const clip = panelClipRef.current;
    if (seat && clip) {
      const o = p2o(clamp01((pRaw - PANEL_BOX_AT[0]) / PANEL_BOX_AT[1]));
      setSheetVar(seat.style, 'opacity', o.toFixed(3));
      setSheetVar(seat.style, 'visibility', o <= 0 ? 'hidden' : 'visible');
      if (!panelWRef.current) {
        const w = seat.getBoundingClientRect().width;
        if (w > 1) panelWRef.current = w;
      }
      const wU = p2o(clamp01((pRaw - PANEL_W_AT[0]) / PANEL_W_AT[1]));
      setSheetVar(clip.style, 'inline-size', `${(panelWRef.current * wU).toFixed(1)}px`);
    }
    const head = panelHeadRef.current;
    if (head) {
      const u = p2o(clamp01((pRaw - PANEL_HEAD_AT[0]) / PANEL_HEAD_AT[1]));
      setSheetVar(head.style, 'opacity', u.toFixed(3));
      /* visibility (not just opacity) — it INHERITS to the header's
       * text spans, so the r325 clip probe (which reads each text
       * node's own element) never sees the pct readout riding the
       * unfolding clip edge. */
      setSheetVar(head.style, 'visibility', u <= 0 ? 'hidden' : 'visible');
    }
    const pct = panelPctRef.current;
    if (pct) {
      const txt = `${String(Math.round(clamp01(pRaw) * 100)).padStart(3, '0')}%`;
      if (pct.textContent !== txt) pct.textContent = txt;
    }
    const rows = resolveRows(track);
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i]!;
      const u = p2o(clamp01((pRaw - (PANEL_ROW_AT + i * PANEL_ROW_STEP)) / PANEL_ROW_DUR));
      setSheetVar(r.style, 'opacity', u.toFixed(3));
      setSheetVar(r.style, 'visibility', u <= 0 ? 'hidden' : 'visible');
      setSheetVar(r.style, 'translate', `0 ${(24 * (1 - u)).toFixed(1)}px`);
    }
  }

  /* ── the settled sheet — ONE paint shared by the RM branch, the
   *    mid-flight RM flip and the layout effect's static paint (the
   *    R312 static-sheet contract + the r346 furniture at rest). ── */
  function paintSettled(track: HTMLElement, mobile: boolean): void {
    /* the layer stack + the assembled fragments stand at full ink */
    for (const g of track.querySelectorAll<SVGGElement>('.jt-plan [data-xl]')) {
      setSheetVar(g.style, 'opacity', '1');
    }
    for (const f of track.querySelectorAll<SVGGElement>('.jt-plan [data-frag]')) {
      setSheetVar(f.style, 'opacity', '1');
      setSheetVar(f.style, 'transform', 'none');
    }
    const svg = camSvgFor(track);
    if (svg) setSheetVar(svg.style, 'transform', 'none');
    /* the plaques + the drift — the R312 static sheet */
    if (card1Ref.current) setSheetVar(card1Ref.current.style, 'opacity', '0');
    if (card2Ref.current) setSheetVar(card2Ref.current.style, 'opacity', '0');
    if (stackRef.current) {
      setSheetVar(stackRef.current.style, 'transform', 'translateY(0.0px)');
    }
    /* the r346 furniture at rest: the caption dimmed to its whisper,
     * the markers popped, the panel open at full width. */
    if (captionRef.current) {
      setSheetVar(captionRef.current.style, 'opacity', '0.25');
      setSheetVar(captionRef.current.style, 'translate', 'none');
      setSheetVar(captionRef.current.style, 'visibility', 'visible');
    }
    for (const m of track.querySelectorAll<HTMLElement>('.jt-mk')) {
      setSheetVar(m.style, 'opacity', '1');
      setSheetVar(m.style, 'transform', 'none');
      setSheetVar(m.style, 'visibility', 'visible');
    }
    if (panelSeatRef.current) {
      setSheetVar(panelSeatRef.current.style, 'opacity', '1');
      setSheetVar(panelSeatRef.current.style, 'visibility', 'visible');
    }
    if (panelClipRef.current) setSheetVar(panelClipRef.current.style, 'inline-size', '100%');
    if (panelHeadRef.current) {
      setSheetVar(panelHeadRef.current.style, 'opacity', '1');
      setSheetVar(panelHeadRef.current.style, 'visibility', 'visible');
    }
    if (panelPctRef.current && panelPctRef.current.textContent !== '100%') {
      panelPctRef.current.textContent = '100%';
    }
    for (const r of track.querySelectorAll<HTMLElement>('.map-panel-row')) {
      setSheetVar(r.style, 'opacity', '1');
      setSheetVar(r.style, 'visibility', 'visible');
      setSheetVar(r.style, 'translate', 'none');
    }
    if (mobile) writeCamBox(track, CAM_FULL);
    writeAttrs(track, '4', 'all', 'mastery', 'on', 'on');
  }

  /* ── the ONE scroll driver (zero React renders per tick — both
   *    clocks, every write, on the single shared-conductor frame) ── */
  useSheetScroll(
    trackRef,
    ({ vh, rect, pin }) => {
      const track = trackRef.current;
      if (!track) return;
      const { mobile, phone, reduced } = viewportState();

      let pRaw: number;
      if (mobile) {
        let geo = colGeoRef.current;
        if (!geo) {
          const col =
            colElRef.current ??
            (colElRef.current = track.querySelector<HTMLElement>('.jt-map-col'));
          const mapIn = mapInRef.current ?? track.querySelector<HTMLElement>('.jt-map-in');
          if (col && mapIn) {
            const cRect = col.getBoundingClientRect();
            if (cRect.height > 1) {
              geo = {
                top: cRect.top + window.scrollY,
                height: cRect.height,
                winH: mapIn.getBoundingClientRect().height,
                stickyTop: parseFloat(getComputedStyle(mapIn).top) || 0,
              };
              colGeoRef.current = geo;
            }
          }
        }
        pRaw =
          geo && geo.height > geo.winH + 1
            ? (window.scrollY - geo.top + geo.stickyTop) / (geo.height - geo.winH)
            : pin;
      } else {
        pRaw = rect.height > vh + 1 ? -rect.top / (rect.height - vh) : pin;
      }

      /* the static end-state under reduced motion. */
      if (reduced) {
        paintSettled(track, mobile);
        return;
      }

      /* 1 · the entrance descent (≥992 only — the STACK drifts, the
       *     window's chrome stays: the measured architecture). */
      const stackEl = stackRef.current;
      if (!mobile) {
        if (!driftFsRef.current) {
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

      /* 3 · the six progressive layers — ghost→full crossfades (the
       *     ONE render path: r346 retires the R342-final timeline
       *     branch — the browser rides the same direct-write frame
       *     the deterministic core always owned). */
      const groups = resolveLayers(track);
      for (let i = 0; i < LAYER_WINDOWS.length; i += 1) {
        const [a, b] = LAYER_WINDOWS[i]!;
        const o = XL_GHOST + (1 - XL_GHOST) * p2o((t - a) / (b - a));
        for (const el of groups[i] ?? []) {
          setSheetVar(el.style, 'opacity', o.toFixed(3));
        }
      }

      /* 4 · the statement plaques — plaque 1 stands from t 0 (the
       *     spec's rest state), out 1.0–1.4; plaque 2 in 1.6–2.0
       *     (the 0.2s dead gap keeps one voice at a time), out
       *     2.15–2.35 on BOTH belts. The exit window's history, all
       *     measured: r349 cured the ≤991 belt (the held statement
       *     rode the panning camera, ink-on-ink); r353's desktop
       *     window (2.5–3.0) held the statement over the RESOLVED
       *     campus through band progress 0.30–0.48 — the VLM-flagged
       *     destructive beats; R354's first pass pulled the desktop
       *     to the mobile window (2.2–2.6). The final pass re-times
       *     on MEASURED glyph contrast (the statement/reference
       *     pair-diff metric, r354-final evidence): a uniform
       *     opacity fade crosses below the 3:1 WCAG large-text bar
       *     around opacity 0.95 and keeps falling — no opacity fade
       *     can hold readable contrast into its tail, so the fix is
       *     to cross the degraded span FAST and finish before the
       *     seat's ink peaks: the 1.0→0.5 drop now spans ~0.06s of
       *     clock (~63px of scroll at 1440 — a flick, not a restable
       *     frame), and the exit completes at t 2.35, while the
       *     satellite layer (2.02–2.52) is still ~2/3 resolved —
       *     the campus owns a clean reading window from band
       *     progress ~0.36, and the statement never rests at low
       *     contrast over dense ink on either belt. */
      writeCard(card1Ref.current, t, -1, -1, 1.0, 1.4);
      writeFade(card2Ref.current, t, 1.6, 2.0, 2.15, 2.35);

      /* 5 · the r346 ASSEMBLY — the band-progress windows (the
       *     caption exit, the fragment flights, the marker pops, the
       *     plate yield, the panel unfold + its settling content). */
      writeAssembly(track, pRaw, mobile);

      /* 6 · the discrete machine — unchanged semantics. */
      pRaw = clamp(pRaw, 0, 1);
      const { stage, finding, wash } = sceneClock(t, pRaw);
      writeAttrs(track, String(stage), finding, wash, 'off', stage === 5 ? 'on' : 'off');

      /* 7 · the ≤991 camera. */
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
        colGeoRef.current = null;
        driftFsRef.current = 0;
        layerElsRef.current = [];
        fragElsRef.current = [];
        markerElsRef.current = [];
        rowElsRef.current = [];
        panelWRef.current = 0;
      },
    },
  );

  /* ── the ONE scene lifecycle (arm → prime → revert) ──────────── */
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof window === 'undefined') return undefined;
    const { reduced, mobile } = viewportState();

    /* the static end-state paint (RM): no engine, no armed seats —
     * the CSS-authored states ARE the settled states under RM. */
    if (reduced) {
      paintSettled(track, mobile);
      return undefined;
    }

    /* r346 — ARM the scrub-only seats: the markers + the panel rest
     * at their SETTLED states in CSS (a dead JS pass keeps every
     * seat visible); the jt-live class — added here, before the
     * first paint — holds their pre-window hidden states until the
     * driver's own frames open them (and gates them out of the tab
     * order via the driver's visibility writes). */
    track.classList.add('jt-live');

    /* the prime frame — useSheetScroll's own mount prime renders the
     * rest state; this synthetic scroll additionally wakes the
     * shared conductor and schedules the settle pass that re-measures
     * every cache through onRefresh. */
    const prime = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    /* fonts reflow the sheet (the fluid root re-rungs; the sticky
     * column's span and the drift rung re-derive). */
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready
      .then(() => {
        window.dispatchEvent(new Event('scroll'));
      })
      .catch(() => undefined);

    /* a mid-flight reduced-motion flip collapses the scene to the
     * static final sheet; flipping back re-arms the scrub. */
    const reducedMq =
      typeof window.matchMedia === 'function' ? window.matchMedia(PREFERS_REDUCED_MOTION) : null;
    const onReduceFlip = (e: MediaQueryListEvent) => {
      if (e.matches) {
        track.classList.remove('jt-live');
        paintSettled(track, viewportState().mobile);
      } else {
        track.classList.add('jt-live');
        window.dispatchEvent(new Event('scroll'));
      }
    };
    reducedMq?.addEventListener('change', onReduceFlip);

    return () => {
      window.cancelAnimationFrame(prime);
      reducedMq?.removeEventListener('change', onReduceFlip);
      track.classList.remove('jt-live');
      /* the camera's viewBox restore — the crossing contract (r312):
       * consumed ONCE if the mobile camera ever wrote. */
      if (camDirtyRef.current) {
        restoreCam(track);
        camDirtyRef.current = false;
      }
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
        {/* r368 slice 06: the reference opens this band on a bare centred statement
            before any art lands. Decorative and aria-hidden; shown only at
            desktop widths while the scene is at stage 0 (journey.css). */}
        <div className="jt-lede" aria-hidden="true" data-spec="map.lede">من أول محاضرة إلى آخر اختبار</div>
        {/* r368 slice 06: the reference's second frame is one large thick-wall plan
            filling the stage; shown at stage 1 on desktop only (journey.css). */}
        <div className="jt-bigplan" aria-hidden="true" data-spec="map.bigplan">
          <img src={BIG_PLAN_SRC} alt="" loading="lazy" decoding="async" />
        </div>
        {/* the PLAN COLUMN — measured per bp; the ≤991 scroll track */}
        <div className="jt-map-col">
          {/* the stack seat @≥992 · the STICKY WINDOW @≤991 */}
          <div className="jt-map-in" ref={mapInRef}>
            {/* the drafting line-grid underlay — P3: the ONE
                .pat-linegrid pattern (app-grammar.css, the §R325
                family's first public seat) behind the scene's plates —
                the reference's faint full-bleed grid (shot-usecase /
                shot-why). Pure underlay: absolute, pointer-events none,
                zero layout, zero motion; first child so the window
                (and everything it mounts) paints above by document
                order. */}
            <div className="pat-linegrid jt-gridbg" aria-hidden="true" />
            <div className="jt-window" ref={windowRef}>
              {/* the four registration rails — the frame's inset
                  spacers (the measured window chrome; invisible
                  layout seats exactly like the reference's) */}
              <div className="jt-rail jt-rail-t" aria-hidden="true" />
              <div className="jt-rail jt-rail-b" aria-hidden="true" />
              <div className="jt-rail jt-rail-s" aria-hidden="true" />
              <div className="jt-rail jt-rail-e" data-spec="map.raile" aria-hidden="true" />

              {/* the four corner marks — P3/r363 (B1): the ONE
                  RegCross primitive (tone=ink — the measured solid
                  mark colour this window's seats were pinned at; the
                  em-scaled box rides .jt-mark's --reg-cross-size).
                  One vertical + one horizontal stroke each, the
                  drawing-frame grammar. */}
              <RegCross className="jt-mark jt-mark-a" data-spec="map.marka" tone="ink" />
              <RegCross className="jt-mark jt-mark-b" data-spec="map.markb" tone="ink" />
              <RegCross className="jt-mark jt-mark-c" data-spec="map.markc" tone="ink" />
              <RegCross className="jt-mark jt-mark-d" data-spec="map.markd" tone="ink" />

              {/* the dominant plan — r367 (the r364 NEXT item): the
                  reference's map band carries ONE dominant thick-wall
                  plan at ~55% of the band (shot-map-2); ULARA's plan
                  grammar rode the 3-plate use-case grid and the iso
                  walkthrough owned this band alone. The plan band now
                  rides BESIDE the walkthrough — the campus plan's own
                  framed sheet on the window's free inline-end quarter
                  (the markers own the inline-start 28–68%), authored
                  visible (the JS-off law), the choreography untouched.
                  Hidden ≤991 (the stacked column clock has no side
                  seat) — the phone reads the walkthrough alone, as
                  before. */}
              <div className="jt-dominant" data-spec="map.dominant">
                <PlanPlate plan="plan-campus" title="الحرم الجامعي — المسقط الشامل" scale="1:500" rev="B" />
              </div>

              {/* r368 slice 06 (own commit): the reference's platform frames are ONE large plan with a dark
                  card on bare ground. At stages 2-4 on desktop only, this decorative layer covers the walkthrough
                  inside the window (journey.css); touch and mobile never show it. aria-hidden: the closing
                  column and the panel keep the real story. */}
              <div className="jt-platform" aria-hidden="true" data-spec="map.platform">
                <div className="pat-linegrid jt-plat-grid" />
                <img className="jt-plat-img" src={BIG_PLAN_SRC} alt="" loading="lazy" decoding="async" />
                <span className="jt-plat-sq jt-plat-sq-a" />
                <span className="jt-plat-sq jt-plat-sq-b" />
                <div className="jt-plat-card">
                  <DarkCard header="جارٍ الفحص…" rows={['سعة القراءة مقابل السجل', 'أوقات الذروة', 'الحجوزات المفتوحة']} />
                </div>
              </div>

              {/* the drifting plan stack — the entrance descent's
                  target. r346: the stack carries the ISOMETRIC CAMPUS
                  SHEET (the 2D floor plan retires from the mount),
                  the assembly caption + the two statement plaques over
                  it. The r342 annotation cards retire with the plan —
                  the campus plate labels its own volumes (the kernel
                  leaders), and the markers + the capability panel
                  carry the system story now. */}
              <div className="jt-stack" ref={stackRef}>
                <IsoCampusSheet />

                {/* the assembly caption — the band's opening statement
                    («الرحلة — المنظومة تتجمع»): it rides the descent
                    with the sheet and exits over the first 10% of the
                    scrub (the r346 sandbox's own exit). Authored
                    VISIBLE — the JS-off law keeps the statement
                    readable; the driver hides it past its window.
                    R349 (the dead-ref fix): the caption's ref seat was
                    NEVER attached — the exit window (assembly step a)
                    was dead code and the statement rode the drawing
                    for the band's whole scrub (the audit's
                    heading-over-artwork defect at every width). The
                    ref lands; the exit breathes again. */}
                <div className="jt-caption" ref={captionRef}>
                  <p className="jt-caption-kicker fo-mono">{CAPTION_KICKER_AR}</p>
                  <p className="jt-caption-line">{CAPTION_LINE_AR}</p>
                  <div className="jt-caption-meta" aria-hidden="true">
                    <span className="fo-mono" dir="ltr">{CAPTION_SCROLL_LBL}</span>
                    <span className="jt-caption-rule" />
                  </div>
                </div>

                {/* the plaque band + the plaque-2 wrapper — the two
                    statements (the r325 overlay contract, verbatim):
                    plaque 1 rides the band VISIBLE from frame one;
                    plaque 2 rides its opacity-0 from-state wrapper. */}
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
              </div>

              {/* the three numbered markers — the r346 system
                  annotations (الكليات / المقرّرات / البحوث):
                  absolutely-seated buttons over the assembled plate,
                  keyboard accessible (aria-label + focus), their
                  detail cards on hover/focus. Hidden at ≤991 (the
                  camera era's cropped window is no place for fixed
                  pins). Authored popped — the jt-live armed class
                  holds the pre-pop state. */}
              {MARKERS_AR.map((m) => (
                <div key={m.n} className={`jt-mk jt-mk-${m.seat}`}>
                  <button
                    type="button"
                    className="jt-mk-btn"
                    onMouseEnter={() => setHover(m.n)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(m.n)}
                    onBlur={() => setHover(null)}
                    aria-label={`${m.label}: ${m.detail}`}
                  >
                    <span className="jt-mk-dot" aria-hidden="true">
                      <span className="jt-mk-num fo-mono" dir="ltr">{m.n}</span>
                    </span>
                    <span className="jt-mk-tag" aria-hidden="true">{m.label}</span>
                  </button>
                  {/* the detail card — hover/focus only */}
                  <div className={`jt-mk-card${hover === m.n ? ' on' : ''}`} role="status">
                    <div className="jt-mk-card-head">
                      <span className="fo-mono" dir="ltr">{m.n} / {m.label}</span>
                    </div>
                    <p className="jt-mk-card-body">{m.detail}</p>
                    <div className="jt-mk-card-foot" aria-hidden="true" />
                  </div>
                </div>
              ))}

              {/* the capability panel — the r346 bottom-left system
                  ledger (مساحة لكل مؤسسة…): the seat fades in, the
                  clip unfolds (0→the seat's own width, 62→85% of the
                  band), the header + rows settle after (the r325 clip
                  gate). Authored OPEN — the armed class holds the
                  folded state. The mono header carries the live
                  progress readout (a direct textContent write — never
                  React state per frame). */}
              <aside className="map-panel" ref={panelSeatRef} aria-label={PANEL_ARIA_AR}>
                <div className="map-panel-clip" ref={panelClipRef}>
                  <div className="map-panel-in">
                    <div className="map-panel-head" ref={panelHeadRef}>
                      <span className="map-panel-title fo-mono" dir="ltr">{PANEL_TITLE_LBL}</span>
                      <span className="map-panel-pct fo-mono" dir="ltr" ref={panelPctRef}>000%</span>
                    </div>
                    {PANEL_ROWS_AR.map((r) => (
                      <div key={r.n} className="map-panel-row">
                        <span className="map-panel-n fo-mono" dir="ltr">[{r.n}]</span>
                        {/* r351 P6 — the row's one line is the title (the
                            body sentence retired with the copy cut) */}
                        <div className="map-panel-rc">
                          <h3 className="map-panel-rt">{r.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

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

            {/* the INTRODUCTION card — the measured corner card (the
                r312 contract, verbatim): five findings ONE at a time,
                collapsed to the head outside the card era. */}
            <section className="jt-intro" aria-label={INTRO_TITLE_AR}>
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
            </section>
          </div>
        </div>

        {/* the closing column — the section's own head + the
            four-station ledger (kept verbatim; the h2 keeps the
            aria contract, id=chapters-title). */}
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
