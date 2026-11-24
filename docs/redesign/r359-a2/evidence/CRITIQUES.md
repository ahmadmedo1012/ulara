# r359-A2 fidelity critiques — the written record (gate §3)

Every sheet below was OPENED with the image reader and critiqued point-by-point;
each iteration's fixes were applied and re-shot. Sheets live in `sheets/`.

## HERO ELEVATION (desktop 1440, light) — 6 iterations

| iter | sheet | verdict (VLM, merciless) | fixes applied next |
|---|---|---|---|
| i1 | `hero-desktop-i1.webp` | "simplified diagram with a texture stamp" — uniform noise, no light logic, clip-art trees, glass filled with concrete grain, no cast shadows | tone ramp per panel, glass cleaned, reflections, double mullions, depth-7 trees with taper |
| i2 | `hero-desktop-i2.webp` | scores 5-6/10: "closer, trees near-parity" — still no readable sun, glass flat, shadows weak | graded stipple ramps, stair tower + parapet fins (vertical accents), column shadows, clean glass |
| i3 | `hero-desktop-i3.webp` | "unlit drawing — reference is a drawing about light" (instrument was collapsing SVG width; partially stale) | capture instrument fixed to TRUE viewBox width (300px→1440px) |
| i4 | `hero-desktop-i4.webp` | true-scale scores ~6/10: "silhouette improved, still flat" — stipple coverage capped at ~9% ink | TONE REMAP in grammar: pitch+dot curve → shadows now read 60–80% ink |
| i5 | `hero-desktop-i5.webp` | scores 7-8 on trees/composition; "no darkest dark" | near-black door anchor, deeper recess, contact shadows |
| final | `hero-desktop-final.webp` | **"a credible sibling… the same editorial genre… trees near-identical in character, paper tone and texture language in family. Ours passes as the same studio's rougher second sheet rather than a foreign imposter."** | — |

**Numeric proof (measured on the capture):** tonal range paper 235 → contact shadow 116
(0–255); radius 0 and zero box-shadows on all art chrome; stroke census = ONLY the five
grammar tokens (2936 ink / 92 hairline / 62 royal in the 44-key gallery); mono voice =
Geist Mono. See `numeric-checks.json`.

**Honest remaining deltas** (documented, not hidden): the reference's glazing carries more
interior linework at zoom; its massing is more staggered; ours is symmetric-to-a-fault.
These are composition choices A1 can push further when seating the hero (overlap, crop)
— the drawing itself no longer reads as generated.

## HERO ELEVATION (mobile 390, light)

`hero-mobile-final.webp` — same voice at portrait scale; blank top band for A1's headline
seat; trees flank tighter; survey anchors present.

## PLANS (7 keys) — 3 iterations

| iter | sheet | verdict | fixes |
|---|---|---|---|
| i1 | `plan-lecture-i1.webp` | "wall poché is a slab, not architecture — no openings" | paper-cut openings + jambs |
| i2 | `plan-lecture-i2.webp` | "75% there — credible presentation plan" | openings rendered translucent (opacity wrapper bug) → removed |
| i3 | `plan-lecture-i3.webp` | openings read; rear cross-aisle added; jamb ticks | — |

## WHY (why-observe as the family witness) — 2 iterations

| iter | sheet | verdict | fixes |
|---|---|---|---|
| i1 | `why-observe-sheet.webp` | "schematic box diagram — markers float, no leaders, no title block" | real plan fragments (poché + swings + X-boxes), anchored royal tags with codes, instrument cards, title blocks + scale bars |
| i2 | `why-observe-i2.webp` | family upgraded; anchored callouts, cards docked | — |

## Library sheet

`library-sheet.webp` — all 44 keys, light + dark twins, indexed captions (acceptance A).

## Mobile evidence

`mobile-*-360.png` / `mobile-*-412.png` — hero/plan/onboarding/splash at both widths.
