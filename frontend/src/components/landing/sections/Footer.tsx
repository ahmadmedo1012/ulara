/**
 * Footer.tsx — the landing colophon, REBUILT on CSS Grid/Flex (ULARA Ω
 * task 1-C). The R338→R343 spec-mirror (the --fu fluid unit, the
 * fixed-height ink band, the absolutely-positioned chrome, the 88
 * data-spec conformance seats) is retired by program decision: the
 * column structure is a real responsive grid (1 col <768 · 2 cols ≥768),
 * the link groups and the policy row are flex-wrap, the ink band is a
 * normal-flow block whose height rides its art, and every seat sizes
 * from its content. The CONTENT is the
 * R338 folio's own, byte-verbatim: the brand identity + independence
 * paragraph, the three link families, the funnel pair, the subscribe
 * door (a real route to /contact), the licensed skyline strip, and the
 * ten-link policy row with CSS ::after glyph separators (the §A6 law
 * — decorative glyphs are CSS content, never DOM text). The R336 B2
 * pass retired the col3 construction-mark drawing: the footer's ONE
 * identity is the canonical stacked <Logo> (col1), same as every
 * other surface.
 *
 * Kept structural hooks: the <footer> landmark + .fo-in inner
 * container (pinned by tests/r305/mobile-overflow.e2e.ts) and the
 * six reveal blocks the landing's reveal engine targets by class
 * (.fo-c1-top/.fo-c2-top/.fo-c2-bottom rise; .fo-c1-sub, the strip
 * band, the © bar rise with instant opacity). The sheet is
 * styles/landing/footer.css — the geometry lives there, in tokens.
 */
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { RevealCssClass } from '../../../hooks/useReveal';
import { Logo } from '../../../brand';
import { BRAND_LABEL, LOGIN } from '../copy';

/* R349 (D1 · the colophon's dedupe): the four small-link rows that
 * lived under the brand block are RETIRED — every one of their doors
 * (المنصّة/الفصول/الأدوار/الكليات/البيان/التحديات/الرؤية/الحياة
 * الجامعية) already lives in col2's ruled index groups. The audited
 * defect — «repeated navigation strings» — read as two competing
 * sitemaps; ONE index (col2) carries the map now, col1 keeps the
 * identity + the honest independence paragraph + the early-access
 * door (the reference's own col1 grammar: tagline + subscribe). */

/* the col2 index: three groups of four (top row) — mono label + links,
 * the FIRST link of the first group carries the accent ink */
const INDEX_TOP: { label: string; links: [string, string][] }[] = [
  {
    label: 'PLATFORM',
    links: [
      ['/capabilities', 'ما يعمل اليوم'],
      ['#product', 'المنصّة فعليًا'],
      ['#chapters', 'الفصول'],
      ['#roles', 'الأدوار والشرائح'],
    ],
  },
  {
    label: 'JOURNEY',
    links: [
      ['#statement', 'البيان'],
      ['#live', 'التحديات'],
      ['/campus', 'الحياة الجامعية'],
      ['#vision', 'المبدأ والرؤية'],
    ],
  },
  {
    label: 'ACCOUNT',
    /* the funnel pair (register primary + login ghost) renders as
     * literal <Link> seats inside the group below — the landing-funnel
     * source contract counts the to= surfaces, not tuple tables */
    links: [
      ['/app', 'تطبيق الجوال'],
      ['/help', 'المساعدة'],
    ],
  },
];

/* R349 (D3 · the channels retirement): the col2 CHANNELS group is
 * RETIRED — every one of its six doors (التواصل/عن أُلارا/
 * المساعدة/البيانات/الخصوصية/الشروط) already lives verbatim in the
 * pinned ten-door legal row under the © bar. The audit's «repeated
 * navigation strings» finding read the pair as a second sitemap;
 * ONE index (col2's ruled groups) + ONE policy row (the r321 §A2
 * contract) carry every public door now — no information lost, one
 * full link row saved at every width. */

/* R336 B2 (brand unification): the col3 hand-authored "construction
 * mark" (the MARK_PATHS orbit drawing — a SECOND visual identity that
 * lived in no brand source file and bypassed every brand gate) is
 * RETIRED. The footer's ONE identity is the canonical stacked <Logo>
 * in col1; the colophon is a two-column sheet at every breakpoint
 * ≥768 (brand+subscribe | the link index). */

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

  return (
    <footer className="fo-footer" data-spec="footer.root" aria-label={BRAND_LABEL}>
      <div className="fo-in" data-spec="footer.in">
        {/* R345-ED — the drawing-sheet title block: the colophon opens
            with its own plate row (identity · sheet · scale · year),
            the footer reading as the SET'S CLOSING SHEET. Decorative
            chrome riding the house reveal rung. */}
        <RevealCssClass as="div" className="fo-plate" aria-hidden="true">
          <span className="fo-plate-cell fo-mono" dir="ltr">PLATE · 09</span>
          <span className="fo-plate-cell">لوحة الهبوط — يعمل اليوم</span>
          <span className="fo-plate-cell fo-mono" dir="ltr">ULARA · {year}</span>
        </RevealCssClass>
        {/* ── the column band — CSS Grid: 1 col <768 · 2 cols ≥768
            (col1 brand+links+subscribe · col2 the link index + contact
            groups). The retired col3 construction mark is gone (R336 B2):
            ONE identity — the stacked <Logo> in col1. ── */}
        <div className="fo-grid">
          {/* col1 (RTL: the right column) — brand + link rows + subscribe */}
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
              {/* R349 (D1): the duplicated small-link rows retired —
                  col2's ruled index owns the whole sitemap now. */}
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

          {/* col2 — the wide index: 3 mono-labelled groups up, the
              contact groups down */}
          <div className="fo-col fo-col2">
            <div className="fo-c2-top">
              {INDEX_TOP.map((g, gi) => (
                <div className="fo-lgroup" key={g.label}>
                  <div className="fo-mono-label">{g.label}</div>
                  <div className="fo-lg-links">
                    {gi === 2 && (
                      <>
                        {/* the funnel pair — fo-link-account carries the
                            affordance + hit-slop seat (cta.css owns the
                            underline grammar; the class adds no box of
                            its own) */}
                        <Link to="/auth/register" className="fo-link fo-link-account">إنشاء حساب</Link>
                        <Link to="/auth" className="fo-link fo-link-account">{LOGIN}</Link>
                      </>
                    )}
                    {g.links.map(([to, label], li) =>
                      /* r341 (t05 · SPA links): same split as the brand
                         rows — routes ride <Link>, #fragments stay raw
                         anchors (keys/classes/labels unchanged). */
                      to.startsWith('#') ? (
                        <a
                          key={to}
                          href={to}
                          className={gi || li ? 'fo-link' : 'fo-link fo-link-accent'}
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          key={to}
                          to={to}
                          className={gi || li ? 'fo-link' : 'fo-link fo-link-accent'}
                        >
                          {label}
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="fo-c2-bottom">
              <div className="fo-lgroup">
                <div className="fo-mono-label">CONTACT</div>
                {/* the contact cell — the /contact door under its own
                    التواصل heading (the honest prose lives on the page;
                    the footer carries the door) — R349 (D2): one line */}
                <h3 className="fo-contact-h">التواصل</h3>
                <Link to="/contact" className="fo-biglink">
                  التواصل والتسجيل المبكر — صفحة واحدة
                </Link>
              </div>
              <div className="fo-lgroup">
                <div className="fo-mono-label">ADDRESS</div>
                {/* R349 (D2): the REGION row retired — the independence
                    claim lives verbatim in col1's paragraph; the address
                    keeps its one honest door. */}
                <Link to="/about" className="fo-link">مساحة عمل أُلارا التجريبية</Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── the ink strip band — OUR OWN licensed skyline render,
            light/dark twins swapping on the theme token (the
            wy-cycle grammar). A normal-flow block: the two renders
            stack in ONE grid cell and the band's height rides the
            art's own aspect ratio — no fixed heights, no clipping ── */}
        <div className="fo-fstrip">
          <div className="fo-strip-media">
            <img
              className="fo-strip-img is-light"
              src="/media/illustrations/r359/footer/footer-skyline-light.webp"
              srcSet="/media/illustrations/r359/footer/footer-skyline-light@2x.webp 2x"
              alt="أفق حرم جامعي متخيّل بخط رفيع: رواق وقاعة وبرج وأشجار على خط أرض واحد"
              loading="lazy"
             
              width={1440}
              height={384}
            />
            <img
              className="fo-strip-img is-dark"
              src="/media/illustrations/r359/footer/footer-skyline-dark.webp"
              srcSet="/media/illustrations/r359/footer/footer-skyline-dark@2x.webp 2x"
              alt=""
              aria-hidden="true"
              loading="lazy"
             
              width={1440}
              height={384}
            />
          </div>
        </div>

        {/* ── The Grand Outline Wordmark & Back to Top (the landing signature closing) ── */}
        <div className="fo-top-anchor-row">
          {/* R355 (a11y): the standalone aria-label («العودة إلى أعلى
              الصفحة») disagreed with the visible mono label — the axe
              label-content-name-mismatch violation (the visible text
              must be part of the accessible name). Dropped: the
              button's content (the aria-hidden arrow + the mono span)
              names it exactly as rendered. */}
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

        {/* ── the closing banner — the outline wordmark with OUR OWN
            pointer-lens reveal (r351 P4): the accent fill twin sits in
            the same grid cell behind the stroked outline, revealed
            through a pointer-following radial mask (fine pointers, CSS
            media-gated; the lens vars are written imperatively — zero
            React state). The reference's own lens was never extracted;
            this is Ulara's own design in the same register. ── */}
        <div className="fo-giant-banner" aria-hidden="true" ref={lensRef}>
          <span className="fo-giant-plus fo-giant-plus-tl">+</span>
          <span className="fo-giant-plus fo-giant-plus-tr">+</span>
          <div className="fo-giant-text">ULARA // أُلارا</div>
          <div className="fo-giant-text fo-giant-fill">ULARA // أُلارا</div>
          <span className="fo-giant-plus fo-giant-plus-bl">+</span>
          <span className="fo-giant-plus fo-giant-plus-br">+</span>
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
              {' '}— منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل —{' '}
              {/* r341 (t05 · SPA links): the © line's /about door rides
                  the router too (same class, same visible text). */}
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
