/**
 * RolePlates — r347 · the roles deck's eight isometric machines.
 *
 * THE PHASE-4 DIRECTIVE (r346 → r347): the landing's last screenshots
 * retire — the roles band's 8-slide media deck (the /media/product
 * dashboard captures) becomes EIGHT isometric self-running machines,
 * one per accordion row, each drawing ITS ROLE'S OWN WORK in the plate
 * grammar (pure-CSS loops on the iso-loop-* belt, zero JS ticks). The
 * deck's cross-fade law is untouched (.rl-slide transform/opacity, the
 * measured reference belt); only the occupant of each slide changes.
 *
 * Each machine is a DIFFERENT composition (the jscpd law — no two
 * scenes share a vocabulary):
 *
 *   01 الطالب — the personal journey: a winding path climbing the
 *      sheet, understanding checkpoints popping in sequence, the inked
 *      progress crawling, the TODAY chip at the start, the mastery
 *      pennant landing at the summit;
 *   02 الأستاذ — the builder desk: the lecture stack rising, the exam
 *      box beside, submissions flowing in on a dashed route, copper
 *      grading ticks landing one by one;
 *   03 المسجل العام — the registry tower: the records column with its
 *      cap, college wings filing in around the base, the permissions
 *      key orbiting the crown, the live-reports ledger at the foot;
 *   04 ضمان الجودة — the isolation vaults: three walled compounds —
 *      every institution sealed alone — each raising its own flag, a
 *      gauge over the middle seat, one compliance ledger beneath all;
 *   05 مالك المنصّة — the governance vault: the master audit ledger
 *      extending its ticks, the keystone post with three separated
 *      role keys orbiting it, the institution seals row tied by
 *      dashed routes;
 *   06 الباحث — the writing desk: the PDF stack under a hovering scan
 *      lens, the professor's copper margin marks landing on the top
 *      sheet, the library shelf receiving at the far end;
 *   07 مشرف المعمل — the sealed shelf: the virtual-labs catalog —
 *      boxes under DASHED seals that never open (the honest «قيد
 *      التطوير»), the browsing lens resting on one box;
 *   08 وليّ الأمر — the honest absence: the student's report sheet
 *      slides through the wall's gap while the guardian's seat stays a
 *      DASHED outline that breathes but never fills — no separate
 *      account, the report itself carries the follow-up.
 *
 * Geometry: authored in ISO SPACE (lib/iso.ts's 30° projection) via
 * the kernel primitives (kernel/Iso.tsx) — the same grammar as every
 * other plate on the sheet. The slide frame authors at 720×533 and
 * COVERS the media pane (preserveAspectRatio slice) with a central
 * safe zone (±135 × ±100 local) so no pane aspect crops content.
 * Colour law: the --iso-* seats only. Motion law: the loops + their
 * --ild ladder live in iso-plate.css; RM collapses to the settled
 * plate; a dead JS pass still renders the full drawing.
 */
import type { CSSProperties } from 'react';
import { PLATE, iso, sheetDiamond } from '../../../lib/iso';
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

/* the slide's own sheet window — 720×533 (1.35) sits between the pane's
 * own aspects across the tiers; slice covers, the safe zone holds */
const FRAME = '0 0 720 533';

function SlideFrame({ label, dataSpec, children }: { label: string; dataSpec?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={FRAME}
      role="img"
      aria-label={label}
      className="rlp-svg"
      data-spec={dataSpec}
      preserveAspectRatio="xMidYMid slice"
    >
      <IsoDefs />
      {children}
    </svg>
  );
}

/* a hairline record line on a face — the registry/ledger rune */
function Rune({ a, b, stroke = PLATE.muted }: { a: { sx: number; sy: number }; b: { sx: number; sy: number }; stroke?: string }) {
  return (
    <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={stroke} strokeWidth={1.1} />
  );
}

/* ═══════════ 01 · الطالب — the personal journey ═══════════ */

function SceneStudent({ dataSpec }: { dataSpec?: string }) {
  /* the winding climb — five waypoints from the near corner to the summit */
  const path: [number, number, number][] = [
    [-52, 26, 0], [-34, 12, 3], [-12, 8, 7], [10, -4, 11], [28, -16, 16],
  ];
  const summit = path[4] as [number, number, number];
  const summitS = iso(summit[0], summit[1], summit[2]);
  return (
    <SlideFrame dataSpec={dataSpec} label="رحلة الطالب: مسار يصعد، محطات فهم تظهر تباعًا، وشارة إتقان في القمة">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-128} y={-96} w={256} d={190} opacity={0.3} />

        {/* the path itself — the hairline climb */}
        <Route points={path} dashed={false} stroke={PLATE.muted} strokeWidth={1.2} opacity={0.7} />
        {/* the inked progress crawling the first spans */}
        <g className="iso-loop-line" style={ld('0.4s')}>
          <Route points={[path[0]!, path[1]!, path[2]!]} dashed={false} strokeWidth={2} opacity={0.9} />
        </g>

        {/* the understanding checkpoints — popping in sequence, the third copper */}
        {path.map((p, i) => (
          <g key={i} className="iso-loop-dot" style={ld(`${0.6 + i * 0.5}s`)}>
            <IsoNode x={p[0]} y={p[1]} z={p[2]} s={i === 2 ? 3 : 2.4} fill={i === 2 ? PLATE.sienna : PLATE.top} />
          </g>
        ))}
        {/* the concept label — on the copper checkpoint */}
        <SeatLabel x={iso(-12, 8, 7).sx} y={iso(-12, 8, 7).sy} tx={-16} ty={-44} text="محطة فهم" />

        {/* the TODAY chip at the journey's start — the mono voice carries
         * the concept alone (a seat label here crossed the chip's box) */}
        <g className="iso-loop-dot" style={ld('0s')}>
          <PlateTag x={iso(-52, 26, 2).sx} y={iso(-52, 26, 2).sy + 19} text="TODAY" dark />
        </g>

        {/* the mastery pennant — landing at the summit */}
        <g className="iso-loop-box" style={ld('3s')}>
          <line x1={summitS.sx} y1={summitS.sy} x2={summitS.sx} y2={summitS.sy - 14} stroke={PLATE.ink} strokeWidth={1.4} />
          <polygon
            points={`${summitS.sx},${summitS.sy - 14} ${summitS.sx + 11},${summitS.sy - 11} ${summitS.sx},${summitS.sy - 8}`}
            fill={PLATE.sienna}
            stroke={PLATE.ink}
            strokeWidth={0.8}
          />
        </g>
        <SeatLabel x={summitS.sx + 2} y={summitS.sy - 8} tx={72} ty={-60} text="الإتقان" />

        {/* two milestone slabs along the climb — the course's stations */}
        <IsoBox x={-30} y={24} w={10} d={8} h={2.4} />
        <IsoBox x={16} y={2} w={9} d={7} h={2} />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        رحلة شخصية: محطات فهم تُتقَن واحدًا واحدًا
      </PlateLabel>
      <Coord x={152} y={478}>STUDENT JOURNEY / CHECKPOINTS x5</Coord>
    </SlideFrame>
  );
}

/* ═══════════ 02 · الأستاذ — the builder desk ═══════════ */

function SceneTeacher({ dataSpec }: { dataSpec?: string }) {
  return (
    <SlideFrame dataSpec={dataSpec} label="مكتب الأستاذ: المحاضرات تُبنى طبقة طبقة، والاختبار بجانبها، والواجبات تصل فتُصحَّح بعلامات نحاسية">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-126} y={-94} w={252} d={186} opacity={0.3} />

        {/* the drafting desk — the wide work slab */}
        <IsoBox x={-34} y={-8} w={44} d={26} h={4} />
        {/* the lecture stack — sheets rising one at a time */}
        <IsoBox x={-30} y={-4} w={26} d={16} h={1.2} top={PLATE.paperHi} />
        <g className="iso-loop-box" style={ld('0.5s')}>
          <IsoBox x={-28} y={-2} w={22} d={12} z={1.2} h={1.2} top={PLATE.paperHi} />
        </g>
        <g className="iso-loop-box" style={ld('1.2s')}>
          <IsoBox x={-26} y={0} w={18} d={9} z={2.4} h={1.2} top={PLATE.paperHi} />
        </g>
        <SeatLabel x={iso(-24, 4, 3.8).sx} y={iso(-24, 4, 3.8).sy} tx={-64} ty={-44} text="بناء المحاضرة" />

        {/* the exam box beside the desk */}
        <g className="iso-loop-dot" style={ld('0.9s')}>
          <IsoBox x={20} y={-16} w={14} d={12} h={8} />
          <PlateTag x={iso(27, -10, 8.4).sx} y={iso(27, -10, 8.4).sy - 10} text="EXAM" dark />
        </g>

        {/* the submissions route — flowing in from the far corner */}
        <g className="iso-loop-line" style={ld('1.6s')}>
          <Route points={[[38, 8, 2], [16, 2, 3], [2, -4, 5.5]]} />
        </g>
        {/* the submission sheet riding the route's end */}
        <g className="iso-loop-dot" style={ld('2.1s')}>
          <IsoBox x={-2} y={-8} w={10} d={7} h={0.7} top={PLATE.paperHi} />
        </g>

        {/* the grading ticks — copper checks landing in sequence */}
        {[0, 1, 2].map((i) => (
          <g key={i} className="iso-loop-dot" style={ld(`${2.4 + i * 0.4}s`)}>
            <polyline
              points={`${iso(-18 + i * 7, -14, 6).sx},${iso(-18 + i * 7, -14, 6).sy} ${iso(-15.5 + i * 7, -11.5, 6).sx},${iso(-15.5 + i * 7, -11.5, 6).sy} ${iso(-11 + i * 7, -16, 6).sx},${iso(-11 + i * 7, -16, 6).sy}`}
              fill="none"
              stroke={PLATE.sienna}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <SeatLabel x={iso(-8, -13, 6).sx} y={iso(-8, -13, 6).sy} tx={34} ty={-58} text="تصحيح بملاحظات" />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        يبني المحاضرة والاختبار، ويصحّح بملاحظات
      </PlateLabel>
      <Coord x={152} y={478}>TEACHER DESK / BUILD + GRADE</Coord>
    </SlideFrame>
  );
}

/* ═══════════ 03 · المسجل العام — the registry tower ═══════════ */

function SceneRegistrar({ dataSpec }: { dataSpec?: string }) {
  /* the wings — four college blocks filing in around the tower's base */
  const wings: [number, number, number, number, number][] = [
    [-40, -18, 11, 9, 6], [24, -20, 10, 8, 7], [-38, 10, 9, 10, 5], [26, 12, 11, 9, 6],
  ];
  const capTop = iso(0, 0, 31);
  return (
    <SlideFrame dataSpec={dataSpec} label="برج السجلّ: عمود السجلات بتاجه، الكليات تظهر حوله، ومفتاح الصلاحيات يدور فوقه">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-126} y={-96} w={252} d={190} opacity={0.3} />

        {/* the records tower — the tall column with its cap */}
        <IsoBox x={-8} y={-8} w={16} d={16} h={26} />
        <IsoBox x={-6} y={-6} w={12} d={12} z={26} h={5} top={PLATE.east} />
        {/* the record runes — hairlines up the tower's faces */}
        {[6, 12, 18].map((rz) => (
          <Rune key={rz} a={iso(8, -8, rz)} b={iso(8, 8, rz)} />
        ))}

        {/* the college wings — filing in one at a time */}
        {wings.map(([wx, wy, ww, wd, wh], i) => (
          <g key={`${wx}-${wy}`} className="iso-loop-box" style={ld(`${0.3 + i * 0.45}s`)}>
            <IsoBox x={wx} y={wy} w={ww} d={wd} h={wh} />
          </g>
        ))}
        <SeatLabel x={iso(-35, -13, 6).sx} y={iso(-35, -13, 6).sy} tx={-60} ty={-46} text="الكليات والأقسام" />

        {/* the permissions key — orbiting the tower's crown */}
        <g transform={`translate(${capTop.sx} ${capTop.sy})`}>
          <g className="iso-loop-orbit">
            <circle r={13} fill="none" stroke={PLATE.hair} strokeWidth={0.9} strokeDasharray="3 3" />
            <polygon points={`0,${-2} ${2},0 0,${2} ${-2},0`} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.7} />
          </g>
        </g>
        <SeatLabel x={capTop.sx + 9} y={capTop.sy - 9} tx={70} ty={-62} text="الصلاحيات" />

        {/* the live-reports ledger — the strip at the foot */}
        <g className="iso-loop-dot" style={ld('2.2s')}>
          <IsoBox x={-44} y={28} w={30} d={8} h={1.6} />
          <Rune a={iso(-40, 32, 1.8)} b={iso(-24, 32, 1.8)} stroke={PLATE.sienna} />
          <Rune a={iso(-40, 34.5, 1.8)} b={iso(-30, 34.5, 1.8)} />
        </g>
        <SeatLabel x={iso(-34, 31, 1.8).sx} y={iso(-34, 31, 1.8).sy} tx={-60} ty={66} text="تقارير حيّة" />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        السجلّ: كليات وأقسام وصلاحيات وتقارير حيّة
      </PlateLabel>
      <Coord x={152} y={478}>REGISTRY / TOWER + WINGS + KEY</Coord>
    </SlideFrame>
  );
}

/* ═══════════ 04 · ضمان الجودة — the isolation vaults ═══════════ */

function SceneQuality({ dataSpec }: { dataSpec?: string }) {
  /* the three compounds — every institution sealed alone */
  const compounds: [number, number, number][] = [[-44, 2, 6], [-2, -4, 8], [40, 2, 5]];
  const dialC = iso(-2, -4, 16);
  return (
    <SlideFrame dataSpec={dataSpec} label="العزل الكامل: ثلاثة مجمعات مسوّرة، لكل مؤسسة علمها الخاص، ومؤشر فوق الوسط وسجلّ التزام أسفل الجميع">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-130} y={-92} w={260} d={182} opacity={0.3} />

        {compounds.map(([cx, cy, ch], i) => {
          /* the dashed boundary — a wall diamond drawn on the ground */
          const [b0, b1, b2, b3] = [
            iso(cx - 11, cy, 0), iso(cx, cy + 11, 0), iso(cx + 11, cy, 0), iso(cx, cy - 11, 0),
          ] as const;
          return (
            <g key={cx}>
              {/* the walls — the dashes flow around the boundary */}
              <g className="iso-loop-line" style={ld(`${0.2 + i * 0.4}s`)}>
                <polygon
                  points={`${b0.sx},${b0.sy} ${b1.sx},${b1.sy} ${b2.sx},${b2.sy} ${b3.sx},${b3.sy}`}
                  fill="none"
                  stroke={PLATE.ink}
                  strokeWidth={1.1}
                  strokeDasharray="5 4"
                />
              </g>
              {/* the institution block + its own flag */}
              <g className="iso-loop-box" style={ld(`${0.6 + i * 0.4}s`)}>
                <IsoBox x={cx - 4} y={cy - 4} w={8} d={8} h={ch} />
                <line x1={iso(cx + 3, cy - 3, ch).sx} y1={iso(cx + 3, cy - 3, ch).sy} x2={iso(cx + 3, cy - 3, ch).sx} y2={iso(cx + 3, cy - 3, ch).sy - 9} stroke={PLATE.ink} strokeWidth={1.1} />
                <polygon
                  points={`${iso(cx + 3, cy - 3, ch).sx},${iso(cx + 3, cy - 3, ch).sy - 9} ${iso(cx + 3, cy - 3, ch).sx + 7},${iso(cx + 3, cy - 3, ch).sy - 7} ${iso(cx + 3, cy - 3, ch).sx},${iso(cx + 3, cy - 3, ch).sy - 5}`}
                  fill={i === 1 ? PLATE.sienna : PLATE.top}
                  stroke={PLATE.ink}
                  strokeWidth={0.7}
                />
              </g>
            </g>
          );
        })}
        <SeatLabel x={iso(-55, 2, 3).sx} y={iso(-55, 2, 3).sy} tx={-62} ty={-50} text="مؤسسة معزولة" />

        {/* the gauge — the dial over the middle compound */}
        <g transform={`translate(${dialC.sx} ${dialC.sy})`}>
          <circle r={9} fill={PLATE.paperHi} stroke={PLATE.ink} strokeWidth={1.1} />
          <g className="iso-loop-sweep">
            <line x1={-6.6} y1={2} x2={6.6} y2={-2} stroke={PLATE.sienna} strokeWidth={1.6} strokeLinecap="round" />
          </g>
          <circle r={1.5} fill={PLATE.ink} />
        </g>

        {/* the compliance ledger — one strip beneath all three */}
        <g className="iso-loop-dot" style={ld('2.4s')}>
          <IsoBox x={-46} y={26} w={88} d={7} h={1.6} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Rune
              key={i}
              a={iso(-40 + i * 14, 30, 1.8)}
              b={iso(-34 + i * 14, 30, 1.8)}
              stroke={i === 4 ? PLATE.sienna : PLATE.muted}
            />
          ))}
        </g>
        <SeatLabel x={iso(20, 30, 1.8).sx} y={iso(20, 30, 1.8).sy} tx={56} ty={62} text="مؤشرات التزام" />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        كل مؤسسة معزولة تمامًا عن غيرها
      </PlateLabel>
      <Coord x={152} y={478}>QUALITY / ISOLATED x3 + LEDGER</Coord>
    </SlideFrame>
  );
}

/* ═══════════ 05 · مالك المنصّة — the governance vault ═══════════ */

function SceneOwner({ dataSpec }: { dataSpec?: string }) {
  /* the keystone — the post's top, with three separated keys orbiting */
  const keyPost = iso(0, -6, 22);
  return (
    <SlideFrame dataSpec={dataSpec} label="الحاكمية: سجلّ التدقيق الرئيسي تمتد علاماته، وثلاثة مفاتيح منفصلة تدور حول حجر الأساس، وأختام المؤسسات بجانبها">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-128} y={-92} w={256} d={184} opacity={0.3} />

        {/* the master audit ledger — the long low strip, its ticks
         * extending along it as the loop runs */}
        <IsoBox x={-38} y={12} w={76} d={10} h={2.2} />
        <g className="iso-loop-line" style={ld('0.5s')}>
          <Route points={[[-32, 17, 2.4], [30, 17, 2.4]]} dashed={false} stroke={PLATE.muted} strokeWidth={1} opacity={0.8} />
        </g>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={i} className="iso-loop-dot" style={ld(`${0.8 + i * 0.3}s`)}>
            <Rune a={iso(-28 + i * 10, 15.5, 2.4)} b={iso(-25 + i * 10, 15.5, 2.4)} stroke={i === 5 ? PLATE.sienna : PLATE.ink} />
          </g>
        ))}
        <SeatLabel x={iso(-30, 16, 2.4).sx} y={iso(-30, 16, 2.4).sy} tx={-72} ty={60} text="سجلّ التدقيق" />

        {/* the keystone — the post + the crown diamond */}
        <IsoBox x={-1.4} y={-7.4} w={2.8} d={2.8} h={22} top={PLATE.east} />
        <polygon points={sheetDiamond(keyPost.sx, keyPost.sy, 5)} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={1} />

        {/* the three separated role keys — orbiting the keystone */}
        <g transform={`translate(${keyPost.sx} ${keyPost.sy})`}>
          <g className="iso-loop-orbit">
            <circle r={16} fill="none" stroke={PLATE.hair} strokeWidth={0.9} strokeDasharray="3 3" />
            {[0, 120, 240].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return (
                <polygon
                  key={deg}
                  points={sheetDiamond(Math.cos(a) * 16, Math.sin(a) * 16, 2.2)}
                  fill={PLATE.top}
                  stroke={PLATE.ink}
                  strokeWidth={0.8}
                />
              );
            })}
          </g>
        </g>
        <SeatLabel x={keyPost.sx + 12} y={keyPost.sy} tx={62} ty={-54} text="مفاتيح منفصلة" />

        {/* the institution seals — paper chips tied by dashed routes */}
        {[[-46, -18], [-30, -26], [34, -20]].map(([sx, sy], i) => (
          <g key={`${sx}-${sy}`} className="iso-loop-box" style={ld(`${1.4 + i * 0.35}s`)}>
            <IsoBox x={sx!} y={sy!} w={9} d={7} h={0.8} top={PLATE.paperHi} />
            <Rune a={iso(sx! + 2, sy! + 2, 1)} b={iso(sx! + 6, sy! + 2, 1)} stroke={PLATE.sienna} />
          </g>
        ))}
        <g className="iso-loop-line" style={ld('1s')}>
          <Route points={[[-38, -14, 1], [-4, -8, 8]]} />
          <Route points={[[28, -16, 1], [2, -7, 10]]} />
        </g>
        <SeatLabel x={iso(-42, -15, 1).sx} y={iso(-42, -15, 1).sy} tx={-72} ty={-50} text="المؤسّسات" />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        الحاكمية: سجلّ تدقيق لا يُطمس، ومفاتيح منفصلة
      </PlateLabel>
      <Coord x={152} y={478}>GOVERNANCE / AUDIT + KEYS x3</Coord>
    </SlideFrame>
  );
}

/* ═══════════ 06 · الباحث — the writing desk ═══════════ */

function SceneResearcher({ dataSpec }: { dataSpec?: string }) {
  /* the scan lens — hovering over the PDF stack's top sheet */
  const lens = iso(-14, -18, 15);
  return (
    <SlideFrame dataSpec={dataSpec} label="مكتب البحث: كومة PDF تحت عدسة فحص محلّقة، وملاحظات الأستاذ النحاسية تهبط على الورقة، ورفّ المكتبة في الطرف">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-126} y={-92} w={252} d={182} opacity={0.3} />

        {/* the writing desk */}
        <IsoBox x={-38} y={-6} w={42} d={24} h={4} />
        {/* the PDF stack — three sheets, the top one fresh */}
        <IsoBox x={-34} y={-2} w={26} d={15} h={1} top={PLATE.paperHi} />
        <IsoBox x={-32} y={0} w={22} d={12} z={1} h={1} top={PLATE.paperHi} />
        <g className="iso-loop-dot" style={ld('0.4s')}>
          <IsoBox x={-30} y={2} w={18} d={9} z={2} h={1} top={PLATE.paperHi} />
        </g>

        {/* the scan lens — the hovering circle, its pulse ring */}
        <circle cx={lens.sx} cy={lens.sy} r={9} fill={PLATE.paperHi} stroke={PLATE.ink} strokeWidth={1.1} />
        <polygon points={sheetDiamond(lens.sx, lens.sy, 1.8)} fill={PLATE.sienna} stroke={PLATE.ink} strokeWidth={0.7} />
        <g transform={`translate(${lens.sx} ${lens.sy})`}>
          <polygon className="iso-loop-pulse" points={sheetDiamond(0, 0, 13)} fill="none" stroke={PLATE.sienna} strokeWidth={1.2} />
        </g>
        <SeatLabel x={lens.sx} y={lens.sy - 9} tx={-30} ty={-56} text="فحص النزاهة" />

        {/* the professor's margin marks — copper strokes landing on the top sheet */}
        {[0, 1, 2].map((i) => (
          <g key={i} className="iso-loop-dot" style={ld(`${1.2 + i * 0.4}s`)}>
            <Rune a={iso(-27 + i * 5, 5 + i, 3.1)} b={iso(-23 + i * 5, 5 + i, 3.1)} stroke={PLATE.sienna} />
          </g>
        ))}
        <SeatLabel x={iso(-22, 7, 3.1).sx} y={iso(-22, 7, 3.1).sy} tx={-62} ty={52} text="ملاحظات الأستاذ" />

        {/* the library shelf — receiving at the far end */}
        <g className="iso-loop-box" style={ld('2.2s')}>
          <IsoBox x={20} y={-18} w={16} d={22} h={11} />
          <IsoBox x={22.5} y={-15.5} z={11} w={11} d={17} h={4.5} />
          <Rune a={iso(33, -16, 4)} b={iso(33, -2, 4)} />
        </g>
        <g className="iso-loop-line" style={ld('1.8s')}>
          <Route points={[[6, -2, 4], [16, -8, 4]]} />
        </g>
        <SeatLabel x={iso(28, -7, 11).sx} y={iso(28, -7, 11).sy} tx={74} ty={-30} text="المكتبة" />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        يكتب بحثه: رفع، وفحص معلَن، وملاحظات معلَّمة
      </PlateLabel>
      <Coord x={152} y={478}>RESEARCH DESK / SCAN + MARGINS + SHELF</Coord>
    </SlideFrame>
  );
}

/* ═══════════ 07 · مشرف المعمل — the sealed shelf ═══════════ */

function SceneLabs({ dataSpec }: { dataSpec?: string }) {
  /* the sealed boxes — two per shelf level; the seals STAY dashed */
  const boxes: [number, number, number][] = [
    [-32, -16, 0], [-8, -16, 0], [-32, -16, 15], [-8, -16, 15],
  ];
  const lensC = iso(-8, -4, 22);
  return (
    <SlideFrame dataSpec={dataSpec} label="رفوف المعامل الافتراضية: صناديق مختومة بخطوط متقطعة لا تُفتح — فهرس للعرض دون تشغيل، والعدسة على أحدها">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-124} y={-92} w={248} d={182} opacity={0.3} />

        {/* the shelf — two wide levels on side posts */}
        <IsoBox x={-42} y={-22} w={66} d={12} h={2} />
        <IsoBox x={-42} y={-22} w={66} d={12} z={15} h={2} top={PLATE.east} />
        <IsoBox x={-44} y={-24} w={3} d={16} h={19} />
        <IsoBox x={23} y={-24} w={3} d={16} h={19} />

        {boxes.map(([bx, by, bz], i) => (
          <g key={i} className="iso-loop-box" style={ld(`${0.3 + i * 0.45}s`)}>
            <IsoBox x={bx} y={by} z={bz} w={14} d={10} h={6.5} />
            {/* the dashed seal — the box's top face outline, NEVER a fill:
             * the honest «قيد التطوير» — the catalog browses, never runs */}
            <polygon
              points={isoBoxTop(bx, by, bz + 6.5, 14, 10)}
              fill="none"
              stroke={PLATE.sienna}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </g>
        ))}
        <PlateTag x={iso(-25, -11, 6.7).sx} y={iso(-25, -11, 6.7).sy - 9} text="SEALED" dark />
        <SeatLabel x={iso(-25, -11, 6.7).sx} y={iso(-25, -11, 6.7).sy} tx={-74} ty={-62} text="قيد التطوير" />

        {/* the browsing lens — resting on one sealed box, pulsing */}
        <circle cx={lensC.sx} cy={lensC.sy} r={7.5} fill={PLATE.paperHi} stroke={PLATE.ink} strokeWidth={1.1} />
        <polygon points={sheetDiamond(lensC.sx, lensC.sy, 1.5)} fill={PLATE.ink} />
        <g transform={`translate(${lensC.sx} ${lensC.sy})`}>
          <polygon className="iso-loop-pulse" points={sheetDiamond(0, 0, 11)} fill="none" stroke={PLATE.sienna} strokeWidth={1.1} />
        </g>

        {/* the catalog index — the mono chip under the shelf */}
        <g className="iso-loop-dot" style={ld('2.3s')}>
          <PlateTag x={iso(-9, 6, 1).sx} y={iso(-9, 6, 1).sy + 14} text="CATALOG" />
        </g>
        <SeatLabel x={iso(18, -8, 0).sx} y={iso(18, -8, 0).sy} tx={76} ty={42} text="رفوف للعرض" />
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        المعامل الافتراضية قيد التطوير — فهرس دون تشغيل
      </PlateLabel>
      <Coord x={152} y={478}>V-LABS / SEALED CATALOG x4</Coord>
    </SlideFrame>
  );
}

/* the sealed box's top-face outline (local helper — the dashed seal) */
function isoBoxTop(x: number, y: number, z: number, w: number, d: number): string {
  const p1 = iso(x, y, z);
  const p2 = iso(x + w, y, z);
  const p3 = iso(x + w, y + d, z);
  const p4 = iso(x, y + d, z);
  return `${p1.sx},${p1.sy} ${p2.sx},${p2.sy} ${p3.sx},${p3.sy} ${p4.sx},${p4.sy}`;
}

/* ═══════════ 08 · وليّ الأمر — the honest absence ═══════════ */

function SceneGuardian({ dataSpec }: { dataSpec?: string }) {
  /* the guardian's dashed seat — breathing, never filling */
  const seat = iso(34, -8, 0);
  return (
    <SlideFrame dataSpec={dataSpec} label="الحضور الصادق: تقرير الطالب يمرّ عبر الفتحة، ومقعد وليّ الأمر يبقى خطًا متقطعًا لا يمتلئ — لا حساب منفصل اليوم">
      <g transform="translate(360 266) scale(2)">
        <GroundFill x={-124} y={-90} w={248} d={178} opacity={0.3} />

        {/* the student's report sheet — the paper that carries the truth */}
        <g className="iso-loop-dot" style={ld('0s')}>
          <IsoBox x={-48} y={-14} w={24} d={16} h={1} top={PLATE.paperHi} />
          {[0, 1, 2].map((ry) => (
            <Rune key={ry} a={iso(-44, -10 + ry * 5, 1.2)} b={iso(-32 - (ry === 2 ? 6 : 0), -10 + ry * 5, 1.2)} stroke={ry === 0 ? PLATE.sienna : PLATE.muted} />
          ))}
        </g>
        <PlateTag x={iso(-36, -6, 1.4).sx} y={iso(-36, -6, 1.4).sy - 10} text="REPORT" dark />
        <SeatLabel x={iso(-40, -8, 1.2).sx} y={iso(-40, -8, 1.2).sy} tx={-68} ty={-46} text="تقرير الطالب" />

        {/* the wall — two segments with the gap the report passes through */}
        <IsoBox x={-14} y={-20} w={5} d={10} h={9} />
        <IsoBox x={-14} y={0} w={5} d={12} h={9} />

        {/* the report's route — flowing through the gap */}
        <g className="iso-loop-line" style={ld('0.6s')}>
          <Route points={[[-22, -6, 1.5], [-11.5, -5, 1.5], [10, -6, 1.2]]} />
        </g>

        {/* the guardian's seat — a DASHED outline that breathes but
         * NEVER fills: no separate account exists today (the honest
         * absence drawn as the absence of a volume) */}
        <g transform={`translate(${seat.sx} ${seat.sy})`}>
          <g className="iso-loop-pulse">
            {/* the seat's side profile: back + seat + legs, all dashed */}
            <polyline
              points="-7,-14 -7,-4 7,-4 7,0 -10,0 -10,3 10,3 10,0 7,0"
              fill="none"
              stroke={PLATE.ink}
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
          </g>
        </g>
        <SeatLabel x={seat.sx + 4} y={seat.sy - 4} tx={68} ty={-50} text="وليّ الأمر" />
        <g className="iso-loop-dot" style={ld('2s')}>
          <PlateTag x={seat.sx} y={seat.sy + 18} text="NO ACCOUNT" />
        </g>
      </g>

      <PlateLabel x={568} y={460} anchor="start" size={12}>
        لا حساب منفصل — المتابعة عبر تقرير الطالب نفسه
      </PlateLabel>
      <Coord x={152} y={478}>GUARDIAN / REPORT ONLY</Coord>
    </SlideFrame>
  );
}

/* the eight machines — one per accordion row, in the deck's own order */
export const ROLE_SLIDES: React.ComponentType<{ dataSpec?: string }>[] = [
  SceneStudent,
  SceneTeacher,
  SceneRegistrar,
  SceneQuality,
  SceneOwner,
  SceneResearcher,
  SceneLabs,
  SceneGuardian,
];
