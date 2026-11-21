/**
 * r350 B1 — the one-title law + the rail's single theme toggle.
 *
 * Two measured defects pinned here:
 *
 *  1. THE DUPLICATED TITLE. Every authenticated page rendered its name
 *     twice — the topbar's resolved title AND the PageHeader h1 carried
 *     the same string (live-measured on all five roles: «لوحة التحكم»
 *     on screen twice). The r350 contract: the topbar renders the
 *     section kicker + scope chips ONLY; the h1 is the single visible
 *     title; document.title still derives from nav.ts. A regression
 *     that reintroduces the title text into `.topbar-title` fails the
 *     first block.
 *
 *  2. THE RAIL'S TWO THEME TOGGLES. The collapsed icon rail rendered
 *     the sidebar's 3-way segmented control while the topbar's compact
 *     toggle (R325) sat in the same viewport — two theme controls, the
 *     3-way one cramped and unlabeled in a 64px rail. The r350
 *     contract: the rail renders NO theme control (the topbar owns the
 *     flip there); the expanded sidebar and the mobile drawer keep the
 *     labeled 3-way.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Topbar } from '../../src/components/layout/Topbar';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { useAuthStore } from '../../src/stores/auth.store';
import { useUiStore } from '../../src/stores/ui.store';

/* ── the shared mock substrate (mirrors r305-topbar-cluster) ───────── */

const mocks = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  me: { data: undefined } as any,
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  useMe: () => mocks.me,
  useSelectInstitution: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const real = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return { ...real, useMyProfile: () => ({ data: undefined }) };
});

vi.mock('../../src/hooks/useOnboardingState', () => ({
  useOnboardingState: () => ({ shouldAutoStart: false, isOpen: false, open: vi.fn() }),
}));

vi.mock('../../src/components/onboarding/OnboardingFlow', () => ({ OnboardingFlow: () => null }));

// The tour trigger lives in the sidebar footer — the real hook is
// covered by its own suites; here it only needs to exist.
vi.mock('../../src/lib/onboarding', () => ({ startOnboarding: vi.fn() }));

const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function mount(ui: React.ReactElement, path = '/student/dashboard') {
  render(
    <QueryClientProvider client={qc()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  mocks.me = { data: undefined };
  useAuthStore.setState({
    user: {
      id: 'u1', email: 's@zu.edu.ly', firstName: 'أحمد', lastName: 'المبروك',
      role: 'STUDENT', avatarInitials: 'أم',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    memberships: [],
    currentInstitution: null,
  });
  useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: false });
});

/* ── 1. the one-title law ──────────────────────────────────────────── */

describe('r350 B1 · the one-title law', () => {
  it('the topbar title block carries NO page-title text on a nav destination', () => {
    // /student/dashboard is a nav destination — the kicker group label
    // DOES render («الرئيسية»), but the page's own name («لوحة الطالب»
    // per nav.ts) must not appear in the topbar block.
    mount(<Topbar />);
    const block = document.querySelector('.topbar-title');
    expect(block).not.toBeNull();
    const text = block!.textContent ?? '';
    expect(text).not.toContain('لوحة');
    expect(text).not.toContain('الطالب');
  });

  it('the topbar accepts no title prop anymore (compile-time law kept honest)', () => {
    // The TopbarProps surface no longer carries `title` — the block's
    // only text child on a nav destination is the nav.ts GROUP label
    // («الرئيسية» for the student dashboard), never the page's name.
    mount(<Topbar />);
    const kicker = document.querySelector('.topbar-kicker');
    expect(kicker).not.toBeNull(); // nav destination → kicker present
    expect(kicker!.textContent).toBe('الرئيسية'); // nav.ts's own group label
  });

  it('detail pages (no kicker) render an empty-but-present rescue target', () => {
    mount(<Topbar />, '/student/library/borrow/42');
    const block = document.querySelector('.topbar-title');
    expect(block).not.toBeNull();
    expect(block!.textContent).toBe('');
    expect(block).toHaveAttribute('tabindex', '-1'); // focus-rescue seat stays
  });
});

/* ── 2. the rail's single theme toggle ─────────────────────────────── */

describe('r350 B1 · the rail theme-toggle law', () => {
  it('the COLLAPSED rail renders no theme control (the topbar owns the flip)', () => {
    useUiStore.setState({ sidebarCollapsed: true });
    // matchMedia is jsdom-absent — Sidebar's drawer-band hook guards on
    // typeof window.matchMedia; provide a static no-match impl.
    window.matchMedia = window.matchMedia ?? ((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    mount(<Sidebar />);
    const nav = document.querySelector('nav.sidebar');
    expect(nav).not.toBeNull();
    expect(nav!.className).toContain('rail');
    // No theme-toggle group in the rail.
    expect(within(nav as HTMLElement).queryByRole('group', { name: 'السمة' })).toBeNull();
  });

  it('the EXPANDED sidebar keeps the labeled 3-way control', () => {
    window.matchMedia = window.matchMedia ?? ((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
    mount(<Sidebar />);
    const nav = document.querySelector('nav.sidebar');
    expect(nav).not.toBeNull();
    expect(within(nav as HTMLElement).getByRole('group', { name: 'السمة' })).toBeTruthy();
  });
});
