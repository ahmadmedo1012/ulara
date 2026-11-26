import type { SVGProps } from 'react';

/**
 * ULARA's own icon language — the r369 set.
 *
 * Why a private set: the landing used one stock star in twelve roles
 * (jar, brand mark, stat, streak, ladder, chip), which read as a
 * placeholder. Every meaning now has its own glyph, drawn on ONE grid.
 *
 * The grammar (all of it enforced by tests/unit/r369-icons.test.ts):
 *   · 24×24 grid, 2px stroke, round caps and joins, nothing outside
 *     the 2px safety margin (paths live in 3.2–20.8);
 *   · duotone: a soft FILLED accent shape sits behind the line work and
 *     paints `currentColor` at low alpha (`.ui-glyph-accent`), so the
 *     accent follows the text colour and both themes for free — no
 *     second colour to keep in sync;
 *   · `currentColor` only: an icon never ships its own palette;
 *   · decorative by default (`aria-hidden`), the call site names the
 *     control — the same contract as components/Icon.tsx;
 *   · no external request, no font, no sprite sheet: inline SVG only.
 *
 * The glyph table is a plain object so the whole set is ~6 KB of path
 * strings — it tree-shakes per glyph in a bundler that can see the
 * record, and it never costs a network round trip.
 */

type Glyph = {
  /** the soft filled shape behind the line work (optional) */
  accent?: string;
  /** the 2px line layer — one path per sub-shape */
  stroke: readonly string[];
};

export const GLYPHS = {
  /* ── the star family (reward, progress, emphasis) ───────────────── */
  star: {
    accent: 'M12 2.6l2.98 6.04 6.66.97-4.82 4.7 1.14 6.63L12 17.77l-5.96 3.13 1.14-6.63-4.82-4.7 6.66-.97z',
    stroke: ['M12 3.6l2.5 5.08 5.6.82-4.05 3.95.96 5.58L12 16.4l-5.01 2.63.96-5.58-4.05-3.95 5.6-.82z'],
  },
  sparkle: {
    accent: 'M12 2.8l1.9 5.3 5.3 1.9-5.3 1.9L12 17.2l-1.9-5.3L4.8 10l5.3-1.9z',
    stroke: ['M12 3.6l1.6 4.8 4.8 1.6-4.8 1.6L12 16.4l-1.6-4.8L5.6 10l4.8-1.6z', 'M18.5 16v3.5', 'M16.75 17.75h3.5'],
  },
  burst: {
    stroke: [
      'M12 3.2v3.1', 'M12 17.7v3.1', 'M4.8 12h3.1', 'M16.1 12h3.1',
      'M6.9 6.9l2.2 2.2', 'M14.9 14.9l2.2 2.2', 'M17.1 6.9l-2.2 2.2', 'M9.1 14.9l-2.2 2.2',
    ],
    accent: 'M12 8.4a3.6 3.6 0 100 7.2 3.6 3.6 0 100-7.2',
  },
  jar: {
    accent: 'M8.4 9h7.2v7.4a3.6 3.6 0 01-3.6 3.6 3.6 3.6 0 01-3.6-3.6z',
    stroke: ['M7.6 5.6h8.8v2.6H7.6z', 'M6.4 8.2h11.2v8.6a4.6 4.6 0 01-4.6 4.6h-2a4.6 4.6 0 01-4.6-4.6z'],
  },

  /* ── habits + momentum ─────────────────────────────────────────── */
  flame: {
    accent: 'M12 12.4c2.2 1 3.2 2.6 3.2 4.2a3.2 3.2 0 01-6.4 0c0-1.2.5-2.3 1.4-3.2.4 1 .9 1.4 1.8 1.7-.4-1-.3-2 0-2.7z',
    stroke: ['M12 3.6c2.6 3.4 5.4 6 5.4 9.6a5.4 5.4 0 01-10.8 0c0-2 1-3.7 2.2-5.2.5 1.4 1.1 2 2 2.4-.5-2.4.2-4.6 1.2-6.8z'],
  },
  target: {
    stroke: ['M12 4a8 8 0 100 16 8 8 0 100-16', 'M12 7.6a4.4 4.4 0 100 8.8 4.4 4.4 0 100-8.8', 'M12 10.9a1.1 1.1 0 100 2.2 1.1 1.1 0 100-2.2'],
  },
  ladder: {
    stroke: ['M6.4 20V4.4', 'M17.6 20V4.4', 'M6.4 8.4h11.2', 'M6.4 13h11.2', 'M6.4 17.6h11.2'],
  },
  clock: {
    accent: 'M12 3.4a8.6 8.6 0 100 17.2 8.6 8.6 0 100-17.2',
    stroke: ['M12 4.2a7.8 7.8 0 100 15.6 7.8 7.8 0 100-15.6', 'M12 8.2v4.1l2.7 1.6'],
  },

  /* ── study ─────────────────────────────────────────────────────── */
  book: {
    accent: 'M4.6 6.2h13.2a1.6 1.6 0 011.6 1.6v9.9a1.6 1.6 0 01-1.6 1.6H4.6z',
    stroke: ['M6.2 4.4h11.4a2.2 2.2 0 012.2 2.2v11.6a1.4 1.4 0 01-1.4 1.4H6.6a2.2 2.2 0 01-2.2-2.2V6.6a2.2 2.2 0 012.2-2.2z', 'M4.8 17.4h13.6', 'M8.4 8.2h6.4', 'M8.4 11.2h4.4'],
  },
  lecture: {
    accent: 'M4.4 6h15.2v9.4H4.4z',
    stroke: ['M3.6 4.8h16.8v11.4H3.6z', 'M12 16.2v3.4', 'M8.6 19.6h6.8', 'M8 8.4h8', 'M8 11.4h5.2'],
  },
  exam: {
    accent: 'M6.6 4.4h8.2l4.6 4.6v10.6a1.4 1.4 0 01-1.4 1.4H6.6a1.4 1.4 0 01-1.4-1.4V5.8a1.4 1.4 0 011.4-1.4z',
    stroke: ['M8 3.6h7.4l4.2 4.2v12a1.2 1.2 0 01-1.2 1.2H8a1.2 1.2 0 01-1.2-1.2V4.8A1.2 1.2 0 018 3.6z', 'M14.6 3.8v4.4h4.6', 'M10 13l1.8 1.8 3.4-3.6'],
  },
  assignment: {
    accent: 'M7.4 5.4h9.2v14.2H7.4z',
    stroke: ['M8.6 4.2h6.8a1.2 1.2 0 011.2 1.2v14.4a1.2 1.2 0 01-1.2 1.2H8.6a1.2 1.2 0 01-1.2-1.2V5.4a1.2 1.2 0 011.2-1.2z', 'M10 4.2V3h4v1.2', 'M10.2 9.4h3.6', 'M10.2 13h3.6', 'M10.2 16.6h2.2'],
  },
  grade: {
    accent: 'M12 4.2l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.4l5-.7z',
    stroke: ['M12 3.8l2.5 5 5.5.8-4 3.8 1 5.4-5-2.7-5 2.7 1-5.4-4-3.8 5.5-.8z', 'M9.6 20.4l2.4 1 2.4-1'],
  },
  certificate: {
    accent: 'M12 3.6a4.6 4.6 0 100 9.2 4.6 4.6 0 100-9.2',
    stroke: ['M12 3.8a4.4 4.4 0 100 8.8 4.4 4.4 0 100-8.8', 'M9.2 12.4l-.9 7 3.7-2 3.7 2-.9-7', 'M10.4 8.2l1.1 1.2 2.2-2.4'],
  },
  college: {
    accent: 'M4.4 10.6h15.2v9H4.4z',
    stroke: ['M3.6 20.4h16.8', 'M5.2 20.4V10l6.8-3.6 6.8 3.6v10.4', 'M9.4 20.4v-5.2h5.2v5.2', 'M12 3v1.8'],
  },
  campus: {
    stroke: ['M12 3.4l7.6 4.4v8.6L12 20.8l-7.6-4.4V7.8z', 'M12 12l7.6-4.2', 'M12 12v8.8', 'M12 12L4.4 7.8'],
  },
  graduation: {
    accent: 'M12 6.6l8.4 3.4-8.4 3.4-8.4-3.4z',
    stroke: ['M2.8 10l9.2-3.8 9.2 3.8-9.2 3.8z', 'M6.6 11.6v4.2c0 1.6 2.4 2.8 5.4 2.8s5.4-1.2 5.4-2.8v-4.2', 'M20.4 11v5'],
  },

  /* ── people + roles ────────────────────────────────────────────── */
  student: {
    accent: 'M12 11.2a2.6 2.6 0 100 5.2 2.6 2.6 0 100-5.2',
    stroke: ['M12 11.4a2.6 2.6 0 100 5.2 2.6 2.6 0 100-5.2', 'M7 20.4c.7-2.6 2.6-4 5-4s4.3 1.4 5 4', 'M16.4 6.2l-4.4-2-4.4 2 4.4 2z'],
  },
  teacher: {
    accent: 'M6 5.4h12v8.2H6z',
    stroke: ['M5 4.6h14v9.4H5z', 'M12 14v3', 'M9 17h6', 'M8.4 7.6h7.2', 'M8.4 10.6h4.4'],
  },
  admin: {
    accent: 'M8.4 4.6h7.2v5.2a3.6 3.6 0 01-7.2 0z',
    stroke: ['M12 3.4l7 2.4v6.6c0 4-3 6.6-7 8.2-4-1.6-7-4.2-7-8.2V5.8z', 'M9.2 11.6l2 2 3.6-3.8'],
  },
  quality: {
    stroke: ['M5.4 4.4h9.2l4 4v11.2H5.4z', 'M14 4.6v4.2h4', 'M8.6 12l1.6 1.6 3-3.2', 'M8.6 16.6h6.8'],
  },
  owner: {
    accent: 'M5.6 8.6l2.8 2 3.6-3.4 3.6 3.4 2.8-2v8.4H5.6z',
    stroke: ['M4.8 20.4h14.4', 'M6 18.6l-1.2-9 3.6 2.6L12 6.8l3.6 5.4 3.6-2.6-1.2 9z'],
  },
  users: {
    accent: 'M8.8 11.2a2.4 2.4 0 100 4.8 2.4 2.4 0 100-4.8',
    stroke: ['M8.8 11.4a2.4 2.4 0 100 4.8 2.4 2.4 0 100-4.8', 'M4.4 19.8c.6-2.4 2.3-3.8 4.4-3.8s3.8 1.4 4.4 3.8', 'M15.4 11.6a2 2 0 100 4 2 2 0 100-4', 'M16.6 16.4c1.6.3 2.7 1.5 3.2 3.4'],
  },
  user: {
    accent: 'M12 10.6a2.8 2.8 0 100 5.6 2.8 2.8 0 100-5.6',
    stroke: ['M12 10.8a2.8 2.8 0 100 5.6 2.8 2.8 0 100-5.6', 'M6.2 20.4c.8-2.9 3-4.4 5.8-4.4s5 1.5 5.8 4.4'],
  },

  /* ── product surfaces ──────────────────────────────────────────── */
  live: {
    accent: 'M12 10.4a1.6 1.6 0 100 3.2 1.6 1.6 0 100-3.2',
    stroke: ['M12 10.6a1.4 1.4 0 100 2.8 1.4 1.4 0 100-2.8', 'M8.4 7.8a5.6 5.6 0 000 8.4', 'M15.6 7.8a5.6 5.6 0 010 8.4', 'M5.6 5a9 9 0 000 14', 'M18.4 5a9 9 0 010 14'],
  },
  chat: {
    accent: 'M4.6 5.6h14.8v9.2H10l-4.2 3.2v-3.2H4.6z',
    stroke: ['M5.4 4.8h13.2a1.4 1.4 0 011.4 1.4v8.4a1.4 1.4 0 01-1.4 1.4h-6.6L7 19.6v-3.6H5.4A1.4 1.4 0 014 14.6V6.2a1.4 1.4 0 011.4-1.4z', 'M8.4 8.6h7.2', 'M8.4 11.6h4.6'],
  },
  trophy: {
    accent: 'M8.4 4.8h7.2v4.4a3.6 3.6 0 01-7.2 0z',
    stroke: ['M8 4.8h8v4.6a4 4 0 01-8 0z', 'M8 6.2H5.6v1.6a3 3 0 002.6 2.9', 'M16 6.2h2.4v1.6a3 3 0 01-2.6 2.9', 'M12 13.4v3.2', 'M8.8 20.4h6.4', 'M9.6 19.2h4.8l.6 1.2H9z'],
  },
  medal: {
    accent: 'M12 9.4a3.4 3.4 0 100 6.8 3.4 3.4 0 100-6.8',
    stroke: ['M12 9.6a3.2 3.2 0 100 6.4 3.2 3.2 0 100-6.4', 'M8.6 4.4l2.4 4', 'M15.4 4.4l-2.4 4', 'M10.4 16.2l1.6 4.4 1.6-4.4'],
  },
  leaderboard: {
    stroke: ['M4.4 20.4V13h4v7.4', 'M10 20.4V6.6h4v13.8', 'M15.6 20.4v-5h4v5'],
  },
  calendar: {
    accent: 'M5.2 7.6h13.6v11.8H5.2z',
    stroke: ['M5.6 5.2h12.8a1.2 1.2 0 011.2 1.2v12.8a1.2 1.2 0 01-1.2 1.2H5.6a1.2 1.2 0 01-1.2-1.2V6.4a1.2 1.2 0 011.2-1.2z', 'M8.4 3.2v4', 'M15.6 3.2v4', 'M4.6 9.8h14.8'],
  },
  upload: {
    stroke: ['M12 16.4V4.6', 'M8 8.6l4-4 4 4', 'M5 15.4v3.2a1.6 1.6 0 001.6 1.6h10.8a1.6 1.6 0 001.6-1.6v-3.2'],
  },
  download: {
    stroke: ['M12 4.6v11.8', 'M8 12.4l4 4 4-4', 'M5 15.4v3.2a1.6 1.6 0 001.6 1.6h10.8a1.6 1.6 0 001.6-1.6v-3.2'],
  },
  bell: {
    accent: 'M8.6 11.2a3.4 3.4 0 016.8 0v4.4H8.6z',
    stroke: ['M9 16.6h6l1.4 1.8H7.6z', 'M6.6 18.4c.9-1 1.4-2.2 1.4-3.6v-3a4 4 0 018 0v3c0 1.4.5 2.6 1.4 3.6z', 'M10.4 20.4a1.8 1.8 0 003.2 0'],
  },
  search: {
    stroke: ['M11 4.4a6.6 6.6 0 100 13.2 6.6 6.6 0 100-13.2', 'M15.9 15.9l4.3 4.3'],
  },
  settings: {
    accent: 'M12 9.4a2.6 2.6 0 100 5.2 2.6 2.6 0 100-5.2',
    stroke: ['M12 3.6l1.4 2.2 2.6-.6.6 2.6 2.2 1.4-1 2.4 1 2.4-2.2 1.4-.6 2.6-2.6-.6L12 20.4l-1.4-2.2-2.6.6-.6-2.6L5.2 14.8l1-2.4-1-2.4 2.2-1.4.6-2.6 2.6.6z', 'M12 9.6a2.4 2.4 0 100 4.8 2.4 2.4 0 100-4.8'],
  },
  lock: {
    accent: 'M6.6 11.4h10.8v7.2H6.6z',
    stroke: ['M6.8 10.6h10.4a1.2 1.2 0 011.2 1.2v7a1.2 1.2 0 01-1.2 1.2H6.8a1.2 1.2 0 01-1.2-1.2v-7a1.2 1.2 0 011.2-1.2z', 'M8.4 10.4V8.2a3.6 3.6 0 017.2 0v2.2', 'M12 14v2.6'],
  },
  shield: {
    accent: 'M12 5.4l5.8 2v6.2c0 3.2-2.4 5.4-5.8 6.6-3.4-1.2-5.8-3.4-5.8-6.6V7.4z',
    stroke: ['M12 3.4l7 2.4v6.6c0 4-3 6.6-7 8.2-4-1.6-7-4.2-7-8.2V5.8z'],
  },
  check: {
    stroke: ['M5.2 12.6l4.4 4.4 9.2-10'],
  },
  warning: {
    accent: 'M12 4.6l8.2 14.4H3.8z',
    stroke: ['M12 4.2l8.6 15H3.4z', 'M12 9.4v4.2', 'M12 16.4v.6'],
  },
  info: {
    accent: 'M12 3.4a8.6 8.6 0 100 17.2 8.6 8.6 0 100-17.2',
    stroke: ['M12 4.2a7.8 7.8 0 100 15.6 7.8 7.8 0 100-15.6', 'M12 11v5', 'M12 7.8v.6'],
  },

  /* ── navigation (RTL-aware) ────────────────────────────────────── */
  arrowRight: {
    stroke: ['M4.6 12h14.4', 'M13.2 6.2l5.8 5.8-5.8 5.8'],
  },
  arrowLeft: {
    stroke: ['M19.4 12H5', 'M10.8 6.2L5 12l5.8 5.8'],
  },
  arrowUp: {
    stroke: ['M12 19.4V5', 'M6.2 10.8L12 5l5.8 5.8'],
  },
  chevronDown: {
    stroke: ['M6.4 9.6L12 15.2l5.6-5.6'],
  },
  chevronUp: {
    stroke: ['M6.4 14.4L12 8.8l5.6 5.6'],
  },
  close: {
    stroke: ['M6.4 6.4l11.2 11.2', 'M17.6 6.4L6.4 17.6'],
  },
  menu: {
    stroke: ['M4.4 7.4h15.2', 'M4.4 12h15.2', 'M4.4 16.6h15.2'],
  },
  external: {
    stroke: ['M13.4 5.2h5.4v5.4', 'M18.8 5.2l-7.4 7.4', 'M16.4 13.6v4.8a1.2 1.2 0 01-1.2 1.2H5.6a1.2 1.2 0 01-1.2-1.2V8.8a1.2 1.2 0 011.2-1.2h4.6'],
  },
  plus: {
    stroke: ['M12 5.2v13.6', 'M5.2 12h13.6'],
  },
  minus: {
    stroke: ['M5.2 12h13.6'],
  },

  /* ── theme ─────────────────────────────────────────────────────── */
  sun: {
    accent: 'M12 7.4a4.6 4.6 0 100 9.2 4.6 4.6 0 100-9.2',
    stroke: ['M12 7.6a4.4 4.4 0 100 8.8 4.4 4.4 0 100-8.8', 'M12 2.8v1.8', 'M12 19.4v1.8', 'M2.8 12h1.8', 'M19.4 12h1.8', 'M5.5 5.5l1.3 1.3', 'M17.2 17.2l1.3 1.3', 'M18.5 5.5l-1.3 1.3', 'M6.8 17.2l-1.3 1.3'],
  },
  moon: {
    accent: 'M13.4 4.6a7.6 7.6 0 104.2 13.8 8.6 8.6 0 01-4.2-13.8',
    stroke: ['M13.6 4.2a8.4 8.4 0 100 15.6 8.6 8.6 0 01-2-11.2 8.4 8.4 0 012-4.4z'],
  },
  auto: {
    accent: 'M12 3.6a8.4 8.4 0 000 16.8z',
    stroke: ['M12 3.6a8.4 8.4 0 100 16.8 8.4 8.4 0 100-16.8', 'M12 3.6v16.8'],
  },

  /* ── misc ──────────────────────────────────────────────────────── */
  eye: {
    stroke: ['M2.8 12S6 6.6 12 6.6 21.2 12 21.2 12 18 17.4 12 17.4 2.8 12 2.8 12z', 'M12 9.4a2.6 2.6 0 100 5.2 2.6 2.6 0 100-5.2'],
  },
  mail: {
    accent: 'M3.6 7.2h16.8v9.6H3.6z',
    stroke: ['M4.4 5.6h15.2a1.2 1.2 0 011.2 1.2v10.4a1.2 1.2 0 01-1.2 1.2H4.4a1.2 1.2 0 01-1.2-1.2V6.8a1.2 1.2 0 011.2-1.2z', 'M3.6 7l8.4 6 8.4-6'],
  },
  compass: {
    accent: 'M12 3.6a8.4 8.4 0 100 16.8 8.4 8.4 0 100-16.8',
    stroke: ['M12 4.4a7.6 7.6 0 100 15.2 7.6 7.6 0 100-15.2', 'M15.2 8.8l-1.8 4.6-4.6 1.8 1.8-4.6z'],
  },
  heart: {
    accent: 'M12 19.4c-4.6-2.8-7.2-5.4-7.2-8.4A3.8 3.8 0 0112 9.2a3.8 3.8 0 017.2 1.8c0 3-2.6 5.6-7.2 8.4z',
    stroke: ['M12 20c-4.8-3-7.6-5.8-7.6-9A4.2 4.2 0 0112 8.6a4.2 4.2 0 017.6 2.4c0 3.2-2.8 6-7.6 9z'],
  },
  spark: {
    stroke: ['M11 3.4l1.6 4.6 4.6 1.6-4.6 1.6L11 15.8l-1.6-4.6L4.8 9.6l4.6-1.6z', 'M18 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z'],
  },
} as const satisfies Record<string, Glyph | undefined>;

export type GlyphName = {
  [K in keyof typeof GLYPHS]: (typeof GLYPHS)[K] extends Glyph ? K : never;
}[keyof typeof GLYPHS];

export const GLYPH_NAMES = Object.keys(GLYPHS).filter(
  (k): k is GlyphName => Boolean(GLYPHS[k as GlyphName]),
) as readonly GlyphName[];

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> & {
  name: GlyphName;
  /** px; icons never scale with the type ladder — they sit beside it */
  size?: number | string;
};

/**
 * `<Glyph name="star" size={20} />` — the one way to draw an icon.
 * Decorative by default; give the control its name.
 */
export function Glyph({ name, size = 24, className, ...rest }: GlyphProps) {
  const g = GLYPHS[name] as Glyph;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className ? `ui-glyph ${className}` : 'ui-glyph'}
      {...rest}
    >
      {g.accent ? <path d={g.accent} className="ui-glyph-accent" fill="currentColor" /> : null}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {g.stroke.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
