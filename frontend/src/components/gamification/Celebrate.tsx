import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../motion/useReducedMotion';

/**
 * Celebrate — the ONE shared celebration moment (r369 slice 05 / spec 05).
 *
 * Contract:
 *   · Fires only for an achievement the app ALREADY RECORDED (the
 *     training payload reports a level above the remembered one, …) —
 *     never for an invented event. The parent owns the once-only
 *     discipline through the event's stable `id` and mounts this
 *     component only when a fresh event exists.
 *   · The moment is the reference's grammar in the product register:
 *     the +N rise line (the landing's w369-gain recipe) over a
 *     halo-pulsing gold dot — transform/opacity + paint only, token
 *     durations (380ms rise + 520ms halo from a 120ms offset ≈ 0.64s,
 *     inside the 1.2s ceiling), then `onSettle` retires it. The fact
 *     belongs to the page that mounted it; the moment never loops.
 *   · prefers-reduced-motion: the static fact line renders, no
 *     animation, no timer — the parent keeps it or clears it.
 *   · Announced ONCE on a polite live region; never steals focus
 *     (aria-hidden flourishes, the line is the announcement).
 *
 * Direct-import member (the CountIn precedent) — NOT a barrel key:
 * tests/motion/Skeleton.test.tsx pins the motion barrel's exact keys.
 */
export interface CelebrateProps {
  /** Stable event id (e.g. `ula-level:<user>:4`) — re-renders with the
      same id never replay; a mounted Celebrate plays exactly once. */
  id: string;
  /** The «+N» rise line (e.g. «+1»); omit when the event has no count. */
  rise?: string;
  /** The fact line in Arabic — also the polite announcement. */
  label: string;
  /** Retires the moment after the flourish completes (skipped under
      reduced motion: the static line is not a transient). */
  onSettle?: () => void;
}

/* The settle clock mirrors the CSS: --t-micro (120) + --t-slower (520)
   halo + --t-base (380) rise = 1.02s, plus a small frame margin, still
   under the 1.2s spec ceiling. */
const SETTLE_MS = 1100;

export function Celebrate({ id, rise, label, onSettle }: CelebrateProps) {
  const reduced = useReducedMotion();
  const settled = useRef<string | null>(null);

  useEffect(() => {
    if (reduced || !onSettle) return;
    if (settled.current === id) return;
    settled.current = id;
    const t = window.setTimeout(onSettle, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [id, reduced, onSettle]);

  return (
    <p className="g369-celebrate" role="status" data-celebrate-id={id}>
      <span className="g369-celebrate-halo" aria-hidden="true" />
      {rise ? (
        <span className="g369-celebrate-rise" aria-hidden="true">
          {rise}
        </span>
      ) : null}
      <span className="g369-celebrate-label">{label}</span>
    </p>
  );
}
