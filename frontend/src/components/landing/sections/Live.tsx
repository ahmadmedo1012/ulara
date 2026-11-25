/* Four challenges and their live answers. The ruled text columns become
 * a snap carousel on narrow screens; its controls mount with the section. */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
    text: 'تُلقى المحاضرة ثم ينتهي أثرها: لا فحص ولا حضور.',
  },
  {
    num: '02',
    keyword: 'GRADING',
    title: 'تصحيح يأتي متأخرًا',
    answer: 'الجواب: التصحيح التلقائي للموضوعي.',
    text: 'تمرّ أسابيع قبل أن يعرف الطالب خطأه.',
  },
  {
    num: '03',
    keyword: 'MASTERY',
    title: 'غياب خريطة الإتقان',
    answer: 'الجواب: مصفوفة الإتقان لكل مفهوم.',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة.',
  },
  {
    num: '04',
    keyword: 'ARCHIVE',
    title: 'بحوث تُسلَّم وتُنسى',
    answer: 'الجواب: مكتبة البحوث بالفهرسة العربية.',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث يبقى.',
  },
] as const;

export function Live() {
  /* R322 (2-d) — the pains' ≤767 snap carousel + the reference's dot
   * rail. Pure CSS scroll-snap owns the swipe (no swiper dep); this
   * belt only (a) makes the scroll region keyboard-focusable inside
   * the tier, (b) mirrors the snap position onto the dots (the
   * closest-to-center column wins — direction-agnostic, safe in RTL),
   * and (c) lets a dot tap center its column. ≥768 the carousel is a
   * plain grid: the listener detaches, the dots hide, tabIndex
   * releases. Reduced motion: the tap jumps without smoothing (the
   * page's RM canon). */
  const colsRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cols = colsRef.current;
    const dots = dotsRef.current;
    if (!cols || !dots || typeof window.matchMedia !== 'function') return undefined;
    const mm = window.matchMedia('(max-width: 767px)');
    const btns = Array.from(dots.querySelectorAll<HTMLButtonElement>('.pm-dot-btn'));
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setActive = (i: number) => {
      btns.forEach((b, j) => {
        b.classList.toggle('is-active', j === i);
        b.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
    };
    const nearest = () => {
      const c = cols.getBoundingClientRect();
      const mid = (c.left + c.right) / 2;
      let best = 0;
      let bd = Infinity;
      Array.from(cols.children).forEach((child, j) => {
        const r = child.getBoundingClientRect();
        const d = Math.abs((r.left + r.right) / 2 - mid);
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      return best;
    };
    const onScroll = () => setActive(nearest());
    const onTap = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.('.pm-dot-btn') as HTMLButtonElement | null;
      if (!btn) return;
      const i = btns.indexOf(btn);
      const child = cols.children[i];
      if (child) {
        child.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    };
    const apply = (on: boolean) => {
      cols.tabIndex = on ? 0 : -1;
      btns.forEach((b) => {
        b.tabIndex = on ? 0 : -1;
      });
      dots.toggleAttribute('data-on', on);
      if (on) {
        cols.addEventListener('scroll', onScroll, { passive: true });
        dots.addEventListener('click', onTap);
        onScroll();
      } else {
        cols.removeEventListener('scroll', onScroll);
        dots.removeEventListener('click', onTap);
      }
    };
    const onMm = (e: MediaQueryList | MediaQueryListEvent) => apply(e.matches);
    onMm(mm);
    const listener = (e: MediaQueryListEvent) => onMm(e);
    mm.addEventListener('change', listener);
    return () => {
      mm.removeEventListener('change', listener);
      cols.removeEventListener('scroll', onScroll);
      dots.removeEventListener('click', onTap);
    };
  }, []);

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
            {/* R355 (a11y): re-tagged div → p — it IS the section's lead
                paragraph, and the inline prose link inside it (صفحة القدرات)
                then rides the capture's inline-text-link exemption instead
                of failing the 44px tap floor reserved for standalone
                controls. Class selectors keep working; no belt pins the tag. */}
            <p className="pm-sub" data-spec="problem.sub">
              المشكلات التي بُنيت أُلارا لحلّها — تحت كل وجع بند يعمل اليوم،
              والسجل الكامل في{' '}
              <Link to="/capabilities" className="fo-text-link">صفحة القدرات</Link>.
            </p>
          </div>
        </div>

        {/* ── the columns band: one hairline under the head, then the
            four ruled columns (+ the ≤767 dot rail at its foot). */}
        <div className="pm-band" data-spec="problem.band">
          <div className="pm-bandrule" aria-hidden="true" data-spec="problem.bandrule" />
          <div className="pm-bandinner" data-spec="problem.bandinner">
          <div
            className="pm-cols"
            ref={colsRef}
            role="list"
            aria-label="الأوجاع الأربعة"
            tabIndex={0} /* r360 F3 — the scrollable-region-focusable floor (axe
                            wcag2a/2aa): the snap belt is a real scrollable region;
                            keyboard users get focus + arrow-scroll parity (the CSS
                            focus ring contract: base.css's universal ring) */
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

                {/* The answer follows its challenge in reading order. */}
                <div className="pm-bodyzone" data-spec={`problem.bodyzone.${i + 1}`}>
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
              centers its column.
              R355 (a11y): the rail is NO LONGER aria-hidden — focusable
              buttons inside an aria-hidden wrapper is the axe
              aria-hidden-focus violation (the r355 catalog's `/` P1).
              Each bar now carries its column's accessible name; the
              buttons stay tabIndex -1 (pointer/tap seats — the scroll
              region itself is the keyboard path, the columns are the
              content), so the tab order is unchanged. */}
          <div className="pm-dots" ref={dotsRef} data-spec="problem.rail">
            {PAINS.map((p, j) => (
              <button
                key={p.num}
                type="button"
                className="pm-dot-btn"
                data-pm-num={p.num}
                tabIndex={-1}
                aria-label={`الانتقال إلى: ${p.title}`}
              >
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
