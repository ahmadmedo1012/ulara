import { useEffect, useRef } from 'react';
/**
 * CampusPlate — ULARA's own architectural centerpiece (the «لوحة الحرم»
 * plate). ONE original frontal elevation of the learning campus, drafted
 * in the drawing-sheet language of the visual direction: paper ground,
 * near-black ink, technical-grey furniture, ONE orange signal family.
 *
 * Six composed volumes carry the learning journey in the page's RTL
 * reading order — the story starts at the READING-START edge (the
 * physical right for an Arabic reader) and ends at the far tier:
 *
 *   قاعة المحاضرات (the lecture auditorium, the journey's start)
 *   → جسر نقطة الفحص (the checkpoint bridge)
 *   → قاعة التعلّم (the dominant learning hall)
 *   → جناح الاختبار (the exam pavilion)
 *   → جناح المكتبة (the library wing)
 *   → برج الإتقان (the mastery tower, the journey's end),
 *
 * with two drafted trees flanking the composition on one ground line,
 * a dimension chain below, alignment crosses on the drawn axes, level
 * ticks on the datum seat, and restrained grey washes/hatch bands for
 * the depth — nothing more. The drawing is the sheet's centerpiece;
 * the paper breathes around it.
 *
 * Two variants from the same geometry:
 *   · 'trace' — the structure strokes ONLY (no texture, no furniture,
 *     no fills): the preloader's self-drawing plate. Every path carries
 *     `cp-draw` + a per-path `animation-delay` so the sequence traces
 *     the campus stroke by stroke (the reference's loading choreography,
 *     compressed into the honest timing budget). Delay values are inline
 *     STYLES (choreography offsets — the motion-token gate exempts
 *     delays; the DURATION rides the canonical
 *     --motion-duration-brand-draw-mark token).
 *   · 'ink'   — the full plate for the hero seat: strokes + restrained
 *     grey washes/hatch bands + the furniture layer + the two orange
 *     signals (the checkpoint pennant + the mastery beacon). Layer
 *     groups carry data-ink 1..10 so the hero's staged ink-in belt
 *     (hero-mechanics.css) draws them in drafting order after the
 *     preloader's exit slit — the loader's drawing and the hero's
 *     drawing are ONE object: the trace completes, the slit opens, and
 *     the ink version takes its seat.
 *
 * Token compliance: every colour rides var(--*) classes defined in
 * hero.css (.cp-* ladder); zero raw values. The mono micro-labels ride
 * the 11px-rendered floor through the same inverse-scale CSS var the
 * hero window established (--cp-label-fs, measured by the effect
 * below). Non-scaling strokes keep the ink weight at every render size.
 *
 * The viewBox is the plate's own tight frame; it is exported so the
 * inspection instrument (cursor/HeroInspect) authors its stations
 * against the SAME coordinate space (one shared plate space, one
 * mapping — no remap pass, no drift between the drawing and its
 * stations).
 */

/* The plate's own frame — the ONE shared coordinate space (the artwork
 * AND the inspection stations author against it directly). */
export const CAMPUS_FRAME = { x: 0, y: 0, w: 1440, h: 640 } as const;

/* ── The stroke ladder (class names resolved in hero.css) ──────────
 *   cp-2   primary massing outline   — ink, 2.25
 *   cp-15  secondary structure       — ink, 1.5
 *   cp-1   detail + texture strokes  — ink, 1, softened
 *   cp-f   grey furniture            — grid-line, 1
 */
type Stk = { d: string; w: 1 | 15 | 2 };

/* ── LAYER 1 · the ground ───────────────────────────────────────────
 * One confident rule under the whole campus, breaking past the trees
 * on both flanks (the reference's ground runs past the composition),
 * with the datum seat at the reading-start end. */
const GROUND: Stk[] = [
  { d: 'M40 500 H1400', w: 2 },
  { d: 'M1388 500 H1412', w: 1 },
];

/* ── LAYER 2 · قاعة المحاضرات (the lecture auditorium — the journey's
 * start, at the reading-start end) ─────────────────────────────────── */
const AUDITORIUM: Stk[] = [
  { d: 'M1010 300 H1330 V500 H1010 Z', w: 2 },
  /* the parapet course */
  { d: 'M1010 314 H1330', w: 1 },
  /* flanking pilasters */
  { d: 'M1024 300 V500 M1036 300 V500 M1020 300 H1040 M1304 300 V500 M1316 300 V500 M1300 300 H1320', w: 15 },
  /* the grand portal — the double arch */
  { d: 'M1125 500 V430 A45 45 0 0 1 1215 430 V500', w: 2 },
  { d: 'M1133 500 V430 A37 37 0 0 1 1207 430 V500', w: 15 },
  /* the door leaves + rails */
  { d: 'M1170 478 V400 M1133 452 H1207 M1133 424 H1207', w: 1 },
  /* the entry steps inside the recess */
  { d: 'M1141 478 H1199 M1137 486 H1203 M1133 494 H1207', w: 1 },
  /* the flanking arched windows */
  { d: 'M1040 378 V352 A22 22 0 0 1 1084 352 V378 Z M1256 378 V352 A22 22 0 0 1 1300 352 V378 Z', w: 15 },
  { d: 'M1062 336 V378 M1278 336 V378 M1040 378 H1084 M1256 378 H1300', w: 1 },
  /* the parapet's crowning course */
  { d: 'M1010 296 H1330', w: 1 },
];

/* the end tree — the auditorium's organic counterpoint (reading-start
 * flank, breaking past the ground line's end) */
const TREE_B: Stk[] = [
  { d: 'M1388 500 C1386 470 1390 452 1382 430 C1376 414 1380 400 1378 388', w: 15 },
  { d: 'M1382 430 C1372 422 1366 418 1356 416 M1378 402 C1368 396 1362 392 1352 390 M1384 418 C1394 410 1400 406 1410 402 M1380 396 C1372 388 1368 380 1364 372 M1378 388 C1384 378 1390 372 1396 364', w: 1 },
  { d: 'M1356 416 C1350 410 1348 404 1348 398 M1352 390 C1346 384 1344 378 1344 372', w: 1 },
  { d: 'M1344 394 A38 30 0 0 1 1414 400 M1352 374 A26 22 0 0 1 1404 372', w: 1 },
];

/* ── LAYER 3 · جسر نقطة الفحص (the checkpoint bridge) — the glazed
 * link between the auditorium and the hall, with the pennant ──────── */
const BRIDGE: Stk[] = [
  { d: 'M880 408 H1010 V460 H880 Z', w: 2 },
  /* the glazing mullions */
  { d: 'M893 408 V460 M906 408 V460 M919 408 V460 M932 408 V460 M945 408 V460 M958 408 V460 M971 408 V460 M984 408 V460 M997 408 V460', w: 1 },
  /* the bridge floor */
  { d: 'M880 452 H1010', w: 15 },
  /* the piers to the ground */
  { d: 'M890 460 V500 M902 460 V500 M988 460 V500 M1000 460 V500', w: 15 },
  { d: 'M886 460 H906 M984 460 H1004', w: 1 },
  /* the pennant mast */
  { d: 'M945 408 V372', w: 15 },
];

/* ── LAYER 4 · قاعة التعلّم (the learning hall — the dominant mass) ── */
const HALL: Stk[] = [
  /* the main block + the podium */
  { d: 'M640 210 H880 V470 H640 Z', w: 2 },
  { d: 'M648 470 H872 V500 H648 Z', w: 2 },
  /* the parapet course */
  { d: 'M640 228 H880', w: 1 },
  /* the entablature */
  { d: 'M640 248 H880', w: 1 },
  /* five columns: shafts */
  { d: 'M662 264 V470 M674 264 V470 M714 264 V470 M726 264 V470 M766 264 V470 M778 264 V470 M818 264 V470 M830 264 V470 M854 264 V470 M866 264 V470', w: 15 },
  /* capitals + bases */
  { d: 'M659 264 H677 M659 256 H677 M711 264 H729 M711 256 H729 M763 264 H781 M763 256 H781 M815 264 H833 M815 256 H833 M851 264 H869 M851 256 H869 M659 470 H677 M659 478 H677 M711 470 H729 M711 478 H729 M763 470 H781 M763 478 H781 M815 470 H833 M815 478 H833 M851 470 H869 M851 478 H869', w: 1 },
  /* two tall arched doorways behind the colonnade */
  { d: 'M690 470 V420 A25 25 0 0 1 740 420 V470 M770 470 V420 A25 25 0 0 1 820 420 V470', w: 15 },
  { d: 'M715 404 V470 M795 404 V470', w: 1 },
  /* the central steps on the podium face */
  { d: 'M736 470 V500 M784 470 V500 M742 478 H778 M748 486 H772', w: 1 },
];

/* ── LAYER 5 · جناح الاختبار (the exam pavilion) ───────────────────── */
const PAVILION: Stk[] = [
  /* the pediment — raking cornice pair */
  { d: 'M460 330 L545 288 L630 330', w: 2 },
  { d: 'M470 327 L545 292 L620 327', w: 1 },
  /* the clock — the pavilion's dial */
  { d: 'M532 310 A13 13 0 1 1 558 310 A13 13 0 1 1 532 310', w: 15 },
  { d: 'M545 310 V301 M545 310 L552 314', w: 1 },
  /* the architrave */
  { d: 'M466 330 H624 M466 345 H624', w: 2 },
  /* four columns, capitals + bases */
  { d: 'M481 358 V478 M491 358 V478 M481 350 H491 M481 470 H491 M521 358 V478 M531 358 V478 M521 350 H531 M521 470 H531 M561 358 V478 M571 358 V478 M561 350 H571 M561 470 H571 M601 358 V478 M611 358 V478 M601 350 H611 M601 470 H611', w: 15 },
  /* the wall behind — two door openings */
  { d: 'M500 400 H540 M552 400 H592', w: 1 },
  /* the stylobate + central steps */
  { d: 'M462 478 H628 V500 H462 Z', w: 2 },
  { d: 'M525 478 V500 M565 478 V500 M531 488 H559', w: 1 },
];

/* ── LAYER 6 · جناح المكتبة (the library wing) ─────────────────────── */
const LIBRARY: Stk[] = [
  { d: 'M200 370 H440 V500 H200 Z', w: 2 },
  /* the roof band + its inner course */
  { d: 'M200 384 H440 M200 398 H440', w: 1 },
  /* the reading-room fins — vertical, evenly ruled */
  { d: 'M218 404 V490 M222 404 V490 M248 404 V490 M252 404 V490 M278 404 V490 M282 404 V490 M308 404 V490 M312 404 V490 M338 404 V490 M342 404 V490 M368 404 V490 M372 404 V490', w: 15 },
  /* the glazing horizontals behind the fins */
  { d: 'M210 420 H430 M210 438 H430 M210 456 H430', w: 1 },
  /* the entrance portal at the wing's inline-end */
  { d: 'M396 500 V428 H436 V500', w: 15 },
  /* the canopy slab */
  { d: 'M390 428 H442 M390 421 H442', w: 2 },
];

/* ── LAYER 7 · برج الإتقان (the mastery tower — the journey's end at
 * the far tier) + the start tree ───────────────────────────────────── */
const TOWER: Stk[] = [
  /* base tier */
  { d: 'M90 300 H170 V500 H90 Z', w: 2 },
  /* mid tier */
  { d: 'M100 225 H160 V300 H100 Z', w: 2 },
  /* top tier (the lantern) */
  { d: 'M108 160 H152 V225 H108 Z', w: 2 },
  /* course lines on the base tier */
  { d: 'M90 380 H170 M90 440 H170', w: 1 },
  /* the tier setback shadows (the reading-start returns) */
  { d: 'M158 306 V380 M164 306 V440 M150 231 V300 M144 166 V225', w: 1 },
  /* the door — arched, on the base tier */
  { d: 'M118 500 V446 A12 12 0 0 1 142 446 V500', w: 15 },
  /* mid-tier window */
  { d: 'M122 284 V260 A8 8 0 0 1 138 260 V284 Z', w: 15 },
  /* the lantern lancet */
  { d: 'M124 212 V190 A6 6 0 0 1 136 190 V212 Z', w: 15 },
  /* beacon mast — the orange beacon caps it (no cross-brace: the mast
   * reads as an antenna, never a cross) */
  { d: 'M130 160 V134', w: 15 },
];

/* the start tree — bare drafting branches (the organic counterpoint),
 * planted before the tower at the far tier */
const TREE_A: Stk[] = [
  { d: 'M56 500 C58 472 52 452 58 430 C62 414 58 402 60 390', w: 15 },
  { d: 'M58 430 C66 422 72 418 82 416 M60 402 C68 396 74 392 84 390 M58 414 C50 406 46 402 36 398 M60 390 C66 382 70 376 76 368', w: 1 },
  { d: 'M82 416 C86 410 88 404 88 398 M84 390 C90 384 92 378 92 372', w: 1 },
  { d: 'M34 396 A32 26 0 0 1 92 384 M44 376 A24 20 0 0 1 84 372', w: 1 },
];

/* ── LAYER 8 · the furniture — grey, quiet, technical ─────────────── */
const FURNITURE: Stk[] = [
  /* the dimension chain — extension pair + the overall rule */
  { d: 'M40 502 V530 M1400 502 V530', w: 1 },
  { d: 'M40 524 H1400', w: 1 },
  { d: 'M33 531 L47 517 M1393 531 L1407 517', w: 1 },
  /* the hall segment dimension */
  { d: 'M640 506 V516 M880 506 V516 M640 512 H880 M633 519 L647 505 M873 519 L887 505', w: 1 },
  /* alignment crosses on the drawn axes */
  { d: 'M662 505 H674 M668 499 V511 M714 505 H726 M720 499 V511 M766 505 H778 M772 499 V511 M818 505 H830 M824 499 V511 M854 505 H866 M860 499 V511', w: 1 },
  { d: 'M124 505 H136 M130 499 V511 M539 505 H551 M545 499 V511 M1164 505 H1176 M1170 499 V511', w: 1 },
  /* level ticks on the datum seat */
  { d: 'M1408 300 H1416 M1408 380 H1416 M1408 460 H1416', w: 1 },
];

/* ── the texture layer — restrained grey modelling (ink only) ─────── */
const TEXTURE: Stk[] = [
  /* parapet dentils — hall + auditorium */
  { d: 'M656 214 V224 M674 214 V224 M692 214 V224 M710 214 V224 M728 214 V224 M746 214 V224 M764 214 V224 M782 214 V224 M800 214 V224 M818 214 V224 M836 214 V224 M854 214 V224 M872 214 V224', w: 1 },
  { d: 'M1026 305 V313 M1044 305 V313 M1062 305 V313 M1080 305 V313 M1098 305 V313 M1116 305 V313 M1134 305 V313 M1152 305 V313 M1170 305 V313 M1188 305 V313 M1206 305 V313 M1224 305 V313 M1242 305 V313 M1260 305 V313 M1278 305 V313 M1296 305 V313', w: 1 },
  /* shadow hatch — under the hall's entablature */
  { d: 'M648 256 L656 248 M666 256 L674 248 M684 256 L692 248 M702 256 L710 248 M720 256 L728 248 M738 256 L746 248 M756 256 L764 248 M774 256 L782 248 M792 256 L800 248 M810 256 L818 248 M828 256 L836 248 M846 256 L854 248 M864 256 L872 248', w: 1 },
  /* shadow hatch — under the auditorium's parapet */
  { d: 'M1018 322 L1026 314 M1036 322 L1044 314 M1054 322 L1062 314 M1072 322 L1080 314 M1090 322 L1098 314 M1108 322 L1116 314 M1126 322 L1134 314 M1144 322 L1152 314 M1162 322 L1170 314 M1180 322 L1188 314 M1198 322 L1206 314 M1216 322 L1224 314 M1234 322 L1242 314 M1252 322 L1260 314 M1270 322 L1278 314 M1288 322 L1296 314 M1306 322 L1314 314', w: 1 },
  /* shadow hatch — under the pavilion's architrave */
  { d: 'M474 351 L481 345 M492 351 L499 345 M510 351 L517 345 M528 351 L535 345 M546 351 L553 345 M564 351 L571 345 M582 351 L589 345 M600 351 L607 345 M618 351 L623 346', w: 1 },
  /* roof hatch — the library band */
  { d: 'M206 384 L215 375 M224 384 L233 375 M242 384 L251 375 M260 384 L269 375 M278 384 L287 375 M296 384 L305 375 M314 384 L323 375 M332 384 L341 375 M350 384 L359 375 M368 384 L377 375 M386 384 L395 375 M404 384 L413 375 M422 384 L431 375', w: 1 },
  /* under-bridge hatch */
  { d: 'M884 468 L892 460 M898 468 L906 460 M912 468 L920 460 M926 468 L934 460 M940 468 L948 460 M954 468 L962 460 M968 468 L976 460 M982 468 L990 460 M996 468 L1004 460', w: 1 },
  /* the earth ticks — sparse, along the ground */
  { d: 'M70 502 L60 512 M120 502 L110 512 M170 502 L160 512 M220 502 L210 512 M270 502 L260 512 M320 502 L310 512 M370 502 L360 512 M420 502 L410 512 M470 502 L460 512 M520 502 L510 512 M570 502 L560 512 M620 502 L610 512 M670 502 L660 512 M720 502 L710 512 M770 502 L760 512 M820 502 L810 512 M870 502 L860 512 M920 502 L910 512 M970 502 L960 512 M1020 502 L1010 512 M1070 502 L1060 512 M1120 502 L1110 512 M1170 502 L1160 512 M1220 502 L1210 512 M1270 502 L1260 512 M1320 502 L1310 512 M1370 502 L1360 512', w: 1 },
];

/* ── the fills layer — paper knockouts + grey washes (ink only) ───── */
const FILLS: { d: string; tone: 'paper' | 'wash' | 'wash-soft' }[] = [
  /* the hall's recessed colonnade wall */
  { d: 'M656 264 H864 V470 H656 Z', tone: 'wash' },
  /* the hall's doorway knockouts */
  { d: 'M690 470 V420 A25 25 0 0 1 740 420 V470 Z', tone: 'paper' },
  { d: 'M770 470 V420 A25 25 0 0 1 820 420 V470 Z', tone: 'paper' },
  /* the pavilion's tympanum */
  { d: 'M478 324 L545 296 L612 324 Z', tone: 'wash-soft' },
  /* the pavilion's door knockouts */
  { d: 'M500 400 H540 V478 H500 Z', tone: 'paper' },
  { d: 'M552 400 H592 V478 H552 Z', tone: 'paper' },
  /* the auditorium's portal recess */
  { d: 'M1125 500 V430 A45 45 0 0 1 1215 430 V500 Z', tone: 'wash-soft' },
  /* the bridge's glazing */
  { d: 'M880 408 H1010 V452 H880 Z', tone: 'wash' },
  /* the library's reading-room glazing */
  { d: 'M206 404 H434 V490 H206 Z', tone: 'wash-soft' },
];

/* ── the signals — the plate's ONLY orange (ink only) ─────────────── */
const SIGNALS: { d: string }[] = [
  /* the checkpoint pennant on the bridge mast */
  { d: 'M945 372 H961 V381 H945 Z' },
  /* the mastery beacon */
  { d: 'M126.5 128 A3.5 3.5 0 1 1 133.5 128 A3.5 3.5 0 1 1 126.5 128 Z' },
];

/* the trace spread: the stroke sequence occupies the scene-reveal rung
 * (the canonical 2200ms token) — each path's delay is its sequence
 * position's share; the per-path DURATION rides the brand-draw token.
 * The order is the drafting order (ground → reading-start mass →
 * link → hall → pavilion → library → far tower → furniture-less). */
const TRACE_GROUPS: Stk[][] = [
  GROUND,
  AUDITORIUM,
  TREE_B,
  BRIDGE,
  HALL,
  PAVILION,
  LIBRARY,
  TOWER,
  TREE_A,
];

const TRACE_COUNT = TRACE_GROUPS.reduce((n, g) => n + g.length, 0);
/* the trace window: the drawing sequence fills ~1.5s inside the honest
 * counter window (floor 1.9s), so 100% lands WITH the completed trace. */
const TRACE_SPREAD_MS = 1500;

function strokeClass(w: Stk['w']): string {
  if (w === 2) return 'cp-2';
  if (w === 15) return 'cp-15';
  return 'cp-1';
}

function Strokes({ list }: { list: Stk[] }) {
  return (
    <>
      {list.map((p, i) => (
        <path key={i} className={`bp-drawable ${strokeClass(p.w)}`} d={p.d} pathLength={1} />
      ))}
    </>
  );
}

/* The preloader's self-drawing seat: the STRUCTURE strokes only, each
 * carrying cp-draw + its sequence delay (inline style — a choreography
 * offset, exempt from the duration gate; the duration itself is the
 * canonical brand-draw token consumed in preloader.css). */
function TraceStrokes() {
  let index = 0;
  return (
    <>
      {TRACE_GROUPS.map((list, g) => (
        <g key={g}>
          {list.map((p) => {
            const delay = Math.round((index * TRACE_SPREAD_MS) / TRACE_COUNT);
            index += 1;
            return (
              <path
                key={`${g}-${index}`}
                className={`cp-draw ${strokeClass(p.w)}`}
                d={p.d}
                pathLength={1}
                style={{ animationDelay: `${delay}ms` }}
              />
            );
          })}
        </g>
      ))}
    </>
  );
}

type CampusVariant = 'trace' | 'ink';

export function CampusPlate({ variant }: { variant: CampusVariant }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  /* the mono micro-labels' 11px-rendered floor — the same inverse-scale
   * mechanism the hero window established: the svg scales with the
   * viewport, so the label font scales against the LIVE width (rAF-
   * throttled; jsdom-safe). Only the ink seat carries labels. */
  useEffect(() => {
    if (variant !== 'ink') return undefined;
    const svg = svgRef.current;
    if (!svg || typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const w = svg.getBoundingClientRect().width;
      if (!w) return;
      const units = (11 * CAMPUS_FRAME.w) / w;
      svg.style.setProperty('--cp-label-fs', `${Math.max(12, Math.round(units * 10) / 10)}px`);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [variant]);

  return (
    <svg
      ref={svgRef}
      /* bp-svg — the inspection instrument's frame selector (the ONE
       * shared frame contract); cp-svg is the plate's own style hook */
      className="bp-svg cp-svg"
      viewBox={`${CAMPUS_FRAME.x} ${CAMPUS_FRAME.y} ${CAMPUS_FRAME.w} ${CAMPUS_FRAME.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="المجمع التعليمي لأُلارا واجهةً أمامية: قاعة المحاضرات، جسر نقطة الفحص، قاعة التعلّم، جناح الاختبار، جناح المكتبة، وبرج الإتقان — على خط أرض واحد، بسلسلة قياس ومحاور مُسندة، وشجرتين على الطرفين"
    >
      {variant === 'ink' ? (
        <>
          {/* fills first — the washes sit UNDER the strokes. They fade as
              ONE seat (cp-plate-fills) instead of the per-path belt: the
              belt's fill-opacity:1 rung would override the washes' own
              alphas, so the fills carry their own opacity choreography
              in hero.css and no bp-drawable class. */}
          <g className="cp-plate-fills" aria-hidden="true">
            {FILLS.map((f, i) => (
              <path key={i} className={`cp-fill-${f.tone}`} d={f.d} />
            ))}
          </g>
          <g data-ink="1"><Strokes list={GROUND} /></g>
          <g data-ink="2"><Strokes list={AUDITORIUM} /><Strokes list={TREE_B} /></g>
          <g data-ink="3"><Strokes list={BRIDGE} /></g>
          <g data-ink="4"><Strokes list={HALL} /></g>
          <g data-ink="5"><Strokes list={PAVILION} /></g>
          <g data-ink="6"><Strokes list={LIBRARY} /></g>
          <g data-ink="7"><Strokes list={TOWER} /><Strokes list={TREE_A} /></g>
          {/* texture — the grey modelling, grouped with the strokes it
              shades so the ink-in resolves it with its layer */}
          <g data-ink="9" className="cp-tex">
            {TEXTURE.map((p, i) => (
              <path key={i} className="bp-drawable cp-f" d={p.d} pathLength={1} />
            ))}
          </g>
          {/* furniture — dims, crosses, ticks, labels */}
          <g data-ink="10" className="cp-furn">
            {FURNITURE.map((p, i) => (
              <path key={i} className="bp-drawable cp-f" d={p.d} pathLength={1} />
            ))}
            <text className="cp-dim" x={720} y={544} textAnchor="middle">128.40M</text>
            <text className="cp-dim" x={760} y={507} textAnchor="middle">32.00M</text>
          </g>
          {/* the signals — the plate's only orange, drawn with the bridge */}
          <g data-ink="3" aria-hidden="true">
            {SIGNALS.map((s, i) => (
              <path key={i} className="bp-drawable cp-signal" d={s.d} />
            ))}
          </g>
        </>
      ) : (
        /* the trace seat — the same campus, stroke by stroke */
        <TraceStrokes />
      )}
    </svg>
  );
}
