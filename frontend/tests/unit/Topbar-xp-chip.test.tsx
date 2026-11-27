/**
 * r369 slice 02 — the نقاط إتقان collector chip (Topbar's StudentXpChip).
 *
 * The spec orders an honest collector in the product topbar: the
 * student's REAL «نقاط إتقان» total, no invented streak. The contract
 * pinned here:
 *   1. STUDENT-only — no other role renders the chip, even with data;
 *   2. the number is the dashboard's kpi.totalXp, counted in proper
 *      Arabic («نقطة إتقان واحدة»، «نقطتا إتقان»، «5 نقاط إتقان»…);
 *   3. honest zero — a zero balance renders «0 نقطة إتقان», never a
 *      hidden or decorated absence;
 *   4. honest error — a failed query hides the chip rather than guess;
 *   5. the chip routes to /student/gamification, where the number is
 *      explained;
 *   6. loading renders a quiet inert pill, aria-hidden, never a fake 0.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/components/layout/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));
vi.mock('../../src/components/layout/NotificationDropdown', () => ({
  NotificationDropdown: () => <div data-testid="notif-dropdown" />,
}));
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: undefined }),
  useLogout: () => ({ mutate: vi.fn() }),
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('../../src/hooks/useResources', () => ({
  useMyProfile: () => ({ data: undefined }),
}));

/* The one query under test — each pin sets the shape it needs. */
const dashboardState: { data: { kpi: { totalXp: number } } | undefined; isError: boolean } = {
  data: undefined,
  isError: false,
};
vi.mock('../../src/hooks/resources/student', () => ({
  useStudentDashboard: () => dashboardState,
}));

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

import { Topbar } from '../../src/components/layout/Topbar';
import { useAuthStore, type AuthUser, type AppRole } from '../../src/stores/auth.store';

const userWithRole = (role: AppRole): AuthUser => ({
  id: `xp-pin-${role.toLowerCase()}`,
  email: 'xp-pin@uoz.edu',
  firstName: 'نقاط',
  lastName: 'الإتقان',
  role,
});

function renderTopbar(role: AppRole) {
  useAuthStore.setState({ user: userWithRole(role) });
  return render(
    <MemoryRouter>
      <Topbar />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
  dashboardState.data = undefined;
  dashboardState.isError = false;
  navigateSpy.mockClear();
});

describe('Topbar — نقاط إتقان chip (r369 slice 02)', () => {
  it('renders the counted total for a student', () => {
    dashboardState.data = { kpi: { totalXp: 245 } };
    renderTopbar('STUDENT');
    const chip = screen.getByRole('button', { name: /نقطة إتقان/ });
    expect(chip).toHaveTextContent('245 نقطة إتقان');
  });

  it('uses the one/dual/few Arabic forms', () => {
    dashboardState.data = { kpi: { totalXp: 2 } };
    renderTopbar('STUDENT');
    expect(screen.getByRole('button', { name: /نقطتا إتقان/ })).toBeInTheDocument();
  });

  it('renders an honest zero, never a hidden absence', () => {
    dashboardState.data = { kpi: { totalXp: 0 } };
    renderTopbar('STUDENT');
    expect(screen.getByRole('button', { name: /0 نقطة إتقان/ })).toBeInTheDocument();
  });

  it('hides on query error rather than guess', () => {
    dashboardState.isError = true;
    renderTopbar('STUDENT');
    expect(screen.queryByRole('button', { name: /إتقان/ })).not.toBeInTheDocument();
  });

  it('renders for no other role, even with data', () => {
    dashboardState.data = { kpi: { totalXp: 245 } };
    for (const role of ['TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
      cleanup();
      renderTopbar(role);
      expect(screen.queryByRole('button', { name: /إتقان/ })).not.toBeInTheDocument();
    }
  });

  it('routes to /student/gamification', () => {
    dashboardState.data = { kpi: { totalXp: 245 } };
    renderTopbar('STUDENT');
    fireEvent.click(screen.getByRole('button', { name: /نقطة إتقان/ }));
    expect(navigateSpy).toHaveBeenCalledWith('/student/gamification');
  });

  it('shows a quiet inert pill while loading, never a fake number', () => {
    renderTopbar('STUDENT');
    expect(screen.queryByRole('button', { name: /إتقان/ })).not.toBeInTheDocument();
    expect(document.querySelector('.topbar-xp-loading')).not.toBeNull();
  });
});
