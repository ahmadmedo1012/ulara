/**
 * Phase Ω — UniversityInfoPage identity-purity pin.
 *
 * The retired memberships card (real-institution claims, then the
 * fictional-university profile from UNIVERSITY_FACTS) is gone with the
 * identity reset: the platform claims NO institutional memberships and
 * NO accreditation — both are each institution's own affair. The card
 * now renders the honest workspace line, mirrored from the demo fact
 * sheet (backend zu-sync static-source.ts — one source, never
 * hand-retyped: the r155b lesson carries over).
 *
 * useFaculties mocked at the module boundary (the ...actual spread
 * pattern); the card itself is static data.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UniversityInfoPage } from '../../src/pages/student/MorePages';

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useFaculties: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UniversityInfoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UniversityInfoPage — بطاقة تعريف المؤسّسة (Phase Ω)', () => {
  it('renders the honest no-memberships line (the fact sheet mirrored, no hand-retyped list)', () => {
    renderPage();

    // the workspace's own truth, one line — no institutional claims
    expect(screen.getAllByText('لا عضويّات — مساحة عرض محايدة (بيانات تجريبية)').length).toBeGreaterThan(0);
    // the card title states what this is
    expect(screen.getByText('بطاقة تعريف المؤسّسة')).toBeInTheDocument();
  });

  it('claims NO accreditation — the ownership note states whose affair it is', () => {
    renderPage();
    expect(screen.getAllByText('الاعتماد والعضويّات شأن مؤسستك — أُلارا منصّة مستقلّة لا تدّعي أي اعتماد').length).toBeGreaterThan(0);
  });
});
