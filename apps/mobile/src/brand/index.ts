/**
 * index.ts — the RN brand system's single public surface (R326 M0.4).
 *
 * The port of frontend/src/brand/index.ts — the SAME frozen contract:
 *
 *   export type LogoVariant = 'lockup' | 'mark' | 'wordmark' | 'stacked';
 *   export type LogoTone = 'auto' | 'ink' | 'paper' | 'orange';
 *   export function Logo(props: { variant?; size?; tone?; testID? });
 *
 * Geometry (mark · lockups · wordmark sheets) is internal and shared
 * byte-identical with the web (enforced by npm run tokens:check); the
 * renderer in ./Logo is the only platform code.
 *
 * R341 (lead): MarkVesselLayer / MarkCornerstoneLayer (./layers) — the
 * mark as two separately-animatable layers for animated seats (the
 * Boot loader). The MARK_* geometry stays internal (logo-gate §3);
 * animated seats consume these components, never the constants.
 */
export type { LogoVariant, LogoTone } from "./Logo";
export { Logo } from "./Logo";
export { MarkVesselLayer, MarkCornerstoneLayer } from "./layers";

