/**
 * Footer.tsx — the landing colophon, REBUILT on CSS Grid/Flex (ULARA Ω
 * task 1-C). The R338→R343 spec-mirror is retired by program decision:
 * the structure is a real responsive grid, the link groups and the
 * policy row are flex-wrap, and every seat sizes from its content. The
 * CONTENT is the R338 folio's own: the brand identity + independence
 * paragraph, the subscribe door (a real route to /contact), the
 * licensed skyline strip, and the ten-link policy row with CSS ::after
 * glyph separators (the §A6 law — decorative glyphs are CSS content,
 * never DOM text). The R336 B2 pass retired the col3 construction-mark
 * drawing: the footer's ONE identity is the canonical stacked <Logo>.
 *
 * r363 P2 — THE OWNER'S FOOTER RULING (the measured ground truth after
 * r362's «matching» verdict the owner rejected):
 *   · ONE horizontal uppercase/mono link row — the three-group column
 *     stack (PLATFORM / JOURNEY / ACCOUNT + CONTACT / ADDRESS) is
 *     RETIRED. One row carries the whole public index; it wraps IN
 *     PLACE at narrow widths — never a column stack.
 *   · the MEGA statement and the cookie/notice strip SHARE ONE grid
 *     row — the giant outline wordmark band and the ConsentBanner sit
 *     as the two cells of .fo-final-row (RTL-mirrored: the statement
 *     owns the row, the notice cell rides the inline-end). Answering
 *     the gate collapses only the notice cell; the row's height is
 *     driven by the wordmark, so nothing below ever shifts.
 *   · the cookie ACCEPT is the SIGNAL colour (royal fill + the
 *     owner-verified --accent-fg label); REJECT is bare text
 *     (consent-edge.css owns both).
 *   · hover underline draw + scroll reveal on the link row
 *     (the .fo-link::after sweep; the reveal rung keeps the retired
 *     .fo-c2-top class seat).
 * The notice band itself is still ConsentBanner's own machine (the
 * storage contract, the window API, the bottom-stack registration) —
 * only its SEAT moved: from the sheet's tail (after the footer) into
 * the footer's final row, per the ruling.
 *
 * Kept structural hooks: the <footer> landmark + .fo-in inner
 * container (pinned by tests/r305/mobile-overflow.e2e.ts) and the
 * reveal blocks the landing's reveal engine targets by class
 * (.fo-c1-top / .fo-c2-top rise; .fo-c1-sub, the strip band, the ©
 * bar rise with instant opacity). The sheet is
 * styles/landing/footer.css — the geometry lives there, in tokens.
 */
import { Link } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RevealCssClass } from '../../../hooks/useReveal';
import { Logo } from '../../../brand';
import { BRAND_LABEL, LOGIN } from '../copy';

import { DuotoneScene } from '../plates/DuotoneScene';
import cantileverScene from '../../../assets/art-v2/cantilever.svg';
import { RegCross } from '../../patterns/RegCross';

/* r363 — THE ONE LINK ROW. The retired col2 index (three mono-headed
 * groups + the contact/address groups) collapses into ONE horizontal
 * row: every public door the landing owns, in reading order, plus the
 * funnel pair as literal <Link> seats (the landing-funnel source
 * contract counts the to= surfaces). `#fragment` doors stay raw
 * anchors (the r341 t05 SPA split law); route doors ride <Link>.
 * Every target is a live door — the r363 dead-link audit walked them
 * (the #chapters anchor is MountOnVisible's anchorId seat). */
const LINK_ROW: [string, string][] = [
  ['/capabilities', 'ما يعمل اليوم'],
  ['#product', 'المنصّة'],
  ['#chapters', 'الفصول'],
  ['#roles', 'الأدوار'],
  ['#statement', 'البيان'],
  ['#live', 'التحديات'],
  ['/campus', 'الحياة الجامعية'],
  ['#vision', 'الرؤية'],
  ['/colleges', 'الكليات'],
  ['/app', 'التطبيق'],
  ['/help', 'المساعدة'],
  ['/contact', 'التواصل'],
];

export function Footer({ year }: { year: number }) {
  const [email, setEmail] = useState('');

  /* r351 P4 — the pointer-lens tracker (fine pointers only): the lens
   * vars ride the banner imperatively (no React state, no re-render);
   * the fill twin's visibility is CSS-gated (hover + no-RM). */
  const lensRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = lensRef.current;
    if (!el || typeof window.matchMedia !== 'function') return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--lens-x', `${Math.round(e.clientX - r.left)}px`);
      el.style.setProperty('--lens-y', `${Math.round(e.clientY - r.top)}px`);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, []);

  /* r363 P3 — THE DATUM TAGS (reference parity item 5, shot-footer's
   * «[831, 0]» voice): the four corner stations of the banner band,
   * small mono readouts seated beside each RegCross corner plus. The x
   * stations ride the design canvas law (0 / 1440 — the stage viewBox
   * width, the type law's own rung); the y stations are SURVEYED from
   * the live band box (0 at the top rule, the real band height at the
   * bottom rule) so the numbers stay true at every viewport and every
   * type-law tweak. Imperative textContent writes (pre-paint, then on
   * band resizes) — no re-render. Static furniture: they carry no
   * motion, so they render under reduced motion and on touch. */
  const datumRefs = useRef<Array<HTMLSpanElement | null>>([]);
  useLayoutEffect(() => {
    const band = lensRef.current;
    const els = datumRefs.current;
    if (!band || els.length !== 4 || els.some((el) => !el)) return undefined;
    const write = () => {
      const h = Math.round(band.getBoundingClientRect().height);
      const pair = (x: string) => `[${x}, ${h}]`;
      const tl = els[0];
      const tr = els[1];
      const bl = els[2];
      const br = els[3];
      if (tl) tl.textContent = '[0, 0]';
      if (tr) tr.textContent = '[1440, 0]';
      if (bl) bl.textContent = pair('0');
      if (br) br.textContent = pair('1440');
    };
    write();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(write);
      ro.observe(band);
    } else {
      /* exotic embedders: a plain resize listener keeps the survey
       * honest without the observer */
      window.addEventListener('resize', write);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', write);
    };
  }, []);

  return (
    <footer className="fo-footer" data-spec="footer.root" aria-label={BRAND_LABEL}>
      <div className="fo-in" data-spec="footer.in">
        {/* r368 — the use-case accordion: an art plate beside a ruled
            list of audiences (native details, keyboard-operable). */}
        <section className="fo-uses" aria-label="لمن صُمّمت أُلارا" data-spec="footer.uses">
          <div className="fo-uses-art" aria-hidden="true">
            <img src={cantileverScene} alt="" loading="lazy" />
          </div>
          <div className="fo-uses-list">
            {[
              ['الطلاب', 'محاضرات واختبارات وتقدّم واضح في مكان واحد.'],
              ['أعضاء هيئة التدريس', 'ارفع المحتوى وأدر المقررات دون تعقيد.'],
              ['المعيدون', 'تابع الواجبات والدرجات بخطوات أقل.'],
              ['منسقو المقررات', 'وحّد الجداول والمواد بين الشعب.'],
              ['إدارة الكلية', 'نظرة شاملة على المقررات والأداء.'],
              ['الجامعات الصغيرة', 'ابدأ بمساحة عمل واحدة ثم وسّع.'],
            ].map(([t, d], i) => (
              <details key={t} className="fo-use" open={i === 0}>
                <summary className="fo-use-sum"><span>{t}</span><span className="fo-use-plus" aria-hidden="true">+</span></summary>
                <p className="fo-use-desc">{d}</p>
              </details>
            ))}
          </div>
        </section>

        {/* r368 — the closing call: a centred ruled cell with corner
            coordinates, headline, one line and one button (the
            reference's closing band grammar; copy is Ulara's own). */}
        <div className="fo-close" data-spec="footer.cta">
          <span className="fo-close-coord fo-close-coord-a fo-mono" dir="ltr" aria-hidden="true">[0, 000]</span>
          <span className="fo-close-coord fo-close-coord-b fo-mono" dir="ltr" aria-hidden="true">[1440, 000]</span>
          <h2 className="fo-close-title">شاهد أُلارا تعمل على جامعتك</h2>
          <p className="fo-close-sub">تصفح الكليات التجريبية وجرّب المحاضرات والاختبارات في مساحة عمل كاملة.</p>
          <Link to="/colleges" className="fo-close-btn fo-mono">تصفح الكليات</Link>
        </div>

        {/* R345-ED — the drawing-sheet title block: the colophon opens
            with its own plate row (identity · sheet · scale · year),
            the footer reading as the SET'S CLOSING SHEET. */}
        <RevealCssClass as="div" className="fo-plate" aria-hidden="true">
          <span className="fo-plate-cell fo-mono" dir="ltr">PLATE · 09</span>
          <span className="fo-plate-cell">لوحة الهبوط — يعمل اليوم</span>
          <span className="fo-plate-cell fo-mono" dir="ltr">ULARA · {year}</span>
        </RevealCssClass>

        {/* ── r363 — THE ONE LINK ROW (the owner's ruling): one
            horizontal uppercase/mono index row — the mono micro-label
            header + the wrapped link ribbon. It replaces the retired
            col2 three-group column stack; at narrow widths the row
            wraps in place, never into columns. The reveal rung keeps
            the .fo-c2-top class seat the engine targets. ── */}
        <RevealCssClass as="nav" className="fo-linkrow fo-c2-top" aria-label="فهرس المنصّة">
          <div className="fo-mono-label" dir="ltr">[ INDEX · الفهرس ]</div>
          <div className="fo-linkrow-row">
            {LINK_ROW.map(([to, label], i) =>
              /* r341 (t05 · SPA links): route doors ride <Link>,
                 #fragment doors stay raw anchors. The row rides pure
                 gap cadence — the reference's own link row carries no
                 per-item separators (its hairlines divide columns, not
                 doors), and a wrapped row with border separators wore
                 stray marks at every line start (measured probe). */
              to.startsWith('#') ? (
                <a
                  key={to}
                  href={to}
                  className={i ? 'fo-link' : 'fo-link fo-link-accent'}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={to}
                  to={to}
                  className={i ? 'fo-link' : 'fo-link fo-link-accent'}
                >
                  {label}
                </Link>
              ),
            )}
            {/* the funnel pair — the account doors ride the row's end
                (the landing-funnel source contract counts these to=
                surfaces; cta.css owns the underline grammar, the class
                adds no box of its own) */}
            <Link to="/auth/register" className="fo-link fo-link-account">إنشاء حساب</Link>
            <Link to="/auth" className="fo-link fo-link-account">{LOGIN}</Link>
          </div>
        </RevealCssClass>

        {/* ── the identity band — the brand block + the subscribe door
            (the retired col2 index now lives in the ONE row above, so
            the band is a single capped column: the reference's own
            col1 grammar — identity + subscribe). ── */}
        <div className="fo-grid">
          <div className="fo-col fo-col1">
            <div className="fo-c1-top">
              <div className="fo-brand-block">
                {/* the ONE logo — the brand system's stacked identity
                    (mark / «أُلارا» / ULARA), themed via tokens */}
                <Logo variant="stacked" size={40} className="fo-brand-logo" />
                <div className="fo-brand-sub">نظام تشغيل الجامعة — عربية أولًا</div>
                {/* the independence paragraph — VERBATIM the About page's
                    own sentence (one text node; «اصطناعية بالكامل» stays
                    contiguous on one source line — the brand-integrity
                    gate) */}
                <p className="fo-footer-about">منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «مساحة عمل أُلارا التجريبية» — مساحة اصطناعية بالكامل لأغراض العرض، لا تحاكي أي جامعة.</p>
              </div>
            </div>
            <div className="fo-c1-sub">
              <div className="fo-mono-label">[ EARLY ACCESS ]</div>
              {/* the subscribe zone — its mono label + the form wrapper.
                  A REAL door: the early-access channel is the page's own
                  contact form; the footer's input carries the address
                  over to it (no invented mailing list, no fake opt-in) */}
              <div className="fo-form-zone">
                <div className="fo-mono-label">التسجيل المبكر</div>
                <form
                  className="fo-form"
                  action="/contact"
                  method="get"
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.assign(
                      `/contact${email ? `?email=${encodeURIComponent(email)}` : ''}`,
                    );
                  }}
                >
                  <div className="fo-form-copy">
                    {/* R349 (D2): one line — the address rides to the
                        contact page; the no-mailing-list disclosure
                        stays (the honest claim, half the words). */}
                    <div className="fo-form-line">
                      أدخل بريدك الجامعي — نوصله بصفحة التواصل، لا قائمة بريدية عامة
                    </div>
                  </div>
                  <div className="fo-form-row">
                    <input
                      className="fo-input"
                      type="email"
                      name="email"
                      dir="ltr"
                      placeholder="you@university.edu"
                      aria-label="البريد الجامعي للتسجيل المبكر"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                      className="fo-go"
                      type="submit"
                      aria-label="الانتقال إلى التسجيل المبكر"
                    >
                      <svg viewBox="0 0 17 17" aria-hidden="true">
                        <path d="M2 8.5h12M9.5 4l4.5 4.5L9.5 13" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* ── the ink strip band — r364 art v2: the duotone campus
            podium scene with the flat-shape kit (the solid royal
            circle cropped by the strip's edge + the slab + the pale
            disc — the reference's footer collage grammar, our own
            art). The r359 thin-line skyline retires from the seat. ── */}
        <div className="fo-fstrip">
          <div className="fo-strip-media">
            <DuotoneScene
              src={cantileverScene}
              flat
              alt="ساحة الحرم الجامعي بظلال الطالب الوحيد بين كتل الخرسانة — شريط الحبر الختامي"
              variant="strip"
              caption="X:0000 · Y:12700"
            />
          </div>
        </div>

        {/* ── The Grand Outline Wordmark & Back to Top (the landing signature closing) ── */}
        <div className="fo-top-anchor-row">
          {/* R355 (a11y): the standalone aria-label dropped — the
              button's content names it exactly as rendered. */}
          <button
            type="button"
            className="fo-back-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <svg viewBox="0 0 16 16" className="fo-top-arrow" aria-hidden="true">
              <path d="M8 13V3M3 8l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="fo-mono" dir="ltr">[ العودة للأعلى // BACK TO TOP ]</span>
          </button>
        </div>

        {/* ── r363 — THE FINAL ROW (the owner's ruling): the MEGA
            statement and the cookie/notice strip SHARE ONE grid row.
            The giant outline wordmark owns the row; the ConsentBanner
            rides the inline-end cell (RTL-mirrored from the
            reference's bottom-right pin). Answering the gate unmounts
            the notice cell — the auto track collapses to zero and the
            wordmark takes the row; the row's height was always the
            wordmark's, so nothing below ever shifts. ── */}
        <div className="fo-final-row">
          <div className="fo-giant-banner" aria-hidden="true" ref={lensRef}>
            {/* P3/r363 (B1): the wordmark's corner pluses draw from the
                ONE RegCross primitive (tone=muted). The old DOM-text
                '+' spans are gone — the §A6 law (marks never carry DOM
                text) holds here now too. */}
            <RegCross className="fo-giant-plus fo-giant-plus-tl" tone="muted" />
            <RegCross className="fo-giant-plus fo-giant-plus-tr" tone="muted" />
            <div className="fo-giant-text">ULARA // أُلارا</div>
            <div className="fo-giant-text fo-giant-fill">ULARA // أُلارا</div>
            <RegCross className="fo-giant-plus fo-giant-plus-bl" tone="muted" />
            <RegCross className="fo-giant-plus fo-giant-plus-br" tone="muted" />
            {/* r363 P3 — THE DATUM TAGS beside each corner plus (the
                shot-footer survey voice). dir="ltr" keeps the digits/
                brackets Latin-ordered inside the RTL sheet; the seats
                are the logical partners of the pluses above (the origin
                rides the reading start). The effect above surveys the
                bottom pair's y from the live band box. */}
            <span
              className="fo-datum fo-datum-tl"
              dir="ltr"
              ref={(el) => { datumRefs.current[0] = el; }}
            >
              [0, 0]
            </span>
            <span
              className="fo-datum fo-datum-tr"
              dir="ltr"
              ref={(el) => { datumRefs.current[1] = el; }}
            >
              [1440, 0]
            </span>
            <span
              className="fo-datum fo-datum-bl"
              dir="ltr"
              ref={(el) => { datumRefs.current[2] = el; }}
            >
              [0, 0]
            </span>
            <span
              className="fo-datum fo-datum-br"
              dir="ltr"
              ref={(el) => { datumRefs.current[3] = el; }}
            >
              [1440, 0]
            </span>
          </div>
        </div>

        {/* ── the © bar + the policy row — one ruled line (R321 §A2):
            the ten public-door links ride the © bar's own row as a
            flex-wrap nav, hairline-separated via CSS ::after glyphs
            (the §A6 law — the separator spans ship EMPTY, the glyph is
            stylesheet content, out of innerText entirely) ── */}
        <div className="fo-footer-bottom">
          <div className="fo-legal-l">
            <p className="fo-legal-p">
              <span className="fo-mono">© {year} أُلارا</span>
              {' '}— منصّة مستقلّة · عربية أولًا —{' '}
              {/* r363 — the display-data note is verbatim in col1's
                  independence paragraph above (the honest dedupe); the
                  © line carries the identity + the one door */}
              <Link className="fo-legal-a" to="/about">
                عن المنصّة
              </Link>
            </p>
          </div>
          <nav className="fo-legal-row" aria-label="سياسات المنصّة وصفحاتها العامة">
            <Link to="/legal/privacy" className="fo-legal-link">سياسة الخصوصية</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/legal/terms" className="fo-legal-link">شروط الاستخدام</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/legal/cookies" className="fo-legal-link">التخزين المحلي</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/legal/accessibility" className="fo-legal-link">إمكانية الوصول</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/legal/security" className="fo-legal-link">الأمن</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/legal/data" className="fo-legal-link">البيانات</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/about" className="fo-legal-link">عن أُلارا</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/help" className="fo-legal-link">المساعدة</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            <Link to="/contact" className="fo-legal-link">التواصل</Link>
            <span className="fo-legal-sep" aria-hidden="true" />
            {/* the distribution sheet beside the policy row */}
            <Link to="/app" className="fo-legal-link">تطبيق الجوال</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
