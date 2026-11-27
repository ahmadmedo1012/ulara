/**
 * PublicShell — the r369 chrome for the inner public pages (slice B).
 *
 * One shell for every public route that is not the landing: the same
 * warm nav (route-aware instead of the landing's in-page anchors), the
 * same footer, the same skip link, the same theme control. The landing
 * keeps its own stage navigator; these pages get the public register.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Glyph } from '../../../icons';
import { Logo } from '../../../../brand';
import { ROUTES } from '../../../../lib/routes';
import { ThemeToggle, useThemeSync } from '../../../layout/ThemeToggle';
import { Footer } from '..';
/* the shell speaks the landing's grammar (w369-nav, w369-btn,
   w369-em, w369-h2, w369-footer…), so the landing sheet must load on
   every inner page — the kit sheet then adds the T1–T5 blocks. */
import '../../../../styles/landing/r369.css';
import '../../../../styles/landing/r369-pages.css';


const PAGE_LINKS = [
  { to: ROUTES.capabilities, label: 'القدرات' },
  { to: ROUTES.colleges, label: 'الكليات' },
  { to: '/campus', label: 'الحرم الجامعي' },
  { to: '/competitions', label: 'المسابقات' },
  { to: '/app', label: 'التطبيق' },
  { to: '/help', label: 'المساعدة' },
] as const;

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    burgerRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <header className="w369-nav p369-nav">
      <div className="w369-nav-inner">
        <Link to={ROUTES.root} className="w369-brand" aria-label="أُلارا — الصفحة الرئيسية">
          <span className="w369-brand-mark" aria-hidden="true"><Logo variant="mark" size={30} /></span>
          <span className="w369-brand-word">أُلارا</span>
        </Link>

        <nav className="w369-nav-links p369-nav-links" aria-label="صفحات المنصّة">
          {PAGE_LINKS.slice(0, 4).map((l) => (
            <Link key={l.to} to={l.to} className="p369-nav-link">{l.label}</Link>
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
          aria-controls="p369-mobile-menu"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          onClick={() => setOpen((v) => !v)}
        >
          <Glyph name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {open && (
        <div className="w369-mobile-menu" id="p369-mobile-menu">
          <Link to={ROUTES.root} className="w369-mobile-link">الصفحة الرئيسية</Link>
          {PAGE_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="w369-mobile-link" onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link to="/about" className="w369-mobile-link" onClick={() => setOpen(false)}>عن أُلارا</Link>
          <Link to="/contact" className="w369-mobile-link" onClick={() => setOpen(false)}>التواصل</Link>
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

export function PublicShell({ children }: { children: React.ReactNode }) {
  useThemeSync();
  /* the warm ground is the page's own; make sure no retired landing
     grammar (grain film) leaks onto the inner pages. */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.remove('ula-grain');
    document.body.classList.add('w369-active');
    return () => document.body.classList.remove('w369-active');
  }, []);
  const year = new Date().getFullYear();
  return (
    <div className="w369 p369">
      <a href="#main" className="skip-link w369-skip">تخطَّ إلى المحتوى</a>
      <PublicNav />
      <main id="main" tabIndex={-1} className="p369-main">
        {children}
      </main>
      <Footer year={year} />
    </div>
  );
}
