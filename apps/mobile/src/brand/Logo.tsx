/**
 * Logo.tsx — the R326 M0.4 RN port of the <Logo>
 * (frontend/src/brand/Logo.tsx — the web implementation of record).
 *
 * The GEOMETRY is shared byte-identical (mark.ts · lockups.ts ·
 * wordmark.generated.ts are verbatim copies — enforced by
 * `npm run tokens:check`), and the variant math below mirrors the web
 * implementation line for line: lockup (RTL: mark right, «أُلارا» left) ·
 * mark · wordmark · stacked (mark / «أُلارا» / ULARA).
 *
 * The mark is the U-vessel (mark.ts): ONE round-capped ink stroke
 * `MARK_VESSEL_PATH` + the sienna `MARK_CORNERSTONE` square seated at the
 * right stem's top — never the retired arch, never miter joins.
 *
 * Two documented platform differences:
 *  · react-native-svg has no vector-effect:non-scaling-stroke — the
 *    mark's hairline reproduces the web's optical ramp (R324 X11) by
 *    scaling the strokeWidth in viewBox units: markStrokePx(size) ×
 *    32/size renders the exact same screen-px stroke at every size.
 *  · no CSS keyframes on RN — the web's stroke-draw `animated` prop is
 *    web-only for now (M2.2 may bring it via Reanimated).
 */
import type { ReactNode } from "react";
import Svg, { G, Path, Rect } from "react-native-svg";
import { useTheme } from "../design/theme";
import {
  MARK_VESSEL_PATH,
  MARK_CORNERSTONE,
  MARK_VIEWBOX,
  markStrokePx,
} from "./mark";
import { LOCKUP, STACKED, WORDMARK_STROKE_SHEET } from "./lockups";
import { WORDMARK_AR, WORDMARK_LATIN } from "./wordmark.generated";

export type LogoVariant = "lockup" | "mark" | "wordmark" | "stacked";
/** R336 B1: 'sienna' is the web's spelling of the accent tone — accepted
 * here as an alias so both platforms speak the SAME tone vocabulary
 * ('orange' stays accepted; same #C43E16, one meaning). */
export type LogoTone = "auto" | "ink" | "paper" | "orange" | "sienna";

export function Logo({
  variant = "lockup",
  size = 32,
  tone = "auto",
  testID,
}: {
  /** default 'lockup' (horizontal, RTL order: mark right, wordmark left) */
  variant?: LogoVariant;
  /** mark height in px; lockup/stacked scale from it. In the 'wordmark'
   * variant it is the wordmark's ink height in px. */
  size?: number;
  /** 'auto' = the live palette (ink text · sienna cornerstone — themes with
   * the app); 'ink'/'paper'/'orange' are literal one-colour settings
   * for fixed backgrounds (BRAND.md §tones). */
  tone?: LogoTone;
  testID?: string;
}): ReactNode {
  const { palette } = useTheme();
  const ink =
    tone === "paper"
      ? "#F5F1E8"
      : tone === "orange" || tone === "sienna"
        ? "#C43E16"
        : tone === "ink"
          ? "#262019"
          : palette.text;
  const cornerstone = tone === "auto" ? palette.accent : ink;

  /* the web's non-scaling hairline, reproduced in viewBox units (X11):
   * at size 32 → 1.5 units ≈ 1.5px; at size 16 the taper keeps the same
   * rendered px weight the web's vector-effect guarantees. The vessel is
   * ONE continuous stroke — round caps and joins throughout. */
  const markStrokeUnits = +((markStrokePx(size) * 32) / size).toFixed(3);

  /* ── the mark (shared by mark/lockup/stacked) ─────────────────────── */
  const markShape = (
    <G stroke={ink} fill="none" strokeWidth={markStrokeUnits} strokeLinejoin="round" strokeLinecap="round">
      <Path d={MARK_VESSEL_PATH} />

      <Rect
        x={MARK_CORNERSTONE.x}
        y={MARK_CORNERSTONE.y}
        width={MARK_CORNERSTONE.size}
        height={MARK_CORNERSTONE.size}
        fill={cornerstone}
        stroke="none"
      />
    </G>
  );

  /* ── the wordmark sheet (stroke-only outlined connected letterforms) ─ */
  const wordPath = (transform: string) => (
    <Path
      d={WORDMARK_AR.d}
      transform={transform}
      fill="none"
      stroke={ink}
      strokeWidth={WORDMARK_STROKE_SHEET}
      strokeLinejoin="miter"
    />
  );
  const latinPath = (transform: string) => (
    <Path d={WORDMARK_LATIN.d} transform={transform} fill={ink} stroke="none" />
  );

  /* ── variant canvases (size = mark height; wordmark: ink height) ──── */
  let viewBox: string;
  let width: number;
  let height: number;
  let body: ReactNode;

  if (variant === "mark") {
    viewBox = MARK_VIEWBOX;
    width = size;
    height = size;
    body = markShape;
  } else if (variant === "wordmark") {
    viewBox = WORDMARK_AR.viewBox;
    width = +((size * WORDMARK_AR.ink.w) / WORDMARK_AR.ink.h).toFixed(2);
    height = size;
    body = wordPath("");
  } else if (variant === "stacked") {
    viewBox = STACKED.viewBox;
    width = size;
    height = +((size * STACKED.h) / 32).toFixed(2);
    body = (
      <G>
        <G transform={`translate(${STACKED.mark.x} ${STACKED.mark.y})`}>{markShape}</G>
        {wordPath(`translate(${STACKED.ar.x} ${STACKED.ar.y}) scale(${STACKED.ar.scale})`)}
        {latinPath(`translate(${STACKED.latin.x} ${STACKED.latin.y}) scale(${STACKED.latin.scale})`)}
      </G>
    );
  } else {
    viewBox = LOCKUP.viewBox;
    width = +((size * LOCKUP.w) / 32).toFixed(2);
    height = size;
    body = (
      <G>
        {wordPath(`translate(${LOCKUP.ar.x} ${LOCKUP.ar.y}) scale(${LOCKUP.ar.scale})`)}
        <G transform={`translate(${LOCKUP.mark.x} ${LOCKUP.mark.y})`}>{markShape}</G>
      </G>
    );
  }

  return (
    <Svg
      viewBox={viewBox}
      width={width}
      height={height}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="أُلارا"
    >
      {body}
    </Svg>
  );
}
