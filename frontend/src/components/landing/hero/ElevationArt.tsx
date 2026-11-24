import type { CSSProperties } from 'react';

/**
 * ElevationArt — «مبنى الجامعة» the r359 hero elevation (A1's committed
 * fallback under the A2 art contract — see the ledger D5).
 *
 * ONE large finely drawn monochrome architectural elevation in the
 * reference's language: a brutalist university block — board-formed
 * concrete with pour lines, a double-height glazed bay with thin
 * mullions, cantilevered slabs, an entrance tower with roof plant,
 * an entrance stair, a low courtyard wall — flanked by bare winter
 * trees (a ghosted echo behind each), on a heavy ground line, with
 * dot-stipple cast shadows anchoring the whole composition.
 *
 * Craft laws (measured from the reference's own drawing):
 *   · line weights: profiles 2.6 · masses 1.4 · mullions 0.8 · ghost
 *     echo 0.6 @ 35% ink — ONE ink hierarchy;
 *   · stipple shadows: pattern dots at two densities, layered for
 *     cast pools — never flat fills;
 *   · trees: pen-drawn branching — three limb levels + twig hatching,
 *     tapering;
 *   · no gradients, no blur, no colour — ink on paper only (the ONE
 *     signal colour lives on the hotspots, never in the ink);
 *   · dimension callouts are DRAWN but hidden by default — the hero's
 *     inspect interaction reveals them (the reference's drag-to-inspect).
 *
 * Variants:
 *   · ink    — the finished drawing (the hero seat);
 *   · trace  — the structure strokes only, each carrying a draw-in
 *              class (the preloader's self-drawing mark).
 *
 * The art keys contract: when A2's `hero-elevation` /
 * `hero-elevation-mobile` keys land in `components/illustrations/r359/`,
 * the hero mounts THOSE first (import.meta.glob precedence — see
 * Hero.tsx); this file stays as the committed no-art floor.
 */

export const ELEVATION_FRAME = { w: 1440, h: 640 } as const;

/* the ink layers — staged ink-in rides these (hero-mechanics.css):
 * 1 structure (ground + slabs) · 2 masses · 3 glazing · 4 texture +
 * shadows · 5 trees · 6 callouts. */
/* the active viewBox — the fallback art's window (the mobile crop seats
 * the building itself; A2's mobile key overrides the whole art). */
const VB_DESKTOP = '0 -80 1440 700';
/* the mobile crop (exported for the hero's station mapping) */
export const VB_MOBILE = '250 74 960 546';

export function ElevationArt({
  variant = 'ink',
  viewBox = VB_DESKTOP,
  className,
  style,
}: {
  variant?: 'ink' | 'trace';
  viewBox?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const trace = variant === 'trace';
  const ink = (i: number) => (trace ? `ev-trace ev-t${i}` : `ev-ink ev-i${i}`);

  return (
    <svg
      className={`ev-svg ${trace ? 'ev-svg-trace' : 'ev-svg-ink'} ${className ?? ''}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="رسم معماري لواجهة مبنى جامعي"
      style={style}
    >
      <defs>
        {/* dot stipple — the shadow planes (two densities) */}
        <pattern id="ev-stip" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="1.6" cy="1.6" r="1.55" className="ev-dot" />
          <circle cx="6" cy="4.6" r="1.55" className="ev-dot" />
          <circle cx="3.4" cy="7.6" r="1.55" className="ev-dot" />
        </pattern>
        <pattern id="ev-stip-lite" width="13" height="13" patternUnits="userSpaceOnUse">
          <circle cx="1.8" cy="1.8" r="1.35" className="ev-dot" />
          <circle cx="8.2" cy="8.2" r="1.35" className="ev-dot" />
        </pattern>
        {/* board-form concrete: pour lines + tie holes */}
        <pattern id="ev-board" width="12" height="5.2" patternUnits="userSpaceOnUse">
          <line x1="0" y1="4.6" x2="12" y2="4.6" strokeWidth="0.5" className="ev-struct" />
          <circle cx="3" cy="2.4" r="0.55" className="ev-dot" />
          <circle cx="9" cy="2.6" r="0.55" className="ev-dot" />
        </pattern>
        {/* glazing: fine diagonal hairlines */}
        <pattern id="ev-glaze" width="8" height="8" patternUnits="userSpaceOnUse">
          <line x1="-2" y1="6" x2="6" y2="-2" strokeWidth="0.45" className="ev-struct" />
          <line x1="6" y1="10" x2="14" y2="2" strokeWidth="0.45" className="ev-struct" />
        </pattern>
        {/* the fade gradients (mask luminance: white = ink, black = paper) */}
        <linearGradient id="ev-g-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id="ev-g-d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.92" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id="ev-g-diag" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id="ev-g-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
        </linearGradient>
        <mask id="ev-m-r"><rect x="0" y="-80" width="1440" height="700" fill="url(#ev-g-r)" /></mask>
        <mask id="ev-m-d"><rect x="0" y="-80" width="1440" height="700" fill="url(#ev-g-d)" /></mask>
        <mask id="ev-m-diag"><rect x="0" y="-80" width="1440" height="700" fill="url(#ev-g-diag)" /></mask>
        <mask id="ev-m-up"><rect x="0" y="-80" width="1440" height="700" fill="url(#ev-g-up)" /></mask>
      </defs>

      {/* ══ [1] STRUCTURE — ground + datum ══ */}
      <g className={ink(1)}>
        {/* the heavy ground line (double weight) */}
        <line x1="16" y1="560" x2="1424" y2="560" strokeWidth="3" className="ev-out" />
        <line x1="16" y1="566" x2="1424" y2="566" strokeWidth="0.8" className="ev-struct" />
        {/* datum ticks */}
        {Array.from({ length: 23 }, (_, i) => 16 + i * 63).map((x) => (
          <line key={x} x1={x} y1="555" x2={x} y2="571" strokeWidth="0.9" className="ev-struct" />
        ))}
        {/* the curb + planting band */}
        <line x1="16" y1="540" x2="248" y2="540" strokeWidth="1" className="ev-struct" />
        <line x1="1160" y1="540" x2="1424" y2="540" strokeWidth="1" className="ev-struct" />
      </g>

      {/* ══ [2] MASSES — the brutalist block ══ */}
      <g className={ink(2)}>
        {/* LEFT WING — 2-storey board-formed frame */}
        <rect x="250" y="188" width="268" height="372" fill="url(#ev-board)" className="ev-fill" />
        <path d="M250 188 h268 v372 h-268 z" fill="none" strokeWidth="2.6" className="ev-out" />
        {/* slab bands (the cantilever) */}
        <line x1="238" y1="188" x2="536" y2="188" strokeWidth="2.6" className="ev-out" />
        <line x1="238" y1="330" x2="536" y2="330" strokeWidth="1.4" className="ev-struct" />
        <line x1="238" y1="462" x2="570" y2="462" strokeWidth="2.6" className="ev-out" />
        {/* vertical fins */}
        {Array.from({ length: 8 }, (_, i) => 268 + i * 31).map((x) => (
          <line key={x} x1={x} y1="192" x2={x} y2="558" strokeWidth="1.2" className="ev-struct" />
        ))}
        {/* the window band between fins (recessed stipple) */}
        <rect x="268" y="336" width="217" height="124" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-r)" />
        {/* the cantilever's shadow on the wall below */}
        <rect x="250" y="466" width="268" height="12" fill="url(#ev-stip)" className="ev-shadow" />

        {/* CENTER — the double-height glazed bay */}
        <rect x="518" y="132" width="372" height="428" fill="url(#ev-stip-lite)" className="ev-shadow" mask="url(#ev-m-diag)" />
        <rect x="518" y="132" width="372" height="428" fill="url(#ev-glaze)" className="ev-fill" />
        <path d="M518 132 h372 v428 h-372 z" fill="none" strokeWidth="2.6" className="ev-out" />
        {/* the deep head shadow + the lower glass tone band */}
        <rect x="518" y="132" width="372" height="30" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-d)" />
        <rect x="518" y="460" width="372" height="100" fill="url(#ev-stip-lite)" className="ev-shadow" mask="url(#ev-m-d)" />
        <rect x="518" y="254" width="372" height="8" fill="url(#ev-stip-lite)" className="ev-shadow" />
        {/* mullions + transoms */}
        {Array.from({ length: 15 }, (_, i) => 518 + 24 + i * 24).map((x) => (
          <line key={x} x1={x} y1="134" x2={x} y2="558" strokeWidth="0.8" className="ev-glaze" />
        ))}
        <line x1="518" y1="254" x2="890" y2="254" strokeWidth="0.8" className="ev-glaze" />
        <line x1="518" y1="360" x2="890" y2="360" strokeWidth="0.8" className="ev-glaze" />
        <line x1="518" y1="460" x2="890" y2="460" strokeWidth="0.8" className="ev-glaze" />
        {/* the slab over the bay */}
        <line x1="506" y1="132" x2="902" y2="132" strokeWidth="2.6" className="ev-out" />

        {/* RIGHT — the entrance tower */}
        <rect x="890" y="96" width="236" height="464" fill="url(#ev-board)" className="ev-fill" />
        <path d="M890 96 h236 v464 h-236 z" fill="none" strokeWidth="2.6" className="ev-out" />
        {/* the tower's shaded face (right third) */}
        <rect x="1046" y="96" width="80" height="464" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-diag)" />
        {/* the diagonal shadow plane cast across the tower's left half +
            the wing's shaded right end + the bay's under-slab shade */}
        <polygon points="890,96 976,96 890,560" fill="url(#ev-stip)" className="ev-shadow" />
        <rect x="458" y="192" width="60" height="366" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-r)" />
        <rect x="518" y="132" width="72" height="428" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-r)" />
        {/* roof plant — the mechanical penthouse (one clean mass, no ornament) */}
        <path d="M918 96 v-22 h84 v22" fill="none" strokeWidth="1.4" className="ev-struct" />
        {/* the entrance opening (deep stipple) */}
        <rect x="938" y="424" width="86" height="136" fill="url(#ev-stip)" className="ev-shadow" />
        <path d="M938 424 h86 v136 h-86 z" fill="none" strokeWidth="1.4" className="ev-struct" />
        {/* the lintel + canopy */}
        <line x1="898" y1="424" x2="1132" y2="424" strokeWidth="2.6" className="ev-out" />
        <line x1="916" y1="388" x2="1150" y2="388" strokeWidth="2.6" className="ev-out" />
        <line x1="916" y1="388" x2="916" y2="424" strokeWidth="1.3" className="ev-struct" />
        <line x1="1134" y1="388" x2="1134" y2="424" strokeWidth="1.3" className="ev-struct" />
        {/* canopy's own shadow on the wall */}
        <rect x="890" y="424" width="48" height="8" fill="url(#ev-stip)" className="ev-shadow" />

        {/* THE BASE COURSE — the plinth band anchoring every mass */}
        <rect x="250" y="516" width="268" height="44" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-up)" />
        <rect x="890" y="516" width="236" height="44" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-up)" />
        <line x1="250" y1="516" x2="1126" y2="516" strokeWidth="1.3" className="ev-struct" />

        {/* THE ENTRANCE STAIR — 8 steps, drawn as stacked profiles */}
        {Array.from({ length: 8 }, (_, i) => i).map((i) => (
          <g key={i}>
            <line x1={872 - i * 15} y1={560 - i * 10} x2={968} y2={560 - i * 10} strokeWidth="1.2" className="ev-struct" />
            <line x1={872 - i * 15} y1={560 - i * 10} x2={872 - i * 15} y2={560 - i * 10 - 10} strokeWidth="1.2" className="ev-struct" />
          </g>
        ))}
        {/* stair's cast shadow */}
        <polygon points="872,560 968,560 1000,586 840,586" fill="url(#ev-stip-lite)" className="ev-shadow" />

        {/* THE LOW COURTYARD WALL (left) with coping */}
        <path d="M56 500 h190 v60 H56 z" fill="none" strokeWidth="1.4" className="ev-struct" />
        <line x1="52" y1="500" x2="250" y2="500" strokeWidth="2.6" className="ev-out" />
        {Array.from({ length: 9 }, (_, i) => 68 + i * 20).map((x) => (
          <line key={x} x1={x} y1="502" x2={x} y2="558" strokeWidth="0.8" className="ev-struct" />
        ))}
        {/* clean balustrade pickets behind the wall */}
        {Array.from({ length: 24 }, (_, i) => 62 + i * 8).map((x) => (
          <line key={x} x1={x} y1="540" x2={x} y2="524" strokeWidth="0.7" className="ev-struct" />
        ))}
      </g>

      {/* ══ [3] GLAZING detail — lit rooms + reflections ══ */}
      <g className={ink(3)}>
        {/* a few lit rooms behind the glazing */}
        <rect x="542" y="270" width="46" height="80" fill="url(#ev-stip-lite)" className="ev-shadow" />
        <rect x="686" y="368" width="46" height="88" fill="url(#ev-stip-lite)" className="ev-shadow" />
        <rect x="778" y="464" width="46" height="90" fill="url(#ev-stip-lite)" className="ev-shadow" />
      </g>

      {/* ══ [4] TEXTURE + CAST SHADOWS — the anchoring ══ */}
      <g className={ink(4)}>
        {/* the big diagonal cast shadow from the center bay (double layer) */}
        <polygon points="518,560 890,560 1004,588 404,588" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-diag)" />
        <polygon points="560,560 850,560 918,576 486,576" fill="url(#ev-stip)" className="ev-shadow" />
        {/* the tower's ground shadow (heavier) */}
        <polygon points="890,560 1126,560 1216,590 800,590" fill="url(#ev-stip)" className="ev-shadow" mask="url(#ev-m-d)" />
        {/* shadow pool under the cantilever slab */}
        <rect x="238" y="464" width="332" height="10" fill="url(#ev-stip)" className="ev-shadow" />
        {/* people for scale — three figures */}
        <g className="ev-people">
          <path d="M918 538 v-21 m0 -9 a5 5 0 1 1 .1 0 M909 538 h18" fill="none" strokeWidth="1.5" className="ev-struct" />
          <path d="M1042 542 v-23 m0 -9 a5.5 5.5 0 1 1 .1 0 M1033 542 h18" fill="none" strokeWidth="1.5" className="ev-struct" />
          <path d="M318 542 v-20 m0 -9 a5 5 0 1 1 .1 0 M309 542 h18" fill="none" strokeWidth="1.5" className="ev-struct" />
        </g>
      </g>

      {/* ══ [5] TREES — pen-drawn winter trees + ghost echoes ══ */}
      <g className={ink(5)}>
        {/* LEFT TREE — three limb levels + twig hatching */}
        <path
          className="ev-tree"
          d="M140 560 V440
             M140 452 l-24 -26 M116 426 l-14 -12 M102 414 l-11 -6 M116 426 l-3 -18 M113 408 l-7 -9
             M140 470 l22 -28 M162 442 l16 -18 M178 424 l12 -10 M162 442 l1 -19 M163 423 l6 -11
             M140 440 l-7 -26 M133 414 l-10 -12 M133 414 l3 -15
             M140 440 l12 -22 M152 418 l11 -13 M152 418 l-2 -16
             M162 442 l-9 -15
             M116 426 l2 -16 M118 410 l-5 -8
             M178 424 l3 -15 M181 409 l6 -9
             M133 414 l5 -14 M138 400 l-4 -7
             M163 423 l7 -13"
          fill="none"
          strokeWidth="1.2"
        />
        {/* trunk weight + the base flare */}
        <path className="ev-tree" d="M140 560 V470" fill="none" strokeWidth="2.4" />
        <path className="ev-tree" d="M136 560 l4 -12 M144 560 l-4 -12" fill="none" strokeWidth="1.6" />
        {/* the trees' ground shadow blobs (soft stipple ellipses) */}
        <ellipse cx="140" cy="563" rx="58" ry="8" fill="url(#ev-stip)" className="ev-shadow" />
        <ellipse cx="1188" cy="563" rx="64" ry="8" fill="url(#ev-stip)" className="ev-shadow" />
        {/* LEFT GHOST */}
        <path
          className="ev-tree-ghost"
          d="M104 560 V474 M104 486 l-16 -18 M88 468 l-8 -10 M104 498 l14 -16 M118 482 l9 -11"
          fill="none"
          strokeWidth="0.6"
        />
        {/* RIGHT TREE — taller, richer */}
        <path
          className="ev-tree"
          d="M1188 560 V418
             M1188 432 l-28 -32 M1160 400 l-17 -14 M1143 386 l-12 -8 M1160 400 l-4 -21 M1156 379 l-9 -11
             M1188 452 l30 -30 M1218 422 l17 -19 M1235 403 l13 -11 M1218 422 l2 -22 M1220 400 l8 -13
             M1188 418 l-11 -26 M1177 392 l-11 -13 M1177 392 l4 -17
             M1188 418 l14 -24 M1202 394 l12 -13 M1202 394 l-1 -18
             M1218 422 l-10 -17 M1208 405 l-9 -10
             M1160 400 l4 -16 M1164 384 l5 -9
             M1235 403 l5 -15 M1240 388 l7 -9
             M1177 392 l6 -14 M1183 378 l-4 -8
             M1202 394 l8 -13 M1210 381 l4 -8"
          fill="none"
          strokeWidth="1.2"
        />
        <path className="ev-tree" d="M1188 560 V468" fill="none" strokeWidth="2.6" />
        <path className="ev-tree" d="M1183 560 l5 -12 M1193 560 l-5 -12" fill="none" strokeWidth="1.7" />
        {/* RIGHT GHOST */}
        <path
          className="ev-tree-ghost"
          d="M1224 560 V482 M1224 496 l-15 -17 M1209 479 l-7 -9 M1224 508 l16 -15 M1240 493 l9 -10"
          fill="none"
          strokeWidth="0.6"
        />
      </g>

      {/* ══ [6] CALLOUTS — dimension strings (revealed by inspection) ══ */}
      <g className={ink(6)}>
        {/* horizontal dimension string under the building */}
        <line x1="250" y1="604" x2="1126" y2="604" strokeWidth="0.8" className="ev-dim" />
        <line x1="250" y1="596" x2="250" y2="612" strokeWidth="0.8" className="ev-dim" />
        <line x1="1126" y1="596" x2="1126" y2="612" strokeWidth="0.8" className="ev-dim" />
        <line x1="518" y1="600" x2="518" y2="608" strokeWidth="0.8" className="ev-dim" />
        <line x1="890" y1="600" x2="890" y2="608" strokeWidth="0.8" className="ev-dim" />
        <text x="366" y="594" className="ev-dim-t" textAnchor="middle">26.8</text>
        <text x="704" y="594" className="ev-dim-t" textAnchor="middle">37.2</text>
        <text x="1008" y="594" className="ev-dim-t" textAnchor="middle">23.6</text>
        {/* vertical dimension at the right */}
        <line x1="1156" y1="96" x2="1156" y2="560" strokeWidth="0.8" className="ev-dim" />
        <line x1="1148" y1="96" x2="1164" y2="96" strokeWidth="0.8" className="ev-dim" />
        <line x1="1148" y1="560" x2="1164" y2="560" strokeWidth="0.8" className="ev-dim" />
        <text x="1172" y="330" className="ev-dim-t" textAnchor="middle" transform="rotate(90 1172 330)">46.4</text>
        {/* level marks on the left wing */}
        <text x="256" y="184" className="ev-dim-t" textAnchor="end">+17.6</text>
        <text x="256" y="326" className="ev-dim-t" textAnchor="end">+10.2</text>
        <text x="256" y="458" className="ev-dim-t" textAnchor="end">0.0</text>
      </g>
    </svg>
  );
}
