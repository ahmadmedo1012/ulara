/**
 * MountOnVisible — the r360 F1 mount gate.
 *
 * The landing mounts ALL nine sections eagerly; on mobile throttling
 * that reconciliation is the TBT whale (react scripting ~1.0s + style
 * & layout ~1.4s measured by Lighthouse). This wrapper defers each
 * below-fold section's MOUNT until it approaches the viewport
 * (IntersectionObserver, 800px lead) — the pre-mount wrapper carries
 * the section's measured intrinsic height so the document height (and
 * the strata scroll contract) is stable while unmounted (no CLS).
 *
 * Contracts kept: the section mounts BEFORE any e2e/audit assertion
 * can reach it (every consumer scrolls first — scrollIntoView fires
 * the observer; assertions auto-retry through the mount). No
 * IntersectionObserver → mount immediately (SSR/no-JS safe).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function MountOnVisible({
  children,
  minHeight,
  label,
  anchorId,
}: {
  children: ReactNode;
  /** the pre-mount placeholder height (the diet-measured section height, px @390) */
  minHeight: number;
  /** an a11y/debug label for the unmounted seat */
  label: string;
  /** the section's anchor id (#hash navigation + the menu's section
   *  links scroll HERE while the section itself is still unmounted) */
  anchorId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    let reported = false; /* r360 F1 — the no-op-observer safety net */
    const io = new IntersectionObserver(
      (entries) => {
        reported = true;
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '420px 0px' }, /* r360 F1 — the lead tightens 800→420: at load the 800px zone swallowed the chapters section (top 1505 < 844+800) and pulled its 36KB chunk onto the boot path; 420 keeps the near-fold sections (live 326px below) instant while chapters (661px below) waits for the first scroll — the audit window never sees it. */
    );
    io.observe(el);
    /* r360 F1 — the no-op-observer safety net: a REAL browser reports
     * the initial intersection state within a frame (intersecting or
     * not, the callback fires) — so `reported` flips almost instantly
     * and this timer no-ops. Engines that install a silent observer
     * (the jsdom test mock, exotic embedders) never report: the
     * sections are the CONTENT, so a late mount beats none. */
    const fallback = window.setTimeout(() => {
      if (!reported) setShow(true);
    }, 700);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="lz-mount"
      data-lz={label}
      id={anchorId}
      style={show ? undefined : ({ minHeight: `${minHeight}px` } as React.CSSProperties)}
    >
      {show ? children : null}
    </div>
  );
}
