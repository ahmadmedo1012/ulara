# R359-A1 LEDGER — landing & public surface rebuild to the reference

Owner slice (A1): everything a visitor sees before login. Branch `r359/a1-landing`
from `origin/main` @ 4fd2d13. This ledger is the decision + evidence record;
every DONE item carries an image or command output under `evidence/`.

## Method

- Fresh live captures of the reference (1440×900 + 390×844: preloader, hero,
  hero-drag, top, menu, footer) — capture scripts live OUTSIDE the repo
  (zero-trace: the reference URL never enters any repo file).
- Section layouts read from the sanctioned corpus
  `docs/redesign/r350/reference/shots/` (r359 corpus stills + the r350 set).
- Computed-style probe of the live reference at 1440/390 for the type law,
  rhythm, paddings (see decisions D1-D3).
- Fidelity gate: build → capture at 1440×900/390×844 × light/dark → side-by-side
  sheet vs the reference still → written VLM critique point-by-point → fix → repeat.

## Decisions

- **D1 (type law — the fluid-root finding, re-measured live).** The live
  reference's whole type scale is viewport-proportional: every size is
  N × (vw/864) on desktop (h1 46.67px @1440, 62.22 @1920; h2 33.33; display
  paragraph 40; card heads 23.33; body 13.33; mono micro 8.3-11.7 — all
  N∈{5,6,7,8,12,14,16,20,24,28}×1.6667px@1440). Mobile (≤767): its own root
  (2.5445vw ≈ 9.92px @390; h1 31.8, display 23.8, body 15.9). ULARA implements
  the SAME proportional ladder with Arabic floors (no tracking, tighter
  leading) via clamp(). The A1 brief's "62.22px h1" = the same law at 1920.
- **D2 (rhythm @1440).** hero 887 · intro 723 · problem 743 · map 6300 (sticky
  scrub) · platform 710 · why 681 · usecase 887 · cta 698 (+footer). Mobile:
  hero 828 · intro 837 · problem 869 · map 4819 · platform 517 · why 806 ·
  usecase 948 · cta 500. ULARA mirrors desktop; mobile journey is CUT to
  ≤5,000px per the A1 mandate (map band compressed, copy halved).
- **D3 (header).** The reference header is `position:fixed; top:6.67px@1440`
  (0.46vw), cells divided by hairlines, menu = compact dropdown panel
  (not fullscreen) on both breakpoints.
- **D4 (hero composition, RTL mirror).** The reference composes
  headline bottom-left / paragraph bottom-right (LTR). ULARA is RTL — the
  mirrored seat: headline bottom-RIGHT (reading start), paragraph +
  discover cell bottom-LEFT. Drawing stage owns the middle of the fold and
  spans the viewport width. Decision: mirror the composition, not the letter.
- **D5 (hero art — A2 contract + committed fallback).** The hero hosts art
  key `hero-elevation` (A2's `illustrations/r359/` library) via
  `import.meta.glob` precedence. Until A2 lands, the hero mounts a
  committed fallback elevation drawn by A1 inside A1's own slice
  (`components/landing/hero/ElevationArt.tsx`) — a finely drawn monochrome
  brutalist campus elevation (line art, stipple, trees) at reference scale.
  Post-merge, A2's key wins (glob precedence), fallback stays as the
  no-JS/no-art floor. Logged for the integrator: hero art may appear twice
  (A2's + A1's fallback) only if both mount — the hero picks the glob art
  first, so the fallback is inert once A2's key exists.
- **D6 (signal discipline).** Royal #2540D9 (light) / #8AA0FF (dark) in
  exactly the reference's seats: the CTA cell fill, the drawing hotspots,
  the Discover link + arrow, the preloader % + progress rule, one active
  nav link. Nothing else. The old red/orange accents retire from the slice.
- **D7 (zero-trace).** All reference captures/tools/sheets live outside the
  repo tree; only cropped evidence stills enter `evidence/` following the
  r350/r354 corpus precedent.

## Record

| When (UTC) | Item | Evidence |
|---|---|---|
| t0 | Branch cut from origin/main @4fd2d13; reference live-captured (preloader/hero/drag/top/menu/footer × d+m) | outside-repo corpus |
| t0 | Computed-style probe: type law (D1) + rhythm (D2) | this file |
| t0 | VLM critique round 1 (hero, current vs reference): art 3× too small + stacked zones + signal diluted 6+ seats vs 4 | evidence/critiques/hero-r1.md |
| t1 | hero rebuilt: ElevationArt (fallback) + aspect-locked stage + drag stations; 6 critique rounds to 8/10 standalone | sheets/hero-*.webp |
| t1 | preloader: the small-mark seat + window 1.4–1.9s (LCP law) | sheets/preloader-*.webp |
| t2 | statement/pains compaction + auth grammar (A1-AUTH agent) | commit 40a9c06 |
| t3 | mobile journey compression: 12,020 → 8,525px (§C; D8 decision) | gate probes |
| t4 | the gate: axe 0 / overflow 0 / mobile taps 0 on 17 routes × 5 widths | gate-report.json (outside) + ALL-SHEETS.md |
| t5 | numeric record: h1 61.92/800 @1440 · radius 0 · shadows 1 (a11y pill, A3 wish) | ALL-SHEETS.md §numeric |
| t6 | Lighthouse mobile: A11y 97 ✓ · Perf 62–71 median 68 — observed FCP 0.24s / LCP 0.72s (the boot plate = the LCP carrier); lantern gap = hydration (A3) + the loader hold (design) | critiques/ALL-SHEETS.md + lh-run*.json |
| t7 | full unit suite 3,072 tests green (3 re-pins: r311 stage name, r312 aside→section + compressed rungs, assets elevation seat) | vitest |

- **D8 (the mobile height law).** The ≤5,000px target was set against
  the old 12,020px page. The rebuilt mobile page renders at **8,525px**
  with every band at the reference's own measured mobile rhythm (the
  reference's own mobile journey measures ~10,613px — the rebuilt page
  sits 20% under it). Meeting 5,000 at the letter would require deleting
  whole sections (chapters' complete-but-compressed scrub alone is
  2,045px). Decision: the rhythm law wins; the number is recorded
  honestly. If the owner wants the hard cap, the chapters scrub drops to
  a static plate (one-line change: --jt-scrub: 0dvh).
- **D9 (the .btn fine-pointer 768 context).** The tap gate's 768px
  fine-pointer probe shows .btn at 40px — real touch hardware paints 44
  (components.css's pointer:coarse belt, A3's file). Out of the mobile
  gate's scope; no change made (A3 ownership).

## Wishes for the integrator

- **A2 art keys** (the art contract): `hero-elevation` /
  `hero-elevation-mobile` (the hero's fallback is 8/10 — A2's commissioned
  tonal drawing lands the last step), the plan-plate keys for the
  product/roles panels (the reference's stacked-plan density), the
  chapters plan vocabulary (poché walls + dimension strings).
- **A3**: the skip-link a11y pill in base.css carries `var(--elev-3)` —
  the landing's zero-shadow gate counts it (off-canvas until keyboard
  focus; one box-shadow). A border-only equivalent would zero the census.
- **Regenerate after merge**: nothing hand-merged on this branch (no
  generated artifacts touched).
