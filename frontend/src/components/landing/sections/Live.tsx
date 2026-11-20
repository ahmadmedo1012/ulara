/* P2-0 (r335 split) — [3] التحديات — R337 (A-problem): the section
 * is REBUILT against the frozen reference spec (docs/redesign/r335/
 * the frozen r335 reference captures (home-problem-wrap.{390),768,1024,1440,1920}.json).
 *
 * the reference's problem band is a RULED LEDGER of four columns — the
 * inverse of the old open-column transplant (R322 2-d, retired with
 * this rewrite):
 *
 *   section.pm-section[problem.wrap] > toprule · frame
 *   frame > head[problem.head] > titleblock(kicker · h2) · subwrap > sub
 *   frame > band[problem.band] > bandrule · cols · dots(≤767)
 *   cols > col×4[problem.col.N] > colrule · meta(pad box > keyroll >
 *     keytext · indexroll > indextext · cue) · metarule · bodyzone >
 *     artzone(artcolor > artin > PainArt svg) · textzone(pad box >
 *     tgrid > titlebox > itemtitle · anszone > bodytext) · zonerule
 *
 * STRUCTURE (the spec's own census — 1920): every column carries its
 * own 1px start-edge rule (the FIRST column rides the band's edge
 * instead), the meta row closes with a dashed 1px rule, the art cell
 * is the spec's 36rem square holding the centered 20rem drawing, and
 * the text zone holds the display title + the answer-led body block.
 *
 * Honesty contracts kept (R322 lineage): each pain names a real gap
 * in Libyan higher-ed and keeps its answered-by-a-live-capability
 * line (non-negotiable — the answer rides as the body block's
 * leading sentence, accented); no invented statistics; the full
 * matrix lives on /capabilities.
 *
 * Presentational: the ≤767 snap-carousel belt (keyboard focus, dot
 * mirroring, dot tap) stays in the composer — this component
 * receives the two refs the belt drives. */
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { PainArt } from '../PainArt';

/* ── R345-ED (feat/home-editorial-scenes) — the pains' measurement
 * furniture. The census art seat (problem.artsvg.N → PainArt) keeps its
 * motif drawings; THIS overlay turns each motif into a distinct measured
 * problem story — the instrument each pain defeats:
 *
 *   01 LECTURE — the measuring ruler the lecture's trace never reaches,
 *                the dashed drop line that dies midway, «TRACE Ø»;
 *   02 GRADING — the day-count rail the correction travels
 *                (D+1 … D+14) + the D+14 stamp slamming in;
 *   03 MASTERY — the axis arrows + the gap's «؟» + «MAP 8/9»
 *                (the cell the score cannot name);
 *   04 ARCHIVE — the drawer's index tabs, one broken away, «IDX —».
 *
 * Everything here is decorative chrome (aria-hidden) in the sheet's own
 * ink classes. Choreography: dash-draw + tag reveal keyed on the
 * column's reveal state — armed ONLY under .js-reveal-armed (the house
 * reveals module's root class), so no-JS and reduced-motion visitors
 * read the complete furniture (the house law); per-stroke --pd ladders
 * give each story its own controlled beat. */
function PainFurniture({ kind }: { kind: '01' | '02' | '03' | '04' }) {
  const ticks = (from: number, to: number, step: number, x: number, long: number) =>
    Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step).map((y, i) => (
      <line key={`t${i}`} className="pm-fx" pathLength={1} x1={x} y1={y} x2={i % 4 === 0 ? x + long : x + long * 0.45} y2={y} style={{ ['--pd' as string]: `${160 + i * 60}ms` }} />
    ));
  return (
    <svg className="pm-furniture" viewBox="0 0 220 220" fill="none" role="presentation" aria-hidden="true" focusable="false">
      {kind === '01' && (
        <>
          {/* the ruler the trace never reaches — full height, edge seat */}
          <line className="pm-fx" pathLength={1} x1="206" y1="14" x2="206" y2="206" style={{ ['--pd' as string]: '80ms' }} />
          {ticks(22, 198, 8, 206, 9)}
          {/* the lecture's dashed drop — the trace that dies midway */}
          <line className="pm-fx pm-fx-dash" pathLength={1} x1="110" y1="128" x2="110" y2="176" style={{ ['--pd' as string]: '520ms' }} />
          {/* the empty-trace tag */}
          <g className="pm-fx-tag" style={{ ['--pd' as string]: '700ms' }}>
            <rect className="pm-fx" pathLength={1} x="128" y="184" width="52" height="16" />
            <text className="pm-fx-t" x="154" y="195" textAnchor="middle">TRACE Ø</text>
          </g>
        </>
      )}
      {kind === '02' && (
        <>
          {/* the day rail — the correction's journey across the weeks */}
          <line className="pm-fx" pathLength={1} x1="16" y1="200" x2="204" y2="200" style={{ ['--pd' as string]: '80ms' }} />
          {[16, 42, 68, 94, 120, 146, 172, 204].map((x, i) => (
            <line key={`d${i}`} className="pm-fx" pathLength={1} x1={x} y1="195" x2={x} y2="205" style={{ ['--pd' as string]: `${200 + i * 90}ms` }} />
          ))}
          <text className="pm-fx-t" x="16" y="214" textAnchor="start">D+1</text>
          <text className="pm-fx-t pm-fx-t-a" x="204" y="214" textAnchor="end">D+14</text>
          {/* the LATE stamp — the deadline the stack outlives */}
          <g className="pm-fx-tag pm-fx-tag-stamp" style={{ ['--pd' as string]: '820ms' }}>
            <rect className="pm-fx pm-fx-a" pathLength={1} x="132" y="118" width="58" height="20" />
            <text className="pm-fx-t pm-fx-t-a" x="161" y="132" textAnchor="middle">D+14</text>
          </g>
        </>
      )}
      {kind === '03' && (
        <>
          {/* the axis arrows — the map's two labelled directions */}
          <g className="pm-fx-grp">
            <line className="pm-fx" pathLength={1} x1="196" y1="34" x2="196" y2="14" style={{ ['--pd' as string]: '120ms' }} />
            <path className="pm-fx" pathLength={1} d="M191 20 L196 13 L201 20" style={{ ['--pd' as string]: '260ms' }} />
            <line className="pm-fx" pathLength={1} x1="196" y1="34" x2="214" y2="34" style={{ ['--pd' as string]: '380ms' }} />
            <path className="pm-fx" pathLength={1} d="M208 29 L215 34 L208 39" style={{ ['--pd' as string]: '480ms' }} />
          </g>
          {/* the gap's question mark — the concept the score cannot name */}
          <text className="pm-fx-q" x="110" y="118" textAnchor="middle">؟</text>
          {/* the measure frame tag — counted cells vs the unnamed one */}
          <g className="pm-fx-tag" style={{ ['--pd' as string]: '760ms' }}>
            <rect className="pm-fx" pathLength={1} x="128" y="184" width="56" height="16" />
            <text className="pm-fx-t" x="156" y="195" textAnchor="middle">MAP 8/9</text>
          </g>
        </>
      )}
      {kind === '04' && (
        <>
          {/* the drawer's index rail — three tabs, one broken away */}
          <line className="pm-fx" pathLength={1} x1="14" y1="30" x2="206" y2="30" style={{ ['--pd' as string]: '80ms' }} />
          <rect className="pm-fx" pathLength={1} x="150" y="22" width="26" height="12" style={{ ['--pd' as string]: '260ms' }} />
          <rect className="pm-fx" pathLength={1} x="118" y="22" width="26" height="12" style={{ ['--pd' as string]: '400ms' }} />
          <path className="pm-fx pm-fx-dash" pathLength={1} d="M108 21 L86 24 L88 34 L110 33 Z" style={{ ['--pd' as string]: '560ms' }} />
          {/* the trail the paper never completes */}
          <line className="pm-fx pm-fx-dash" pathLength={1} x1="46" y1="60" x2="70" y2="60" style={{ ['--pd' as string]: '640ms' }} />
          {/* the lost-index tag */}
          <g className="pm-fx-tag" style={{ ['--pd' as string]: '780ms' }}>
            <rect className="pm-fx" pathLength={1} x="14" y="184" width="46" height="16" />
            <text className="pm-fx-t" x="37" y="195" textAnchor="middle">IDX —</text>
          </g>
        </>
      )}
    </svg>
  );
}

/* ── The four pains — the honest inverse of the live ledger: each
 * pain names a real gap in Libyan higher-ed today and is answered by
 * a capability that WORKS in the system. The `keyword` is the
 * reference's own meta-row seat (mono Latin, ~6–8ch); `num` is the
 * ghost 2-digit index riding the row's far edge. The body block
 * opens with the honest answer sentence (the r322 pin, accented). */
const PAINS = [
  {
    num: '01',
    keyword: 'LECTURE',
    title: 'محاضرة بلا أثر مقيس',
    answer: 'الجواب: المحاضرات التفاعلية بنقاط الفحص.',
    text: 'تُلقى المحاضرة ثم ينتهي أثرها: لا فحص يثبّت الفهم، ولا حضور يُحتسب.',
  },
  {
    num: '02',
    keyword: 'GRADING',
    title: 'تصحيح يأتي متأخرًا',
    answer: 'الجواب: التصحيح التلقائي للموضوعي.',
    text: 'تمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت.',
  },
  {
    num: '03',
    keyword: 'MASTERY',
    title: 'غياب خريطة الإتقان',
    answer: 'الجواب: مصفوفة الإتقان لكل مفهوم.',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة ولا خطوته التالية.',
  },
  {
    num: '04',
    keyword: 'ARCHIVE',
    title: 'بحوث تُسلَّم وتُنسى',
    answer: 'الجواب: مكتبة البحوث بالفهرسة العربية.',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث عربي يبقى.',
  },
] as const;

interface LiveProps {
  /* the snap-carousel scroll region (≤767) — the composer's belt reads it
     (R342: the region is a role="list" div — the reference's own list is a
     plain div; the ordered-list semantics ride the ARIA role; the composer
     keeps its HTMLOListElement ref, assigned here at the JSX boundary) */
  colsRef: RefObject<HTMLElement>;
  /* the dot rail — the composer's belt mirrors the snap position onto it */
  dotsRef: RefObject<HTMLDivElement>;
}

export function Live({ colsRef, dotsRef }: LiveProps) {
  return (
    <section id="live" className="pm-section" aria-labelledby="pm-title" data-spec="problem.wrap">
      {/* R342 — the reference's outer positioning wrapper (the spec census:
          div[1] wraps the section at the same measured box). Our section
          IS the band box; this transparent block is its honest structural
          counterpart (div↔div), not a layout change. */}
      <div className="pm-outer" data-spec="problem.outer">
        {/* the band's top rule (a real 1px element) */}
        <div className="pm-toprule" aria-hidden="true" data-spec="problem.toprule" />

      <div className="pm-frame" data-spec="problem.frame">
        <div className="pm-inner" data-spec="problem.inner">
        {/* ── the head: kicker + H2 at the start, sub note at the far
            edge (margined off the head row's top). */}
        <div className="pm-head" data-spec="problem.head">
          <div className="pm-titleblock" data-spec="problem.titleblock">
            <div className="pm-kicker" data-spec="problem.kicker">
              <div className="pm-kicker-text fo-mono" dir="ltr" data-spec="problem.kickertext">
                [03] التحديات
              </div>
            </div>
            <div className="pm-titlebox" data-spec="problem.titlebox">
              <h2 className="pm-title" id="pm-title" data-spec="problem.h2">
                أربعة أوجاع من التعليم العالي الليبي
              </h2>
            </div>
          </div>
          <div className="pm-subwrap" data-spec="problem.subwrap">
            <div className="pm-sub" data-spec="problem.sub">
              ليست أحكامًا على أحد — بل هي المشكلات التي بُنيت أُلارا لحلّها؛ تحت كل وجع بند
              يعمل اليوم، والسجل الكامل في{' '}
              <Link to="/capabilities" className="fo-text-link">صفحة القدرات</Link>.
            </div>
          </div>
        </div>

        {/* ── the columns band: one hairline under the head, then the
            four ruled columns (+ the ≤767 dot rail at its foot). */}
        <div className="pm-band" data-spec="problem.band">
          <div className="pm-bandrule" aria-hidden="true" data-spec="problem.bandrule" />
          <div className="pm-bandinner" data-spec="problem.bandinner">
          <div
            className="pm-cols"
            ref={colsRef as RefObject<HTMLDivElement>}
            role="list"
            aria-label="الأوجاع الأربعة"
            data-spec="problem.cols"
          >
            {PAINS.map((p, i) => (
              <div
                key={p.num}
                className="pm-col"
                role="listitem"
                data-ula-reveal="item"
                data-spec={`problem.col.${i + 1}`}
              >
                {/* the column's own start-edge rule — the reference renders
                    NO rule on the first column (the band's edge serves it)
                    at every breakpoint, so the element is not mounted there
                    (an invisible extra would only feed the heuristic pool). */}
                {i > 0 && (
                  <div className="pm-colrule" aria-hidden="true" data-spec={`problem.colrule.${i + 1}`} />
                )}

                {/* the meta row — a padded box holding the keyword roll,
                    the ghost index roll, and the orange cue dot. */}
                <div className="pm-meta" data-spec={`problem.meta.${i + 1}`}>
                  <div className="pm-keyword-roll" data-spec={`problem.keyroll.${i + 1}`}>
                    <div className="pm-keyword fo-mono" dir="ltr" data-spec={`problem.keytext.${i + 1}`}>
                      {p.keyword}
                    </div>
                  </div>
                  <div className="pm-index-roll" data-spec={`problem.indexroll.${i + 1}`}>
                    <div className="pm-index fo-mono" dir="ltr" data-spec={`problem.indextext.${i + 1}`}>
                      {p.num}
                    </div>
                  </div>
                  <div className="pm-metarule" aria-hidden="true" data-spec={`problem.metarule.${i + 1}`} />
                  <div className="pm-cue" aria-hidden="true" data-spec={`problem.cue.${i + 1}`} />
                </div>

                {/* the body zone: the art cell over the text cell. */}
                <div className="pm-bodyzone" data-spec={`problem.bodyzone.${i + 1}`}>
                  <div className="pm-artzone" data-spec={`problem.artzone.${i + 1}`}>
                    <div className="pm-artcolor" data-spec={`problem.artcolor.${i + 1}`}>
                      <div className="pm-artin" data-spec={`problem.artin.${i + 1}`}>
                        {/* R342 — the svg box itself is the spec's bound art
                            window (the drawing inside is Ulara's own motif);
                            the container hooks stay on the boxes around it. */}
                        <PainArt kind={p.num} data-spec={`problem.artsvg.${i + 1}`} />
                      </div>
                    </div>
                    {/* R345-ED — the column's own measurement furniture (the
                        distinct problem story), decorative chrome above the
                        motif drawing */}
                    <PainFurniture kind={p.num} />
                  </div>
                  <div className="pm-textzone" data-spec={`problem.textzone.${i + 1}`}>
                    <div className="pm-tgrid" data-spec={`problem.tgrid.${i + 1}`}>
                      <div className="pm-item-titlebox" data-spec={`problem.titleboxcol.${i + 1}`}>
                        <div className="pm-item-title" data-spec={`problem.itemtitle.${i + 1}`}>
                          {p.title}
                        </div>
                      </div>
                      <div className="pm-anszone" data-spec={`problem.anszone.${i + 1}`}>
                        <div className="pm-answrap" data-spec={`problem.answrap.${i + 1}`}>
                          <div className="pm-item-sub" data-spec={`problem.bodytext.${i + 1}`}>
                            <strong className="pm-ans">{p.answer}</strong> {p.text}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pm-zonerule" aria-hidden="true" data-spec={`problem.zonerule.${i + 1}`} />
                    {/* the ruled-ledger closing rule — the reference closes every
                        ≤991 cell with its own 1px rule (the open ≥992 grid has
                        none); mounted only where the census draws it. */}
                    <div className="pm-closerule" aria-hidden="true" data-spec={`problem.closerule.${i + 1}`} />
                  </div>
                </div>
                </div>
            ))}
          </div>
          </div>

          {/* ≤767 only — the reference's swiper dot rail at the band's
              foot (2.02×0.2rem bars, 1st active): one button per
              column, the active bar follows the snap position, a tap
              centers its column. */}
          <div className="pm-dots" ref={dotsRef} aria-hidden="true" data-spec="problem.rail">
            {PAINS.map((p, j) => (
              <button key={p.num} type="button" className="pm-dot-btn" data-pm-num={p.num} tabIndex={-1}>
                <span className="pm-dot-bar" data-spec={`problem.dotbar.${j + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* the band's own closing rule (≤991 — the reference's mobile ledger
            ends on a full-width 1px rule after the band (the inner's third
            child); the ≥992 open grid has none) */}
        <div className="pm-bottomrule" aria-hidden="true" data-spec="problem.bottomrule" />
        </div>
      </div>
      </div>
    </section>
  );
}
