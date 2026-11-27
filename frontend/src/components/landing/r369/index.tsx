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

/**
 * r369 reveal — CONTENT IS VISIBLE BY DEFAULT.
 *
 * The old shape (CSS hides everything, then a 1.2s `setTimeout` force-
 * reveals) could pop a band in late and looked identical to a bug. This
 * one is the opposite, and the difference matters for no-JS, print,
 * deep links, screenshots and slow CPUs:
 *
 *   · nothing is hidden until JS decides to hide it;
 *   · and it only decides for an element that starts BELOW the fold, so
 *     nothing on the first screen ever animates (no CLS, no flash);
 *   · the observer then flips `data-reveal="pending"` → `"in"` once,
 *     never back — scrolling up never re-hides content;
 *   · reduced motion, or no IntersectionObserver, means never armed.
 *
 * The visual grammar lives in the sheet (`[data-reveal='pending']`), so
 * this hook carries no timing of its own.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReduced() || typeof IntersectionObserver === 'undefined') return undefined;
    const box = el.getBoundingClientRect();
    // already on screen (or above it): show it, never animate it
    if (box.top < window.innerHeight * 0.92) return undefined;
    el.dataset.reveal = 'pending';
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          el.dataset.reveal = 'in';
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
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

/**
 * Reveal safety: the armed state is a PROGRESSIVE ENHANCEMENT, so it is
 * switched off wherever “scroll into view” may never happen — printing
 * (the whole page must be on paper) and a deep link that drops the
 * reader mid-page. Both are real, and both would otherwise hide content
 * the reader is looking at.
 */
export function revealAllNow() {
  document.querySelectorAll('[data-reveal="pending"]').forEach((el) => {
    (el as HTMLElement).dataset.reveal = 'in';
  });
}

/* ─────────────────────────── scroll engine ───────────────────────── */

/**
 * ONE scroll reader for the page: passive listener, rAF-throttled, reads
 * a single number (0 → 1). Everything scroll-linked on this surface
 * subscribes to it — no element polls layout, no scroll listener inside
 * an animation loop, no `will-change` left behind.
 */
function useScrollProgress(steps = 0) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      /* r369 phone-smoothness: consumers that show a STEP (the section
       * index) subscribe to the quantised value, so React re-renders only
       * when the step changes, not on every scroll frame. */
      setP(steps > 0 ? Math.round(raw * steps) / steps : raw);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return p;
}

/**
 * Which stage is on screen: the last band whose top has crossed the
 * middle of the viewport. One passive rAF listener for the whole bar —
 * five links never each own a scroll handler.
 */
function useActiveStage() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-stage]')];
      if (!nodes.length) return;
      const mid = window.innerHeight * 0.45;
      let next = 0;
      nodes.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= mid) next = i;
      });
      setActive(next);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return active;
}

/** The stage pill: travels to the active item (measured, not guessed). */
function StageNav({ active }: { active: number }) {
  const ref = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>('.w369-stage-item');
    const cur = items[active];
    if (!cur) return;
    el.style.setProperty('--stage-x', `${cur.offsetLeft}px`);
    el.style.setProperty('--stage-w', `${cur.offsetWidth}px`);
  }, [active]);
  return (
    <ul className="w369-stage" ref={ref}>
      <li className="w369-stage-pill" aria-hidden="true" />
      {STAGES.map((st, i) => (
        <li key={st.id}>
          <a
            href={`#${st.id}`}
            className="w369-stage-item"
            aria-current={i === active ? 'true' : undefined}
            data-on={i === active ? 'true' : 'false'}
          >
            {st.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The slim progress rail: one 2px line in the signal colour. */
function ScrollRail() {
  /* r369 phone-smoothness: the rail writes its transform straight to the
   * DOM from one passive rAF listener. It never goes through React state,
   * so a scroll frame costs no render at all. */
  const fill = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (fill.current) fill.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="w369-rail" aria-hidden="true">
      <span className="w369-rail-fill" ref={fill} />
    </div>
  );
}

/* ─────────────────────────── star jar (scroll) ───────────────────────── */

/**
 * The reader's position in the argument, not a reward: the index counts
 * the numbered sections behind you. It describes THIS PAGE only, which is
 * why it is safe to show — it makes no claim about the product.
 */
const JAR_TOTAL = 6;

function StarJar() {
  /* Continuous, not a one-shot trigger: the jar fills as you actually
   * read, and it empties again if you go back up — the number is your
   * position in the story, never a claim about the product. */
  const progress = useScrollProgress(JAR_TOTAL);
  const n = Math.min(JAR_TOTAL, Math.round(progress * JAR_TOTAL));
  /* the index names the section you are IN, so it starts at 1, not 0 */
  const at = Math.max(1, n);
  const full = n >= JAR_TOTAL;
  /* the finale closes the loop: it says how many stars YOU collected on
   * the way down. A window event, not a context — one number, one hop. */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ulara:stars', { detail: n }));
  }, [n]);
  return (
    <div className="w369-jar" data-full={full ? 'true' : 'false'}>
      <span className="w369-jar-icon" aria-hidden="true"><Glyph name="compass" size={16} /></span>
      {/* the visible number is decoration for the eye; the live region
          below is the ONE announcement (otherwise a screen reader reads
          the same sentence twice). */}
      <span className="w369-jar-text" aria-hidden="true">
        القسم <b>{at}</b> من {JAR_TOTAL}
      </span>
      <span className="w369-jar-track" aria-hidden="true">
        {Array.from({ length: JAR_TOTAL }).map((_, i) => (
          <span key={i} className="w369-jar-pip" data-on={i < n ? 'true' : 'false'} />
        ))}
      </span>
      <span className="visually-hidden" role="status" aria-live="polite">
        {n === JAR_TOTAL ? 'آخر قسم: الخاتمة' : `القسم ${at} من ${JAR_TOTAL}`}
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

/* r369 phase 3 — the top bar becomes a STAGE navigator: five steps, one
   per story band, with a pill that travels to the active step as you
   scroll. Labels are each band's subject, so the bar reads as the story
   you are inside. */
const STAGES = [
  { id: 'story', label: 'الإنجاز' },
  { id: 'stars', label: 'الإتقان' },
  { id: 'progress', label: 'التقدّم' },
  { id: 'rewards', label: 'الاعتماد' },
  { id: 'levels', label: 'السلّم' },
] as const;

const NAV_LINKS: readonly NavLink[] = [
  { href: '#story', label: 'الحكاية' },
  { href: '#levels', label: 'المستويات' },
  { href: '#roles', label: 'الأدوار' },
  { href: ROUTES.capabilities, label: 'القدرات', external: true },
  { href: ROUTES.colleges, label: 'الكليات', external: true },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const active = useActiveStage();
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
      <ScrollRail />
      <div className="w369-nav-inner">
        <Link to={ROUTES.root} className="w369-brand" aria-label="أُلارا — الصفحة الرئيسية">
          <span className="w369-brand-mark" aria-hidden="true"><Glyph name="star" size={18} /></span>
          <span className="w369-brand-word">أُلارا</span>
        </Link>

        <nav className="w369-nav-links" aria-label="مراحل القصة">
          <StageNav active={active} />
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
  { title: 'محاضرة: مدخل إلى الإحصاء', meta: 'الأحد 9:00 · القاعة 3', tone: 'sky', icon: 'graduation' },
  { title: 'اختبار قصير: الجبر الخطّي', meta: 'بعد يومين · 20 دقيقة', tone: 'rose', icon: 'target' },
] as const;

/**
 * The 30-second tour — built in-page instead of shipping a video: one
 * dialog, four beats, each beat is a real screen fragment of the story
 * (task → star → progress → reward). Native <dialog> gives the focus
 * trap, Escape and the backdrop for free; the beats advance on a timer
 * and the reader can step them by hand or close at any point.
 */
const TOUR_BEATS = [
  { icon: 'assignment' as const, title: 'تنجز مهمّة', body: 'واجب، محاضرة، اختبار — كلٌّ منها يظهر في يومك.' },
  { icon: 'target' as const, title: 'تُسجَّل النقطة', body: 'يُسجَّل الإنجاز فتظهر نقاطه فورًا في رصيدك.' },
  { icon: 'leaderboard' as const, title: 'يظهر التقدّم', body: 'نقاط الإتقان تُسجَّل في شريط تقدّم المقرّر ومصفوفة الإتقان.' },
  { icon: 'medal' as const, title: 'يُوثَّق الإنجاز', body: 'عند بلوغ العتبة تُسجَّل الشارة في سجلّ الطالب.' },
];

function TourDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  useEffect(() => {
    if (prefersReduced()) return undefined;
    const t = window.setInterval(() => setBeat((b) => (b + 1) % TOUR_BEATS.length), 2200);
    return () => window.clearInterval(t);
  }, []);
  const b = TOUR_BEATS[beat] ?? TOUR_BEATS[0]!;
  return (
    <dialog
      ref={ref}
      className="w369-tour"
      aria-label="جولة سريعة في أُلارا"
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="w369-tour-inner">
        <button type="button" className="w369-tour-close" onClick={onClose} aria-label="إغلاق الجولة">
          <Glyph name="close" size={20} />
        </button>
        <p className="w369-eyebrow">
          <Glyph name="sparkle" size={15} /> جولة 30 ثانية · نموذج توضيحي
        </p>
        <div className="w369-tour-stage" key={beat}>
          <span className="w369-tour-icon" data-tone={beat}>
            <Glyph name={b.icon} size={34} />
          </span>
          <h3 className="w369-tour-title">{b.title}</h3>
          <p className="w369-tour-body">{b.body}</p>
        </div>
        <div className="w369-tour-dots" role="tablist" aria-label="خطوات الجولة">
          {TOUR_BEATS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === beat}
              className="w369-tour-dot"
              data-on={i === beat ? 'true' : 'false'}
              onClick={() => setBeat(i)}
            >
              <span className="visually-hidden">{`الخطوة ${i + 1}`}</span>
            </button>
          ))}
        </div>
        <div className="w369-tour-actions">
          <button
            type="button"
            className="w369-btn w369-btn-primary"
            onClick={() => {
              onClose();
              document.getElementById('story')?.scrollIntoView({ block: 'start' });
            }}
          >
            أكمل القصة
          </button>
          <button type="button" className="w369-btn w369-btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </dialog>
  );
}

export function Hero() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const points = useCountUp(24, seen);
  const [tour, setTour] = useState(false);
  const artRef = useRef<HTMLDivElement | null>(null);

  /* depth, not decoration: the phone drifts a few pixels against the
   * pointer. Fine pointers only, transform only, nothing under RM. */
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const art = artRef.current;
    if (!art || e.pointerType !== 'mouse' || prefersReduced()) return;
    const box = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - box.left) / box.width - 0.5;
    const dy = (e.clientY - box.top) / box.height - 0.5;
    art.style.setProperty('--px', `${(dx * -10).toFixed(2)}px`);
    art.style.setProperty('--py', `${(dy * -8).toFixed(2)}px`);
  };
  const onLeave = () => {
    artRef.current?.style.setProperty('--px', '0px');
    artRef.current?.style.setProperty('--py', '0px');
  };

  return (
    <section className="w369-hero" ref={ref} data-jar="01" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="w369-hero-copy">
        <p className="w369-eyebrow">
          <Glyph name="sparkle" size={15} />
          نظام تشغيل الجامعة — عربي أولًا
        </p>
        <h1 className="w369-h1">
          جامعةٌ تعمل
          <span className="w369-em">
            في نظام واحد
            <svg className="w369-underline" viewBox="0 0 240 16" aria-hidden="true" preserveAspectRatio="none">
              <path d="M3 12 C60 4 150 3 237 9" fill="none" strokeWidth="5" strokeLinecap="round" stroke="var(--gold)" />
            </svg>
          </span>
        </h1>
        <p className="w369-lead">
          المقرّرات والمحاضرات والتقييم والحضور ومؤشّرات الجودة في نظام واحد يربط الطالب
          وعضو الهيئة والإدارة. لا أدوات متناثرة، ولا أرقام لا تُقاس: كل ما يحدث في
          المقرّر يُسجَّل، ويُقرأ، ويُبنى عليه.
        </p>
        <div className="w369-hero-actions">
          <Link to={ROUTES.authRegister} className="w369-btn w369-btn-primary w369-btn-lg">
            أنشئ حسابك الجامعي
            <Glyph name="arrowLeft" size={18} className="ui-glyph-nudge" />
          </Link>
          <Link to={ROUTES.auth} className="w369-btn w369-btn-ghost">لديك حساب؟ تسجيل الدخول</Link>
          <button type="button" className="w369-tour-btn" onClick={() => setTour(true)}>
            <span className="w369-tour-play" aria-hidden="true"><Glyph name="live" size={16} /></span>
            شاهد الجولة · 0:30
          </button>
        </div>
        {/* mounted only while open — the funnel counts exactly five primary
            doors in the page itself, and the dialog is a layer, not a sixth */}
        {tour && <TourDialog onClose={() => setTour(false)} />}
        <ul className="w369-hero-facts">
          <li><Glyph name="certificate" size={16} /> للطلّاب وأعضاء الهيئة والإدارة</li>
          <li><Glyph name="target" size={16} /> نقاط إتقان من الإنجاز المسجَّل</li>
          <li><Glyph name="leaderboard" size={16} /> مؤشّرات جودة قابلة للتتبّع</li>
          <li><Glyph name="certificate" size={16} /> شهادات وسجلات موثّقة</li>
        </ul>
      </div>

      <a className="w369-hero-cue" href="#story">
        <span className="w369-hero-cue-dot" aria-hidden="true" />
        تابع الأقسام
      </a>

      <div className="w369-hero-art" ref={artRef}>
        <div className="w369-phone" aria-hidden="false" role="img"
             aria-label="عرض توضيحي لشاشة الطالب في أُلارا: قائمة واجبات ومحاضرات مع شريط تقدّم">
          <div className="w369-phone-top">
            <span className="w369-phone-dot" />
            <span className="w369-phone-time">9:41</span>
          </div>
          <div className="w369-phone-screen">
            <div className="w369-phone-greet">
              <span className="w369-phone-avatar" aria-hidden="true">س</span>
              <div>
                <p className="w369-phone-hi">الأحد · 24 نوفمبر</p>
                <p className="w369-phone-sub">سارة العتيبي · الأدب الحديث</p>
              </div>
            </div>
            <div className="w369-phone-stars">
              <Glyph name="target" size={18} />
              <b>{points}</b> <span>نقطة إتقان اليوم</span>
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
              <b>62٪</b>
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
  'شهادات وسجلات', 'لوحة تقدّم المقرّر', 'مكتبة وبحوث', 'تقارير الجودة',
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
  /** anchor target for the nav (#story, #levels …) */
  id?: string;
  /** index in the top bar's stage navigator */
  stage?: string;
}

function Band({ n, kicker, title, body, tint, icon, children, jar, id, stage }: BandProps) {
  return (
    <section className="w369-band" id={id} data-tint={tint} data-jar={jar} data-stage={stage}>
      <div className="w369-band-head">
        <span className="w369-band-num" aria-hidden="true">{n}</span>
        <p className="w369-band-kicker"><Glyph name={icon} size={15} />{kicker}</p>
        <h2 className="w369-h2">{title}</h2>
        <p className="w369-body">{body}</p>
      </div>
      <div className="w369-band-body" ref={useReveal<HTMLDivElement>()}>{children}</div>
    </section>
  );
}

/* ── shared: the burst ── */

/**
 * The earned-points note. r369-mat r1 replaced the six-spark confetti with
 * this: one line that rises and fades. A university product confirms an
 * entry; it does not throw a party over it.
 */
function PointsGain({ seed, n }: { seed: number; n: number }) {
  return (
    <span className="w369-gain" key={seed} aria-hidden="true">
      +{n}
    </span>
  );
}

/* ── 02 the today list: tap a task, earn its stars ── */

const TODAY_TASKS = [
  { id: 't1', icon: 'book', title: 'واجب تحليل النصّ الأدبي', course: 'الأدب الحديث', stars: 3 },
  { id: 't2', icon: 'graduation', title: 'محاضرة مدخل إلى الإحصاء', course: 'الإحصاء التطبيقي', stars: 5 },
  { id: 't3', icon: 'target', title: 'اختبار قصير في الجبر الخطّي', course: 'الجبر الخطّي', stars: 4 },
  { id: 't4', icon: 'assignment', title: 'ورشة الكتابة الأكاديمية', course: 'مهارات أكاديمية', stars: 6 },
  { id: 't5', icon: 'certificate', title: 'مراجعة ملفّ المشروع', course: 'مشروع التخرّج', stars: 7 },
] as const;

/** the weekly goal, and where the three milestone ticks sit on it */
const WEEK_GOAL = 25;
const MILESTONES = [5, 15, 25] as const;

export function StarsBand() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [seed, setSeed] = useState(0);
  const [burstAt, setBurstAt] = useState<string | null>(null);
  const collected = TODAY_TASKS.reduce((n, t) => (done[t.id] ? n + t.stars : n), 0);
  const count = TODAY_TASKS.filter((t) => done[t.id]).length;
  const pct = Math.round((collected / WEEK_GOAL) * 100);
  const goalMet = collected >= WEEK_GOAL;

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) { setSeed((n) => n + 1); setBurstAt(id); }
      else setBurstAt(null);
      return next;
    });
  };

  return (
    <Band
      n="02" jar="02" tint="violet" icon="sparkle" id="story" stage="0"
      kicker="من الإنجاز إلى النقطة"
      title={<>كل إنجاز<br /><span className="w369-em">يُقاس بصدق</span></>}
      body="الواجب والمحاضرة والاختبار القصير — كلٌّ منها يُسجَّل لحظة إتمامه ويُحوَّل إلى نقاط إتقان. هذه هي القائمة كما يراها الطالب صباحًا."
    >
      <div className="w369-today">
        <div className="w369-today-head">
          <div>
            <span className="w369-chip w369-chip-amber">
              <Glyph name="calendar" size={14} />اليوم
            </span>
            <p className="w369-today-count">
              <b aria-live="polite">{count}</b>
              <span> من {TODAY_TASKS.length} مهامّ</span>
            </p>
            <p className="w369-today-earn" data-on={collected > 0 ? 'true' : 'false'}>
              <Glyph name="target" size={14} />+{collected} نقطة إتقان اليوم
            </p>
          </div>
          <div className="w369-goal" data-met={goalMet ? 'true' : 'false'}>
            <span className="w369-goal-num"><b>{collected}</b> / {WEEK_GOAL}</span>
            <span className="w369-goal-track" aria-hidden="true">
              <span
                className="w369-goal-fill"
                style={{ transform: `scaleX(${Math.min(1, pct / 100)})` }}
              />
              {MILESTONES.map((m) => (
                <span
                  key={m}
                  className="w369-goal-tick"
                  data-hit={collected >= m ? 'true' : 'false'}
                  style={{ insetInlineStart: `${(m / WEEK_GOAL) * 100}%` }}
                >
                  <Glyph name="check" size={10} />
                </span>
              ))}
            </span>
            <span className="w369-fine">
              {goalMet ? 'اكتمل هدف الأسبوع — 25 نقطة' : `هدف الأسبوع: ${WEEK_GOAL} نقطة`}
            </span>
          </div>
        </div>

        <ul className="w369-tasks">
          {TODAY_TASKS.map((t) => {
            const on = !!done[t.id];
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className="w369-task"
                  data-done={on ? 'true' : 'false'}
                  aria-pressed={on}
                  onClick={() => toggle(t.id)}
                >
                  <span className="w369-task-ico"><Glyph name={t.icon} size={18} /></span>
                  <span className="w369-task-text">
                    <b>{t.title}</b>
                    <span>{t.course}</span>
                  </span>
                  <span className="w369-task-stars" aria-hidden="true">
                    {t.stars}
                  </span>
                  <span className="w369-task-check" aria-hidden="true">
                    {on ? <Glyph name="check" size={16} /> : <span className="w369-task-ring" />}
                  </span>
                  {burstAt === t.id && on && <PointsGain seed={seed} n={t.stars} />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="w369-fine">
          نموذج تفاعلي بمهامّ توضيحية، لا بيانات حساب. في المنصّة تُحتسب النقاط من الإنجاز المسجَّل وحده.
        </p>
      </div>
    </Band>
  );
}

/* ── 03 the rolling counter: /30, by scroll and by tap ── */

/* the lane, in a 400x110 box; the CSS offset-path below is the SAME curve */
const ROAD_D = 'M12 92 C 110 92, 110 22, 200 44 S 300 98, 388 22';

const FIRST_STEP = { at: 0, msg: 'المسار يبدأ من هنا.' };
const PROGRESS_STEPS = [
  FIRST_STEP,
  { at: 10, msg: 'ربع المسار: صار التقدّم مقروءًا.' },
  { at: 20, msg: 'ثلثا المسار: الإتقان يتراكم.' },
  { at: 30, msg: 'المسار مكتمل — وهذه شهادة المقرّر.' },
];

/* three courses with different weights: the same 30 points land at a
   different mastery on each, which is the point of a matrix */
const MASTERY_ROWS = [
  { label: 'الأدب الحديث', scale: 100, tone: 'violet' },
  { label: 'الإحصاء التطبيقي', scale: 68, tone: 'teal' },
  { label: 'الجبر الخطّي', scale: 84, tone: 'coral' },
] as const;

function RollingDigits({ value, total }: { value: number; total: number }) {
  const digits = String(value).padStart(String(total).length, '0').split('');
  return (
    <span className="w369-rollnum" aria-hidden="true">
      {digits.map((d, i) => (
        <span key={i} className="w369-roll">
          <span
            className="w369-roll-strip"
            style={{ ['--dig' as string]: String(d) } as React.CSSProperties}
            aria-hidden="true"
          >
            {Array.from({ length: 10 }).map((_, n) => <span key={n}>{n}</span>)}
          </span>
        </span>
      ))}
      <span className="w369-roll-total">/{total}</span>
    </span>
  );
}

/* desktop + motion allowed: the stars band becomes a pinned scene (see
   landing/r369.css "round 3 — the pinned scene"; the query is mirrored there) */
const PINNED_Q = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

export function ProgressBand() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [byScroll, setByScroll] = useState(0);
  const [extra, setExtra] = useState(0);
  const TOTAL = 30;

  /* scroll drives the counter: how far this card has travelled through
   * the viewport, 0 → 30. Reduce-motion readers still get the number
   * (it is content), they simply get no interpolation. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const sec = el.closest('section');
      const pinned = !!sec && window.matchMedia(PINNED_Q).matches;
      let p: number;
      if (pinned && sec) {
        /* r369 round 3 — the pinned scene: the band is ~2 screens tall
         * and its card stays seated while the page scrolls past, so the
         * counter reads the band's own travel (0 when its top reaches the
         * bar, 30 when its bottom leaves). */
        const b = sec.getBoundingClientRect();
        const travel = Math.max(1, b.height - window.innerHeight);
        p = Math.min(1, Math.max(0, -b.top / travel));
      } else {
        const box = el.getBoundingClientRect();
        const span = window.innerHeight + box.height;
        p = Math.min(1, Math.max(0, (window.innerHeight - box.top) / span));
      }
      setByScroll(Math.round(p * TOTAL));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const value = Math.min(TOTAL, Math.max(0, byScroll + extra));
  const step = [...PROGRESS_STEPS].reverse().find((x) => value >= x.at) ?? FIRST_STEP;

  /* the road's geometry is read off the SVG path itself (one curve, one
     truth): a point at pct% of its length, expressed as % of the 400x110
     box so it scales with the container. Before the path mounts, the
     start point. */
  const roadRef = useRef<SVGPathElement>(null);
  const roadAt = (pct: number): React.CSSProperties => {
    const el = roadRef.current;
    const len = el?.getTotalLength?.() ?? 0;
    const pt = el && len ? el.getPointAtLength((pct / 100) * len) : { x: 12, y: 92 };
    return { left: `${(pt.x / 400) * 100}%`, top: `${(pt.y / 110) * 100}%` };
  };
  const [, setRoadReady] = useState(false);
  useEffect(() => setRoadReady(true), []);

  return (
    <Band
      n="03" jar="03" tint="teal" icon="leaderboard" id="stars" stage="1"
      kicker="من النقطة إلى التقدّم"
      title={<>النقاط تصير<br /><span className="w369-em">تقدّمًا مقروءًا</span></>}
      body="الأرقام لا تبقى متناثرة: تتجمّع في تقدّم المقرّر ومصفوفة الإتقان، فتعرف أين أنت وأين الخطوة التالية."
    >
      <div className="w369-meter" ref={ref} data-step={String(PROGRESS_STEPS.indexOf(step))}>
        <div className="w369-meter-head">
          <span className="w369-chip"><Glyph name="target" size={14} />مصفوفة الإتقان</span>
          <span className="w369-chip w369-chip-soft">نموذج توضيحي</span>
        </div>
        <div className="w369-meter-body">
          <div className="w369-meter-num">
            <RollingDigits value={value} total={TOTAL} />
            <span className="w369-meter-unit">نقطة إتقان من ثلاثين</span>
            <p className="w369-meter-msg" aria-live="polite">{step.msg}</p>
            <button
              type="button"
              className="w369-btn w369-btn-small"
              onClick={() => setExtra((n) => (n >= TOTAL ? 0 : n + 1))}
            >
              <Glyph name="target" size={14} />
              {extra >= TOTAL ? 'أعد من البداية' : 'أضف نقطة'}
            </button>
          </div>
        </div>
        {/* r369 round 3 — the mastery road (the reference's "progress you
            can actually see" road, in our unit): ONE winding lane from
            the start to the course certificate. The gold fill, the
            marker and the milestone stars all read the SAME `value` the
            counter shows (pathLength=100 -> % of 30), so the road is the
            number drawn, never a second figure. Decorative: the counter
            and the rows already carry the information for assistive tech. */}
        <div className="w369-road" aria-hidden="true" style={{ ['--p' as string]: (value / TOTAL) * 100 }}>
          <svg viewBox="0 0 400 110" preserveAspectRatio="none" className="w369-road-svg">
            <path ref={roadRef} className="w369-road-lane" d={ROAD_D} pathLength={100} />
            <path className="w369-road-fill" d={ROAD_D} pathLength={100} />
          </svg>
          {PROGRESS_STEPS.slice(1).map((x) => (
            <span
              key={x.at}
              className="w369-road-stop"
              data-hit={value >= x.at ? 'true' : 'false'}
              style={roadAt((x.at / TOTAL) * 100)}
            />
          ))}
          <span className="w369-road-dot" style={roadAt((value / TOTAL) * 100)} />
        </div>
        <ul className="w369-meter-rows">
          {PROGRESS_STEPS.slice(1).map((x) => (
            <li key={x.at} data-hit={value >= x.at ? 'true' : 'false'}>
              <span className="w369-meter-dot" aria-hidden="true" />
              <b>{x.at}</b>
              <span>{x.msg}</span>
            </li>
          ))}
        </ul>

        {/* the matrix the counter feeds: three courses, one scale */}
        <div className="w369-matrix">
          <div className="w369-matrix-head">
            <span>المصفوفة</span>
            <span>الإتقان</span>
          </div>
          <ul>
            {MASTERY_ROWS.map((r) => {
              /* the bars answer the same number as the counter: nothing
               * here is a separate figure the page made up */
              const pct = Math.min(100, Math.round((value / TOTAL) * r.scale));
              return (
                <li key={r.label} data-tone={r.tone}>
                  <span className="w369-matrix-course">{r.label}</span>
                  <span className="w369-matrix-bar" aria-hidden="true">
                    <i style={{ transform: `scaleX(${pct / 100})` }} />
                  </span>
                  <b className="w369-matrix-pct">{pct}٪</b>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Band>
  );
}

/* ── 04 rewards: costs, an 18-star fill, and the unlocked state ── */

const REWARDS = [
  { id: 'r1', icon: 'medal', title: 'شارة الإنجاز', cost: 6, body: 'تُفتح عند إتمام هدف حقيقي — أول واجب، أول أسبوع كامل، أول إتقان.' },
  { id: 'r2', icon: 'trophy', title: 'لوحة تقدّم المقرّر', cost: 12, body: 'موضعك بين زملائك في المقرّر، محسوبًا من نقاط الإتقان لا من الحظّ.' },
  { id: 'r3', icon: 'certificate', title: 'شهادة المقرّر', cost: 18, body: 'شهادة عند إكمال المقرّر، جاهزة للتنزيل وموثّقة داخل حسابك.' },
] as const;

const WALLET_MAX = 18;

export function RewardsBand() {
  const [wallet, setWallet] = useState(0);
  const opened = REWARDS.filter((r) => wallet >= r.cost).length;
  return (
    <Band
      n="04" jar="04" tint="coral" icon="medal" id="progress" stage="2"
      kicker="من التقدّم إلى التوثيق"
      title={<>والتقدّم؟<br /><span className="w369-em">يُوثَّق</span></>}
      body="عندما يتراكم الإتقان تصبح له علامات موثّقة: شارة إنجاز، وموضع في لوحة تقدّم المقرّر، وشهادة عند إكماله. الأخيرة تُفتح عند 18 نقطة."
    >
      <div className="w369-wallet" data-opened={String(opened)}>
        <div className="w369-wallet-head">
          <span className="w369-chip w369-chip-amber"><Glyph name="target" size={14} />رصيد النقاط</span>
          <span className="w369-wallet-num"><b>{wallet}</b> / {WALLET_MAX}</span>
          <button
            type="button"
            className="w369-btn w369-btn-small"
            onClick={() => setWallet((n) => (n >= WALLET_MAX ? 0 : n + 1))}
          >
            {wallet >= WALLET_MAX ? 'صفّر الرصيد' : 'أضف نقطة'}
          </button>
        </div>
        <span className="w369-wallet-track" aria-hidden="true">
          {Array.from({ length: WALLET_MAX }).map((_, i) => (
            <span key={i} className="w369-wallet-pip" data-on={i < wallet ? 'true' : 'false'} />
          ))}
        </span>
        <ul className="w369-reward-grid">
          {REWARDS.map((r) => {
            const open = wallet >= r.cost;
            return (
              <li key={r.id} className="w369-reward" data-open={open ? 'true' : 'false'}>
                <span className="w369-reward-ico"><Glyph name={r.icon} size={22} /></span>
                <h3 className="w369-h3">{r.title}</h3>
                <p className="w369-body">{r.body}</p>
                <span className="w369-reward-cost">{r.cost} نقطة</span>
                <span className="w369-reward-state">
                  {open ? <><Glyph name="check" size={14} />مفتوحة</> : <>تحتاج {r.cost - wallet} نقطة أخرى</>}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="w369-wallet-note">
          <span className="w369-wallet-note-label">كيف تُحتسب؟</span>
          <span className="w369-wallet-note-chip">واجب مُسلَّم · 3</span>
          <span className="w369-wallet-note-chip">اختبار مُجتاز · 4</span>
          <span className="w369-wallet-note-chip">محاضرة محضورة · 2</span>
          <span className="w369-fine">من السجل الأكاديمي نفسه، بلا إدخال يدوي.</span>
        </div>
      </div>
    </Band>
  );
}

/* ── 05 rewards become habits (Sat → Fri, the Gulf week) ── */

const WEEK = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const WEEK_ON = 5;

export function HabitsBand() {
  return (
    <Band
      n="05" jar="05" tint="sky" icon="flame" id="rewards" stage="3"
      kicker="من التوثيق إلى الانتظام"
      title={<>والانتظام<br /><span className="w369-em">لا الضغط</span></>}
      body="سلسلة النشاط ليست عدّادًا للضغط، بل قياسًا هادئًا للاستمرار. أُلارا تحفظ وتيرتك، وتتوقّف بلا عقوبة إن انقطع يوم، وتُظهر الصورة الأسبوعية كما هي."
    >
      <div className="w369-streak">
        <div className="w369-streak-head">
          <span className="w369-streak-flame"><Glyph name="flame" size={22} className="ui-glyph-flicker" /></span>
          <div>
            <b>سلسلة النشاط — هذا الأسبوع</b>
            <span>خمسة أيام من سبعة، كما تُحسب في المنصّة.</span>
          </div>
          <span className="w369-streak-total"><b>{WEEK_ON}</b><span> أيام</span></span>
        </div>
        <ul className="w369-streak-days">
          {WEEK.map((d, i) => (
            <li key={d} data-on={i < WEEK_ON ? 'true' : 'false'}>
              <span className="w369-streak-dot">
                {i < WEEK_ON ? <Glyph name="star" size={16} /> : <span className="w369-streak-empty" />}
              </span>
              <span className="w369-streak-day">{d}</span>
            </li>
          ))}
        </ul>
        <p className="w369-fine">
          تُحسب من النشاط المسجَّل فقط، وتتوقّف عند الغياب بلا عقوبة ولا تصفير مُفاجئ.
        </p>
        <ul className="w369-rules">
          <li><Glyph name="check" size={14} />تُقرأ من السجل الأكاديمي، لا من إدخال يدوي.</li>
          <li><Glyph name="check" size={14} />العطلة الرسمية لا تُحتسب يومًا فائتًا.</li>
          <li><Glyph name="check" size={14} />لا إشعارات ليلية ولا ضغط سلوكي: تقرير أسبوعي واحد.</li>
        </ul>
      </div>
    </Band>
  );
}

/* ── 06 the 20-level ladder, each level with its own drawing ── */

const LEVELS = [
  'بذرة', 'برعمة', 'خطوة', 'طريق', 'مصباح', 'فجر', 'شمس', 'مدار', 'قمر', 'نجم',
  'كوكبة', 'سماء', 'قوس', 'منارة', 'برج', 'قلعة', 'أفق', 'قمّة', 'تاج', 'المعلّم',
];

/**
 * Twenty distinct badges, drawn from one rule instead of twenty files:
 * the ring's rays grow every five levels, the inner mark changes tier,
 * and the ink moves from leaf → sky → violet → amber → coral. Original
 * geometry, generated — no borrowed badges.
 */
function LevelBadge({ level, size = 40 }: { level: number; size?: number }) {
  const tier = Math.floor(level / 5);            // 0..3
  const rays = 3 + (level % 5);                  // 3..7
  /* rays are ticks OUTSIDE the ring: r 18 → 21.5. They mark the level's
   * place in its tier without drawing a wheel across the badge. */
  const rail = Array.from({ length: rays }).map((_, i) => {
    const a = (Math.PI * 2 * i) / rays - Math.PI / 2;
    return (
      <line
        key={i}
        x1={24 + Math.cos(a) * 18.4}
        y1={24 + Math.sin(a) * 18.4}
        x2={24 + Math.cos(a) * 21.6}
        y2={24 + Math.sin(a) * 21.6}
      />
    );
  });
  const marks = ['leaf', 'sky', 'violet', 'amber'] as const;
  return (
    <svg
      className="w369-badge-svg" width={size} height={size} viewBox="0 0 48 48"
      data-tier={marks[tier]} aria-hidden="true" focusable="false"
    >
      {rail}
      <circle cx="24" cy="24" r="14.5" className="w369-badge-ring" />
      <circle cx="24" cy="24" r="10.5" className="w369-badge-inner" />
      {tier >= 2 && <circle cx="24" cy="24" r="20" className="w369-badge-halo" />}
      <circle cx="24" cy="24" r={tier === 0 ? 3.4 : tier === 1 ? 4.2 : tier === 2 ? 5 : 5.6} className="w369-badge-core" />
      {tier === 3 && <path d="M18 24.5 22.5 29 31 19.5" className="w369-badge-tick" />}
    </svg>
  );
}

export function LevelsBand() {
  const [picked, setPicked] = useState(0);
  const name = LEVELS[picked];
  return (
    <Band
      n="06" jar="06" tint="leaf" icon="admin" id="levels" stage="4"
      kicker="سلّم الإتقان — عشرون مستوى"
      title={<>سلّمٌ من<br /><span className="w369-em">عشرين مستوى</span></>}
      body="من «بذرة» إلى «المعلّم»: تدرّج إتقان بأسماء عربية أصيلة، ولكل مستوى شارة مرسومة له وحده. اختر مستوى لترى تعريفه."
    >
      <div className="w369-levels">
        <div className="w369-levels-head">
          <span className="w369-chip w369-chip-amber"><Glyph name="star" size={14} />المستوى {picked + 1} من 20</span>
          <span className="w369-fine">أسماء السلّم وشاراته من تصميم أُلارا، وتُمنح حسب نقاط الإتقان.</span>
        </div>
        <div className="w369-levels-stage">
          <span className="w369-levels-big" aria-hidden="true"><LevelBadge level={picked} size={132} /></span>
          <div className="w369-levels-read">
            <b className="w369-levels-name">{name}</b>
            <span className="w369-levels-idx">المستوى {picked + 1} / 20</span>
            <span className="w369-levels-tier">
              {['بذور', 'مسارات', 'منائر', 'قمم'][Math.floor(picked / 5)]}
            </span>
          </div>
        </div>
        <ul className="w369-tiers">
          {[
            { name: 'بذور', range: '1–5' },
            { name: 'مسارات', range: '6–10' },
            { name: 'منائر', range: '11–15' },
            { name: 'قمم', range: '16–20' },
          ].map((t, i) => (
            <li key={t.name} data-on={Math.floor(picked / 5) === i ? 'true' : 'false'}>
              <b>{t.name}</b>
              <span>{t.range}</span>
            </li>
          ))}
        </ul>
        <ol className="w369-levels-grid">
          {LEVELS.map((n, i) => (
            <li key={n}>
              <button
                type="button"
                className="w369-level"
                data-on={i === picked ? 'true' : 'false'}
                aria-pressed={i === picked}
                onClick={() => setPicked(i)}
              >
                <span className="w369-level-badge"><LevelBadge level={i} size={30} /></span>
                <span className="w369-level-idx">{i + 1}</span>
                <span className="w369-level-name">{n}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </Band>
  );
}

/* ── 07 the hand-off: four steps, two phones, one approval ── */

const HANDOFF = [
  { n: '01', title: 'الطالب يُنجز', body: 'يُسلّم الواجب أو يُكمل الاختبار داخل أُلارا، فتُسجَّل النتيجة فورًا.' },
  { n: '02', title: 'تُحتسب النقاط', body: 'نقاط الإتقان تُحسب تلقائيًّا من الإنجاز — لا إدخال يدوي ولا انتظار.' },
  { n: '03', title: 'عضو الهيئة يرى', body: 'تصل المتابعة إلى صفّه: من أنجز، ومن يحتاج تدخّلًا، وأين الإتقان الحقيقي.' },
  { n: '04', title: 'الإدارة تُعتمد', body: 'البرنامج والمقرّر والمؤشّرات تُدار من مساحة واحدة، والاعتماد يمرّ بخطوة واحدة.' },
] as const;

export function ShowcaseBand() {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [approval, setApproval] = useState<'idle' | 'sent' | 'approved'>('idle');
  return (
    <section className="w369-handoff" id="handoff">
      <header className="w369-band-head">
        <p className="w369-band-kicker"><Glyph name="users" size={15} />كيف ينتقل الإنجاز بين الأدوار</p>
        <h2 className="w369-h2">خطوةٌ من الطالب،<br /><span className="w369-em">تصل إلى الإدارة</span></h2>
        <p className="w369-body">
          أربع خطوات لا أكثر: يُنجز الطالب، فتُحتسب نقاط الإتقان، فيراها عضو الهيئة، فتعتمدها الإدارة.
          بدّل بين الهاتفين لترى الطرفين.
        </p>
      </header>

      <ol className="w369-steps">
        {HANDOFF.map((h) => (
          <li key={h.n} className="w369-step">
            <span className="w369-step-n">{h.n}</span>
            <b>{h.title}</b>
            <span>{h.body}</span>
          </li>
        ))}
      </ol>

      <div className="w369-two">
        <div className="w369-two-switch" role="group" aria-label="اختر الدور">
          <button
            type="button" className="w369-two-tab" aria-pressed={role === 'student'}
            onClick={() => setRole('student')}
          >
            <Glyph name="student" size={16} />هاتف الطالب
          </button>
          <button
            type="button" className="w369-two-tab" aria-pressed={role === 'teacher'}
            onClick={() => setRole('teacher')}
          >
            <Glyph name="teacher" size={16} />هاتف عضو الهيئة
          </button>
        </div>

        <div className="w369-two-phones" data-role={role}>
          <div className="w369-phone w369-phone-back" aria-hidden={role === 'student'}>
            <div className="w369-phone-screen">
              <div className="w369-mini-head">
                <b>متابعة الصفّ</b><span>الأدب الحديث · 24 طالبًا</span>
              </div>
              <ul className="w369-mini-list">
                <li><span>نورة الحربي</span><b>12 نقطة</b></li>
                <li><span>سلمان القحطاني</span><b>9 نقاط</b></li>
                <li data-warn="true"><span>ريم الزهراني</span><b>تحتاج متابعة</b></li>
              </ul>
              <button
                type="button"
                className="w369-btn w369-btn-small w369-mini-cta"
                /* r369 slice 06 (Lighthouse aria-hidden-focus): when the
                   role toggle hides this phone (student mode), the CTA
                   must leave the tab order with it — an aria-hidden
                   ancestor may never hold a focusable. The demo itself
                   is unchanged in teacher mode. */
                disabled={role === 'student' || approval === 'approved'}
                onClick={() => setApproval(approval === 'idle' ? 'sent' : 'approved')}
              >
                {approval === 'idle' && <><Glyph name="check" size={14} />أرسل طلب اعتماد</>}
                {approval === 'sent' && <>بانتظار الإدارة…</>}
                {approval === 'approved' && <><Glyph name="check" size={14} />معتمد</>}
              </button>
              <p className="w369-mini-note" role="status">
                {approval === 'approved'
                  ? 'وصل الاعتماد إلى لوحة الإدارة.'
                  : approval === 'sent'
                    ? 'أُرسل الطلب — بانتظار اعتماد الإدارة.'
                    : 'الاعتماد يمرّ بخطوة واحدة.'}
              </p>
            </div>
          </div>

          <div className="w369-phone w369-phone-front">
            <div className="w369-phone-screen">
              <div className="w369-mini-head">
                <b>صباح الخير، سارة</b><span>اليوم · 3 مهامّ</span>
              </div>
              <ul className="w369-mini-list">
                <li data-done="true"><span>واجب تحليل النصّ</span><b>✓ 3</b></li>
                <li data-done="true"><span>اختبار الجبر</span><b>✓ 4</b></li>
                <li><span>ورشة الكتابة</span><b>6</b></li>
              </ul>
              <div className="w369-mini-progress">
                <span>تقدّم المقرّر</span><b>78٪</b>
              </div>
              <p className="w369-mini-note">نموذج توضيحي لواجهة الطالب.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 08 the showcase: seven real surfaces, one at a time ── */

const FIRST_SLIDE = { title: 'لوحة الطالب', body: 'المهامّ ونقاط الإتقان والتقدّم في شاشة واحدة.', screen: 'dashboard' };
const SLIDES = [
  FIRST_SLIDE,
  { title: 'قائمة اليوم', body: 'ما يجب أن يُنجز الآن، مرتّبًا بالأولوية.', screen: 'today' },
  { title: 'مصفوفة الإتقان', body: 'ما أتقنته وما يحتاج مراجعة، بمقرّر.', screen: 'mastery' },
  { title: 'لوحة تقدّم المقرّر', body: 'تقدّم الصفّ بنقاط الإتقان، يراه عضو الهيئة ويتابعه.', screen: 'leaderboard' },
  { title: 'سلّم المستويات', body: 'عشرون مستوى وشارة لكل واحد.', screen: 'levels' },
  { title: 'مساحة عضو الهيئة', body: 'الصفّ كاملًا في شاشة، والمتابعة بخطوة.', screen: 'teacher' },
  { title: 'لوحة الجودة', body: 'مؤشّرات البرنامج والمقرّر في مكان واحد.', screen: 'quality' },
] as const;

/**
 * Seven small screens that actually say something — each is a labelled
 * demonstration built from the same primitives as the page, so a reader
 * can tell the student dashboard from the quality console at a glance.
 * Every one is marked «نموذج توضيحي»; none of them shows invented data
 * beyond the fixed demo numbers the rest of the page uses.
 */
interface MiniView { head: string; meta: string; rows: [string, string][] }
const DEFAULT_VIEW: MiniView = {
  head: 'اليوم', meta: '3 مهامّ · 24 نقطة',
  rows: [['واجب تحليل النصّ', '✓ 3'], ['اختبار الجبر الخطّي', '✓ 4'], ['ورشة الكتابة', '6']],
};

function MiniScreen({ screen }: { screen: string }) {
  const views: Record<string, MiniView> = {
    dashboard: DEFAULT_VIEW,
    today: {
      head: 'قائمة اليوم', meta: 'مرتّبة بالأولوية',
      rows: [['الواجب — الأدب الحديث', '3'], ['المحاضرة — 9:00', '2'], ['الاختبار — غدًا', '4']],
    },
    mastery: {
      head: 'مصفوفة الإتقان', meta: 'الأدب الحديث',
      rows: [['التحليل السردي', '92٪'], ['الشعر الحديث', '78٪'], ['النقد التطبيقي', '54٪']],
    },
    leaderboard: {
      head: 'لوحة تقدّم المقرّر', meta: '24 طالبًا',
      rows: [['نورة الحربي', '42'], ['سلمان القحطاني', '38'], ['سارة العتيبي', '34']],
    },
    levels: {
      head: 'سلّم الإتقان', meta: 'المستوى 7 من 20',
      rows: [['فجر', 'مُكتمل'], ['شمس', 'الحالي'], ['مدار', 'مقفل']],
    },
    teacher: {
      head: 'متابعة الصفّ', meta: 'الأدب الحديث',
      rows: [['أنجزوا الواجب', '19 / 24'], ['تحتاج متابعة', '3'], ['متوسّط الإتقان', '71٪']],
    },
    quality: {
      head: 'مؤشّرات البرنامج', meta: 'الفصل الأول',
      rows: [['نسبة الاكتمال', '86٪'], ['رضا الطلّاب', '4.2 / 5'], ['مقرّرات تحت المراجعة', '2']],
    },
  };
  const view = views[screen] ?? DEFAULT_VIEW;
  return (
    <div className="w369-mini-ui" data-screen={screen}>
      <div className="w369-mini-head"><b>{view.head}</b><span>{view.meta}</span></div>
      <ul className="w369-mini-list">
        {view.rows.map(([label, value]) => (
          <li key={label}><span>{label}</span><b>{value}</b></li>
        ))}
      </ul>
      <div className="w369-mini-bars" aria-hidden="true">
        {[72, 54, 88, 63].map((w, i) => (
          <i key={i} style={{ transform: `scaleX(${w / 100})` }} />
        ))}
      </div>
      <p className="w369-mini-note">نموذج توضيحي للواجهة.</p>
    </div>
  );
}

export function CarouselBand() {
  const [i, setI] = useState(0);
  const total = SLIDES.length;
  const go = (d: number) => setI((n) => (n + d + total) % total);
  const slide = SLIDES[i] ?? FIRST_SLIDE;
  return (
    <section className="w369-show" id="showcase">
      <header className="w369-band-head">
        <p className="w369-band-kicker"><Glyph name="compass" size={15} />من داخل المنصّة</p>
        <h2 className="w369-h2">سبع شاشات،<br /><span className="w369-em">لغة واحدة</span></h2>
      </header>
      <div
        className="w369-carousel"
        role="group"
        aria-roledescription="عرض شرائح"
        aria-label="شاشات أُلارا"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); go(-1); }
        }}
        tabIndex={0}
      >
        <div className="w369-slide-copy">
          <span className="w369-slide-count" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}<i />{String(total).padStart(2, '0')}
          </span>
          <h3 className="w369-h3" aria-live="polite">{slide.title}</h3>
          <p className="w369-body">{slide.body}</p>
          <div className="w369-slide-nav">
            <button type="button" className="w369-arrow" onClick={() => go(-1)} aria-label="السابق">
              <Glyph name="arrowRight" size={18} />
            </button>
            <button type="button" className="w369-arrow" onClick={() => go(1)} aria-label="التالي">
              <Glyph name="arrowLeft" size={18} />
            </button>
          </div>
          <ul className="w369-dots">
            {SLIDES.map((s, n) => (
              <li key={s.title}>
                <button
                  type="button" className="w369-dot" data-on={n === i ? 'true' : 'false'}
                  aria-label={`الشريحة ${n + 1}: ${s.title}`} aria-pressed={n === i}
                  onClick={() => setI(n)}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="w369-slide-screen" data-screen={slide.screen} aria-hidden="true">
          <div className="w369-phone">
            <div className="w369-phone-screen">
              <div className="w369-mini-head"><b>{slide.title}</b><span>نموذج توضيحي</span></div>
              <MiniScreen screen={slide.screen} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 08 the principles, the true trust block, the audiences ── */

const PRINCIPLES = [
  { icon: 'shield', title: 'بياناتك لك', body: 'لا إعلانات، ولا بيع بيانات، وحذف حسابك متاح في أي وقت من إعداداتك.' },
  { icon: 'compass', title: 'عربية أولًا', body: 'الواجهة كلها من اليمين إلى اليسار، والأرقام والمصطلحات كما تُكتب في جامعاتنا.' },
  { icon: 'target', title: 'لا أرقام مُجمّلة', body: 'كل رقم في المنصّة مشتقّ من إنجاز مسجّل — لا تقديرات ولا نقاط تُدخل يدويًّا.' },
  { icon: 'users', title: 'أدوار واضحة', body: 'الطالب وعضو الهيئة والإدارة والجودة يروْن ما يخصّهم فقط، بصلاحيات محدّدة.' },
] as const;

const AUDIENCES = [
  { icon: 'graduation', title: 'الكليات والبرامج', body: 'مقرّرات وبرامج ومؤشّرات في مساحة واحدة.', to: ROUTES.colleges },
  { icon: 'teacher', title: 'أعضاء الهيئة', body: 'متابعة الصفّ ومصفوفة الإتقان دون جداول يدوية.', to: '/capabilities' },
  { icon: 'admin', title: 'مراكز الجودة', body: 'تقارير ومؤشّرات جاهزة للاعتماد الداخلي.', to: '/vision' },
] as const;

export function PrinciplesBand() {
  return (
    <section className="w369-principles" id="principles">
      <header className="w369-band-head">
        <p className="w369-band-kicker"><Glyph name="shield" size={15} />ما لا نتنازل عنه</p>
        <h2 className="w369-h2">أربعة مبادئ،<br /><span className="w369-em">مكتوبة لا معلّقة</span></h2>
      </header>
      <ul className="w369-principle-grid" data-stagger="">
        {PRINCIPLES.map((p) => (
          <li key={p.title} className="w369-principle">
            <span className="w369-principle-ico"><Glyph name={p.icon} size={20} /></span>
            <h3 className="w369-h3">{p.title}</h3>
            <p className="w369-body">{p.body}</p>
          </li>
        ))}
      </ul>
      <p className="w369-fine">
        كل ادّعاء هنا مطابق لما تنصّ عليه صفحاتنا القانونية فعليًّا —{' '}
        <Link to="/legal/privacy" className="w369-link">سياسة الخصوصية</Link>.
      </p>

      <div className="w369-trust">
        <span className="w369-trust-item"><Glyph name="shield" size={16} />بلا إعلانات</span>
        <span className="w369-trust-item"><Glyph name="lock" size={16} />بلا بيع بيانات</span>
        <span className="w369-trust-item"><Glyph name="close" size={16} />حذف الحساب في أي وقت</span>
        <span className="w369-trust-item"><Glyph name="compass" size={16} />عربي RTL بالكامل</span>
      </div>

      <ul className="w369-audience-grid" data-stagger="">
        {AUDIENCES.map((a) => (
          <li key={a.title} className="w369-audience">
            <span className="w369-audience-ico"><Glyph name={a.icon} size={20} /></span>
            <b>{a.title}</b>
            <span>{a.body}</span>
            <Link to={a.to} className="w369-link">
              اعرف أكثر <Glyph name="arrowLeft" size={14} className="ui-glyph-nudge" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── together: the three views ── */

const ROLES = [
  { icon: 'student', title: 'الطالب', body: 'يرى مهامّه ونقاط إتقانه وتقدّمه في مكان واحد — ويعرف الخطوة التالية دائمًا.' },
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
      <ul className="w369-role-grid" data-stagger="">
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
    q: 'كيف تُحسب نقاط الإتقان؟',
    a: 'تُحسب من الإنجاز المسجَّل وحده — إتمام الواجب، تسليم الاختبار، حضور المحاضرة — وتظهر فور تسجيله، بلا إدخال يدوي.',
  },
  {
    q: 'هل يمكن للطالب رؤية تقدّمه في كل مقرّر؟',
    a: 'نعم. لكل مقرّر تقدّمه الخاص، ومصفوفة الإتقان تُظهر الدرجات والمواضيع التي أتقنتها والتي تحتاج مراجعة.',
  },
  {
    q: 'ماذا يحدث لسلسلة النشاط إن غاب الطالب يومًا؟',
    a: 'تتوقّف ولا تُعاقب: تعود من حيث توقّفت مع اليوم التالي. الغاية قياس الانتظام، لا معاقبة الانقطاع.',
  },
  {
    q: 'هل الشهادات معتمدة؟',
    a: 'شهادات إكمال المقرّر تُصدرها المنصّة وتوثّق داخل حسابك. الاعتماد الرسمي يبقى بيد مؤسستك وسياساتها.',
  },
  {
    q: 'هل تعمل أُلارا على الجوّال؟',
    a: 'نعم — تطبيق أندرويد و iOS، والواجهة تعمل كذلك في متصفّح الجوّال بالكامل بالعربية ومن اليمين إلى اليسار.',
  },
  {
    q: 'من يرى بياناتي داخل المقرّر؟',
    a: 'عضو الهيئة يرى إنجازك داخل المقرّر الذي يُدرّسه، والإدارة ترى مؤشّرات مُجمّعة. لا أحد خارج مؤسستك يرى صفّك، والتفاصيل في سياسة الخصوصية.',
  },
  {
    q: 'هل أستطيع حذف حسابي؟',
    a: 'نعم، من إعدادات حسابك مباشرة. الحذف يُزيل بياناتك الشخصية، ويُبقي ما تفرضه مؤسستك من سجلات أكاديمية رسمية، وهذا موضّح في صفحة «بياناتك».',
  },
];

export function FaqBand() {
  return (
    <section className="w369-faq" id="faq">
      <div className="w369-faq-head">
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
  const [read, setRead] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setRead((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('ulara:stars', on as EventListener);
    return () => window.removeEventListener('ulara:stars', on as EventListener);
  }, []);
  return (
    <section className="w369-cta" data-jar="06">
      <div className="w369-cta-inner">
        <p className="w369-cta-tally" data-full={read >= JAR_TOTAL ? 'true' : 'false'}>
          <Glyph name="compass" size={15} />
          قرأت <b>{read}</b> من {JAR_TOTAL} أقسام — والتفاصيل كلها في المنصّة
        </p>
        <h2 className="w369-h1 w369-cta-title">
          ابدأ من<br /><span className="w369-em">مقرّرك الأول</span>
        </h2>
        <p className="w369-lead">
          أنشئ حسابك الجامعي، وستجد مقرّراتك ومهامّك وتقدّمك جاهزة في مكان واحد.
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
