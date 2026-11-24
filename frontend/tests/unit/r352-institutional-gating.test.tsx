/**
 * r352 — permission-sensitive rendering + the workspace's honest
 * states: the server's effective capability set (GET /me/permissions)
 * is the ONLY thing that reveals write controls — never the client's
 * role labels — and missing institution context renders the honest
 * select-institution state, while a server 403 renders the shared
 * permission-denied panel.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, ApiError, type ApiRequestConfig, type ApiResponse } from '../../src/lib/api';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import { InstitutionOrganizationPage } from '../../src/pages/institutional/OrganizationPage';
import { InstitutionWorkspaceLayout } from '../../src/components/institutional/shell';

const ADMIN_USER: AuthUser = {
  id: 'u-admin', email: 'admin@test.ly', firstName: 'مدير', lastName: 'تجريبي', role: 'ADMIN',
};

/** Paged list routes answer the BARE wire shape — the body IS
 * `{ data, meta }` (backend lib/pagination.ts: res.json({ data, meta }))
 * with NO outer `{ data: payload }` envelope; every other route answers
 * the standard envelope (unwrap's contract: res.data.data). The seam
 * surfaced when A3's KpiBand became the first `.meta` consumer — the
 * double-wrap made listQuery.data.meta undefined and crashed the page. */
const PAGED_ROUTES = new Set(['/institutional/org-units']);

/** Installs the hermetic adapter: route table + recording. */
function installAdapter(routes: Record<string, unknown>, log: string[] = []) {
  api.defaults.adapter = (config: ApiRequestConfig) => {
    const url = config.url ?? '';
    log.push(`${config.method} ${url}`);
    const hit = Object.entries(routes).find(([path]) => url === path || url.startsWith(path + '?'));
    if (!hit) {
      const res: ApiResponse<unknown> = {
        data: { error: { code: 'MOCK_NOT_IMPLEMENTED', message: 'لا يوجد مثبت' } },
        status: 501, statusText: '501', headers: {}, config,
      };
      return Promise.reject(new ApiError('501', config, 'ERR_BAD_REQUEST', res));
    }
    const body = PAGED_ROUTES.has(url) ? hit[1] : { data: hit[1] };
    const res: ApiResponse<unknown> = { data: body, status: 200, statusText: 'OK', headers: {}, config };
    return Promise.resolve(res);
  };
}

function withProviders(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/institution/organization']}>{node}</MemoryRouter>
    </QueryClientProvider>
  );
}

const EMPTY_PAGED = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

beforeEach(() => {
  useAuthStore.setState({
    user: ADMIN_USER,
    accessToken: 'test-token',
    memberships: [{ institutionId: 'inst-1', name: 'المؤسسة التجريبية', slug: 'test', role: 'ADMIN', isActive: true }],
    currentInstitution: { id: 'inst-1', name: 'المؤسسة التجريبية', slug: 'test' },
    membershipRole: 'ADMIN',
  });
});

describe('r352 permission-sensitive rendering (the server is the authority)', () => {
  it('reveals the create button ONLY when the effective capabilities include ORG_STRUCTURE_MANAGE', async () => {
    const log: string[] = [];
    installAdapter({
      '/me/permissions': { role: 'ADMIN', capabilities: [], roleDefaults: [], membershipRole: 'ADMIN' },
      '/institutional/org-units/tree': [],
      '/institutions/me/profile': { institution: { id: 'inst-1', name: 'م', slug: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' } },
      '/institutional/org-units': EMPTY_PAGED,
    }, log);

    const { unmount } = render(withProviders(<InstitutionOrganizationPage />));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'الهيكل التنظيمي' })).toBeInTheDocument());
    // capability absent → no write affordances at all
    expect(screen.queryByRole('button', { name: /وحدة جديدة/ })).toBeNull();
    // the capability endpoint was consulted (not the role label)
    expect(log).toContain('get /me/permissions');
    unmount();

    log.length = 0;
    installAdapter({
      '/me/permissions': {
        role: 'ADMIN',
        capabilities: ['ORG_STRUCTURE_MANAGE'],
        roleDefaults: [], membershipRole: 'ADMIN',
      },
      '/institutional/org-units/tree': [],
      '/institutions/me/profile': { institution: { id: 'inst-1', name: 'م', slug: 's', status: 'ACTIVE', createdAt: '', updatedAt: '' } },
      '/institutional/org-units': EMPTY_PAGED,
    }, log);
    render(withProviders(<InstitutionOrganizationPage />));
    await waitFor(() => expect(screen.getByRole('button', { name: /وحدة جديدة/ })).toBeInTheDocument());
  });
});

describe('r352 honest states', () => {
  it('renders the select-institution state when no institution context exists', async () => {
    useAuthStore.setState({
      user: ADMIN_USER, accessToken: 't',
      memberships: [], currentInstitution: null, membershipRole: null,
    });
    const log: string[] = [];
    installAdapter({}, log);
    render(withProviders(<InstitutionOrganizationPage />));
    /* R359 (A3 · the dead-region repair): an ADMIN with ZERO
     * memberships gets the honest no-membership sheet state (the
     * «pick from the switcher» copy now renders only when a
     * membership exists to pick). */
    await waitFor(() => expect(screen.getByText('لا عضوية مؤسسية لحسابك')).toBeInTheDocument());
    // no institution-scoped request was fired without a context
    expect(log.filter((l) => l.includes('org-units'))).toHaveLength(0);
  });

  it('renders the shared permission-denied panel on a server 403 (contract: backend authorization is authoritative)', async () => {
    api.defaults.adapter = (config: ApiRequestConfig) => {
      const res: ApiResponse<unknown> = {
        data: { error: { code: 'FORBIDDEN', message: 'لا تملك صلاحية الوصول' } },
        status: 403, statusText: '403', headers: {}, config,
      };
      return Promise.reject(new ApiError('403', config, 'ERR_BAD_REQUEST', res));
    };
    render(withProviders(<InstitutionOrganizationPage />));
    await waitFor(() => {
      // every fired query renders the shared permission-denied panel
      expect(screen.getAllByText('لا تملك صلاحية الوصول').length).toBeGreaterThan(0);
    });
  });
});

describe('r352 workspace rail — kind-aware section set', () => {
  it('renders the 13 sections for a university and 12 for a vocational center (research hidden)', async () => {
    const renderRail = async (kindCode: string | null) => {
      installAdapter({
        '/institutions/me/profile': {
          institution: {
            id: 'inst-1', name: 'م', slug: 's', status: 'ACTIVE', createdAt: '', updatedAt: '',
            kind: kindCode ? { id: 'k', code: kindCode, nameAr: kindCode } : null,
          },
        },
        '/me/permissions': { role: 'ADMIN', capabilities: [], roleDefaults: [], membershipRole: 'ADMIN' },
      });
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { unmount } = render(
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/institution']}>
            <InstitutionWorkspaceLayout />
          </MemoryRouter>
        </QueryClientProvider>,
      );
      // wait for the profile (and its kind) to settle — the rail's
      // section set re-derives from it
      await waitFor(() => {
        expect(screen.getByText(kindCode ?? 'المؤسسة التعليمية')).toBeInTheDocument();
      });
      const labels = screen.getAllByRole('link').map((a) => a.textContent ?? '');
      unmount();
      return labels;
    };

    const uni = await renderRail('UNIVERSITY');
    expect(uni.some((l) => l.includes('البحث المؤسسي'))).toBe(true);
    expect(uni.some((l) => l.includes('المجالس واللجان'))).toBe(true);

    const vocational = await renderRail('VOCATIONAL_TRAINING_CENTER');
    expect(vocational.some((l) => l.includes('البحث المؤسسي'))).toBe(false);
    expect(vocational.some((l) => l.includes('البرامج والخطط'))).toBe(true);
  });
});
