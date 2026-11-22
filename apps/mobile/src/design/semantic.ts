/**
 * R334 2-f — the SEMANTIC color layer.
 *
 * Role names for what screens actually mean, resolved per theme through the
 * EXISTING mechanism (ds palette + statusTones from ./tokens → the
 * generated shared source of truth). Screens should reach for these seats
 * instead of raw palette keys, so a future token reshuffle only edits this
 * one mapping.
 *
 * ds discipline (unchanged, now testable):
 *   · Elevation WITHOUT shadows — cards rise by a surface step + a hairline
 *     frame. The presets below never emit any shadow or elevation key.
 *   · ONE royal accent per screen — `accent` is the only saturated brand
 *     hue (the 2026 «Parchment & Royal» takeover; see the accent block
 *     below — the blue now clears AA as text itself).
 *   · success/warning/danger are FEEDBACK tones, never accents.
 *
 * Shared-JSON mapping notes (shared/design-tokens.json — read-only truth):
 *   · `surface`            = the page ground  (shared `bg`: paper/charcoal).
 *   · `surfaceElevated`    = cards & sheets   (shared light `surfaceElevated`
 *     = neutral.0 ✓). Dark maps to palette.surface (#2E2E2E = the Card
 *     component's existing ground), NOT the web's surface2 step (#353535) —
 *     the mobile app's dark card seat predates this layer and must not be
 *     repainted from under its 90+ consumers. Documented divergence.
 *   · `sunken`             = wells/tracks/inset fields (shared `bgSoft` =
 *     surface2 = palette.surfaceHover in BOTH themes ✓).
 *   · status seats         = shared successInk/warningInk/dangerInk exactly:
 *     the text ink is the family `deep` rung in both themes (AAA), while
 *     the fill rides the family `ink`.
 */
import { StyleSheet, type ViewStyle } from "react-native";
import { ds, statusTones, type StatusTone, type ThemeName } from "./tokens";

// ── status seats ───────────────────────────────────────────────────────────

/** A feedback tone's three seats: solid UI, tinted ground, AA text ink. */
export interface StatusSeat {
  /** Saturated tone — borders, icons, solid fills (not body text). */
  fill: string;
  /** Tinted ground — wells, badges, banners. */
  soft: string;
  /** AA-safe ink for text on surface/sunken grounds. */
  ink: string;
}

function statusSeat(tone: StatusTone): StatusSeat {
  // fill = the saturated family ink; soft = its tinted ground; ink = the
  // family `deep` rung, which is the AAA text tier in BOTH themes (dark
  // deep is the light tint, so status text keeps its contrast there too).
  return { fill: tone.ink, soft: tone.bg, ink: tone.deep };
}

// ── the semantic color seats ───────────────────────────────────────────────

export interface SemanticColors {
  /** Page ground — the paper itself (light #F5F1E8 · dark #262019). */
  surface: string;
  /** Cards, sheets, popovers — one surface step up + hairline frame. */
  surfaceElevated: string;
  /** Sunken wells — inset fields, progress tracks, code grounds. */
  sunken: string;
  /** Primary ink — headings, values. */
  textPrimary: string;
  /** Secondary ink — supporting copy, labels. */
  textSecondary: string;
  /** Tertiary ink — metadata, timestamps. */
  textTertiary: string;
  /**
   * THE royal — the single accent seat (light #2540D9 · dark #8AA0FF).
   * The blue clears AA as text itself (light 6.62:1 · dark 6.56:1), so
   * `accentInk` ≡ `accent` now (the sienna era's raw/ink split retired).
   * One accented element per screen.
   */
  accent: string;
  /** Text-safe accent (AA) — ≡ accent (light #2540D9 · dark #8AA0FF). */
  accentInk: string;
  /** Tinted accent ground — soft washes behind the accent moment
   *  (light #E4E9FF · dark #232845 — never the light value in dark). */
  accentSoft: string;
  /** Label ink on an `accent` fill (light #FFFFFF · dark #262019 —
   *  the owner-verified pair; white on #8AA0FF FAILS at 2.46:1). */
  accentFg: string;
  /** Success feedback (mint family). */
  success: StatusSeat;
  /** Warning feedback (yellow family). */
  warning: StatusSeat;
  /** Danger/destructive feedback (rose family). */
  danger: StatusSeat;
}

export function semanticColorsFor(name: ThemeName): SemanticColors {
  const p = ds[name];
  const t = statusTones[name];
  return {
    surface: p.bg,
    surfaceElevated: p.surface,
    sunken: p.surfaceHover,
    textPrimary: p.text,
    textSecondary: p.textSecondary,
    textTertiary: p.textMuted,
    accent: p.accent,
    accentInk: p.accentInk,
    accentSoft: p.accentSoft,
    accentFg: p.accentFg,
    success: statusSeat(t.mint),
    warning: statusSeat(t.yellow),
    danger: statusSeat(t.rose),
  };
}

// ── hairline presets — elevation without shadows ──────────────────────────

export interface Hairlines {
  /** Card/well frame — the thinnest physical line (≈0.5pt @2x). */
  border: ViewStyle;
  /** Strong 1px rule — section breaks, sheet frames. */
  borderStrong: ViewStyle;
  /** Separator FILL (height, not a border width). */
  separator: ViewStyle;
}

export function hairlinesFor(name: ThemeName): Hairlines {
  const p = ds[name];
  return {
    border: { borderWidth: StyleSheet.hairlineWidth, borderColor: p.border },
    borderStrong: { borderWidth: 1, borderColor: p.rule },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: p.border },
  };
}

// ── the bundle theme.tsx serves additively ────────────────────────────────

export interface SemanticTheme {
  name: ThemeName;
  colors: SemanticColors;
  hairlines: Hairlines;
}

export function semanticThemeFor(name: ThemeName): SemanticTheme {
  return { name, colors: semanticColorsFor(name), hairlines: hairlinesFor(name) };
}

/** The forbidden elevation keys — the no-shadows contract (kept testable). */
export const SHADOW_KEYS = [
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "elevation",
] as const;
