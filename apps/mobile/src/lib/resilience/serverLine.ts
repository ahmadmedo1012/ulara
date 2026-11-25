/**
 * resilience/serverLine — r362 P1: the REAL-REQUEST evidence bus.
 *
 * The connectivity layer answers four questions (see ./network). Three of
 * them have a trustworthy instrument: NetInfo's `isConnected` (device
 * interface), our own `/ping` probe (API reachability), and the query
 * cache (database health). The fourth — «is the ULARA server actually
 * unreachable right now?» — was answered by the PROBE ALONE, and that is
 * the defect the owner kept feeling: a 5s probe budget over a Libyan
 * mobile link to a cold Vercel function times out routinely, twice in a
 * row, and the app announced «تعذّر الاتصال بخادم أُلارا» while real
 * API requests were succeeding on the same connection, over cached
 * content the reader could still use.
 *
 * A probe is a *synthetic* request. The app's own traffic is the real
 * evidence, and it is always being produced. This module is the seam
 * that carries it: the API client reports every outcome here, and the
 * connectivity machine may only claim `ularaServerUnavailable` while
 * real traffic also fails (or has not succeeded since the streak began).
 *
 * Deliberately dependency-free (no React, no client import) so both the
 * transport and the connectivity layer can depend on it without a cycle.
 */

/** What a real request proved about the server. */
export type ServerSignal = "reachable" | "unreachable";

const listeners = new Set<(signal: ServerSignal) => void>();

/**
 * Report the outcome of a REAL request. `reachable` means an HTTP
 * response arrived at all (any status — a 500 still proves the server
 * answered); `unreachable` is reserved for transport failures
 * (offline / DNS / TLS / timeout), which say nothing about the server's
 * health but everything about the path to it.
 */
export function reportServerSignal(signal: ServerSignal): void {
  listeners.forEach((listener) => listener(signal));
}

/** Subscribe to real-request evidence. Returns the unsubscribe. */
export function onServerSignal(listener: (signal: ServerSignal) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only seam (the `__networkInternals` pattern). */
export const __serverLineInternals = {
  listenerCount(): number {
    return listeners.size;
  },
  reset(): void {
    listeners.clear();
  },
};
