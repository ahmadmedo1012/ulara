/**
 * ProductPlates — r347 · the platform band's isometric machines.
 *
 * THE PHASE-4 DIRECTIVE (r346 → r347): the landing's last screenshots
 * retire — the platform band's two real captures (exam-active.webp,
 * ai-tutor.webp — the "ugly pictures that do not explain the project")
 * become ISOMETRIC SELF-RUNNING machines in the plate grammar: pure-CSS
 * loops on the iso-loop-* belt (iso-plate.css), zero JS ticks, each
 * drawing THE CAPABILITY the retired capture used to prove:
 *
 *   P1 قاعة الاختبار — the exam runner: the desk with the running
 *      exam sheet, the sweeping timer dial, the objective cells
 *      auto-ticking in sequence, and the essay sheet's dashed route
 *      flowing to the professor's desk. The retired capture's DOM
 *      callouts (المؤقّت · التصحيح التلقائي · المقالية إلى الأستاذ)
 *      re-seat as the plate grammar's own anchored labels — a copper
 *      dot on the target, a hairline, the Arabic word at its seat.
 *   P2 برج المساعد — the academic assistant: the core tower with its
 *      orbiting knowledge ring, the student's question node popping
 *      in, the staged answer lines drawing back on the student's
 *      sheet, and the review-plan chip landing on the far side.
 *
 * Geometry: every volume is authored in ISO SPACE (lib/iso.ts's 30°
 * projection) and rendered by the kernel primitives (kernel/Iso.tsx) —
 * the same grammar as the hero campus plate and the why panels. The
 * scene rides ONE g transform (translate + scale); the caption row is
 * authored OUTSIDE it in direct sheet coordinates (the WhyPanels
 * law — furniture never scales with the scene). Colour law: every
 * paint flows the --iso-* seats (PLATE) — zero raw literals. Motion
 * law: the kernel draws nothing by itself; the loop classes + their
 * --ild delay ladder live in iso-plate.css; reduced motion collapses
 * every loop to its settled static plate; a dead JS pass still renders
 * the fully-inked drawing (JS-off safety).
 *
 * The annotation system (one voice across both plates): mono chips
 * (PLATE.ink ground) name the INSTRUMENTS (PROFESSOR · PLAN); SeatLabel — the copper-dot + hairline + Arabic word — names
 * the CONCEPTS (المؤقّت · التصحيح التلقائي · المقالية · السؤال ·
 * النواة · خطة المراجعة); the caption row (PlateLabel + Coord) carries
 * the sheet's own furniture at the foot.
 */
import type { CSSProperties } from 'react';
import { PLATE, iso } from '../../../lib/iso';
import {
  IsoDefs,
  GroundFill,
  IsoBox,
  IsoNode,
  PlateLabel,
  PlateTag,
  SeatLabel,
  Route,
  Coord,
} from '../kernel/Iso';
/* the isometric plate grammar's painting system (the --iso-* seats +
   the loop belt) rides the plates — the CSS-rides-the-component law */
import '../../../styles/landing/iso-plate.css';

/* the loop delay slot — the exempt choreography ladder (seconds) */
const ld = (s: string) => ({ ['--ild' as string]: s }) as CSSProperties;

/* the platform frame: the measured .pr-img box holds ~1.7 across the
 * desktop tiers (the column rides % while the row rides the fluid rem
 * root — both scale with the viewport), so the plate authors at 480×283
 * and meets the box near-edge-to-edge at every tier. */
const FRAME = '0 0 480 283';

/* ────────── P1 · قاعة الاختبار — the exam runner machine ────────── */

export function ExamRunnerPlate({ label, dataSpec }: { label: string; dataSpec?: string }) {
  /* the timer dial's centre — a post-mounted instrument at the desk's
   * far corner (iso-projected once; the dial + its needle group seat
   * on the same centre) */
  const dialC = iso(-44, -22, 15);
  /* the objective cells' front row — five seats, the third copper */
  const cells = [-50, -41, -32, -23, -14];
  return (
    <svg viewBox={FRAME} role="img" aria-label={label} className="prp-svg" data-spec={dataSpec}>
      <IsoDefs />
      <g transform="translate(240 138) scale(1.5)">
        <GroundFill x={-58} y={-30} w={112} d={52} opacity={0.4} />

        {/* the exam desk — the running exam sheet on its slab */}
        <IsoBox x={-46} y={-14} w={30} d={24} h={3} />
        <g className="iso-loop-box" style={ld('0s')}>
          <IsoBox x={-43} y={-11} w={24} d={18} h={0.9} top={PLATE.paperHi} />
          {/* the sheet's own question rows — hairline runes */}
          {[0, 1, 2].map((ry) => (
            <polyline
              key={ry}
              points={`${iso(-40, -8 + ry * 5, 4.1).sx},${iso(-40, -8 + ry * 5, 4.1).sy} ${iso(-24 - (ry === 2 ? 8 : 0), -8 + ry * 5, 4.1).sx},${iso(-24 - (ry === 2 ? 8 : 0), -8 + ry * 5, 4.1).sy}`}
              fill="none"
              stroke={PLATE.muted}
              strokeWidth={1.2}
            />
          ))}
        </g>

        {/* the timer — the post + the sweeping dial */}
        <IsoBox x={-45} y={-23} w={2.2} d={2.2} h={12.6} top={PLATE.east} />
        <g transform={`translate(${dialC.sx} ${dialC.sy})`}>
          <circle r={8.5} fill={PLATE.paperHi} stroke={PLATE.ink} strokeWidth={1.1} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return (
              <line
                key={i}
                x1={Math.cos(a) * 6.4}
                y1={Math.sin(a) * 6.4}
                x2={Math.cos(a) * 7.8}
                y2={Math.sin(a) * 7.8}
                stroke={PLATE.ink}
                strokeWidth={0.8}
              />
            );
          })}
          <g className="iso-loop-sweep">
            <line x1={-6.4} y1={2} x2={6.4} y2={-2} stroke={PLATE.sienna} strokeWidth={1.6} strokeLinecap="round" />
          </g>
          <circle r={1.5} fill={PLATE.ink} />
        </g>
        {/* the timer's concept label — copper dot on the dial's rim,
            the word seated clear above-left of the instrument */}
        <SeatLabel x={dialC.sx - 10} y={dialC.sy} tx={-50} ty={-52} text="المؤقّت" />

        {/* the objective cells — auto-ticking in sequence, one copper */}
        {cells.map((cx, i) => (
          <g key={cx} className="iso-loop-dot" style={ld(`${0.4 + i * 0.35}s`)}>
            <IsoBox x={cx} y={14} w={6.5} d={6.5} h={1.4} top={i === 2 ? PLATE.sienna : PLATE.top} />
            {/* the landed tick — a copper check on the graded pair */}
            {i < 2 && (
              <polyline
                points={`${iso(cx + 1.6, 17.4, 1.6).sx},${iso(cx + 1.6, 17.4, 1.6).sy} ${iso(cx + 3, 16.2, 1.6).sx},${iso(cx + 3, 16.2, 1.6).sy} ${iso(cx + 5.2, 18.4, 1.6).sx},${iso(cx + 5.2, 18.4, 1.6).sy}`}
                fill="none"
                stroke={PLATE.sienna}
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        ))}
        {/* the grading's concept label — dot on the cells' mid-row, the
         * word seated below on the open sheet (the chip voice retired:
         * the concept label IS the cells' annotation) */}
        <SeatLabel x={-40} y={-8} tx={-46} ty={22} text="تصحيح تلقائي للموضوعي" />

        {/* the essay — the sheet lifting off the desk on its dashed
         * route to the professor (the route's dashes flow, then the
         * sheet lands on the far desk) */}
        <g className="iso-loop-line" style={ld('1.2s')}>
          <Route points={[[-16, -6, 4.2], [2, -8, 4.6], [16, -12, 6.4]]} />
        </g>
        <g className="iso-loop-box" style={ld('2s')}>
          <IsoBox x={-18} y={-9} w={10} d={8} h={0.7} top={PLATE.paperHi} />
        </g>
        {/* the essay's concept label — dot on the route's mid-span,
            the word seated above on the open sheet */}
        <SeatLabel x={-2} y={-13} tx={40} ty={-32} text="المقالية إلى الأستاذ" />

        {/* the professor's desk — the essay's destination, its chip
         * seated below the desk on the open sheet (clear of the essay
         * label's leader line above) */}
        <IsoBox x={16} y={-22} w={22} d={17} h={6.4} />
        <g className="iso-loop-box" style={ld('2.6s')}>
          <IsoBox x={19} y={-19} w={16} d={11} h={0.7} top={PLATE.paperHi} />
        </g>
        <g className="iso-loop-dot" style={ld('2.9s')}>
          <PlateTag x={26} y={26} text="PROFESSOR" dark />
        </g>
      </g>

      {/* the caption row — the sheet's own furniture (OUTSIDE the scene
       * transform, the WhyPanels law) */}
      <PlateLabel x={468} y={254} anchor="start" size={11}>
        قاعة الاختبار: مؤقّت، وتصحيح تلقائي للموضوعي، ومقالية إلى الأستاذ
      </PlateLabel>
      <Coord x={12} y={270}>EXAM RUNNER · TIMER / AUTO-GRADE / ESSAY ROUTE</Coord>
    </svg>
  );
}

/* ────────── P2 · برج المساعد — the academic assistant machine ────────── */

export function AssistantPlate({ label, dataSpec }: { label: string; dataSpec?: string }) {
  /* the core tower's top centre — the orbit ring's seat */
  const coreTop = iso(1, 4, 20);
  /* the core's concept label's dot — seated on the tower's east face */
  const coreFace = iso(12, -4, 9);
  return (
    <svg viewBox={FRAME} role="img" aria-label={label} className="prp-svg" data-spec={dataSpec}>
      <IsoDefs />
      <g transform="translate(240 138) scale(1.5)">
        <GroundFill x={-58} y={-30} w={112} d={54} opacity={0.4} />

        {/* the core tower — the assistant's booth + its cap */}
        <IsoBox x={-10} y={-6} w={22} d={20} h={14} />
        <IsoBox x={-7} y={-3} w={16} d={14} z={14} h={6} top={PLATE.east} />
        {/* the core's concept label — dot on the cap's crown */}
        <SeatLabel x={coreFace.sx} y={coreFace.sy} tx={44} ty={-28} text="نواة المساعد" />

        {/* the knowledge ring — orbiting the tower's cap */}
        <g transform={`translate(${coreTop.sx} ${coreTop.sy})`}>
          <g className="iso-loop-orbit">
            <circle r={11.5} fill="none" stroke={PLATE.hair} strokeWidth={0.9} strokeDasharray="3 3" />
            <polygon points={`0,${-1.8} ${1.8},0 0,${1.8} ${-1.8},0`} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.7} />
          </g>
        </g>

        {/* the student — the seat + the question node popping in */}
        <IsoBox x={-50} y={4} w={11} d={11} h={3} />
        <g className="iso-loop-dot" style={ld('0s')}>
          <IsoNode x={-44.5} y={9.5} z={4.4} s={2.6} />
        </g>
        {/* the question's concept label — dot on the student's node */}
        <SeatLabel x={-46.8} y={-22.2} tx={-62} ty={-44} text="سؤال الطالب" />

        {/* the question's route — the seat → the core */}
        <g className="iso-loop-line" style={ld('0.3s')}>
          <Route points={[[-40, 8, 4], [-24, 4, 4], [-11, 2, 8]]} />
        </g>

        {/* the answer — the staged lines drawing back on the student's
         * sheet (the paper lands, then its rows ink in sequence) */}
        <g className="iso-loop-box" style={ld('1.1s')}>
          <IsoBox x={-52} y={-14} w={20} d={13} h={1} top={PLATE.paperHi} />
        </g>
        {[0, 1].map((ry) => (
          <g key={ry} className="iso-loop-line" style={ld(`${1.5 + ry * 0.35}s`)}>
            <polyline
              points={`${iso(-49, -11 + ry * 4.6, 2.2).sx},${iso(-49, -11 + ry * 4.6, 2.2).sy} ${iso(-36 - (ry === 1 ? 6 : 0), -11 + ry * 4.6, 2.2).sx},${iso(-36 - (ry === 1 ? 6 : 0), -11 + ry * 4.6, 2.2).sy}`}
              fill="none"
              stroke={ry === 0 ? PLATE.sienna : PLATE.muted}
              strokeWidth={1.3}
            />
          </g>
        ))}
        <g className="iso-loop-line" style={ld('2.2s')}>
          <Route points={[[-8, -6, 8], [-24, -10, 4], [-34, -9, 2.4]]} />
        </g>

        {/* the review plan — the chip landing on the far side, its
         * route actually reaching the chip's near face */}
        <g className="iso-loop-line" style={ld('1.8s')}>
          <Route points={[[12, 4, 8], [18, 5, 6], [21, 5, 5.4]]} />
        </g>
        <g className="iso-loop-box" style={ld('2.4s')}>
          <IsoBox x={22} y={0} w={17} d={14} h={5} top={PLATE.ink} east={PLATE.ink} west={PLATE.ink} />
          {[3.5, 6.5].map((py, i) => (
            <polyline
              key={py}
              points={`${iso(25, py, 5.1).sx},${iso(25, py, 5.1).sy} ${iso(25 + (i === 0 ? 11 : 7), py, 5.1).sx},${iso(25 + (i === 0 ? 11 : 7), py, 5.1).sy}`}
              fill="none"
              stroke={i === 0 ? PLATE.sienna : PLATE.muted}
              strokeWidth={1.4}
            />
          ))}
        </g>
        <g className="iso-loop-dot" style={ld('2.8s')}>
          <PlateTag x={iso(30.5, 7, 5).sx} y={iso(30.5, 7, 5).sy + 13} text="PLAN" dark />
        </g>
        {/* the plan's concept label — dot on the chip's crown */}
        <SeatLabel x={iso(28, 3, 5).sx} y={iso(28, 3, 5).sy} tx={64} ty={-14} text="خطة مراجعة" />
      </g>

      {/* the caption row — the sheet's own furniture (OUTSIDE the scene
       * transform, the WhyPanels law) */}
      <PlateLabel x={468} y={254} anchor="start" size={11}>
        برج المساعد: السؤال يصل النواة، والجواب يعود بخطوات وخطة مراجعة
      </PlateLabel>
      <Coord x={12} y={270}>AI ASSISTANT · QUESTION / ANSWER / REVIEW PLAN</Coord>
    </svg>
  );
}
