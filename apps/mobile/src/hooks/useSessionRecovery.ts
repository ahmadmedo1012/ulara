/**
 * useSessionRecovery — r362 P1: the two moments a kept-but-unverified
 * session gets its second chance.
 *
 * The transport no longer ends a session on a transient refresh failure
 * (a flaky link, a 15s abort, a 5xx cold start, the auth limiter's
 * 429). It keeps the session and schedules a bounded backoff ladder.
 * This hook closes the two gaps the ladder cannot cover on its own:
 *
 *   · FOREGROUND — the app was suspended for hours; the ladder's timers
 *     did not run. Every `active` transition re-attempts the refresh.
 *   · CONNECTIVITY REGAIN — a device that lost radio entirely has no
 *     clock-driven recovery path worth trusting; the moment ULARA is
 *     reachable again is the honest trigger.
 *
 * Both paths call `retrySessionRefresh()`, which is a no-op unless a
 * TRANSIENT failure actually left the session unverified — a healthy
 * session is never rotated gratuitously, and a definitive refusal is
 * never retried (it already ended the session).
 *
 * Mounted once at the root. Renders nothing.
 */
import { useEffect } from "react";
import { AppState } from "react-native";
import { retrySessionRefresh } from "@/api/client";
import { useNetworkStatus } from "@/lib/resilience/network";

export function useSessionRecovery(): void {
  const { phase } = useNetworkStatus();
  const reachable = phase === "internetAvailable";

  // Connectivity regain: fire on the transition INTO reachable, not on
  // every render that happens to be reachable.
  useEffect(() => {
    if (!reachable) return;
    void retrySessionRefresh();
  }, [reachable]);

  // Foreground: a suspended app's timers do not run.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void retrySessionRefresh();
    });
    return () => sub.remove();
  }, []);
}
