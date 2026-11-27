/**
 * tokens.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Source of truth: shared/design-tokens.json (R326 M0.4).
 * Regen (repo root): npm run tokens:build · Gate: npm run tokens:check
 *
 * The MOBILE half of the shared design-system set. The typed public surface
 * (DsPalette · StatusTone · the toneFor* mappers) lives in ./tokens,
 * which re-exports this data — every existing import keeps working.
 */

export const ds = {
  light: {
    bg: "#FBF6EC",
    surface: "#FFFFFF",
    surfaceHover: "#F5EDDF",
    overlay: "#FFFFFF",
    text: "#1E1A3C",
    textSecondary: "#6E6455",
    textMuted: "#6A6151",
    textFaint: "#6F6656",
    accent: "#1E1A3C",
    accentHover: "#332C5C",
    accentHoverFg: "#FBF6EC",
    accentInk: "#1E1A3C",
    accentSoft: "#E6E1F2",
    accentStrong: "#332C5C",
    accentFg: "#FBF6EC",
    primary: "#1E1A3C",
    primaryFg: "#FBF6EC",
    border: "#E3D8C2",
    rule: "#E3D8C2",
    gold: "#F29A1F",
    goldInk: "#A8620A",
    dangerFg: "#FFFFFF",
    onSurface: "#1E1A3C",
    onSurfaceMuted: "#6A6151",
  },
  dark: {
    bg: "#14122B",
    surface: "#1E1B3D",
    surfaceHover: "#262251",
    overlay: "#1E1B3D",
    text: "#F7F1E6",
    textSecondary: "#D3CEE4",
    textMuted: "#C2BDDA",
    textFaint: "#B3ADC9",
    accent: "#EFE9FF",
    accentHover: "#FFFFFF",
    accentHoverFg: "#14122B",
    accentInk: "#EFE9FF",
    accentSoft: "#2A2552",
    accentStrong: "#FFFFFF",
    accentFg: "#14122B",
    primary: "#EFE9FF",
    primaryFg: "#14122B",
    border: "#423C6E",
    rule: "#423C6E",
    gold: "#F7B34A",
    goldInk: "#F7C97E",
    dangerFg: "#14122B",
    onSurface: "#F7F1E6",
    onSurfaceMuted: "#C2BDDA",
  },
};

export const statusTones = {
  light: {
    mint: { bg: "#DEF2EA", ink: "#12805C", deep: "#0A5A40" },
    yellow: { bg: "#FBEED4", ink: "#A9740A", deep: "#6B4708" },
    rose: { bg: "#FBE3E0", ink: "#C23227", deep: "#8F1F16" },
    sky: { bg: "#DFEBF5", ink: "#2F7FB5", deep: "#14486B" },
    lavender: { bg: "#EDE6FB", ink: "#7C5CE0", deep: "#3D2A80" },
    copper: { bg: "#FCE4DE", ink: "#E8603F", deep: "#9B2E16" },
    grey: { bg: "#EFEBE4", ink: "#6A655C", deep: "#262233" },
  },
  dark: {
    mint: { bg: "#16362E", ink: "#5FD6AC", deep: "#5FD6AC" },
    yellow: { bg: "#3A2F1A", ink: "#F0C572", deep: "#F0C572" },
    rose: { bg: "#3B2320", ink: "#FF8A7A", deep: "#FF8A7A" },
    sky: { bg: "#1D3045", ink: "#8CC7EC", deep: "#C6E4F8" },
    lavender: { bg: "#2A2350", ink: "#B49BF5", deep: "#DED2FF" },
    copper: { bg: "#3E2320", ink: "#FF9B7C", deep: "#FFC8B8" },
    grey: { bg: "#2B2750", ink: "#B9B3CE", deep: "#DCD8EA" },
  },
};

export const tierColors = {
  BRONZE: "#B07A4A",
  SILVER: "#8E8AA8",
  GOLD: "#F29A1F",
  PLATINUM: "#8A6BE8",
};

// The mobile px type ladder (Arabic 13px floor) — the web runs the
// fluid-rem ladder in tokens.css, platform-specific by design.
export const type = {
  monoXXS: 10,
  xs: 11,
  sm: 12,
  body: 14,
  bodyLg: 16,
  h4: 18,
  h3: 21,
  h2: 26,
  h1: 32,
  display: 40,
} as const;

// The spacing ladder (px-keyed — the mobile half of webRungs).
export const sp = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  72: 72,
  96: 96,
  128: 128,
  160: 160,
  192: 192,
  240: 240,
} as const;

export const motion = {
  micro: 120,
  fast: 220,
  base: 380,
  slow: 520,
  slower: 700,
  cinema: 700,
  sheetExit: 240,
  guestReveal: 520,
} as const;

export const dsEase = [0.34, 1.56, 0.64, 1] as const;

// radius: the r369 soft ladder (shared JSON is the source of truth).
export const radius = {
  "xs": 8,
  "sm": 10,
  "md": 14,
  "lg": 18,
  "xl": 22,
  "2xl": 28,
  "3xl": 36,
  "full": 9999,
  none: 8, // back-compat alias (= xs) for the pre-r369 call sites
} as const;

export const touchFloor = 44;
