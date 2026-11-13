/**
 * R320 §C — the test-account login panel (AuthPage).
 *
 * The panel replaces the five per-role demo chips with the SHARED
 * test-account table (one easy account per job, `@test.ly` /
 * `12345678` — imported from the repo-root `@shared/testAccounts`
 * re-export; the physical table is
 * backend/src/modules/auth/test-accounts.data.ts). These tests pin the
 * panel's three contracts:
 *
 *   1. RENDER — every job in the table, grouped التعليم / الحوكمة /
 *      النظام (R321 §A7 — the governance bucket is «الحوكمة»), email +
 *      password VISIBLE (published test credentials).
 *   2. QUICK LOGIN — ONE tap fills BOTH form fields AND submits them
 *      (the owner's 2026-11-12 rule: the row button is «دخول سريع» —
 *      the documented fast path; manual typing stays first-class).
 *   3. GATE — VITE_SHOW_TEST_ACCOUNTS=0 hides the panel AND its reopen
 *      chip (default: absent var = SHOW).
 *
 * OWNER RULE (2026-11-12) — the panel starts OPEN in EVERY build
 * (development AND production): it is the documented entry for the
 * platform's development phase. The R322 collapsed-chip production
 * default is RETIRED (it cost the owner a working login while a
 * rotated password looked like a broken login).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TEST_ACCOUNTS, TEST_ACCOUNT_GROUPS } from '@shared/testAccounts';

type LoginState = {
  mutateAsync: (values: { email: string; password: string }) => Promise<never>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  reset: () => void;
};

const loginState = vi.hoisted(() => ({ current: {} as LoginState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => loginState.current,
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('R320 §C — the test-account login panel', () => {
  beforeEach(() => {
    loginState.current = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders EVERY job from the shared table, grouped, with email + password visible', () => {
    renderPage();

    // One group header per group, in the table's order.
    for (const group of TEST_ACCOUNT_GROUPS) {
      expect(screen.getByText(group)).toHaveClass('auth-demo-group-label');
    }

    // Every job row: the job label + the email, each exactly once; the
    // password is VISIBLE by design (published test credentials) — one
    // visible copy per account (they all share the easy value).
    const rows = screen.getAllByRole('button', { name: /^دخول سريع بحساب / });
    expect(rows).toHaveLength(TEST_ACCOUNTS.length);
    for (const account of TEST_ACCOUNTS) {
      expect(screen.getByText(account.job)).toBeInTheDocument();
      expect(screen.getByText(account.email)).toBeInTheDocument();
    }
    expect(screen.getAllByText(TEST_ACCOUNTS[0]!.password)).toHaveLength(TEST_ACCOUNTS.length);
  });

  it('«دخول سريع» fills BOTH fields AND submits them — one tap, the documented fast path', async () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد') as HTMLInputElement;
    const password = screen.getByLabelText('كلمة المرور') as HTMLInputElement;
    const student = TEST_ACCOUNTS.find((a) => a.email === 'student@test.ly')!;

    fireEvent.click(screen.getByRole('button', { name: 'دخول سريع بحساب طالب' }));
    await waitFor(() => {
      expect(email.value).toBe(student.email);
      expect(password.value).toBe(student.password);
    });
    // The single tap SUBMITS — the fast path is one tap, not two.
    await waitFor(() => {
      expect(loginState.current.mutateAsync).toHaveBeenCalledWith({
        email: student.email,
        password: student.password,
      });
    });
  });

  it('quick login submits the filled credentials for ANY row (registrar)', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'دخول سريع بحساب المسجل العام' }));
    await waitFor(() => {
      expect(loginState.current.mutateAsync).toHaveBeenCalledWith({
        email: 'registrar@test.ly',
        password: '12345678',
      });
    });
  });

  it('VITE_SHOW_TEST_ACCOUNTS=0 hides the panel AND its reopen chip', () => {
    vi.stubEnv('VITE_SHOW_TEST_ACCOUNTS', '0');
    renderPage();

    expect(screen.queryByRole('button', { name: 'الحسابات التجريبية' })).toBeNull();
    expect(screen.queryByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^دخول سريع بحساب / })).toHaveLength(0);
  });

  it('the panel starts OPEN (owner rule 2026-11-12 — every build) and is dismissible', () => {
    renderPage();

    // The panel is the first thing a visitor sees — all jobs visible,
    // no opener chip needed, in EVERY build (dev AND production).
    expect(screen.getByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'الحسابات التجريبية' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^دخول سريع بحساب / })).toHaveLength(
      TEST_ACCOUNTS.length,
    );

    // Dismissible: the quiet close returns the reopen chip.
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    expect(screen.queryByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeNull();
    expect(screen.getByRole('button', { name: 'الحسابات التجريبية' })).toHaveClass(
      'auth-demo-hint-reopen',
    );

    // …and the chip re-opens it (the r157 F5 affordance keeps working).
    fireEvent.click(screen.getByRole('button', { name: 'الحسابات التجريبية' }));
    expect(screen.getByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeInTheDocument();
  });

  /* OWNER RULE (2026-11-12) — the R322 collapsed-chip production
   * default is RETIRED: the panel starts OPEN in a production build
   * too. VITE_SHOW_TEST_ACCOUNTS=0 remains the one honest off-switch. */
  it('a production build ALSO starts with the panel OPEN (owner rule 2026-11-12)', () => {
    vi.stubEnv('DEV', false);
    renderPage();

    expect(screen.getByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'الحسابات التجريبية' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^دخول سريع بحساب / })).toHaveLength(
      TEST_ACCOUNTS.length,
    );
  });
});
