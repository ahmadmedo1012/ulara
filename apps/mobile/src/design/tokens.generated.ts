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
    bg: "#F5F1E8",
    surface: "#FFFFFF",
    surfaceHover: "#EFEBDF",
    overlay: "#FFFFFF",
    text: "#1A1713",
    textSecondary: "#414140",
    textMuted: "#62625F",
    textFaint: "#666660",
    accent: "#2540D9",
    accentHover: "#1B30B0",
    accentInk: "#2540D9",
    accentSoft: "#E4E9FF",
    accentStrong: "#1B30B0",
    accentFg: "#FFFFFF",
    primary: "#1A1713",
    primaryFg: "#FFFFFF",
    border: "#E0E0DA",
    rule: "#B3B3AF",
    gold: "#B57438",
    goldInk: "#8F5A28",
    onSurface: "#1A1713",
    onSurfaceMuted: "#62625F",
  },
  dark: {
    bg: "#262019",
    surface: "#2E2E2E",
    surfaceHover: "#353535",
    overlay: "#2E2E2E",
    text: "#F5F1E8",
    textSecondary: "#C9C9C5",
    textMuted: "#B4B4B0",
    textFaint: "#A2A29D",
    accent: "#8AA0FF",
    accentHover: "#4C63F0",
    accentInk: "#8AA0FF",
    accentSoft: "#2A2F4A",
    accentStrong: "#A9B8FF",
    accentFg: "#262019",
    primary: "#FFFFFF",
    primaryFg: "#17130E",
    border: "#6F6F6B",
    rule: "#6F6F6B",
    gold: "#E0A067",
    goldInk: "#F2B782",
    onSurface: "#F5F1E8",
    onSurfaceMuted: "#B4B4B0",
  },
};

export const statusTones = {
  light: {
    mint: { bg: "#E2EFE8", ink: "#17724A", deep: "#0D5433" },
    yellow: { bg: "#F5EBD6", ink: "#A8750F", deep: "#5E420C" },
    rose: { bg: "#FBE4E4", ink: "#C62828", deep: "#9E1A1A" },
    sky: { bg: "#E1E9F0", ink: "#4A7FA8", deep: "#1F4968" },
    lavender: { bg: "#ECE6FA", ink: "#8A6FE0", deep: "#3F2D7A" },
    copper: { bg: "#F8E3D8", ink: "#C43E16", deep: "#8F2F0F" },
    grey: { bg: "#ECEDEB", ink: "#626260", deep: "#262019" },
  },
  dark: {
    mint: { bg: "#1F3A2E", ink: "#5FD39A", deep: "#5FD39A" },
    yellow: { bg: "#3B331F", ink: "#EFC87B", deep: "#F8E3B4" },
    rose: { bg: "#3A2020", ink: "#FF7A70", deep: "#FF7A70" },
    sky: { bg: "#23313F", ink: "#93C2E9", deep: "#C9E2F5" },
    lavender: { bg: "#2D2545", ink: "#B7A0F4", deep: "#DCD2F9" },
    copper: { bg: "#46221A", ink: "#FF6B3D", deep: "#FFC5AE" },
    grey: { bg: "#2A2A28", ink: "#B7B2A6", deep: "#DDD8CB" },
  },
};

export const tierColors = {
  BRONZE: "#A7724E",
  SILVER: "#9CA3AF",
  GOLD: "#D4A537",
  PLATINUM: "#7B3AED",
};

// The mobile px type ladder (Arabic 13px floor) — the web runs the
// fluid-rem ladder in tokens.css, platform-specific by design.
export const type = {
  monoXXS: 10,
  xs: 11,
  sm: 12,
  body: 13,
  bodyLg: 15,
  h4: 17,
  h3: 20,
  h2: 24,
  h1: 30,
  display: 36,
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
  micro: 80,
  fast: 200,
  base: 400,
  slow: 500,
  slower: 650,
  cinema: 900,
  sheetExit: 835,
  guestReveal: 700,
} as const;

export const dsEase = [0.23, 1, 0.32, 1] as const;

// radius discipline: 0 everywhere; circles only for round elements.
export const radius = {
  none: 0,
  full: 9999,
} as const;

export const touchFloor = 44;
