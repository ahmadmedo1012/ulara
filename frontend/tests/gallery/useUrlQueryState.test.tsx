import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUrlQueryState } from '../../src/hooks/useUrlQueryState';

/**
 * Phase Ω (identity purity): the campus param is retired with the
 * invented campuses — the hook binds ONLY the search query. This suite
 * pins the query-only contract: URL reads, the debounced write, and
 * the clear path.
 */
function makeWrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('useUrlQueryState', () => {
  it('reads the initial query from the URL', () => {
    const { result } = renderHook(() => useUrlQueryState(), {
      wrapper: makeWrapper(['/colleges?q=هندس']),
    });
    expect(result.current.state.query).toBe('هندس');
  });

  it('falls back to an empty query on a clean URL', () => {
    const { result } = renderHook(() => useUrlQueryState(), {
      wrapper: makeWrapper(['/colleges']),
    });
    expect(result.current.state.query).toBe('');
  });

  it('ignores retired params (campus no longer exists)', () => {
    const { result } = renderHook(() => useUrlQueryState(), {
      wrapper: makeWrapper(['/colleges?campus=أي-شيء']),
    });
    expect(result.current.state.query).toBe('');
  });

  it('setQuery debounces the URL write', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges']),
    });

    // the live state updates immediately…
    act(() => result.current.hook.setQuery('حاسوب'));
    expect(result.current.hook.state.query).toBe('حاسوب');
    // …but the URL write is debounced (not yet at 0 ms)
    expect(result.current.params.get('q')).toBeNull();

    await act(async () => { await new Promise((r) => setTimeout(r, 160)); });
    expect(result.current.params.get('q')).toBe('حاسوب');
  });

  it('clear wipes both the live state and the URL immediately', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges?q=هندس']),
    });

    act(() => result.current.hook.clear());
    expect(result.current.hook.state.query).toBe('');
    expect(result.current.params.get('q')).toBeNull();
  });

  it('whitespace-only writes remove the param from the URL', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges?q=هندس']),
    });

    act(() => result.current.hook.setQuery('   '));
    await act(async () => { await new Promise((r) => setTimeout(r, 160)); });
    expect(result.current.params.get('q')).toBeNull();
  });
});
