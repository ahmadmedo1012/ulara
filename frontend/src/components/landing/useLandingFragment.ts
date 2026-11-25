import { useEffect } from 'react';

// These are stable public fragments, including two targets inside the vision section.
const seats = new Map(Object.entries({
  chapters: 'chapters', product: 'product', roles: 'roles', live: 'live',
  vision: 'vision', cta: 'vision', colleges: 'vision', footer: 'footer',
}));

export function useLandingFragment(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let changes: MutationObserver | undefined;
    let sizes: ResizeObserver | undefined;
    let frame = 0;
    let stopAt = 0;
    const stop = () => {
      changes?.disconnect();
      sizes?.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(stopAt);
      stopAt = 0;
    };
    const follow = () => {
      stop();
      const id = window.location.hash.slice(1);
      if (!id) return;
      const seat = seats.get(id);
      const wrapper = seat && document.querySelector<HTMLElement>(`[data-lz="${seat}"]`);
      if (!wrapper) {
        document.getElementById(id)?.scrollIntoView();
        return;
      }
      // The anchor can arrive after the hash: first approach its reserved space,
      // then align the actual target after the lazy component replaces it.
      wrapper.scrollIntoView({ behavior: 'instant' });
      const align = () => {
        const target = document.getElementById(id) ?? (id === 'footer' ? wrapper.querySelector('footer') : null);
        if (!target || !wrapper.querySelector('section, footer')) return false;
        (target.getClientRects().length ? target : wrapper).scrollIntoView({ behavior: 'instant' });
        return true;
      };
      const adjust = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          if (window.location.hash.slice(1) === id && align() && !stopAt) {
            stopAt = window.setTimeout(stop, 3500);
          }
        });
      };
      changes = new MutationObserver(adjust);
      changes.observe(wrapper, { subtree: true, childList: true });
      if (typeof ResizeObserver !== 'undefined') {
        sizes = new ResizeObserver(adjust);
        // Earlier sections exchange reserved heights for measured content.
        // Keep the requested element in place until that initial layout settles.
        document.querySelectorAll('.lz-mount').forEach((el) => sizes?.observe(el));
      }
      adjust();
    };
    follow();
    window.addEventListener('hashchange', follow);
    const gestures = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    gestures.forEach((event) => window.addEventListener(event, stop, { passive: true }));
    return () => {
      window.removeEventListener('hashchange', follow);
      gestures.forEach((event) => window.removeEventListener(event, stop));
      stop();
    };
  }, [ready]);
}
