/**
 * Landing → register → auth FUNNEL contract (r164b → r369).
 *
 * The BEHAVIOUR is unchanged and still law:
 *   تعرّف → أنشئ حسابك / ابدأ الآن → /auth/register → /auth
 *
 *   · five primary CTAs → /auth/register (nav, mobile menu, hero, finale,
 *     footer) and five login affordances → /auth on the same surfaces;
 *   · warm-up warms BOTH auth boundaries;
 *   · the finale never shows login copy under a create-account button;
 *   · the mobile menu is a both-way funnel and closes again;
 *   · 404 way-back: home (primary) + colleges + login.
 *
 * r369 re-pin (one-line reason): the public landing was rebuilt as the
 * numbered story — the drawing-sheet class names this file used to query
 * (.fo-hero-actions, .fo-cta-actions, .fo-mobile-menu …) are retired with
 * the reference-parity composition, so the SELECTORS moved to the
 * `.w369-*` surface. Every route assertion, count and copy check is the
 * same one; nothing was deleted or relaxed.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import LandingPage from '../../src/pages/LandingPage';
import NotFoundPage from '../../src/pages/NotFoundPage';

beforeAll(() => {
  if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderLanding() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── source contract ─────────────────────────────────────────────── */

describe('landing funnel — source contract (r164b → r369)', () => {
  /* The funnel counts are computed over the WHOLE guest surface — the
   * contract is about the page, not the file layout. */
  const surface = [
    'src/pages/LandingPage.tsx',
    'src/components/landing/r369/index.tsx',
  ].map(read).join('\n');
  const tsx = read('src/pages/LandingPage.tsx');
  const bands = read('src/components/landing/r369/index.tsx');
  const live = stripComments(surface);

  it('the FIVE primary CTAs all route to /auth/register (nav, mobile menu, hero, finale, footer)', () => {
    expect((live.match(/ROUTES\.authRegister\b/g) ?? []).length).toBe(5);
    // …and a primary never carries the login route (the rendered-DOM
    // block below proves it per surface; this is the source-side guard).
    expect(live).not.toMatch(/className="w369-btn w369-btn-primary[^"]*"[^>]*\n?[^<]*to=\{ROUTES\.auth\}/);
  });

  it('login affordances ride the same register: five surfaces', () => {
    expect((live.match(/ROUTES\.auth\b/g) ?? []).length).toBe(5);
  });

  it('the finale never shows login copy under a create-account button (label ↔ copy ↔ destination tell one story)', () => {
    const finale = stripComments(bands);
    const cta = finale.slice(finale.indexOf('export function CtaBand'));
    const actions = cta.indexOf('w369-cta-actions');
    expect(actions).toBeGreaterThanOrEqual(0);
    const ledeBlock = cta.slice(0, actions);
    expect(ledeBlock).toContain('أنشئ حسابك الجامعي');
    expect(ledeBlock).not.toContain('سجِّل دخولك');

    const actionsBlock = cta.slice(actions);
    expect(actionsBlock).toContain('ROUTES.authRegister');
    // the returning-visitor ghost sits AFTER the primary inside the
    // actions row, never inside the lede.
    expect(actionsBlock).toContain('تسجيل الدخول');
    expect(actionsBlock).toContain('ROUTES.auth');
  });

  it('the idle warm-up warms BOTH auth boundaries (r162 /auth + r164b /auth/register)', () => {
    const warmAt = tsx.indexOf('const warm = () => {');
    expect(warmAt).toBeGreaterThanOrEqual(0);
    const warmBody = tsx.slice(warmAt, tsx.indexOf('};', warmAt));
    expect(warmBody).toContain(`import('./AuthPage')`);
    expect(warmBody).toContain(`import('./RegisterPage')`);
  });

  it('the mobile menu carries both doors (≤900px hides the nav pair)', () => {
    const menuAt = bands.indexOf('w369-mobile-menu');
    expect(menuAt).toBeGreaterThanOrEqual(0);
    const menu = bands.slice(menuAt, bands.indexOf('</div>', bands.indexOf('w369-mobile-cta', menuAt)));
    expect(menu).toContain('ROUTES.authRegister');
    expect(menu).toContain('ROUTES.auth');
    expect(menu).toContain('تسجيل الدخول');
  });
});

/* ── rendered guest DOM ───────────────────────────────────────────── */

describe('landing funnel — rendered guest DOM (r164b → r369)', () => {
  it('a guest sees the split immediately: nav login → /auth, nav primary → /auth/register', () => {
    const { container } = renderLanding();
    const actions = container.querySelector('.w369-nav-actions');
    expect(actions).not.toBeNull();
    const login = actions?.querySelector<HTMLAnchorElement>('.w369-nav-login');
    const primary = actions?.querySelector<HTMLAnchorElement>('.w369-btn-primary');
    expect(login?.getAttribute('href')).toBe('/auth');
    expect(primary?.getAttribute('href')).toBe('/auth/register');
  });

  it('the hero primary carries the start promise: «أنشئ حسابك الجامعي» → /auth/register', () => {
    const { container } = renderLanding();
    const primary = container.querySelector<HTMLAnchorElement>(
      '.w369-hero-actions .w369-btn-primary',
    );
    expect(primary?.textContent).toContain('أنشئ حسابك الجامعي');
    expect(primary?.getAttribute('href')).toBe('/auth/register');
  });

  it('the finale closes the loop: primary → /auth/register AND a login ghost → /auth', () => {
    const { container } = renderLanding();
    const actions = container.querySelector('.w369-cta-actions');
    expect(actions).not.toBeNull();

    const primary = actions?.querySelector<HTMLAnchorElement>('.w369-btn-primary');
    expect(primary?.textContent).toContain('أنشئ حسابك الجامعي');
    expect(primary?.getAttribute('href')).toBe('/auth/register');

    const login = actions?.querySelector<HTMLAnchorElement>('.w369-btn-ghost');
    expect(login?.textContent).toContain('تسجيل الدخول');
    expect(login?.getAttribute('href')).toBe('/auth');
  });

  it('ONE primary per content viewport: a single accent CTA in hero and finale each', () => {
    const { container } = renderLanding();
    expect(container.querySelectorAll('.w369-hero-actions .w369-btn-primary')).toHaveLength(1);
    expect(container.querySelectorAll('.w369-cta-actions .w369-btn-primary')).toHaveLength(1);
  });

  it('the mobile menu is a both-way funnel: ONE register primary + a login ghost', () => {
    const { container } = renderLanding();

    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));

    const menu = container.querySelector('.w369-mobile-menu');
    expect(menu).not.toBeNull();
    expect(menu?.querySelectorAll('.w369-btn-primary')).toHaveLength(1);
    const primary = menu?.querySelector<HTMLAnchorElement>('.w369-btn-primary');
    expect(primary?.getAttribute('href')).toBe('/auth/register');

    const login = within(menu as HTMLElement).getByRole('link', { name: 'تسجيل الدخول' });
    expect(login.getAttribute('href')).toBe('/auth');

    // …and it closes again (the menu's own click-to-close contract).
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق القائمة' }));
    expect(container.querySelector('.w369-mobile-menu')).toBeNull();
  });
});

/* ── 404 way-back ─────────────────────────────────────────────────── */

describe('404 way-back (r164b → r188)', () => {
  it('ONE primary (home) + two secondary exits: colleges browse and login', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    /* r369 re-key: the 404 rides PublicShell + the warm button grammar
       (w369-btn-primary/ghost); the exits + hrefs below are unchanged. */
    expect(container.querySelectorAll('.p369-t5 .w369-btn-primary')).toHaveLength(1);

    /* r369 re-key: the warm nav also carries a login ghost — scope the
       exit assertions to the T5 column. */
    const t5 = container.querySelector('.p369-t5') as HTMLElement;
    const home = within(t5).getByRole('link', { name: /العودة إلى الرئيسية/ });
    const colleges = within(t5).getByRole('link', { name: /تصفح الكليات التجريبية/ });
    const login = within(t5).getByRole('link', { name: 'تسجيل الدخول' });
    expect(home.getAttribute('href')).toBe('/');
    expect(colleges.getAttribute('href')).toBe('/colleges');
    expect(login.getAttribute('href')).toBe('/auth');
  });
});
