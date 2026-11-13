#!/usr/bin/env node
/**
 * scripts/brand/ulara-kit.mjs — ULARA Ω 2-A: the staged brand kit generator.
 *
 * Reads shared/brand.json (the ONE name source of truth — see its $doc) and
 * generates the official ULARA asset SOURCES into shared/brand/ulara/. The
 * owner's takeover directive opened the old Gate A: these files ARE the
 * active brand kit now — the product surface consumes them (the shared
 * canonical mark is shared/brand/mark.svg, rewritten from this kit).
 *
 * The mark (owner-approved brief): a geometric U on the 32×32 grid — the
 * letter U opened upward, reading as a vessel / open book — drawn as ONE
 * unified ink stroke (two vertical stems joined by a simple quadratic bowl,
 * stroke-linecap="round", one stroke width), plus exactly ONE orange
 * cornerstone: a 4×4 square sitting in the top-right corner of the right
 * stem (a grid-aligned corner cell). It deliberately shares NOTHING with the
 * retired arch: no arc commands at all (only M/L/Q), different stem rails
 * (9/23 vs the arch's 8/24), round joins instead of miter, and a corner
 * (not keystone-centre) stone. The logo gate's forbidden arch signature (the
 * arc sweep pinned by scripts/brand/logo-gate.sh) cannot occur — there is
 * no 'A' arc command anywhere in this family (M/L/Q only). Note: neither
 * this file nor its test spells that signature verbatim — logo-gate.sh
 * greps every .mjs for it and scripts/brand/ is not a sanctioned seat.
 *
 * Files written (10, all deterministic — byte-identical on re-run):
 *   mark.svg                 the canonical 32-grid mark (ink + cornerstone)
 *   mark-mono.svg            one-colour version (cornerstone folds into ink)
 *   lockup-horizontal-ar.svg mark + «أُلارا»   (RTL: mark right, word left)
 *   lockup-horizontal-en.svg mark + «ULARA»    (LTR: mark left, word right)
 *   lockup-vertical-ar.svg   mark over «أُلارا», centred
 *   lockup-vertical-en.svg   mark over «ULARA», centred
 *   favicon-16.svg           simplified mark — stroke 5.5, 6×6 stone
 *   favicon-32.svg           simplified mark — stroke 4.5, 6×6 stone
 *   appicon-1024.svg         paper ground, canonical mark at 60% of canvas
 *   og-1200x630.svg          paper ground, RTL: mark + wordmark + descriptor
 *
 * Staged typography: lockup/OG wordmarks use a SYSTEM font stack as a
 * placeholder — final brand typography is applied at build time (the same
 * contract as the current system: SVG sources here, raster/derived twins
 * built later). Commit the generated SVGs; regeneration is verification
 * (node --test scripts/brand/ulara-kit.test.mjs byte-compares).
 *
 * Usage:
 *   node scripts/brand/ulara-kit.mjs [--out <dir>]   (default shared/brand/ulara)
 *
 * Core deps: node:fs / node:path (+ node:url for repo-root resolution, the
 * repo idiom from scripts/brand/build-app-icons.mjs). No new dependencies.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRAND_JSON = join(ROOT, "shared", "brand.json");
const TOKENS_JSON = join(ROOT, "shared", "design-tokens.json");
const DEFAULT_OUT = join(ROOT, "shared", "brand", "ulara");

/* ── CLI ─────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
let out = DEFAULT_OUT;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out" && argv[i + 1]) {
    out = resolve(argv[i + 1]);
    i++;
  } else if (argv[i].startsWith("--out=")) {
    out = resolve(argv[i].slice(6));
  } else {
    console.error(`ulara-kit: unknown argument '${argv[i]}' — usage: node scripts/brand/ulara-kit.mjs [--out <dir>]`);
    process.exit(2);
  }
}

/* ── 1. the source of truth (loud on shape drift — build-app-icons idiom) ─ */
const brand = JSON.parse(readFileSync(BRAND_JSON, "utf8"));
const need = (k) => {
  if (!(k in brand)) {
    console.error(`ulara-kit: shared/brand.json is missing '${k}' — the source of truth changed shape; update the kit.`);
    process.exit(1);
  }
  return brand[k];
};
const AR = need("name_ar");
const EN = need("name_en");
const PAPER = brand.colors.paper;
const INK = brand.colors.ink;
const ACCENT = brand.colors.accent;

/* Name rules fail loudly here too (belt and braces with the test): the
 * damma is not optional, and the data form is not the lockup form. */
if (!/\u064F/.test(AR)) {
  console.error("ulara-kit: brand.json name_ar lost its damma — the damma-less spelling is forbidden.");
  process.exit(1);
}
if (EN !== EN[0] + EN.slice(1).toLowerCase() || EN === EN.toUpperCase()) {
  console.error("ulara-kit: brand.json name_en must be the running-text form (e.g. 'Ulara'), not the lockup form.");
  process.exit(1);
}

/* The palette is pinned to the live design-tokens.json brand trio
 * (paper/ink/orange) on every run. In brand.json the sienna is seated as
 * "accent"; in design-tokens it is the brand.orange seat (accent routes
 * through triad.copper.ink there). */
const tokens = JSON.parse(readFileSync(TOKENS_JSON, "utf8"));
const tokenBrand = tokens.color.brand;
for (const [seat, hex, tokenSeat] of [
  ["paper", PAPER, "paper"],
  ["ink", INK, "ink"],
  ["accent", ACCENT, "orange"],
]) {
  if (tokenBrand[tokenSeat] !== hex) {
    console.error(`ulara-kit: brand.json colors.${seat} (${hex}) has drifted from design-tokens.json color.brand.${tokenSeat} (${tokenBrand[tokenSeat]}) — the two sources must stay pinned together.`);
    process.exit(1);
  }
}

/* ── 2. the mark geometry (one authored U, parametrically restated) ────── */
/* The canonical U on the 32-grid: stems on the 9/23 rails, tops at y7,
 * quadratic bowl dipping to y27. One stroke, round caps/joins. */
const U_PATH = "M9 7L9 19Q9 27 16 27Q23 27 23 19L23 7";
/* The 16px tuning: same rails, stems shortened to y8 so the bolder stroke
 * and the 6×6 stone keep the mark inside the grid with air around it. */
const U_PATH_SMALL = "M9 8L9 19Q9 27 16 27Q23 27 23 19L23 8";

/* The orange cornerstone — exactly one per mark. Canonical: the 4×4 cell
 * at the top-right corner of the right stem (x21..25, y3..7) — it lands
 * flush on the stem's round cap, so the letter grows out of the stone.
 * Small sizes: a 6×6 stone (larger proportion) covering the bolder cap. */
const STONE = { x: 21, y: 3, s: 4 };
const STONE_BIG = { x: 20, y: 2, s: 6 };

const FONT_AR = "'Segoe UI', 'Noto Sans Arabic', Tahoma, sans-serif";
const FONT_EN = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const XMLNS = "http://www.w3.org/2000/svg";

/* The descriptor line for the OG source. Kit copy (not a name primitive),
 * so it lives here rather than in brand.json. */
const DESCRIPTOR_AR = "نظام تشغيل الجامعة";

const GEN_NOTE = `ULARA Omega 2-A staged source — generated by scripts/brand/ulara-kit.mjs from shared/brand.json (deterministic; do not hand-edit — regenerate instead).`;
const TYPO_NOTE = `Typography note: the system font stack is a staged placeholder — final brand typography is applied at build time.`;

/** Indent a multi-line block by n spaces (keeps the emitted SVG tidy). */
const indent = (s, n) => s.split("\n").map((l) => " ".repeat(n) + l).join("\n");

/* The canonical mark elements: one ink stroke + the orange cornerstone. */
function markInk({ path = U_PATH, stroke = 4 } = {}) {
  return [
    `<path d="${path}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<rect x="${STONE.x}" y="${STONE.y}" width="${STONE.s}" height="${STONE.s}" fill="${ACCENT}"/>`,
  ].join("\n");
}

/* One-colour version: the cornerstone folds into ink. */
function markMono({ path = U_PATH, stroke = 4 } = {}) {
  return [
    `<path d="${path}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<rect x="${STONE.x}" y="${STONE.y}" width="${STONE.s}" height="${STONE.s}" fill="${INK}"/>`,
  ].join("\n");
}

/* Small-seat version: bolder stroke + the 6×6 stone, shortened stems. */
function markFavicon({ stroke, path }) {
  return [
    `<path d="${path}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<rect x="${STONE_BIG.x}" y="${STONE_BIG.y}" width="${STONE_BIG.s}" height="${STONE_BIG.s}" fill="${ACCENT}"/>`,
  ].join("\n");
}

/** Wrap mark elements in a placement group (scale in 32-grid units). */
function placed(gx, gy, scale, elems) {
  return `  <g transform="translate(${gx} ${gy}) scale(${scale})">\n${indent(elems, 4)}\n  </g>`;
}

function svgFile({ w, h, vb, body }) {
  return `<svg xmlns="${XMLNS}" width="${w}" height="${h}" viewBox="${vb}">\n${body}\n</svg>\n`;
}

/* ── 3. the file set ──────────────────────────────────────────────────── */
const FILES = {
  "mark.svg": svgFile({
    w: 32,
    h: 32,
    vb: "0 0 32 32",
    body: `  <!-- ${GEN_NOTE} The U vessel: one ink stroke + one orange cornerstone. -->\n${indent(markInk(), 2)}`,
  }),

  "mark-mono.svg": svgFile({
    w: 32,
    h: 32,
    vb: "0 0 32 32",
    body: `  <!-- ${GEN_NOTE} One-colour version: the cornerstone folds into ink. -->\n${indent(markMono(), 2)}`,
  }),

  "lockup-horizontal-ar.svg": svgFile({
    w: 240,
    h: 64,
    vb: "0 0 240 64",
    body: [
      `  <!-- ${GEN_NOTE} Horizontal lockup, RTL: the mark leads on the right, the Arabic wordmark trails left. Anchor note: with direction="rtl" the START is the right edge, so x pins the wordmark's right edge. -->`,
      `  <!-- ${TYPO_NOTE} -->`,
      placed(136, 4, 1.75, markInk()),
      `  <text x="124" y="43" text-anchor="start" direction="rtl" font-family="${FONT_AR}" font-size="34" fill="${INK}">${AR}</text>`,
    ].join("\n"),
  }),

  "lockup-horizontal-en.svg": svgFile({
    w: 240,
    h: 64,
    vb: "0 0 240 64",
    body: [
      `  <!-- ${GEN_NOTE} Horizontal lockup, LTR: the mark leads on the left, the Latin wordmark (lockup-only all-caps) trails right. -->`,
      `  <!-- ${TYPO_NOTE} -->`,
      placed(16, 4, 1.75, markInk()),
      `  <text x="92" y="43" font-family="${FONT_EN}" font-size="34" letter-spacing="2" fill="${INK}">ULARA</text>`,
    ].join("\n"),
  }),

  "lockup-vertical-ar.svg": svgFile({
    w: 96,
    h: 100,
    vb: "0 0 96 100",
    body: [
      `  <!-- ${GEN_NOTE} Vertical lockup: the mark over the Arabic wordmark, centred. -->`,
      `  <!-- ${TYPO_NOTE} -->`,
      placed(20, 6, 1.75, markInk()),
      `  <text x="48" y="86" text-anchor="middle" direction="rtl" font-family="${FONT_AR}" font-size="22" fill="${INK}">${AR}</text>`,
    ].join("\n"),
  }),

  "lockup-vertical-en.svg": svgFile({
    w: 96,
    h: 100,
    vb: "0 0 96 100",
    body: [
      `  <!-- ${GEN_NOTE} Vertical lockup: the mark over the Latin wordmark (lockup-only all-caps), centred. -->`,
      `  <!-- ${TYPO_NOTE} -->`,
      placed(20, 6, 1.75, markInk()),
      `  <text x="48" y="86" text-anchor="middle" font-family="${FONT_EN}" font-size="20" letter-spacing="2" fill="${INK}">ULARA</text>`,
    ].join("\n"),
  }),

  "favicon-16.svg": svgFile({
    w: 16,
    h: 16,
    vb: "0 0 32 32",
    body: `  <!-- ${GEN_NOTE} 16px tuning: stroke 5.5, shortened stems, 6×6 stone — legible as U at 16px. -->\n${indent(markFavicon({ stroke: 5.5, path: U_PATH_SMALL }), 2)}`,
  }),

  "favicon-32.svg": svgFile({
    w: 32,
    h: 32,
    vb: "0 0 32 32",
    body: `  <!-- ${GEN_NOTE} 32px tuning: stroke 4.5, 6×6 stone. -->\n${indent(markFavicon({ stroke: 4.5, path: U_PATH }), 2)}`,
  }),

  "appicon-1024.svg": svgFile({
    w: 1024,
    h: 1024,
    vb: "0 0 1024 1024",
    body: [
      `  <!-- ${GEN_NOTE} App icon source: paper ground, canonical mark at 60% of the canvas (32 x 19.2 = 614.4, offset 204.8), cornerstone preserved. -->`,
      `  <rect width="1024" height="1024" fill="${PAPER}"/>`,
      placed(204.8, 204.8, 19.2, markInk()),
    ].join("\n"),
  }),

  "og-1200x630.svg": svgFile({
    w: 1200,
    h: 630,
    vb: "0 0 1200 630",
    body: [
      `  <!-- ${GEN_NOTE} OG image source, RTL layout: the mark leads on the right, wordmark + descriptor trail left on paper. Anchor note: with direction="rtl" the START is the right edge, so x pins each line's right edge. -->`,
      `  <!-- ${TYPO_NOTE} -->`,
      `  <rect width="1200" height="630" fill="${PAPER}"/>`,
      placed(960, 238, 5, markInk()),
      `  <text x="900" y="353" text-anchor="start" direction="rtl" font-family="${FONT_AR}" font-size="128" fill="${INK}">${AR}</text>`,
      `  <text x="900" y="433" text-anchor="start" direction="rtl" font-family="${FONT_AR}" font-size="48" fill="${INK}" opacity="0.72">${DESCRIPTOR_AR}</text>`,
    ].join("\n"),
  }),
};

/* ── 4. write (deterministic: fixed order, fixed bytes, trailing \n) ───── */
mkdirSync(out, { recursive: true });
for (const [name, content] of Object.entries(FILES)) {
  writeFileSync(join(out, name), content);
}
console.log(`ulara-kit: wrote ${Object.keys(FILES).length} staged sources → ${out}`);
console.log(`ulara-kit: from shared/brand.json — name_ar ${AR} / name_en ${EN}; palette paper ${PAPER} · ink ${INK} · accent ${ACCENT} (pinned to design-tokens.json).`);
