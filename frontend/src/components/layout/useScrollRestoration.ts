import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType, type NavigationType } from 'react-router-dom';

const SCROLL_STORAGE_KEY_PREFIX = 'ulara.scroll:';

/* r152a (A4 P3): hardened browsers and embedded webviews can throw on
 * sessionStorage access itself (the app already guards this in
 * auth.store / LandingPage / ProfilePage) — an unguarded throw inside
 * this effect would land the whole app on the error boundary on every
 * navigation. Persistence and restore silently degrade instead. */
const readStoredScroll = (key: string): number | null => {
  try {
    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY_PREFIX + key);
    return stored ? Number(stored) : null;
  } catch {
    return null;
  }
};

const persistScroll = (key: string, scrollTop: number): void => {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY_PREFIX + key, String(scrollTop));
  } catch {
    /* storage blocked — skip persisting */
  }
};

/* r305-A4 (task 2-e): the POP restore's one-rAF apply can land while
 * the destination's height hasn't arrived yet — the shell's inner
 * Suspense fallback on a cold chunk, or a page whose data (lists /
 * charts / media) lands after mount. A real scroller CLAMPS the
 * programmatic write to scrollHeight − clientHeight, so the stored
 * offset silently degrades to whatever the short state can hold and
 * the position is lost the moment the real content replaces it
 * (measured in useScrollRestoration.test.tsx: POP into a route that
 * grows 100→2000px after the restore frame parks the user at the top,
 * forever). The watcher re-applies the stored offset for a bounded
 * window (wall-clock — see r363 below) and stands down the moment the offset is
 * honored, a new navigation replaces this effect, or the user scrolls
 * the container themselves (any position that isn't the one our own
 * write produced — the clamped result of our write always compares
 * equal to `expected`, user movement never does). PUSH/REPLACE —
 * always top, no stored offset to lose — are untouched.
 *
 * r363 — the budget is WALL-CLOCK, not frame-count. The original
 * window was "~60 rAF frames", which reads as ~1s at 60fps — but on a
 * janking main thread (the CI e2e runners, low-end phones recovering
 * from a background kill) 60 frames can stretch past any observer's
 * patience, and the watcher stood down BEFORE the late height ever
 * arrived: the restore was stranded at the clamped top and the test's
 * own 40s window never saw the position return (measured twice in CI:
 * 022f5db and ef92b4f, both attempts, while the same code passes 4/4
 * locally — the frames were starved, not the restore lost). A
 * wall-clock budget degrades honestly: under a healthy clock it
 * re-applies for the same practical span and still stands down the
 * moment the offset is honored; under starvation it keeps trying
 * through the whole window instead of dying early. */
const RESTORE_WATCH_MS = 4000;

/**
 * useScrollRestoration — saves the content scroll position per history
 * entry, restores it on POP (browser back/forward), scrolls to top on
 * PUSH/REPLACE.
 *
 * Pass the ref of the scroll container (the element that actually
 * scrolls — typically `.content` inside the AppShell, NOT window).
 *
 * See FR-008 (narrowed): scroll-position restoration only.
 */
export function useScrollRestoration(scrollRef: React.RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const navigationType: NavigationType = useNavigationType();
  const previousKey = useRef<string | null>(null);
  const previousScrollTop = useRef<number>(0);

  // Track the live scroll position so we can persist on key change.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const onScroll = () => {
      previousScrollTop.current = node.scrollTop;
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  // Persist on navigate-away; restore or top-scroll on navigate-in.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    // Save the OUTGOING key's scroll position.
    if (previousKey.current && previousKey.current !== location.key) {
      persistScroll(previousKey.current, previousScrollTop.current);
    }

    // POP restore machinery — owns its own teardown (rAFs + watcher
    // listener) so a mid-watch navigation cancels it cleanly.
    let applyRaf = 0;
    let watchRaf = 0;
    let honored = false;
    // What our last programmatic write produced (the clamped result).
    // -1 until the first apply: scroll events before the restore has
    // applied must not cancel it (old-code parity — the apply always
    // happened, even over a scroll that raced it).
    let expected = -1;
    // The wall-clock budget's epoch — read once at arm time so a slow
    // first frame never shortens the window.
    const watchT0 = performance.now();

    const stopWatching = () => {
      if (applyRaf) {
        cancelAnimationFrame(applyRaf);
        applyRaf = 0;
      }
      if (watchRaf) {
        cancelAnimationFrame(watchRaf);
        watchRaf = 0;
      }
      node.removeEventListener('scroll', onWatchScroll);
    };

    const onWatchScroll = () => {
      if (expected < 0) return;
      if (honored) return;
      if (node.scrollTop !== expected) stopWatching(); // user intent wins
    };

    const apply = () => {
      node.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
      expected = node.scrollTop;
      if (expected >= top - 1) {
        honored = true;
        stopWatching();
      }
    };

    const tick = () => {
      watchRaf = 0;
      if (honored) return;
      if (performance.now() - watchT0 >= RESTORE_WATCH_MS) {
        stopWatching();
        return;
      }
      watchRaf = requestAnimationFrame(() => {
        watchRaf = 0;
        if (honored) return;
        apply();
        tick();
      });
    };

    let restoreTeardown: (() => void) | null = null;
    // Effect-scoped so `apply` (defined above) closes over the restore
    // target — a block-scoped const inside the POP branch would leak
    // the reference to the global `window.top` (measured: NaN writes).
    let top = 0;

    if (navigationType === 'POP') {
      // Browser back/forward: restore the entry's saved position.
      top = readStoredScroll(location.key) ?? 0;
      node.addEventListener('scroll', onWatchScroll, { passive: true });
      // Run after layout so the content is in place; the bounded
      // watcher completes the restore if the height arrives late.
      applyRaf = requestAnimationFrame(() => {
        applyRaf = 0;
        apply();
        if (!honored) tick();
      });
      restoreTeardown = stopWatching;
    } else {
      // PUSH/REPLACE: top of the new route.
      node.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    previousKey.current = location.key;
    previousScrollTop.current = 0;
    return () => restoreTeardown?.();
  }, [location.key, navigationType, scrollRef]);
}
