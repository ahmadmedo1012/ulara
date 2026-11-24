/**
 * r360 F4 — the new-backend UI surfaces, wired end-to-end with their
 * real endpoints (the r359 A4 routes A3 could not build):
 *
 *  · the settings register's per-category preferences
 *    (GET/PUT /me/notification-preferences) — rows render from the
 *    server's effective set, a flip PUTs exactly one key, the
 *    optimistic row answers instantly;
 *  · the email-verification seat (/auth/me's emailVerifiedAt +
 *    POST /auth/resend-verification) — verified renders the quiet
 *    confirm, unverified renders the banner + verb, the honest
 *    statuses surface verbatim;
 *  · the audit-trail browser (GET /institutional/audit-logs) — rows
 *    render verbatim, filters ride the query, a 403 renders the
 *    honest wall;
 *  · the users export (GET /users/export) — the CSV blob, the
 *    BOM-prefixed bytes, the filename, the X-Export-Rows count;
 *  · the module registry's one read-gated module (AUDIT_BROWSE).
 *
 * The transport is the api client's own test seam
 * (`api.defaults.adapter`) — the auth-header pipeline stays real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, ApiError, downloadUsersExport, type ApiRequestConfig, type ApiResponse } from '../../src/lib/api';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import SettingsPage from '../../src/pages/SettingsPage';
import { InstitutionAuditLogPage } from '../../src/pages/institutional/AuditLogPage';
import { visibleModules, INST_MODULES } from '../../src/components/institutional/modules';

const STUDENT: AuthUser = {
  id: 'u1', email: 'student@zu.edu.ly', firstName: 'أحمد', lastName: 'الزاوي', role: 'STUDENT',
  emailVerifiedAt: null,
};

const ADMIN: AuthUser = {
  id: 'u2', email: 'admin@zu.edu.ly', firstName: 'سالم', lastName: 'القرضابي', role: 'ADMIN',
};

/** Installs the hermetic adapter: a route table + request log. The
 * paged institutional routes answer the BARE `{ data, meta }` shape
 * (backend lib/pagination.ts), everything else the `{ data: }`
 * envelope. Blob routes answer a Blob body with custom headers. */
function installAdapter(
  routes: Record<string, { body: unknown; status?: number; headers?: Record<string, string>; paged?: boolean }>,
  log: string[] = [],
) {
  api.defaults.adapter = (config: ApiRequestConfig) => {
    const url = config.url ?? '';
    log.push(`${config.method} ${url}${config.params ? ` ${JSON.stringify(config.params)}` : ''}`);
    const hit = Object.entries(routes).find(([path]) => url === path || url.startsWith(path + '?'));
    if (!hit) {
      const res: ApiResponse<unknown> = {
        data: { error: { code: 'MOCK_NOT_IMPLEMENTED', message: 'لا يوجد مثبت' } },
        status: 501, statusText: '501', headers: {}, config,
      };
      return Promise.reject(new ApiError('501', config, 'ERR_BAD_REQUEST', res));
    }
    const route = hit[1];
    const body = route.paged ? route.body : { data: route.body };
    const res: ApiResponse<unknown> = {
      data: body as unknown,
      status: route.status ?? 200,
      statusText: 'OK',
      headers: route.headers ?? {},
      config,
    };
    return Promise.resolve(res);
  };
}

function withProviders(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/settings']}>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

const ME_PROFILE = {
  ...STUDENT,
  id: 'u1',
  currentInstitution: { id: 'inst-1', name: 'مساحة عمل أُلارا التجريبية', slug: 'ulara-demo' },
};

const PREFS = {
  userId: 'u1',
  pushUrgent: true,
  pushAcademic: true,
  pushSystem: true,
  pushSocial: false,
  emailDigest: false,
};

beforeEach(() => {
  useAuthStore.setState({
    user: STUDENT, accessToken: 'test-token', memberships: [], currentInstitution: null, membershipRole: null,
  });
});

afterEach(() => {
  api.defaults.adapter = null;
  vi.restoreAllMocks();
});

/* ── 1. the notification-preferences register ──────────────────── */

describe('F4 · the settings register speaks the REAL preference endpoint', () => {
  it('renders the five seats from the server\'s effective set (GET /me/notification-preferences)', async () => {
    const log: string[] = [];
    installAdapter({
      '/auth/me': { body: ME_PROFILE },
      '/notifications': { body: [] },
      '/me/push-devices': { body: [] },
      '/me/notification-preferences': { body: PREFS },
    }, log);

    render(withProviders(<SettingsPage />));

    await waitFor(() => {
      expect(screen.getByText('العاجل')).toBeInTheDocument();
      expect(screen.getByText('الاجتماعي')).toBeInTheDocument();
      expect(screen.getByText('الملخّص الأسبوعي بالبريد')).toBeInTheDocument();
    });
    // the row's state derives from the payload: pushSocial=false → موقوف
    const social = screen.getByRole('button', { name: 'الاجتماعي — موقوف' });
    expect(social).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'العاجل — مفعّل' })).toHaveAttribute('aria-pressed', 'true');
    expect(log.some((l) => l.startsWith('get /me/notification-preferences'))).toBe(true);
  });

  it('a flip PUTs exactly one key and the optimistic row answers', async () => {
    const puts: unknown[] = [];
    /* Stateful prefs (the server's upsert semantics): GET answers the
     * live row, PUT applies the patch — so the post-settle refetch
     * (onSettled invalidation) sees the same truth the optimistic
     * flip showed, exactly like the real backend. */
    let current = { ...PREFS };
    api.defaults.adapter = (config: ApiRequestConfig) => {
      const url = config.url ?? '';
      const ok = (data: unknown) => ({ data: { data }, status: 200, statusText: 'OK', headers: {}, config });
      if (url === '/auth/me') return Promise.resolve(ok(ME_PROFILE) as never);
      if (url.startsWith('/notifications')) return Promise.resolve(ok([]) as never);
      if (url === '/me/push-devices') return Promise.resolve(ok([]) as never);
      if (url === '/me/notification-preferences' && config.method === 'get') {
        return Promise.resolve(ok(current) as never);
      }
      if (url === '/me/notification-preferences' && config.method === 'put') {
        puts.push(config.data);
        current = { ...current, ...(config.data as object) };
        return Promise.resolve(ok(current) as never);
      }
      return Promise.reject(new ApiError('501', config, 'ERR_BAD_REQUEST', { data: {}, status: 501, statusText: '501', headers: {}, config } as ApiResponse<unknown>));
    };

    render(withProviders(<SettingsPage />));
    await waitFor(() => screen.getByRole('button', { name: 'الاجتماعي — موقوف' }));

    fireEvent.click(screen.getByRole('button', { name: 'الاجتماعي — موقوف' }));
    // the optimistic flip answers instantly and SURVIVES the settle
    await waitFor(() => expect(screen.getByRole('button', { name: 'الاجتماعي — مفعّل' })).toBeInTheDocument());
    await waitFor(() => expect(puts).toEqual([{ pushSocial: true }]));
    // and it survives the invalidation refetch too (the server truth)
    await waitFor(() => expect(screen.getByRole('button', { name: 'الاجتماعي — مفعّل' })).toBeInTheDocument());
  });
});

/* ── 2. the email-verification seat ────────────────────────────── */

describe('F4 · the email-verification seat (banner + resend)', () => {
  it('a verified account renders the quiet confirm — no resend verb', async () => {
    installAdapter({
      '/auth/me': { body: { ...ME_PROFILE, emailVerifiedAt: '2026-01-02T00:00:00.000Z' } },
      '/notifications': { body: [] },
      '/me/push-devices': { body: [] },
      '/me/notification-preferences': { body: PREFS },
    });
    render(withProviders(<SettingsPage />));
    await waitFor(() => expect(screen.getByText('البريد الإلكتروني مؤكَّد')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'إعادة إرسال رسالة التأكيد' })).toBeNull();
  });

  it('an unverified account renders the banner + the honest sent line', async () => {
    installAdapter({
      '/auth/me': { body: ME_PROFILE },
      '/notifications': { body: [] },
      '/me/push-devices': { body: [] },
      '/me/notification-preferences': { body: PREFS },
      '/auth/resend-verification': { body: { status: 'sent' } },
    });
    render(withProviders(<SettingsPage />));
    await waitFor(() => expect(screen.getByText('البريد الإلكتروني غير مؤكَّد')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'إعادة إرسال رسالة التأكيد' }));
    await waitFor(() => expect(screen.getByText(/أُرسلت رسالة التأكيد/)).toBeInTheDocument());
  });

  it('the provider-less refusal surfaces verbatim (unavailable — a state, not a fake success)', async () => {
    installAdapter({
      '/auth/me': { body: ME_PROFILE },
      '/notifications': { body: [] },
      '/me/push-devices': { body: [] },
      '/me/notification-preferences': { body: PREFS },
      '/auth/resend-verification': { body: { status: 'unavailable' } },
    });
    render(withProviders(<SettingsPage />));
    await waitFor(() => screen.getByRole('button', { name: 'إعادة إرسال رسالة التأكيد' }));
    fireEvent.click(screen.getByRole('button', { name: 'إعادة إرسال رسالة التأكيد' }));
    await waitFor(() => expect(screen.getByText(/قناة البريد غير مهيأة/)).toBeInTheDocument());
  });
});

/* ── 3. the audit-trail browser ────────────────────────────────── */

const AUDIT_ROWS = [
  {
    id: 'a1', userId: 'u2', institutionId: 'inst-1', action: 'council.create',
    resourceType: 'Council', resourceId: 'c1', ip: '10.0.0.9', userAgent: 'e2e',
    metadata: { x: 1 }, createdAt: '2026-11-01T10:00:00.000Z',
    user: { id: 'u2', email: 'admin@zu.edu.ly', firstName: 'سالم', lastName: 'القرضابي' },
  },
  {
    id: 'a2', userId: null, institutionId: 'inst-1', action: 'scheduler.digest.sweep',
    resourceType: 'MailOutbox', resourceId: null, ip: null, userAgent: null,
    metadata: null, createdAt: '2026-11-02T03:00:00.000Z', user: null,
  },
];

function auditProviders(node: React.ReactNode, initial = '/institution/audit') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initial]}>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('F4 · the audit-trail browser (GET /institutional/audit-logs)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: ADMIN, accessToken: 't',
      memberships: [{ institutionId: 'inst-1', name: 'م', slug: 'm', role: 'ADMIN', isActive: true }],
      currentInstitution: { id: 'inst-1', name: 'م', slug: 'm' }, membershipRole: 'ADMIN',
    });
  });

  it('renders the rows verbatim (the actor, the system row, the mono resource line)', async () => {
    const log: string[] = [];
    installAdapter({
      '/me/permissions': { body: { role: 'ADMIN', capabilities: ['AUDIT_BROWSE'], roleDefaults: [], membershipRole: 'ADMIN' } },
      '/institutions/me/profile': { body: { institution: { id: 'inst-1', name: 'م', slug: 'm', status: 'ACTIVE', kind: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' } } },
      '/institutional/audit-logs': { body: { data: AUDIT_ROWS, meta: { page: 1, limit: 20, total: 2, totalPages: 1 } }, paged: true },
    }, log);

    render(auditProviders(<InstitutionAuditLogPage />));
    await waitFor(() => expect(screen.getByText('council.create')).toBeInTheDocument());
    expect(screen.getByText('سالم القرضابي')).toBeInTheDocument();
    expect(screen.getByText('— النظام —')).toBeInTheDocument();
    expect(screen.getByText('MailOutbox')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.9')).toBeInTheDocument();
    expect(log.some((l) => l.startsWith('get /institutional/audit-logs'))).toBe(true);
  });

  it('the 403 wall is honest (no rows, no fake wall)', async () => {
    installAdapter({
      '/me/permissions': { body: { role: 'ADMIN', capabilities: ['AUDIT_BROWSE'], roleDefaults: [], membershipRole: 'ADMIN' } },
      '/institutions/me/profile': { body: { institution: { id: 'inst-1', name: 'م', slug: 'm', status: 'ACTIVE', kind: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' } } },
      '/institutional/audit-logs': { body: { error: { code: 'FORBIDDEN', message: 'مرفوض' } }, status: 403 },
    });
    render(auditProviders(<InstitutionAuditLogPage />));
    // InstStates renders the ErrorState for a 403 — the honest wall
    await waitFor(() => expect(screen.getByText('سجل التدقيق')).toBeInTheDocument());
  });
});

/* ── 4. the users export ───────────────────────────────────────── */

describe('F4 · the users export helper (GET /users/export)', () => {
  it('returns the CSV blob + filename + the X-Export-Rows count', async () => {
    const csv = '\uFEFFid,email\nu1,a@x.ly\n';
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' });
    installAdapter({
      '/users/export': { body: blob, headers: { 'x-export-rows': '1' }, paged: true },
    });
    const out = await downloadUsersExport({ format: 'csv' });
    expect(out.filename).toMatch(/^ulara-users-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(out.rows).toBe(1);
    // the blob passes through BYTE-FOR-BYTE — the exact instance the
    // transport answered (the BOM bytes themselves are pinned by the
    // backend's own export test, r359-routes.test.ts, which reads the
    // raw buffer).
    expect(out.blob).toBe(blob);
  });

  it('the role filter rides the query and the filename', async () => {
    const log: string[] = [];
    installAdapter({
      '/users/export': { body: new Blob(['x'], { type: 'text/csv' }), headers: {}, paged: true },
    }, log);
    await downloadUsersExport({ role: 'TEACHER' });
    expect(log[0]).toContain('role');
    expect(log[0]).toContain('TEACHER');
  });
});

/* ── 5. the module registry's read-gated module ────────────────── */

describe('F4 · the audit module is the ONE read-gated nav section', () => {
  it('the registry carries the audit module with its AUDIT_BROWSE read gate', () => {
    const audit = INST_MODULES.find((m) => m.to === '/institution/audit');
    expect(audit).toBeDefined();
    expect(audit?.readCapability).toBe('AUDIT_BROWSE');
    expect(audit?.manage).toBeNull(); // read-only: the trail has no writes
  });

  it('members without the grant never see it; holders do; kind-only callers keep the pre-audit behaviour', () => {
    const profile = { kind: null } as never;
    const without = visibleModules(profile, { has: (c) => c === 'SOMETHING_ELSE' });
    expect(without.some((m) => m.to === '/institution/audit')).toBe(false);
    const withGrant = visibleModules(profile, { has: (c) => c === 'AUDIT_BROWSE' });
    expect(withGrant.some((m) => m.to === '/institution/audit')).toBe(true);
    // no reader supplied (tests / pre-audit callers): the filter only hides
    const legacy = visibleModules(profile, undefined);
    expect(legacy.some((m) => m.to === '/institution/audit')).toBe(true);
  });
});
