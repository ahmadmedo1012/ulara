/**
 * Mascot «نجّوم» — the friendly star of ULARA (r369).
 *
 * An ORIGINAL character drawn for this platform: a round five-point star
 * with a warm face, little arms and a soft amber body. Six poses cover
 * every emotional seat the product needs — welcome, cheer on success,
 * think with the reader, rest on empty states, wave on the CTA, and the
 * tiny sleeping twin for quiet zero-states.
 *
 * Rules:
 * · pure SVG, token colours only (no raw hex — the design gate scans TSX);
 * · aria-hidden by default (decorative) — pass `label` when the mascot IS
 *   the message (empty states) and it becomes an accessible image;
 * · no animation inside the SVG: motion lives in the consuming sheet so
 *   prefers-reduced-motion can kill it in one place.
 */

import { useId } from 'react';

export type MascotPose = 'hello' | 'cheer' | 'think' | 'rest' | 'wave' | 'sleep';

export interface MascotProps {
  pose?: MascotPose;
  size?: number;
  className?: string;
  /** When set, the mascot carries a name in the a11y tree. */
  label?: string;
}

const BODY = 'M50 6 C54 6 57 12 60 20 L70 34 C76 38 88 42 94 46 C98 49 96 56 90 60 L76 68 C72 72 70 82 70 90 C70 97 63 100 57 96 L44 86 C40 83 36 83 32 86 L19 96 C13 100 6 97 6 90 C6 82 4 72 0 68 L-14 60 C-20 56 -22 49 -18 46 C-12 42 0 38 6 34 L16 20 C19 12 22 6 26 6 Z';

/** the star body re-centred on a 100×100 box */
const STAR = 'M50 4 C54 4 58 11 61 21 L70 35 C76 39 88 43 95 47 C99 50 97 58 91 61 L77 69 C73 73 71 83 71 91 C71 98 64 101 58 97 L45 87 C41 84 37 84 33 87 L20 97 C14 101 7 98 7 91 C7 83 5 73 1 69 L-13 61 C-19 58 -21 50 -15 47 C-9 43 3 39 9 35 L18 21 C21 11 25 4 29 4 Z';

function Arms({ pose }: { pose: MascotPose }) {
  const up = pose === 'cheer' || pose === 'hello';
  return (
    <g stroke="var(--accent-ink)" strokeWidth="3.2" strokeLinecap="round" fill="none">
      {up ? (
        <>
          <path d="M18 52 C10 48 8 40 10 32" />
          <path d="M82 52 C90 48 92 40 90 32" />
        </>
      ) : (
        <>
          <path d="M18 60 C10 62 8 68 10 74" />
          <path d="M82 60 C90 62 92 68 90 74" />
        </>
      )}
    </g>
  );
}

function Face({ pose }: { pose: MascotPose }) {
  const closed = pose === 'sleep' || pose === 'rest';
  const happy = pose === 'cheer' || pose === 'hello' || pose === 'wave';
  return (
    <g>
      {/* eyes */}
      {closed ? (
        <g stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M36 52 q5 5 10 0" />
          <path d="M58 52 q5 5 10 0" />
        </g>
      ) : (
        /* m369-eyes-open — the CSS hook for the product's occasional
           blink (slice 05): the animation lives in the consuming sheet
           (the rule above), this class only names the part. */
        <g className="m369-eyes-open">
          <ellipse cx="41" cy="50" rx="4.2" ry="5" fill="var(--accent-ink)" />
          <ellipse cx="63" cy="50" rx="4.2" ry="5" fill="var(--accent-ink)" />
          <circle cx="42.6" cy="48.2" r="1.4" fill="var(--c-yellow-bg)" />
          <circle cx="64.6" cy="48.2" r="1.4" fill="var(--c-yellow-bg)" />
        </g>
      )}
      {/* cheeks */}
      <ellipse cx="30" cy="62" rx="5" ry="3.4" fill="var(--c-peach-bg)" opacity="0.9" />
      <ellipse cx="74" cy="62" rx="5" ry="3.4" fill="var(--c-peach-bg)" opacity="0.9" />
      {/* mouth */}
      {happy ? (
        <path d="M44 62 q8 9 16 0" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : pose === 'sleep' ? (
        <path d="M46 64 q6 3 12 0" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <circle cx="54" cy="64" r="3" fill="var(--accent-ink)" />
      )}
    </g>
  );
}

export function Mascot({ pose = 'hello', size = 96, className, label }: MascotProps) {
  const gid = useId();
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      {...a11y}
    >
      {/* the soft ground disc */}
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-ink)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="56" r="44" fill="var(--accent-soft)" opacity="0.65" />
      <g transform="translate(0 6) scale(0.92) translate(4 2)">
        <path d={STAR} fill={`url(#${gid})`} />
        <path d={STAR} fill="none" stroke="var(--accent-ink)" strokeWidth="2.2" opacity="0.18" />
      </g>
      <Face pose={pose} />
      <Arms pose={pose} />
      {pose === 'cheer' && (
        <g fill="var(--gold)">
          <path d="M88 18 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" opacity="0.9" />
          <path d="M12 12 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8 Z" opacity="0.75" />
        </g>
      )}
      {pose === 'sleep' && (
        <g fill="var(--info)" opacity="0.75" fontFamily="var(--font-display)" fontWeight="700">
          <text x="80" y="26" fontSize="11">z</text>
          <text x="88" y="16" fontSize="8">z</text>
        </g>
      )}
    </svg>
  );
}

/** unused-BODY guard: keep the raw outline exported for future poses */
export const MASCOT_BODY_PATH = BODY;
