/**
 * LandingPage — «عالم أُلارا الدافئ» (r369).
 *
 * The public surface is ONE numbered story, composed here from the
 * components/landing/r369 band set:
 *
 *   nav → hero 01 → marquee → 02 stars → 03 progress → 04 rewards →
 *   05 habits → 06 levels → roles → faq → cta → footer
 *
 * What the page still owns (unchanged contracts):
 * · the guest gate — authenticated visitors are redirected to their
 *   role's dashboard, never shown the landing;
 * · the entrance gate — a short star-burst plays once per session
 *   (sessionStorage flag via lib/motion/introGate), is skipped under
 *   reduced motion / save-data, and the e2e fixtures skip it with
 *   sessionStorage['ulara-intro-skip'] = '1';
 * · the theme sync (light/dark/system) and the Arabic RTL shell;
 * · the funnel — 5 register CTAs + 5 login affordances, pinned by
 *   tests/unit/landing-funnel.test.tsx;
 * · the skip link as the first tab stop.
 *
 * R369 retires the drawing-sheet composition (the 9 reference bands:
 * the pinned journey map, the drafting frame, the registration marks,
 * the mono-bracket indices, the grain film). The old section tree stays
 * on disk for one commit while this surface is verified, then leaves in
 * the r369 cleanup batch (see docs/redesign/r369/LEDGER.md).
 */
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { shouldPlayIntro, introEnvironment } from '../lib/motion/introGate';
import {
  CtaBand,
  FaqBand,
  Footer,
  HabitsBand,
  Hero,
  LandingNav,
  LevelsBand,
  Marquee,
  Preloader,
  ProgressBand,
  RewardsBand,
  RolesBand,
  StarJar,
  StarsBand,
} from '../components/landing/r369';
import '../styles/landing/r369.css';

export default function LandingPage() {
  useThemeSync();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const redirectHome =
    isHydrated && user
      ? user.role === 'TEACHER' ? '/teacher/dashboard'
      : user.role === 'ADMIN' ? '/admin/dashboard'
          : user.role === 'QUALITY' ? '/quality/dashboard'
            : user.role === 'OWNER' ? '/owner/dashboard'
              : '/student/dashboard'
      : null;

  const [introPlaying, setIntroPlaying] = useState(() => {
    try {
      const reduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return shouldPlayIntro(
        typeof sessionStorage !== 'undefined' ? sessionStorage : null,
        reduced,
        introEnvironment(),
      );
    } catch {
      return false;
    }
  });

  /* the warm ground is the page's own; drop the retired grain film and
     any legacy landing classes the old composition left on <body>. */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.remove('ula-grain');
    document.body.classList.add('w369-body');
    return () => document.body.classList.remove('w369-body');
  }, []);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className="w369">
      {introPlaying && <Preloader onDone={() => setIntroPlaying(false)} />}

      <a href="#main" className="w369-skip">تخطَّ إلى المحتوى</a>

      <LandingNav />

      <main id="main" tabIndex={-1}>
        <Hero />
        <Marquee />
        <div id="story">
          <StarsBand />
          <ProgressBand />
          <RewardsBand />
          <HabitsBand />
          <LevelsBand />
        </div>
        <RolesBand />
        <FaqBand />
        <CtaBand />
      </main>

      <Footer year={year} />
      <StarJar />
    </div>
  );
}
