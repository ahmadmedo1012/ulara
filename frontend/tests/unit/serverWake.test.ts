/**
 * serverWake — the cold-start signal must not fire for one slow endpoint
 * on a server that is already answering (the full-screen card looped on
 * /student/calendar even with a healthy connection).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('serverWake', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.resetModules(); });
  afterEach(() => { vi.useRealTimers(); });

  it('a never-answered session flips slow after 4s (the genuine cold start)', async () => {
    const m = await import('../../src/lib/serverWake');
    m.wakeRequestStart(1);
    vi.advanceTimersByTime(5000);
    expect(m.isServerSlow()).toBe(true);
    m.wakeRequestSettle(1);
    expect(m.isServerSlow()).toBe(false);
  });

  it('one slow request does not flip slow while the server answered in the last 15s', async () => {
    const m = await import('../../src/lib/serverWake');
    m.wakeRequestStart(1);
    m.wakeRequestSettle(1); /* answered */
    m.wakeRequestStart(2); /* the slow endpoint */
    vi.advanceTimersByTime(14_000);
    expect(m.isServerSlow()).toBe(false);
  });

  it('a warm session needs a lone request pending 20s after the last answer', async () => {
    const m = await import('../../src/lib/serverWake');
    m.wakeRequestStart(1);
    m.wakeRequestSettle(1);
    vi.advanceTimersByTime(30_000);
    m.wakeRequestStart(2);
    vi.advanceTimersByTime(10_000);
    expect(m.isServerSlow()).toBe(false);
    vi.advanceTimersByTime(11_000);
    expect(m.isServerSlow()).toBe(true);
  });

  it('a network fault or timeout does not count as an answer', async () => {
    const m = await import('../../src/lib/serverWake');
    m.wakeRequestStart(1);
    m.wakeRequestSettle(1, false);
    m.wakeRequestStart(2);
    vi.advanceTimersByTime(5000);
    expect(m.isServerSlow()).toBe(true);
  });
});
