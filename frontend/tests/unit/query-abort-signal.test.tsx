/**
 * r370 item 9 — a cancelled read must actually stop.
 *
 * Found: `lib/api.ts` fully supports `signal` (it wires an AbortController
 * into fetch / xhr.abort()), but NOT ONE hook forwarded TanStack Query's
 * per-query signal — so navigating away cancelled the QUERY while the HTTP
 * request kept running to completion and its body was parsed and thrown
 * away. On a slow network that is the request that keeps the tab's network
 * queue busy while the next screen waits.
 *
 * Fixed: every single-line read in `hooks/resources/student.ts` and
 * `hooks/resources/notifications.ts` passes `{ signal }` through to
 * `api.get`. These tests render the REAL hooks and prove the signal reaches
 * the client and is aborted when the query is cancelled (unmount).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const get = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/api', () => ({
  api: { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiBaseURL: '/api/v1',
  // The real unwrap reads `{ data: { data } }` — return the payload.
  unwrap: async (p: Promise<{ data: { data: unknown } }>) => (await p).data.data,
}));

import { useStudentDashboard, useStudentResults } from '../../src/hooks/resources/student';
import { useNotifications } from '../../src/hooks/resources/notifications';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  get.mockReset();
});

describe('read hooks forward TanStack Query’s abort signal', () => {
  it.each([
    ['useStudentDashboard', useStudentDashboard, '/me/dashboard'],
    ['useStudentResults', useStudentResults, '/me/results'],
  ])('%s passes a live AbortSignal to api.get and aborts it on unmount', async (_name, hook, path) => {
    let captured: AbortSignal | undefined;
    get.mockImplementation((_url: string, config?: { signal?: AbortSignal }) => {
      captured = config?.signal;
      // Never resolves: the query stays in flight until we unmount.
      return new Promise(() => undefined);
    });

    const { unmount } = renderHook(() => hook(), { wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(get.mock.calls[0]![0]).toBe(path);
    expect(captured).toBeInstanceOf(AbortSignal);
    expect(captured!.aborted).toBe(false);

    unmount();
    await waitFor(() => expect(captured!.aborted).toBe(true));
  });

  it('the notifications feed forwards it too', async () => {
    let captured: AbortSignal | undefined;
    get.mockImplementation((_url: string, config?: { signal?: AbortSignal }) => {
      captured = config?.signal;
      return new Promise(() => undefined);
    });

    const { unmount } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(captured).toBeInstanceOf(AbortSignal);
    unmount();
    await waitFor(() => expect(captured!.aborted).toBe(true));
  });
});
