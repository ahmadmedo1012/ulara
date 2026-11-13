/**
 * Logo.tsx — the ULARA <Logo> implementation (the public barrel ./index
 * re-exports it under the frozen contract).
 *
 * ONE logo for the whole product (the R323 brief retired the six
 * competing variants; the ULARA takeover re-seats the same system on
 * the U-vessel):
 *   · mark      — the 32-grid hairline U-vessel + the sienna cornerstone
 *   · lockup    — horizontal, RTL: mark right, «أُلارا» left (default)
 *   · stacked   — mark / «أُلارا» / ULARA, the full vertical identity
 *   · wordmark  — the outlined word alone (size = its ink height)
 *
 * Everything is inline SVG (no <img>), inherits currentColor, and the
 * sienna cornerstone rides var(--accent) — the seat tokens.css re-keys
 * per theme (#C43E16 light · luminous ember #FF6B3D dark) — so the mark
 * themes without props. The root svg carries data-logo (the
 * loader-orchestrator tests count them) and role="img" + <title>.
 *
 * `animated` draws the construction in 600–900 ms — the hairline
 * vessel first, the sienna cornerstone LAST (a base-visible CSS draw:
 * under prefers-reduced-motion the animation never applies and the logo
 * is simply there, complete).
 */
import { useId } from 'react';
import type React from 'react';
import {
  MARK_CORNERSTONE,
  MARK_VESSEL_PATH,
  MARK_VIEWBOX,
  markStrokePx,
} from './mark';
import { LOCKUP, STACKED, WORDMARK_STROKE_SHEET } from './lockups';
import { WORDMARK_AR, WORDMARK_LATIN } from './wordmark.generated';

export type LogoVariant = 'lockup' | 'mark' | 'wordmark' | 'stacked';
export type LogoTone = 'auto' | 'ink' | 'paper' | 'sienna';

export function Logo(props: {
  /** default 'lockup' (horizontal, RTL order: mark right, wordmark left) */
  variant?: LogoVariant;
  /** mark height in px; lockup/stacked scale from it. In the 'wordmark'
   * variant it is the wordmark's ink height in px. */
  size?: number;
  /** 'auto' = currentColor + var(--accent) for the sienna cornerstone;
   * 'ink'/'paper'/'sienna' are literal one-colour settings for fixed
   * backgrounds (paper #F5F1E8, ink #262019, sienna #C43E16). */
  tone?: LogoTone;
  className?: string;
  /** stroke-draw 600–900 ms, sienna cornerstone LAST */
  animated?: boolean;
}): React.JSX.Element {
  const {
    variant = 'lockup',
    size = 32,
    tone = 'auto',
    className,
    animated = false,
  } = props;

  /* the ink slot (strokes + wordmark) and the cornerstone slot, per
   * tone: 'auto' inherits (currentColor + var(--accent)); 'ink'/
   * 'paper'/'sienna' pin BOTH slots to the literal brand colour for
   * fixed grounds (documented in BRAND.md §tones). */
  const ink =
    tone === 'paper'
      ? '#F5F1E8'
      : tone === 'sienna'
        ? '#C43E16'
        : tone === 'ink'
          ? '#262019'
          : 'currentColor';
  const cornerstone = tone === 'auto' ? 'var(--accent)' : ink;

  /* unique keyframe names per instance (multiple Logos per page) */
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const kfVessel = `ulaV${uid}`;
  const kfWord = `ulaW${uid}`;
  const kfStone = `ulaS${uid}`;

  const draw = (name: string, durationVar: string, delay: number): React.CSSProperties | undefined =>
    animated
      ? { strokeDasharray: 1, animation: `${name} var(${durationVar}) var(--brand-draw-ease) ${delay}ms both` }
      : undefined;
  const pop = (): React.CSSProperties | undefined =>
    animated ? { animation: `${kfStone} var(--motion-duration-brand-pop) var(--ease-linear) 750ms both` } : undefined;

  const styleTag = animated ? (
    <style>{`@keyframes ${kfVessel}{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes ${kfWord}{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes ${kfStone}{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion:reduce){.ula-logo *{animation:none !important}}`}</style>
  ) : null;

  /* ── the mark (shared by mark/lockup/stacked) ───────────────────────
   * The hairline rides the optical-size ramp (X11): markStrokePx tapers
   * the non-scaling stroke below the 32-grid design size so the small
   * seats (12/14/16/22/24/26 px) keep the designed weight instead of
   * bloating to 2.7× the ratio. The vessel draws as ONE continuous
   * stroke — stems, bowl, stems — with ROUND caps and joins (the
   * vessel is one gesture, never mitered), then the cornerstone pops
   * LAST. */
  const markShape = (
    <g stroke={ink} fill="none" strokeWidth={markStrokePx(size)} strokeLinecap="round" strokeLinejoin="round">
      <path
        d={MARK_VESSEL_PATH}
        pathLength={1}
        vectorEffect="non-scaling-stroke"
        style={draw(kfVessel, '--motion-duration-brand-draw-mark', 0)}
      />
      <rect x={MARK_CORNERSTONE.x} y={MARK_CORNERSTONE.y} width={MARK_CORNERSTONE.size} height={MARK_CORNERSTONE.size} fill={cornerstone} stroke="none" style={pop()} />
    </g>
  );

  /* ── the wordmark sheet (stroke-only outlined connected letterforms) ─ */
  const wordPath = (transform: string, name: string): React.JSX.Element => (
    <path
      d={WORDMARK_AR.d}
      transform={transform}
      fill="none"
      stroke={ink}
      strokeWidth={WORDMARK_STROKE_SHEET}
      strokeLinejoin="miter"
      pathLength={1}
      style={draw(name, '--motion-duration-brand-draw-word', 200)}
    />
  );
  const latinPath = (transform: string): React.JSX.Element => (
    <path d={WORDMARK_LATIN.d} transform={transform} fill={ink} stroke="none" />
  );

  /* ── variant canvases (size = mark height; wordmark: ink height) ──── */
  let viewBox: string;
  let width: number;
  let height: number;
  let body: React.JSX.Element;

  if (variant === 'mark') {
    viewBox = MARK_VIEWBOX;
    width = size;
    height = size;
    body = markShape;
  } else if (variant === 'wordmark') {
    viewBox = WORDMARK_AR.viewBox;
    width = +((size * WORDMARK_AR.ink.w) / WORDMARK_AR.ink.h).toFixed(2);
    height = size;
    body = wordPath('', kfWord);
  } else if (variant === 'stacked') {
    viewBox = STACKED.viewBox;
    width = size;
    height = +((size * STACKED.h) / 32).toFixed(2);
    body = (
      <>
        <g transform={`translate(${STACKED.mark.x} ${STACKED.mark.y})`}>{markShape}</g>
        {wordPath(`translate(${STACKED.ar.x} ${STACKED.ar.y}) scale(${STACKED.ar.scale})`, kfWord)}
        {latinPath(`translate(${STACKED.latin.x} ${STACKED.latin.y}) scale(${STACKED.latin.scale})`)}
      </>
    );
  } else {
    viewBox = LOCKUP.viewBox;
    width = +((size * LOCKUP.w) / 32).toFixed(2);
    height = size;
    body = (
      <>
        {wordPath(`translate(${LOCKUP.ar.x} ${LOCKUP.ar.y}) scale(${LOCKUP.ar.scale})`, kfWord)}
        <g transform={`translate(${LOCKUP.mark.x} ${LOCKUP.mark.y})`}>{markShape}</g>
      </>
    );
  }

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className={className ? `ula-logo ${className}` : 'ula-logo'}
      role="img"
      data-logo={variant}
      focusable="false"
      style={{ display: 'block' }}
      aria-label="أُلارا"
    >
      <title>أُلارا</title>
      {styleTag}
      {body}
    </svg>
  );
}
