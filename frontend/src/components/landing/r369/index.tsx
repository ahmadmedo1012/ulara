/**
 * r369 «عالم أُلارا الدافئ» — the public landing surface.
 *
 * ONE composition, one idea per band, told as a numbered story:
 *   01 المهمّة      hero — the product itself in a phone, + the promise
 *   02 تصير نجومًا   assignments → stars (XP), with a live counter
 *   03 تصير تقدّمًا   stars → course & mastery progress
 *   04 يصير مكافآت   progress → badges, certificates, standing
 *   05 تصير عادات    rewards → streaks and a study routine
 *   06 معًا          student · teacher · admin, then the closing CTA
 *
 * Contracts kept from the previous landing (business, not decoration):
 * · the funnel — exactly 5 primary CTAs → /auth/register (nav, mobile
 *   menu, hero, finale, footer) and exactly 5 login affordances → /auth;
 * · honest copy — no invented product statistics anywhere. Every number
 *   this page animates describes THE PAGE (how many stars you collected
 *   reading it) or a count of things the platform really ships; the
 *   phone mockup is labelled as a demonstration;
 * · accessibility — one h1, landmarks, 44px targets, keyboard-operable
 *   FAQ (native details/summary), polite live region for the star jar,
 *   decorative mascot hidden from the tree;
 * · reduced motion — every reveal and count-up resolves instantly.
 *
 * The old drawing-sheet tree (sections/*, journey/*, hero/*) is retired
 * with the r313 art direction; this file and its sheet are the whole
 * public surface now.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Glyph, type GlyphName } from '../../icons';
import { ROUTES } from '../../../lib/routes';
import { ThemeToggle } from '../../layout/ThemeToggle';
import { Mascot } from './Mascot';

/* ─────────────────────────── motion helpers ─────────────────────────── */

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Reveal-on-enter. Returns a ref + the boolean; RM resolves true. */
function useInView<T extends HTMLElement>(rootMargin = '-12% 0px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReduced() || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setSeen(true); io.disconnect(); }
      },
      { rootMargin },
    );
    io.observe(el);
    /* Safety net: content may NEVER stay invisible. A section that is
     * never scrolled into view (deep link, print, a screenshot tool, a
     * browser that throttles IO) reveals itself after a short grace. */
    const fallback = window.setTimeout(() => setSeen(true), 1200);
    return () => { io.disconnect(); window.clearTimeout(fallback); };
  }, [rootMargin]);
  return [ref, seen] as const;
}

/** Counts 0 → target once `run` flips. RM jumps straight to the value. */
function useCountUp(target: number, run: boolean, ms = 1100) {
  const [n, setN] = useState(prefersReduced() ? target : 0);
  useEffect(() => {
    if (!run) return undefined;
    if (prefersReduced()) { setN(target); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      // ease-out quart: fast start, gentle arrival (matches --ease-out)
      setN(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return n;
}

/* ─────────────────────────── star jar (scroll) ───────────────────────── */

/**
 * The page counts the reader's own journey: each numbered band you pass
 * gives you a star. It is HONEST by construction — the number describes
 * this page, never the platform's data.
 */
const JAR_TOTAL = 6;

function StarJar() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-jar]'));
    if (!nodes.length) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setN(JAR_TOTAL); return undefined; }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.jar;
          if (!id) continue;
          setN((prev) => (prev >= JAR_TOTAL ? prev : prev + 1));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const full = n >= JAR_TOTAL;
  return (
    <div className="w369-jar" data-full={full ? 'true' : 'false'}>
      <span className="w369-jar-icon" aria-hidden="true"><Glyph name="star" size={16} className="ui-glyph-twinkle" /></span>
      <span className="w369-jar-text">
        جمعتَ <b>{n}</b> من {JAR_TOTAL} نجوم في رحلتك
      </span>
      <span className="w369-jar-track" aria-hidden="true">
        {Array.from({ length: JAR_TOTAL }).map((_, i) => (
          <span key={i} className="w369-jar-pip" data-on={i < n ? 'true' : 'false'} />
        ))}
      </span>
      <span className="visually-hidden" role="status" aria-live="polite">
        {n === JAR_TOTAL ? 'أكملت الرحلة: ستة نجوم من ستة' : `جمعت ${n} من ${JAR_TOTAL} نجوم`}
      </span>
    </div>
  );
}

/* ─────────────────────────────── nav ─────────────────────────────── */

interface NavLink { href: string; label: string; external?: boolean }

/* the phone menu carries the full public register; the desktop bar keeps
   the five story seats so the bar never crowds. */
const MOBILE_EXTRA: readonly NavLink[] = [
  { href: '/campus', label: 'الحرم الجامعي', external: true },
  { href: '/competitions', label: 'المسابقات', external: true },
  { href: '/app', label: 'التطبيق', external: true },
];

const NAV_LINKS: readonly NavLink[] = [
  { href: '#story', label: 'الحكاية' },
  { href: '#levels', label: 'المستويات' },
  { href: '#roles', label: 'الأدوار' },
  { href: ROUTES.capabilities, label: 'القدرات', external: true },
  { href: ROUTES.colleges, label: 'الكليات', external: true },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    // the a11y contract: focus returns to the control that opened it
    burgerRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <header className="w369-nav">
      <div className="w369-nav-inner">
        <Link to={ROUTES.root} className="w369-brand" aria-label="أُلارا — الصفحة الرئيسية">
          <span className="w369-brand-mark" aria-hidden="true"><Glyph name="star" size={18} /></span>
          <span className="w369-brand-word">أُلارا</span>
        </Link>

        <nav className="w369-nav-links" aria-label="أقسام الصفحة">
          {NAV_LINKS.map((l) => (
            l.external
              ? <Link key={l.href} to={l.href} className="w369-nav-link">{l.label}</Link>
              : <a key={l.href} href={l.href} className="w369-nav-link">{l.label}</a>
          ))}
        </nav>

        <div className="w369-nav-actions">
          <ThemeToggle />
          <Link to={ROUTES.auth} className="w369-btn w369-btn-ghost w369-nav-login">تسجيل الدخول</Link>
          <Link to={ROUTES.authRegister} className="w369-btn w369-btn-primary">
            أنشئ حسابك
            <Glyph name="arrowLeft" size={16} />
          </Link>
        </div>

        <button
          ref={burgerRef}
          type="button"
          className="w369-nav-burger"
          aria-expanded={open}
          aria-controls="w369-mobile-menu"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          onClick={() => setOpen((v) => !v)}
        >
          <Glyph name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {open && (
        <div className="w369-mobile-menu" id="w369-mobile-menu">
          {[...NAV_LINKS, ...MOBILE_EXTRA].map((l) => (
            l.external
              ? <Link key={l.href} to={l.href} className="w369-mobile-link">{l.label}</Link>
              : <a key={l.href} href={l.href} className="w369-mobile-link">{l.label}</a>
          ))}
          <div
            className="w369-mobile-theme"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <span className="w369-mobile-theme-label">المظهر</span>
            <ThemeToggle />
          </div>
          <div className="w369-mobile-cta">
            <Link to={ROUTES.authRegister} className="w369-btn w369-btn-primary" onClick={() => setOpen(false)}>
              أنشئ حسابك
            </Link>
            <Link to={ROUTES.auth} className="w369-btn w369-btn-ghost" onClick={() => setOpen(false)}>
              تسجيل الدخول
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────────── hero ─────────────────────────────── */

const HERO_ROWS = [
  { title: 'واجب: تحليل النصّ الأدبي', meta: 'يُسلَّم غدًا · الأدب الحديث', tone: 'amber', icon: 'book' },
  { title: 'محاضرة: مدخل إلى الإحصاء', meta: 'الأحد ٩:٠٠ · القاعة ٣', tone: 'sky', icon: 'graduation' },
  { title: 'اختبار قصير: الجبر الخطّي', meta: 'بعد يومين · ٢٠ دقيقة', tone: 'rose', icon: 'target' },
] as const;

export function Hero() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const stars = useCountUp(6, seen);
  return (
    <section className="w369-hero" ref={ref} data-jar="01">
      <div className="w369-hero-copy">
        <p className="w369-eyebrow">
          <Glyph name="sparkle" size={15} />
          نظام تشغيل الجامعة — عربي أولًا
        </p>
        <h1 className="w369-h1">
          تعلّمك يصير
          <span className="w369-em"> نجومًا</span>
          <svg className="w369-underline" viewBox="0 0 240 16" aria-hidden="true" preserveAspectRatio="none">
            <path d="M3 12 C60 4 150 3 237 9" fill="none" strokeWidth="5" strokeLinecap="round" stroke="var(--gold)" />
          </svg>
        </h1>
        <p className="w369-lead">
          كل واجب تُنجزه، وكل محاضرة تحضرها، وكل اختبار تجتازه — يتحوّل إلى نقاط إتقان
          تراها وتشعر بها. أُلارا تحوّل رحلة الجامعة من قائمة مهامّ إلى حكاية تكبر معك.
        </p>
        <div className="w369-hero-actions">
          <Link to={ROUTES.authRegister} className="w369-btn w369-btn-primary w369-btn-lg">
            أنشئ حسابك الجامعي
            <Glyph name="arrowLeft" size={18} className="ui-glyph-nudge" />
          </Link>
          <Link to={ROUTES.auth} className="w369-btn w369-btn-ghost">لديك حساب؟ تسجيل الدخول</Link>
        </div>
        <ul className="w369-hero-facts">
          <li><Glyph name="certificate" size={16} /> للطلّاب وأعضاء الهيئة والإدارة</li>
          <li><Glyph name="star" size={16} /> نقاط إتقان حقيقية من بيانتك</li>
          <li><Glyph name="flame" size={16} /> عادات دراسة تُبنى يومًا بيوم</li>
        </ul>
      </div>

      <div className="w369-hero-art">
        <div className="w369-phone" aria-hidden="false" role="img"
             aria-label="عرض توضيحي لشاشة الطالب في أُلارا: قائمة واجبات ومحاضرات مع شريط تقدّم">
          <div className="w369-phone-top">
            <span className="w369-phone-dot" />
            <span className="w369-phone-time">٩:٤١</span>
          </div>
          <div className="w369-phone-screen">
            <div className="w369-phone-greet">
              <Mascot pose="hello" size={44} />
              <div>
                <p className="w369-phone-hi">صباح الخير، سارة</p>
                <p className="w369-phone-sub">يومك فيه ٣ مهامّ — تبدأ بواحدة</p>
              </div>
            </div>
            <div className="w369-phone-stars">
              <Glyph name="star" size={18} />
              <b>{stars}</b> <span>نجوم اليوم</span>
              <span className="w369-phone-ring" />
            </div>
            <ul className="w369-phone-list">
              {HERO_ROWS.map((r) => (
                <li key={r.title} className="w369-phone-row" data-tone={r.tone}>
                  <span className="w369-phone-ico"><Glyph name={r.icon} size={16} /></span>
                  <span className="w369-phone-body">
                    <b>{r.title}</b>
                    <em>{r.meta}</em>
                  </span>
                </li>
              ))}
            </ul>
            <div className="w369-phone-progress">
              <span>تقدّم المقرّر</span>
              <span className="w369-phone-bar"><i style={{ inlineSize: '62%' }} /></span>
              <b>٦٢٪</b>
            </div>
          </div>
        </div>
        <p className="w369-art-note">عرض توضيحي للواجهة — لا يعرض بيانات طالب حقيقي.</p>
      </div>
    </section>
  );
}

/* ───────────────────────────── marquee ───────────────────────────── */

const MARQUEE = [
  'مقرّرات ومحاضرات', 'واجبات واختبارات', 'مصفوفة إتقان', 'حضور ومتابعة',
  'شهادات وإنجازات', 'لوحة متصدّرين', 'مكتبة وبحوث', 'تقارير الجودة',
];

export function Marquee() {
  return (
    <div className="w369-marquee" aria-hidden="true">
      <div className="w369-marquee-track">
        {[0, 1].map((dup) => (
          <ul className="w369-marquee-run" key={dup}>
            {MARQUEE.map((m) => (
              <li key={m}><Glyph name="star" size={14} />{m}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── numbered story ─────────────────────────── */

interface BandProps {
  n: string;
  kicker: string;
  title: React.ReactNode;
  body: string;
  tint: 'violet' | 'teal' | 'coral' | 'sky' | 'leaf';
  icon: GlyphName;
  children: React.ReactNode;
  jar: string;
}

function Band({ n, kicker, title, body, tint, icon, children, jar }: BandProps) {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <section className="w369-band" ref={ref} data-tint={tint} data-jar={jar}>
      <div className="w369-band-head">
        <span className="w369-band-num" aria-hidden="true">{n}</span>
        <p className="w369-band-kicker"><Glyph name={icon} size={15} />{kicker}</p>
        <h2 className="w369-h2">{title}</h2>
        <p className="w369-body">{body}</p>
      </div>
      <div className="w369-band-body" data-seen={seen ? 'true' : 'false'}>{children}</div>
    </section>
  );
}

/* ── 02 tasks become stars ── */

const STAR_SOURCES = [
  { icon: 'book', title: 'إتمام الواجب', body: 'تسلّمه في وقته، فتظهر النجمات فورًا في رصيدك.' },
  { icon: 'graduation', title: 'حضور المحاضرة', body: 'حضورك يُسجَّل، والنجمة تُضاف دون خطوة إضافية.' },
  { icon: 'target', title: 'اجتياز الاختبار', body: 'نتيجتك تُحدّد نجومك، وتُضاف إلى مصفوفة إتقانك.' },
] as const;

export function StarsBand() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const kinds = useCountUp(STAR_SOURCES.length, seen);
  return (
    <Band
      n="02" jar="02" tint="violet" icon="sparkle"
      kicker="المهمّة تصير نجمة"
      title={<>كل ما تُنجزه<br /><span className="w369-em">يصير نجمة</span></>}
      body="الواجب، المحاضرة، الاختبار القصير — كلٌّ منها يمنحك نقاط إتقان في اللحظة التي تُتمّها. لا انتظار لتصحيح، ولا أرقام ضائعة: النجوم تظهر أمامك فورًا، وتحتفظ بها."
    >
      <div className="w369-star-grid" ref={ref}>
        <div className="w369-stat w369-stat-lead">
          <span className="w369-stat-ico"><Glyph name="star" size={20} className="ui-glyph-twinkle" /></span>
          <b className="w369-stat-num">{kinds}</b>
          <span className="w369-stat-label">طرق راسخة لجمع النجوم في أُلارا</span>
        </div>
        <div className="w369-stat w369-stat-note">
          <Mascot pose="cheer" size={64} />
          <span className="w369-stat-label">
            المكافأة ليست شهادة تُعلَّق، بل شعور يوميّ بأنك تتقدّم.
          </span>
        </div>
      </div>
      <ul className="w369-sources">
        {STAR_SOURCES.map((x) => (
          <li key={x.title} className="w369-source">
            <span className="w369-source-ico"><Glyph name={x.icon} size={18} /></span>
            <b>{x.title}</b>
            <span>{x.body}</span>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/* ── 03 stars become progress ── */

const PROGRESS_ROWS = [
  { label: 'الأدب الحديث', pct: 78, tone: 'violet' },
  { label: 'الإحصاء التطبيقي', pct: 54, tone: 'teal' },
  { label: 'الجبر الخطّي', pct: 91, tone: 'coral' },
] as const;

export function ProgressBand() {
  return (
    <Band
      n="03" jar="03" tint="teal" icon="leaderboard"
      kicker="النجمة تصير تقدّمًا"
      title={<>النجوم ترتّب نفسها<br /><span className="w369-em">تقدّمًا تراه</span></>}
      body="نجومك لا تبقى أرقامًا متناثرة: تتجمّع في تقدّم المقرّر، وفي مصفوفة الإتقان التي تُظهر ما أتقنته وما يحتاج جهدًا. تعرف دائمًا أين أنت، وأين الخطوة التالية."
    >
      <div className="w369-progress-card">
        <div className="w369-progress-head">
          <span className="w369-chip"><Glyph name="target" size={14} />مصفوفة الإتقان</span>
          <span className="w369-chip w369-chip-soft">نموذج توضيحي</span>
        </div>
        <ul className="w369-progress-list">
          {PROGRESS_ROWS.map((r) => (
            <li key={r.label} data-tone={r.tone}>
              <div className="w369-progress-line">
                <b>{r.label}</b>
                <span>{r.pct}٪</span>
              </div>
              <span className="w369-progress-bar"><i style={{ inlineSize: `${r.pct}%` }} /></span>
            </li>
          ))}
        </ul>
        <p className="w369-fine">
          التقدّم محسوب من إنجازاتك الفعلية في المقرّر — لا تقديرات ولا أرقام مُجمّلة.
        </p>
      </div>
    </Band>
  );
}

/* ── 04 progress becomes rewards ── */

const REWARDS = [
  { icon: 'medal', title: 'شارات الإنجاز', body: 'تُفتح عند إتمام هدف حقيقي — أول واجب، أول أسبوع كامل، أول إتقان.' },
  { icon: 'trophy', title: 'لوحة المتصدّرين', body: 'ترتيبك بين زملائك في المقرّر، مبنيًّا على نقاط الإتقان لا على الحظّ.' },
  { icon: 'certificate', title: 'شهادات المقرّر', body: 'شهادة عند إكمال المقرّر، جاهزة للتنزيل وموثّقة داخل المنصّة.' },
] as const;

export function RewardsBand() {
  return (
    <Band
      n="04" jar="04" tint="coral" icon="medal"
      kicker="التقدّم يصير مكافأة"
      title={<>والتقدّم؟<br /><span className="w369-em">يصير مكافأة</span></>}
      body="عندما يتراكم الإتقان، تصبح له علامات تراها: شارات تُفتح، وترتيب في لوحة المتصدّرين، وشهادة عند إكمال المقرّر. مكافآت حقيقية تخرج من بياناتك، لا جوائز معلّقة في الهواء."
    >
      <ul className="w369-reward-grid">
        {REWARDS.map((r) => (
          <li key={r.title} className="w369-reward">
            <span className="w369-reward-ico"><Glyph name={r.icon} size={22} /></span>
            <h3 className="w369-h3">{r.title}</h3>
            <p className="w369-body">{r.body}</p>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/* ── 05 rewards become habits ── */

const WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function HabitsBand() {
  return (
    <Band
      n="05" jar="05" tint="sky" icon="flame"
      kicker="المكافأة تصير عادة"
      title={<>والمكافأة؟<br /><span className="w369-em">تصير عادة</span></>}
      body="سلسلة الأيام المتتالية ليست عدّادًا للضغط، بل تذكيرًا لطيفًا بأنك تستمرّ. أُلارا تحفظ وتيرتك، وتذكّرك بلطف حين ينقطع يوم، وتحتفي حين تكتمل الأسبوع."
    >
      <div className="w369-streak">
        <div className="w369-streak-head">
          <span className="w369-streak-flame"><Glyph name="flame" size={22} className="ui-glyph-flicker" /></span>
          <div>
            <b>سلسلة هذا الأسبوع</b>
            <span>هكذا تبدو خمسة أيام من سبعة — نموذج توضيحي، لا بياناتك.</span>
          </div>
        </div>
        <ul className="w369-streak-days">
          {WEEK.map((d, i) => (
            <li key={d} data-on={i < 5 ? 'true' : 'false'}>
              <span className="w369-streak-dot">
                {i < 5 ? <Glyph name="star" size={16} /> : <span className="w369-streak-empty" />}
              </span>
              <span className="w369-streak-day">{d}</span>
            </li>
          ))}
        </ul>
        <p className="w369-fine">
          السلسلة تُحسب من نشاطك الفعلي، وتُصفَّر بهدوء عند الغياب — بلا عقوبات.
        </p>
      </div>
    </Band>
  );
}

/* ── the 20-level ladder (original Arabic names) ── */

const LEVELS = [
  'بذرة', 'برعمة', 'خطوة', 'طريق', 'مصباح', 'فجر', 'شمس', 'مدار', 'قمر', 'نجم',
  'كوكبة', 'سماء', 'قوس', 'منارة', 'برج', 'قلعة', 'أفق', 'قمّة', 'تاج', 'المعلّم',
];

export function LevelsBand() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const n = useCountUp(LEVELS.length, seen);
  return (
    <Band
      n="06" jar="06" tint="leaf" icon="admin"
      kicker="عشرون مستوى، أسماء عربية"
      title={<>سلّمٌ من<br /><span className="w369-em">عشرين مستوى</span></>}
      body="من «بذرة» إلى «المعلّم»: سلّم إتقان بأسماء عربية أصيلة، يفتح كل مستوى شارةً جديدة. لا تسريع ولا اختصار — كل مستوى يُفتح بما أنجزته فعلًا."
    >
      <div className="w369-levels" id="levels" ref={ref}>
        <div className="w369-levels-head">
          <span className="w369-chip w369-chip-amber"><Glyph name="star" size={14} />{n} مستوى</span>
          <span className="w369-fine">أسماء السلّم من تصميم أُلارا، وتُمنح حسب نقاط الإتقان.</span>
        </div>
        <ol className="w369-levels-grid">
          {LEVELS.map((name, i) => (
            <li key={name} className="w369-level" data-top={i >= LEVELS.length - 1 ? 'true' : 'false'}>
              <span className="w369-level-badge" aria-hidden="true">
                <Glyph name={i < 10 ? 'star' : 'medal'} size={i < 10 ? 16 : 18} />
              </span>
              <span className="w369-level-idx">{i + 1}</span>
              <span className="w369-level-name">{name}</span>
            </li>
          ))}
        </ol>
      </div>
    </Band>
  );
}

/* ── together: the three views ── */

const ROLES = [
  { icon: 'student', title: 'الطالب', body: 'يرى مهامّه، نجومه، تقدّمه، وسلسلته في مكان واحد — ويعرف الخطوة التالية دائمًا.' },
  { icon: 'teacher', title: 'عضو الهيئة', body: 'يرى صفّه كاملًا: من أنجز، ومن يحتاج متابعة، وأين يقع الإتقان الحقيقي، بمصفوفة واحدة.' },
  { icon: 'admin', title: 'الإدارة والجودة', body: 'ترى المقرّرات والبرامج والمؤشّرات، وتُدير الصلاحيات والتقارير من مساحة واحدة.' },
] as const;

export function RolesBand() {
  return (
    <section className="w369-roles" id="roles" data-jar="06">
      <header className="w369-band-head">
        <p className="w369-band-kicker"><Glyph name="users" size={15} />معًا</p>
        <h2 className="w369-h2">طالبٌ يتعلّم، عضو هيئةٍ يتابع،<br /><span className="w369-em">وإدارةٌ ترى الصورة</span></h2>
        <p className="w369-body">
          الفكرة نفسها تتكرّر في كل دور: عملٌ صغير، يراه صاحبه، ويُبنى عليه. من مهامّ الطالب
          إلى مؤشّرات الجودة، نظام واحد ولغة واحدة.
        </p>
      </header>
      <ul className="w369-role-grid">
        {ROLES.map((r) => (
          <li key={r.title} className="w369-role">
            <span className="w369-role-ico"><Glyph name={r.icon} size={22} /></span>
            <h3 className="w369-h3">{r.title}</h3>
            <p className="w369-body">{r.body}</p>
            <Link to={ROUTES.capabilities} className="w369-link">
              ما الذي يستطيعه؟ <Glyph name="arrowLeft" size={15} className="ui-glyph-nudge" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

const FAQ = [
  {
    q: 'هل النقاط والنجوم تُحسب يدويًا؟',
    a: 'لا. تُحسب من إنجازاتك المسجّلة في المنصّة — إتمام الواجب، تسليم الاختبار، حضور المحاضرة — وتظهر مباشرة عند الإنجاز.',
  },
  {
    q: 'هل يمكن للطالب رؤية تقدّمه في كل مقرّر؟',
    a: 'نعم. لكل مقرّر تقدّمه الخاص، ومصفوفة الإتقان تُظهر الدرجات والمواضيع التي أتقنتها والتي تحتاج مراجعة.',
  },
  {
    q: 'ما فائدة السلسلة إن غاب الطالب يومًا؟',
    a: 'السلسلة تتوقّف ولا تُعاقب: تعود من حيث توقّفت مع اليوم التالي. الغاية تشجيع الانتظام، لا معاقبة الانقطاع.',
  },
  {
    q: 'هل الشهادات معتمدة؟',
    a: 'شهادات إكمال المقرّر تُصدرها المنصّة وتوثّق داخل حسابك. الاعتماد الرسمي يبقى بيد مؤسستك وسياساتها.',
  },
  {
    q: 'هل تعمل أُلارا على الجوّال؟',
    a: 'نعم — تطبيق أندرويد و iOS، والواجهة تعمل كذلك في متصفّح الجوّال بالكامل بالعربية ومن اليمين إلى اليسار.',
  },
];

export function FaqBand() {
  return (
    <section className="w369-faq" id="faq">
      <div className="w369-faq-head">
        <Mascot pose="think" size={72} />
        <div>
          <p className="w369-band-kicker"><Glyph name="sparkle" size={15} />أسئلة شائعة</p>
          <h2 className="w369-h2">قبل أن تبدأ</h2>
        </div>
      </div>
      <div className="w369-faq-list">
        {FAQ.map((f, i) => (
          <details key={f.q} className="w369-faq-item" open={i === 0}>
            <summary className="w369-faq-q">
              <span>{f.q}</span>
              <Glyph name="chevronDown" size={20} />
            </summary>
            <p className="w369-faq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────── CTA ─────────────────────────────── */

export function CtaBand() {
  return (
    <section className="w369-cta" data-jar="06">
      <div className="w369-cta-inner">
        <Mascot pose="wave" size={110} className="w369-cta-mascot" />
        <h2 className="w369-h1 w369-cta-title">
          خطوتك الأولى<br /><span className="w369-em">نجمة واحدة</span>
        </h2>
        <p className="w369-lead">
          أنشئ حسابك الجامعي، وسجّل أول مهمّة اليوم. الباقي يبني نفسه.
        </p>
        <div className="w369-cta-actions">
          <Link to={ROUTES.authRegister} className="w369-btn w369-btn-primary w369-btn-lg">
            أنشئ حسابك الجامعي
            <Glyph name="arrowLeft" size={18} className="ui-glyph-nudge" />
          </Link>
          <Link to={ROUTES.auth} className="w369-btn w369-btn-ghost w369-btn-lg">تسجيل الدخول</Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── FOOTER ───────────────────────────── */

const FOOTER_COLS = [
  {
    title: 'المنصّة',
    links: [
      { to: ROUTES.capabilities, label: 'القدرات' },
      { to: ROUTES.colleges, label: 'الكليات' },
      { to: ROUTES.community, label: 'المجتمع' },
      { to: ROUTES.competitions, label: 'المسابقات' },
    ],
  },
  {
    title: 'المساعدة',
    links: [
      { to: '/help', label: 'مركز المساعدة' },
      { to: '/contact', label: 'اتصل بنا' },
      { to: '/about', label: 'عن أُلارا' },
      { to: '/app-download', label: 'حمّل التطبيق' },
    ],
  },
];

/* the nine legal/institutional doors — every one of them is a real route
   (App.tsx); the row rides the © bar. */
const LEGAL_LINKS = [
  { to: '/legal/privacy', label: 'الخصوصية' },
  { to: '/legal/terms', label: 'الشروط' },
  { to: '/legal/cookies', label: 'ملفات التعريف' },
  { to: '/legal/accessibility', label: 'الوصولية' },
  { to: '/legal/security', label: 'الأمن' },
  { to: '/legal/data', label: 'بياناتك' },
  { to: '/about', label: 'عن أُلارا' },
  { to: '/help', label: 'المساعدة' },
  { to: '/contact', label: 'اتصل بنا' },
] as const;

export function Footer({ year }: { year: number }) {
  return (
    <footer className="w369-footer">
      <div className="w369-footer-grid">
        <div className="w369-footer-brand">
          <Link to={ROUTES.root} className="w369-brand">
            <span className="w369-brand-mark" aria-hidden="true"><Glyph name="star" size={18} /></span>
            <span className="w369-brand-word">أُلارا</span>
          </Link>
          {/* the honest identity statement — the SAME sentence /about and
              /legal render (one text, three seats; tests pin the equality). */}
          <p className="w369-footer-note">منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «مساحة عمل أُلارا التجريبية» — مساحة اصطناعية بالكامل لأغراض العرض، لا تحاكي أي جامعة.</p>
          <div className="w369-footer-cta">
            <Link to={ROUTES.authRegister} className="w369-btn w369-btn-primary">أنشئ حسابك</Link>
            <Link to={ROUTES.auth} className="w369-btn w369-btn-ghost">تسجيل الدخول</Link>
          </div>
        </div>
        {FOOTER_COLS.map((c) => (
          <nav key={c.title} className="w369-footer-col" aria-label={c.title}>
            <h3 className="w369-footer-title">{c.title}</h3>
            <ul>
              {c.links.map((l) => (
                <li key={l.to}><Link to={l.to} className="w369-footer-link">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="w369-footer-legal">
        <span>© {year} أُلارا — جميع الحقوق محفوظة.</span>
        <nav aria-label="روابط قانونية" className="w369-legal-links">
          {LEGAL_LINKS.map((l, i) => (
            <span key={l.to} className="w369-legal-item">
              {i > 0 && <span className="w369-legal-sep" aria-hidden="true" />}
              <Link to={l.to}>{l.label}</Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/* ───────────────────────────── preloader ───────────────────────────── */

/**
 * The entrance: a short star-burst, once per session, skippable and
 * entirely skipped under reduced motion. It never blocks the page —
 * the sheet renders underneath and the overlay fades itself out.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const finish = useCallback(() => { setLeaving(true); }, []);
  useEffect(() => {
    const t1 = window.setTimeout(finish, 620);
    const t2 = window.setTimeout(onDone, 1020);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [finish, onDone]);
  return (
    <div className="w369-pre" data-leaving={leaving ? 'true' : 'false'} aria-hidden="true">
      <div className="w369-pre-burst">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="w369-pre-ray" style={{ rotate: `${i * 45}deg` }} />
        ))}
        <span className="w369-pre-star"><Glyph name="star" size={34} /></span>
      </div>
      <p className="w369-pre-word">أُلارا</p>
    </div>
  );
}

/* re-exported for the page composer */
export { StarJar, JAR_TOTAL };
