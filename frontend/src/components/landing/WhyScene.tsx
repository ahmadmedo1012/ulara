/**
 * WhyScene — R345-ED (feat/home-editorial-scenes) — the why stage,
 * REBUILT as the connected academic-workflow scene.
 *
 * The retired r338 freeze mirrored the reference's tween-residue seats
 * (absolute rem boxes, sub-pixel reveal scaffolds, a portaled caption
 * bar) — this rebuild keeps the measured STAGE grammar and replaces the
 * seat plumbing with an authored, connected workflow:
 *
 *  · ONE spine lane between the stage rail and the capture track — the
 *    faint full-height axis, the scrubbed accent progress (the inked
 *    route so far, scaleY over --wy-p), and a per-row node + connector
 *    pair joining every rail entry to every capture;
 *  · the RAIL — four .wy-stage entries (numeral · verb · title · sub),
 *    the active one accented by data-wy-stage;
 *  · the TRACK — four real student-surface captures (.wy-capture, the
 *    seeded-demo registry) with their drafting chrome, one capability
 *    chip naming what the screen shows, and an in-flow honest caption
 *    (the portaled caption bar is retired with its visibility leak);
 *  · the moving focus: data-wy-stage + the progress rule + the accent
 *    ladder advance the scene's focus with the scroll — CSS-var and
 *    data-attr writes only, zero renders per tick (the useSheetScroll
 *    contract).
 *
 * Motion: CSS only (house law) — the reveal rung drives the entrances,
 * --wy-p drives the route, no keyframes, no pins, no second clock.
 * Reduced motion / no-JS: the complete readable scene (the reveals
 * module never arms, the progress rule defaults to full ink).
 */
import { useSheetScroll } from '../../lib/motion/useSheetScroll';
import { RevealCssClass } from '../../hooks/useReveal';
import { useRef, useState } from 'react';
import { PRODUCT_CAPTURES } from '../../data/product-media';
import lectureShot2x from '../../assets/product/lecture-checkpoint.webp';

interface Stage {
  num: string;
  verb: string;
  title: string;
  sub: string;
  capId: string;
  /* the one capability the capture visibly shows (the honest chip) */
  chip: string;
  alt: string;
}

/* the four stages — the copy stays the honest r342 lines; each row's
 * capture is the REAL student surface for that stage (the manifest's
 * seeded-demo registry, disclosed per frame). */
const STAGES: Stage[] = [
  {
    num: '01',
    verb: 'شاهد',
    title: 'شاهد المحاضرة',
    sub: 'محاضرة مسجَّلة بنقاط فحص تُصحَّح فورًا أثناء المشاهدة',
    capId: 'student-lecture-player',
    chip: 'نقطة فحص تفاعلية',
    alt: 'مشغّل المحاضرة التفاعلية في أُلارا وبطاقة نقطة الفحص — بيانات العرض التجريبية',
  },
  {
    num: '02',
    verb: 'تحقّق',
    title: 'تحقّق من لوحتك',
    sub: 'يومك ومهامّك وتقدّمك في نظرة واحدة صادقة',
    capId: 'student-dashboard',
    chip: 'مهامّ اليوم',
    alt: 'لوحة الطالب في أُلارا: جدول اليوم والمهام والتقدّم — بيانات العرض التجريبية',
  },
  {
    num: '03',
    verb: 'اختبر',
    title: 'اختبر فهمك',
    sub: 'اختبارات بأربعة أنواع وتصحيح تلقائي وبحوث مفهرسة',
    capId: 'student-library',
    chip: 'تصحيح تلقائي',
    alt: 'المكتبة الإلكترونية في أُلارا: بحث عربي وفهرس وتصفّح الكتب والبحوث — بيانات العرض التجريبية',
  },
  {
    num: '04',
    verb: 'أتقن',
    title: 'أتقن المهارات',
    sub: 'مصفوفة إتقان تُظهر ما أتممت وما بقي عليك',
    capId: 'student-matrix',
    chip: 'درجة الإتقان',
    alt: 'مصفوفة الإتقان في أُلارا: درجة لكل مفهوم مربوطة بالدرس المناسب — بيانات العرض التجريبية',
  },
];

const cap = (id: string) => PRODUCT_CAPTURES.find((c) => c.id === id);

/* the /media/product ladder — 1× intrinsic seat, srcSet for the -1280 twin */
const capSrcSet = (id: string) => {
  const c = cap(id);
  if (!c) return undefined;
  return c.widths.map((w) => `/media/product/${c.id}-${w}.webp ${w}w`).join(', ');
};

const capSrc = (id: string) => {
  const c = cap(id);
  return c ? `/media/product/${c.id}-${c.widths[0]}.webp` : '';
};

/** the scene furniture: the ± corner marks + the mono stage counter
 * (follows data-wy-stage through CSS content? no — content is authored
 * per seat; the counter reads the same stages array, static ladder). */
function SceneFurniture() {
  return (
    <div className="wy-furniture" aria-hidden="true">
      <span className="wy-mark wy-mark-a" />
      <span className="wy-mark wy-mark-b" />
      <div className="wy-counter" aria-hidden="true">
        {STAGES.map((s, i) => (
          <span key={s.num} className="wy-counter-cell fo-mono" dir="ltr">
            {`0${i + 1}`}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WhyScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  /* the ONE scroll driver: traversal → --wy-p (the route's inked span)
   * + data-wy-stage (the focus ladder) — imperative, zero renders per
   * tick (the useSheetScroll contract; the idempotent write law). */
  let lastP = '';
  useSheetScroll(sceneRef, ({ traversal }) => {
    const el = sceneRef.current;
    if (!el) return;
    const stage = Math.min(3, Math.floor(traversal * 4));
    if (el.dataset.wyStage !== String(stage)) el.dataset.wyStage = String(stage);
    const p = traversal.toFixed(4);
    if (p !== lastP) {
      el.style.setProperty('--wy-p', p);
      lastP = p;
    }
  });

  /* L1-a (r341) — the ≤767 deck belt: .wy-track IS the snap scroller;
   * the arrows/dots chrome reads + drives its scroll seat. ≥768 the
   * belt is not scrollable and the chrome is display:none — inert. */
  const trackRef = useRef<HTMLDivElement>(null);
  const [deckAt, setDeckAt] = useState(0);
  const deckGo = (i: number) => {
    const t = trackRef.current;
    if (!t) return;
    const rows = t.querySelectorAll<HTMLElement>('.wy-row');
    const row = rows[Math.max(0, Math.min(rows.length - 1, i))];
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };
  const onDeckScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    const port = t.getBoundingClientRect();
    const mid = port.left + port.width / 2;
    let best = 0;
    let bestD = Infinity;
    t.querySelectorAll<HTMLElement>('.wy-row').forEach((r, i) => {
      const rc = r.getBoundingClientRect();
      const d = Math.abs(rc.left + rc.width / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setDeckAt(best);
  };

  /* the row-1 seat rides the Vite asset pipeline (2× lecture capture) */
  const lecture2xSrc = lectureShot2x;

  return (
    <div className="wy-scene" data-spec="why.stage" ref={sceneRef} data-wy-stage="0" data-wy-scene="workflow">
      <SceneFurniture />

      {/* the spine lane: the faint axis + the scrubbed accent progress
          (the route's inked-so-far span — the moving focus layer) */}
      <div className="wy-spine" aria-hidden="true" data-spec="why.axis">
        <span className="wy-spine-axis" />
        <span className="wy-spine-progress" />
        <span className="wy-spine-tip" />
      </div>

      <div className="wy-track" data-spec="why.track" ref={trackRef} onScroll={onDeckScroll}>
        <div className="wy-track-in" data-spec="why.rows">
          {STAGES.map((s, i) => (
            <div
              className="wy-row"
              data-spec={`why.row${i + 1}`}
              key={s.num}
            >
              {/* the rail entry — numeral · verb · title · sub; the
                  active one accents via the scene's data-wy-stage */}
              <RevealCssClass as="div" className="wy-rail-entry" delay={1}>
                <span className="wy-node" aria-hidden="true" data-spec={`why.node${i + 1}`} />
                <div className="wy-stage" data-spec={`why.stage${i + 1}`}>
                  <div className="wy-stage-head">
                    <span className="wy-stage-num fo-mono" dir="ltr">[{s.num}]</span>
                    <span className="wy-stage-verb" data-spec={`why.verb${i + 1}`}>{s.verb}</span>
                  </div>
                  <div className="wy-stage-title" data-spec={`why.title${i + 1}`}>{s.title}</div>
                  <div className="wy-stage-sub" data-spec={`why.sub${i + 1}`}>{s.sub}</div>
                </div>
                <span className="wy-link" aria-hidden="true" />
              </RevealCssClass>

              {/* the capture side — the real surface with its drafting
                  chrome, the honest capability chip, and the in-flow
                  caption (the portaled bar is retired) */}
              <RevealCssClass as="figure" className="wy-capwrap" delay={2}>
                <span className="wy-link wy-link-end" aria-hidden="true" />
                <div className="wy-capture" data-spec={`why.card${i + 1}`}>
                  {i === 0 ? (
                    <img
                      className="wy-img"
                      src={lecture2xSrc}
                      alt={s.alt}
                      loading="lazy"
                      decoding="async"
                      width={1440}
                      height={870}
                      data-spec={`why.img${i + 1}`}
                    />
                  ) : (
                    <img
                      className="wy-img"
                      src={capSrc(s.capId)}
                      srcSet={capSrcSet(s.capId)}
                      sizes="(min-width: 992px) 55.68rem, 100vw"
                      alt={s.alt}
                      loading="lazy"
                      decoding="async"
                      width={720}
                      height={435}
                      data-spec={`why.img${i + 1}`}
                    />
                  )}
                  <span className="wy-frame-rule" aria-hidden="true" />
                  <span className="wy-frame-tag fo-mono" dir="ltr">{`[${s.num}]`}</span>
                  <span className="wy-frame-demo">بيانات العرض التجريبية</span>
                  <span className="wy-chip">{s.chip}</span>
                </div>
                <figcaption className="wy-cap" data-spec={`why.cap${i + 1}`}>
                  <span className="wy-cap-dot" aria-hidden="true" />
                  <span className="wy-cap-t">{s.title}</span>
                  <span className="wy-cap-s">{s.sub}</span>
                </figcaption>
              </RevealCssClass>
            </div>
          ))}
        </div>
      </div>

      {/* L1-a (r341) — the ≤767 deck carousel chrome: snap-belt arrows
       * + dots seated in the stage's bottom band (why.css hides it
       * ≥768; no data-spec — an off-book chrome seat, never measured). */}
      <div className="wy-deck-chrome">
        <button type="button" className="wy-deck-btn" onClick={() => deckGo(deckAt - 1)} aria-label="المرحلة السابقة" disabled={deckAt === 0}>
          <svg className="wy-deck-svg" viewBox="0 0 12 12" aria-hidden="true">
            <path className="wy-deck-path" d="M4.5 1.5 L9 6 L4.5 10.5" />
          </svg>
        </button>
        <div className="wy-deck-dots" role="group" aria-label="مراحل الرحلة">
          {STAGES.map((s, i) => (
            <button
              type="button"
              key={s.num}
              className={`wy-deck-dot${i === deckAt ? ' is-on' : ''}`}
              onClick={() => deckGo(i)}
              aria-label={s.title}
              aria-current={i === deckAt}
            />
          ))}
        </div>
        <button type="button" className="wy-deck-btn" onClick={() => deckGo(deckAt + 1)} aria-label="المرحلة التالية" disabled={deckAt === STAGES.length - 1}>
          <svg className="wy-deck-svg" viewBox="0 0 12 12" aria-hidden="true">
            <path className="wy-deck-path" d="M7.5 1.5 L3 6 L7.5 10.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
