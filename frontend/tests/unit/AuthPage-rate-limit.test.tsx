/**
 * Wave 23-a — AuthPage rate-limit copy honesty (audit 4-A13 P2-1).
 *
 * One generic banner used to answer every `login.isError`, so a 429
 * lockout told the student to «تحقَّق من البريد وكلمة المرور» —
 * actively misleading during the 10/15-min window (the shared IP
 * bucket is easy to trip). The banner must now name the lockout and
 * surface the honest Arabic message the backend already sends.
 *
 * Verified by code path, NOT by burning the real limiter: the 429
 * state is injected exactly the way the backend would deliver it
 * (`{ error: { code: 'TOO_MANY_REQUESTS', message } }` on an
 * AxiosError-shaped object).
 *
 * r157 F5 extension: the REST of the banner contract via authErrorView
 * (lib/authErrors.ts) — when the backend DID answer, ITS Arabic message
 * shows verbatim: 401 «البريد الإلكتروني أو كلمة المرور غير صحيحة»
 * (backend/src/lib/errors.ts:42), 403 «هذا الحساب معطّل — تواصل مع
 * إدارة الجامعة» (auth.service.ts:291). ULARA 1-A (2026-11-12):
 * network silence / 5xx / DB_UNAVAILABLE are the WAKING shape — the
 * banner names it + offers a retry, and the login flow silently
 * retries twice before showing anything (the owner's rule: waking is
 * not a user problem). The authored generic survives only for
 * Latin-only transport prose the Arabic guard rejects.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { AxiosError } from 'axios';

type LoginState = {
  mutateAsync: (values?: unknown) => Promise<never>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  reset: () => void;
};

const loginState = vi.hoisted(() => ({ current: {} as LoginState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => loginState.current,
  // r178: AuthPage also mounts the institution-selection mutation —
  // these tests exercise the login error paths, so the selector stays
  // a quiet idle stub (never fired without a multi-membership login).
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';

function axError(status: number, code?: string, message?: string): AxiosError<{ error?: { code?: string; message?: string } }> {
  return {
    name: 'AxiosError',
    message: 'Request failed',
    isAxiosError: true,
    config: {},
    response: { status, data: { error: { code, message } } },
  } as unknown as AxiosError<{ error?: { code?: string; message?: string } }>;
}

function renderPage() {
  /* r180: QueryClient for the ambiguity-recovery institutions query. */
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AuthPage — 429 lockout copy (4-A13 P2-1)', () => {
  beforeEach(() => {
    loginState.current = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    };
  });

  it('a 429 surfaces the backend lockout message, never credential advice', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(
      429,
      'TOO_MANY_REQUESTS',
      'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة',
    );
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة');
    // The misleading credential advice must NOT appear in lockout state.
    expect(alert).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('the TOO_MANY_REQUESTS code alone (e.g. a 429 proxied through a gateway) is enough', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(502, 'TOO_MANY_REQUESTS', 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة');
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('محاولات دخول كثيرة');
  });

  it('falls back to authored Arabic when the 429 carries no message body', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(429);
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('محاولات دخول كثيرة — انتظر قليلاً');
    expect(screen.getByRole('alert')).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('a 401 (wrong password) surfaces the backend\'s own Arabic message verbatim (D17-3)', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(
      401,
      'INVALID_CREDENTIALS',
      // The real default from backend/src/lib/errors.ts:42 — the
      // server's own words, not a rewritten generic.
      'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    );
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    // The generic refusal no longer masks the server's answer.
    expect(alert).not.toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('a 403 (disabled account) surfaces the backend\'s own Arabic message verbatim', () => {
    loginState.current.isError = true;
    // The exact sentence auth.service.ts:291 rejects with.
    loginState.current.error = axError(403, 'FORBIDDEN', 'هذا الحساب معطّل — تواصل مع إدارة الجامعة');
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('هذا الحساب معطّل — تواصل مع إدارة الجامعة');
    expect(alert).not.toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('a network failure (no response) shows the WAKING banner + a retry affordance (ULARA 1-A)', () => {
    /* Owner rule 2026-11-12: network silence on this serverless platform
     * means the cold boot is waking — the banner names that honestly and
     * offers the one-tap retry, instead of the credential-generic advice
     * that sent the owner re-typing a password that was fine. */
    loginState.current.isError = true;
    loginState.current.error = {
      name: 'AxiosError',
      message: 'Network Error',
      isAxiosError: true,
      config: {},
    } as unknown as AxiosError;
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('الخادم يستيقظ من السبات');
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
    // The raw Latin transport prose never reaches the RTL UI.
    expect(alert).not.toHaveTextContent('Network Error');
  });

  it('a 503 DB_UNAVAILABLE shows the WAKING banner too (the health surface shape)', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(503, 'DB_UNAVAILABLE', 'Database unavailable');
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('الخادم يستيقظ من السبات');
    // The Latin transport message stays guarded out.
    expect(alert).not.toHaveTextContent('Database unavailable');
  });

  it('silent cold-start retries: a waking failure is retried twice (3 attempts), a 401 once', async () => {
    vi.useFakeTimers();
    try {
      const netErr = {
        name: 'AxiosError',
        message: 'Network Error',
        isAxiosError: true,
        config: {},
      } as unknown as AxiosError;
      const mutateAsync = vi.fn(() => Promise.reject(netErr));
      loginState.current.mutateAsync = mutateAsync as unknown as LoginState['mutateAsync'];
      const { unmount } = renderPage();

      const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
      const password = screen.getByLabelText('كلمة المرور');
      fireEvent.change(email, { target: { value: 'student@test.ly' } });
      fireEvent.change(password, { target: { value: '12345678' } });
      fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

      // Attempt 1 fires immediately; the two silent retries ride the
      // 2.5s + 5s delays — advance through them.
      await vi.advanceTimersByTimeAsync(2500);
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(50);

      expect(mutateAsync).toHaveBeenCalledTimes(3);
      // The retries were SILENT — the mutation error state was reset
      // between attempts (no error flash under the waking status).
      expect(loginState.current.reset).toHaveBeenCalledTimes(2);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a real refusal (401) is NOT retried — exactly one attempt', async () => {
    vi.useFakeTimers();
    try {
      const mutateAsync = vi.fn(() =>
        Promise.reject(axError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة')),
      );
      loginState.current.mutateAsync = mutateAsync as unknown as LoginState['mutateAsync'];
      const { unmount } = renderPage();

      const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
      const password = screen.getByLabelText('كلمة المرور');
      fireEvent.change(email, { target: { value: 'student@test.ly' } });
      fireEvent.change(password, { target: { value: 'wrong-pass' } });
      fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

      await vi.advanceTimersByTimeAsync(8000);
      expect(mutateAsync).toHaveBeenCalledTimes(1);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a Latin-only "message" from the transport is guarded out — generic wins (15-j P0-1)', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(401, 'INVALID_CREDENTIALS', 'Request failed with status code 401');
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).not.toHaveTextContent('Request failed with status code 401');
    // Not a rate limit — the credential-generic grammar is correct here.
    expect(alert).not.toHaveTextContent('محاولات دخول كثيرة');
  });

  it('no error state renders no banner', () => {
    renderPage();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
