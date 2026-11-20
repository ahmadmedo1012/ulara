/**
 * WhyPanels — r346 · the why band's isometric self-running loop panels.
 *
 * THE PHASE-4 DIRECTIVE (r346, commit e4c84e7): the landing's flat 2D
 * artwork retires — the why band's capture-track scene (WhyScene.tsx,
 * R345-ED) is RETIRED from the mount (the file stays in the tree for
 * rollback; sections/Why.tsx documents the swap) and the band's four
 * pillars become ISOMETRIC plates that RUN THEMSELVES: pure-CSS loops
 * (zero JS ticks) ported from the r346 sandbox rebuild's WhyPanels
 * recipe — constant slow rotations, pulses and staged pops on the
 * motion token ladder, each panel one small machine of the system:
 *
 *   01 الفصل المقلوب — the lecture slab with its play diamond, the
 *      timeline checkpoints popping in sequence, the inked progress
 *      crawling, the attendance tower landing with its check, and a
 *      beacon node orbiting the tower (الحضور يُحتسب تلقائيًا);
 *   02 مصفوفة الإتقان — the 4×6 ground matrix filling cell by cell,
 *      the one gap cell dashed + ringing in copper, the arrow to the
 *      NEXT STEP chip;
 *   03 دورة البحث — the document → the scanning dial (an orbiting
 *      beam) → the annotation slab → the library shelf, a four-stage
 *      pipeline joined by flowing dashes;
 *   04 رقابة الجودة — the sweeping gauge dial, the council row
 *      landing one seat at a time, the long ledger slab with its one
 *      copper tick.
 *
 * Geometry: every volume is authored in ISO SPACE (lib/iso.ts's 30°
 * projection) and rendered by the kernel primitives (kernel/Iso.tsx)
 * — the same grammar as the hero campus plate. The loop keyframes +
 * their classes (.iso-loop-*) live in iso-plate.css (the ONE painting
 * system — deliberately NOT in why.css: the r306 keyframes census
 * whitelists why.css's instrument set, and the plate grammar's loops
 * belong to the plate sheet); durations ride the --motion-duration
 * ambient rungs + the --ease family, the per-element choreography
 * rides the exempt inline --ild delay slot. Reduced motion collapses
 * every loop to its settled static plate (iso-plate.css's RM belt);
 * the loops are CSS-authored, so a dead JS pass still runs them.
 *
 * Colour law: every paint flows the --iso-* seats (PLATE) — zero raw
 * literals in this file. Copy: the sandbox's authored Arabic, ported
 * verbatim.
 */
import type { CSSProperties, ReactNode } from 'react';
import { PLATE, iso, isoBoxFaces, poly, sheetDiamond } from '../../../lib/iso';
import {
  IsoDefs,
  Coord,
  GroundFill,
  IsoBox,
  IsoNode,
  PlateLabel,
  Route,
} from '../kernel/Iso';
import { RevealCssClass } from '../../../hooks/useReveal';
/* the isometric plate grammar's painting system (the --iso-* seats +
   the loop belt) rides the plates — the CSS-rides-the-component law */
import '../../../styles/landing/iso-plate.css';

/* the loop delay slot — the exempt choreography ladder (seconds) */
const ld = (s: string): CSSProperties => ({ ['--ild' as string]: s } as CSSProperties);

/* the panel sheet: 300×170, the scene in the upper band, the authored
 * captions (Arabic + mono) seated at the foot — the sandbox's frame */
const FRAME = '0 0 300 170';

function PanelFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wyp-frame">
      <svg viewBox={FRAME} role="img" aria-label={label} className="wyp-svg">
        <IsoDefs />
        {children}
      </svg>
    </div>
  );
}

/** a flat mono chip label (the instrument caption), measured to its text. */
function Tag({ x, y, text, dark = false }: { x: number; y: number; text: string; dark?: boolean }) {
  const w = text.length * 5.6 + 8;
  return (
    <g>
      <rect x={x - w / 2} y={y - 8} width={w} height={13} fill={dark ? PLATE.ink : PLATE.paperHi} stroke={PLATE.ink} strokeWidth={0.8} />
      <text x={x} y={y + 1.5} textAnchor="middle" fontSize={8} fontFamily="var(--font-iso-mono), monospace" fontWeight={500} fill={dark ? 'var(--iso-label-on-ink)' : PLATE.ink} style={{ direction: 'ltr' }}>
        {text}
      </text>
    </g>
  );
}

/** the panel's caption pair: the Arabic line + the mono micro-label. */
function Caption({ ar, mono }: { ar: string; mono: string }) {
  return (
    <>
      <PlateLabel x={18} y={136} anchor="end" size={11}>
        {ar}
      </PlateLabel>
      <Coord x={18} y={154} anchor="start">
        {mono}
      </Coord>
    </>
  );
}

/* ————— 01 · الفصل المقلوب: play → checkpoint → attendance ————— */

function LoopFlipped() {
  const towerTop = iso(35, -3, 10); // the attendance tower's top centre
  return (
    <PanelFrame label="حلقة الفصل المقلوب: شريط المحاضرة، نقاط الإدماج، وحضور تلقائي">
      <g transform="translate(151 69) scale(1.35)">
        <GroundFill x={-58} y={-20} w={106} d={30} opacity={0.4} />
        {/* the video slab — the lecture recording, its play diamond */}
        <IsoBox x={-52} y={-16} w={52} d={22} h={3} />
        <IsoNode x={-45} y={-5} z={3.2} s={3} />
        {/* the timeline: the hair rail + the inked progress crawling */}
        <Route points={[[-46, -5, 3.4], [-8, -5, 3.4]]} dashed={false} stroke={PLATE.muted} strokeWidth={1} opacity={0.7} />
        <g className="iso-loop-line" style={ld('0.3s')}>
          <Route points={[[-46, -5, 3.4], [-20, -5, 3.4]]} dashed={false} strokeWidth={2} opacity={0.9} />
        </g>
        {/* the checkpoints — popping in sequence, the middle one copper */}
        {[-40, -28, -16].map((cx, i) => (
          <g key={cx} className="iso-loop-dot" style={ld(`${1.1 + i * 0.45}s`)}>
            <IsoNode x={cx} y={-5} z={3.4} s={2.4} fill={i === 1 ? PLATE.sienna : PLATE.top} />
          </g>
        ))}
        {/* the attendance tower — landing with its check + tag */}
        <g className="iso-loop-box" style={ld('2.2s')}>
          <IsoBox x={26} y={-12} w={18} d={18} h={10} />
          <polyline points={`${towerTop.sx - 4.4},${towerTop.sy + 0.5} ${towerTop.sx - 1.1},${towerTop.sy + 4} ${towerTop.sx + 4.6},${towerTop.sy - 3}`} fill="none" stroke={PLATE.sienna} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <Tag x={towerTop.sx} y={towerTop.sy - 16} text="ATTEND" dark />
        </g>
        {/* the attendance beacon — a node orbiting the tower's top */}
        <g transform={`translate(${towerTop.sx} ${towerTop.sy})`}>
          <g className="iso-loop-orbit">
            <circle r={7.5} fill="none" stroke={PLATE.hair} strokeWidth={0.9} strokeDasharray="3 3" />
            <polygon points={sheetDiamond(7.5, 0, 1.7)} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.7} />
          </g>
        </g>
        {/* the connectors — checkpoint flow → tower, timeline → tower */}
        <g className="iso-loop-line" style={ld('1.6s')}>
          <Route points={[[5, -2, 3], [24, -3, 6]]} />
        </g>
        <g className="iso-loop-line" style={ld('2s')}>
          <Route points={[[-16, -5, 3.4], [-16, 4, 1.2], [22, 2, 1.2]]} />
        </g>
      </g>
      <Caption ar="شريط المحاضرة + إدماج مصحّح فوريًا + حضور تلقائي" mono="LOOP 6s / CHECKPOINT x3" />
    </PanelFrame>
  );
}

/* ————— 02 · مصفوفة الإتقان: cells fill, gap flags, recommendation ————— */

function LoopMastery() {
  const gapX = -42 + 4 * 6.5; // the gap cell — the concept not yet mastered
  const gapY = -16 + 1 * 6.5;
  const gapC = iso(gapX + 2.5, gapY + 2.5, 1.2);
  return (
    <PanelFrame label="حلقة مصفوفة الإتقان: خلايا تمتلئ، فجوة تُعلَّم بالنحاسي، وتوصية تنطلق">
      <g transform="translate(150 66) scale(1.35)">
        <GroundFill x={-46} y={-20} w={90} d={36} opacity={0.4} />
        {/* the 4×6 matrix — cells landing in reading order, the far
            half already inked (mastered), the gap cell never lands */}
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 6 }, (_, c) => {
            const k = r * 6 + c;
            if (c === 4 && r === 1) return null; // the gap
            return (
              <g key={`${r}-${c}`} className="iso-loop-dot" style={ld(`${0.15 + k * 0.14}s`)}>
                <IsoBox x={-42 + c * 6.5} y={-16 + r * 6.5} w={5} d={5} h={1.2} top={k > 12 ? PLATE.east : PLATE.top} />
              </g>
            );
          }),
        )}
        {/* the gap cell — dashed + ringing in copper, never filled */}
        <polygon points={isoBoxFaces(gapX, gapY, 0, 5, 5, 1.2).top} fill="none" stroke={PLATE.sienna} strokeWidth={1.1} strokeDasharray="3 3" />
        <g transform={`translate(${gapC.sx} ${gapC.sy})`}>
          <polygon className="iso-loop-pulse" points={sheetDiamond(0, 0, 4.2)} fill="none" stroke={PLATE.sienna} strokeWidth={1.3} />
        </g>
        {/* the recommendation — the arrow + the NEXT STEP chip */}
        <g className="iso-loop-dot" style={ld('2.2s')}>
          <Route points={[[gapX + 7, gapY + 2, 2.5], [22, -3, 2.5]]} dashed={false} strokeWidth={1.6} />
          <polyline points={`${iso(22, -3, 2.5).sx},${iso(22, -3, 2.5).sy} ${iso(18.6, -2.2, 2.5).sx},${iso(18.6, -2.2, 2.5).sy} ${iso(19.4, -4.6, 2.5).sx},${iso(19.4, -4.6, 2.5).sy}`} fill="none" stroke={PLATE.sienna} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="iso-loop-box" style={ld('2.6s')}>
          <IsoBox x={26} y={-10} w={15} d={13} h={5} top={PLATE.ink} east={PLATE.ink} west={PLATE.ink} />
          {[-6.5, -3.5, -0.5].map((by, i) => (
            <polyline
              key={by}
              points={`${iso(28.5, by, 5.1).sx},${iso(28.5, by, 5.1).sy} ${iso(28.5 + (i === 2 ? 5 : 9), by, 5.1).sx},${iso(28.5 + (i === 2 ? 5 : 9), by, 5.1).sy}`}
              fill="none"
              stroke={i === 2 ? PLATE.sienna : PLATE.muted}
              strokeWidth={1.4}
            />
          ))}
          <Tag x={iso(33.5, -3.5, 5).sx} y={iso(33.5, -3.5, 5).sy - 12} text="NEXT STEP" dark />
        </g>
      </g>
      <Caption ar="خلايا تمتلئ بالإتقان، الفجوة تُعلَّم، والتوصية جاهزة" mono="MATRIX 4x6 / GAP:FLAGGED" />
    </PanelFrame>
  );
}

/* ————— 03 · دورة البحث: submit → scan → annotate → publish ————— */

function LoopResearch() {
  const scanC = iso(-30, -5.5, 4); // the scanning dial's centre
  return (
    <PanelFrame label="حلقة دورة البحث: إرسال، فحص، شروح داخلية، ثم نشر في المكتبة">
      <g transform="translate(154 71) scale(1.35)">
        <GroundFill x={-62} y={-16} w={104} d={28} opacity={0.4} />
        {/* the document — submitted, its lines still fresh */}
        <g className="iso-loop-box" style={ld('0s')}>
          <IsoBox x={-58} y={-12} w={17} d={13} h={2} />
          {[0, 1, 2, 3].map((i) => (
            <polyline
              key={i}
              points={`${iso(-55, -9.5 + i * 2.6, 2.1).sx},${iso(-55, -9.5 + i * 2.6, 2.1).sy} ${iso(-46 - (i === 3 ? 8 : 0), -9.5 + i * 2.6, 2.1).sx},${iso(-46 - (i === 3 ? 8 : 0), -9.5 + i * 2.6, 2.1).sy}`}
              fill="none"
              stroke={i === 2 ? PLATE.sienna : PLATE.muted}
              strokeWidth={1.3}
            />
          ))}
        </g>
        {/* the scanner — the dial + the orbiting beam (the scan) */}
        <g className="iso-loop-box" style={ld('0.9s')}>
          <circle cx={scanC.sx} cy={scanC.sy} r={8.5} fill="none" stroke={PLATE.ink} strokeWidth={1.1} />
          <polygon points={sheetDiamond(scanC.sx, scanC.sy, 1.8)} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.7} />
        </g>
        <g transform={`translate(${scanC.sx} ${scanC.sy})`}>
          <g className="iso-loop-orbit">
            <circle r={12} fill="none" stroke={PLATE.sienna} strokeWidth={0.9} strokeDasharray="4 4" />
            <line x1={-12} y1={0} x2={12} y2={0} stroke={PLATE.sienna} strokeWidth={0.9} opacity={0.55} />
          </g>
        </g>
        {/* the annotation slab — the professor's note */}
        <g className="iso-loop-box" style={ld('1.7s')}>
          <IsoBox x={-8} y={-9} w={17} d={15} h={6} />
          <polygon
            points={poly(
              { x: -8, y: -9, z: 6.1 },
              { x: 9, y: -9, z: 6.1 },
              { x: 9, y: -4, z: 6.1 },
              { x: -8, y: -4, z: 6.1 },
            )}
            fill={PLATE.ink}
            stroke="none"
          />
          {[-1.5, 1.5].map((ny) => (
            <polyline
              key={ny}
              points={`${iso(-5, ny, 6.1).sx},${iso(-5, ny, 6.1).sy} ${iso(5, ny, 6.1).sx},${iso(5, ny, 6.1).sy}`}
              fill="none"
              stroke={PLATE.muted}
              strokeWidth={1.2}
            />
          ))}
          <Tag x={iso(0.5, -6.5, 6).sx} y={iso(0.5, -6.5, 6).sy - 10} text="NOTE" dark />
        </g>
        {/* the library — the shelf the research lands on */}
        <g className="iso-loop-box" style={ld('2.7s')}>
          <IsoBox x={22} y={-13} w={17} d={19} h={9} />
          <IsoBox x={24.5} y={-10.5} z={9} w={12} d={14} h={5} />
          {[3, 6].map((lz) => (
            <polyline
              key={lz}
              points={`${iso(39, -11, lz).sx},${iso(39, -11, lz).sy} ${iso(39, 4, lz).sx},${iso(39, 4, lz).sy}`}
              fill="none"
              stroke={PLATE.muted}
              strokeWidth={0.9}
            />
          ))}
          <polyline
            points={`${iso(25, -6, 3.1).sx},${iso(25, -6, 3.1).sy} ${iso(31, -6, 3.1).sx},${iso(31, -6, 3.1).sy}`}
            fill="none"
            stroke={PLATE.sienna}
            strokeWidth={1.6}
          />
          <Tag x={iso(30.5, 6, 0).sx} y={iso(30.5, 6, 0).sy + 10} text="LIB" />
        </g>
        {/* the pipeline — flowing dashes between the stages */}
        <g className="iso-loop-line" style={ld('0.5s')}>
          <Route points={[[-39, -5.5, 2.4], [-35, -5.5, 3]]} />
        </g>
        <g className="iso-loop-line" style={ld('1.3s')}>
          <Route points={[[-18, -4, 4], [-12, -4, 4]]} />
        </g>
        <g className="iso-loop-line" style={ld('2.3s')}>
          <Route points={[[11, -1.5, 4], [20, -3.5, 4]]} />
        </g>
      </g>
      <Caption ar="إرسال ← فحص ← شروح الأستاذ ← نشر في المكتبة" mono="PIPELINE 4-STAGE" />
    </PanelFrame>
  );
}

/* ————— 04 · رقابة الجودة: gauge sweep → council → ledger ————— */

function LoopQuality() {
  const dialC = iso(-50.5, -8.5, 1.4); // the gauge dial's centre
  return (
    <PanelFrame label="حلقة رقابة الجودة: مؤشر يقيس، صف المجلس يظهر، وسجل الالتزام يمتد">
      <g transform="translate(153 72) scale(1.25)">
        <GroundFill x={-62} y={-20} w={104} d={34} opacity={0.4} />
        {/* the gauge — the dial slab + the sweeping needle */}
        <g className="iso-loop-box" style={ld('0s')}>
          <IsoBox x={-58} y={-16} w={15} d={15} h={1.4} />
          <circle cx={dialC.sx} cy={dialC.sy} r={12} fill="none" stroke={PLATE.ink} strokeWidth={1.1} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={dialC.sx + Math.cos(a) * 10}
                y1={dialC.sy + Math.sin(a) * 10}
                x2={dialC.sx + Math.cos(a) * 13.2}
                y2={dialC.sy + Math.sin(a) * 13.2}
                stroke={PLATE.ink}
                strokeWidth={0.9}
              />
            );
          })}
        </g>
        <g transform={`translate(${dialC.sx} ${dialC.sy})`}>
          <g className="iso-loop-sweep">
            {/* the needle — symmetric through the pivot (a drafting
                compass): the sweep rotates around the group's origin */}
            <line x1={-10} y1={3} x2={10} y2={-3} stroke={PLATE.sienna} strokeWidth={1.8} strokeLinecap="round" />
          </g>
          <circle r={1.8} fill={PLATE.ink} />
        </g>
        {/* the council — three seats landing one at a time */}
        {[-16, 0, 16].map((cx, i) => (
          <g key={cx} className="iso-loop-box" style={ld(`${1 + i * 0.4}s`)}>
            <IsoBox x={cx} y={-14} w={13} d={9} h={2.6} />
            <polyline
              points={`${iso(cx + 2, -11.5, 2.7).sx},${iso(cx + 2, -11.5, 2.7).sy} ${iso(cx + 8, -11.5, 2.7).sx},${iso(cx + 8, -11.5, 2.7).sy}`}
              fill="none"
              stroke={i === 0 ? PLATE.sienna : PLATE.muted}
              strokeWidth={1.3}
            />
            {i === 1 && <IsoNode x={cx + 6.5} y={-9.5} z={2.7} s={1.5} />}
          </g>
        ))}
        {/* the ledger — the long compliance strip */}
        <g className="iso-loop-box" style={ld('2.4s')}>
          <IsoBox x={-26} y={4} w={64} d={7} h={1.8} />
          {Array.from({ length: 8 }, (_, i) => {
            const tx = -22 + i * 7.5;
            const hot = i === 5;
            return (
              <polyline
                key={i}
                points={`${iso(tx, 5.8, 1.9).sx},${iso(tx, 5.8, 1.9).sy} ${iso(tx + (hot ? 4.4 : 2.6), 5.8, 1.9).sx},${iso(tx + (hot ? 4.4 : 2.6), 5.8, 1.9).sy}`}
                fill="none"
                stroke={hot ? PLATE.sienna : PLATE.muted}
                strokeWidth={1.3}
              />
            );
          })}
        </g>
        {/* the gauge's reading flowing to the council */}
        <g className="iso-loop-line" style={ld('0.8s')}>
          <Route points={[[-40, -8, 2], [-24, -9, 2]]} />
        </g>
      </g>
      <Caption ar="مؤشرات قرائية، صف المجلس، وسجل الالتزام ممتد" mono="GAUGE / COUNCIL x3 / LEDGER" />
    </PanelFrame>
  );
}

/* the four pillars — the sandbox's authored copy, ported verbatim. */
const WHY_PANELS = [
  {
    id: 'flipped',
    index: '01',
    title: 'يُدرِّس بقلبٍ مقلوب',
    body: 'المحاضرة تسجيلة بإدماجيات مصحّحة فوريًا، والحضور يُحتسب تلقائيًا عند الإتمام — لا حاجة لمناداة الأسماء.',
    Loop: LoopFlipped,
  },
  {
    id: 'mastery',
    index: '02',
    title: 'يتقن مفهومًا مفهومًا',
    body: 'مصفوفة إتقان لكل مفهوم: الخلية تمتلئ بالإتقان، والفجوة تُعلَّم بالسيينا وتقود إلى توصية قابلة للتنفيذ.',
    Loop: LoopMastery,
  },
  {
    id: 'research',
    index: '03',
    title: 'يرافق البحث حتى النشر',
    body: 'دورة كاملة: إرسال، فحص، شروح الأستاذ داخل ملف PDF، ثم نشر في مكتبة ببحث نصي عربي مطبّع.',
    Loop: LoopResearch,
  },
  {
    id: 'quality',
    index: '04',
    title: 'يراقب بالقياس لا بالانطباع',
    body: 'قطاع الجودة الرابع: مؤشرات قرائية للمقررات والأساتذة والتفاعل، ومجلس، وسجل التزام لا يُطمس.',
    Loop: LoopQuality,
  },
] as const;

/**
 * WhyPanels — the why band's alternating plate grid (the sandbox Why
 * band's own composition: two columns, the odd rows pushed to the far
 * column with a cascade offset — why.css's r346 section owns the
 * layout). Entrances ride the house reveal belt (RevealCssClass).
 */
export function WhyPanels() {
  return (
    <div className="wy-panels" data-spec="why.panels">
      {WHY_PANELS.map((w, i) => {
        const Loop = w.Loop;
        return (
          <RevealCssClass as="div" className="wy-panel" delay={i % 2 === 0 ? 1 : 2} key={w.id}>
            <Loop />
            <div className="wyp-cap">
              <span className="wyp-idx fo-mono" dir="ltr">{`[${w.index}]`}</span>
              <div className="wyp-captext">
                <h3 className="wyp-title">{w.title}</h3>
                <p className="wyp-body">{w.body}</p>
              </div>
            </div>
          </RevealCssClass>
        );
      })}
    </div>
  );
}
