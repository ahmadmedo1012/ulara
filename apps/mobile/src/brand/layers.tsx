import Svg, { G, Path, Rect } from "react-native-svg";
import {
  MARK_CORNERSTONE,
  MARK_VESSEL_PATH,
  MARK_VIEWBOX,
  markStrokePx,
} from "./mark";

/**
 * R341 (lead, t02 follow-up) — MarkLayers: the canonical mark as TWO
 * separately-animatable svg layers, for seats that animate the vessel
 * and the cornerstone independently (the Boot loader's counter-phase
 * pulse). <Logo> renders both layers inside ONE Svg root, which cannot
 * carry per-element animation — these single-layer exports are the
 * brand system's sanctioned answer.
 *
 * LOGO-GATE LAW (scripts/brand/logo-gate.sh §3): the MARK_* constants
 * are consumed ONLY inside the brand system. Animated seats import
 * THESE components through the barrel (`@/brand`) — they never touch
 * the geometry constants or the svg primitives themselves. Same law,
 * same single source: mark.ts.
 *
 * Each layer renders the mark's own canvas (MARK_VIEWBOX) at `size` —
 * stack them in an absolutely-positioned seat to compose the exact
 * figure <Logo variant="mark"> renders (see boot.tsx's BootMark).
 */

/** The vessel — ONE round-capped ink stroke, the same primitives and
 * stroke math as <Logo>'s markShape (the X11 optical hairline ramp). */
export function MarkVesselLayer({ size, color }: { size: number; color: string }) {
  const strokeUnits = +((markStrokePx(size) * 32) / size).toFixed(3);
  return (
    <Svg viewBox={MARK_VIEWBOX} width={size} height={size}>
      <G
        stroke={color}
        fill="none"
        strokeWidth={strokeUnits}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <Path d={MARK_VESSEL_PATH} />
      </G>
    </Svg>
  );
}

/** The cornerstone — the solid sienna 4×4 seated at the right stem's
 * top (MARK_CORNERSTONE), the same rect <Logo> renders. */
export function MarkCornerstoneLayer({ size, color }: { size: number; color: string }) {
  return (
    <Svg viewBox={MARK_VIEWBOX} width={size} height={size}>
      <Rect
        x={MARK_CORNERSTONE.x}
        y={MARK_CORNERSTONE.y}
        width={MARK_CORNERSTONE.size}
        height={MARK_CORNERSTONE.size}
        fill={color}
        stroke="none"
      />
    </Svg>
  );
}
