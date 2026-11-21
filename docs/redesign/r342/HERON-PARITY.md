# R342 — Heron Parity Report (measured structural inventory)

> Captured 2026-11-20, headless Chromium (Playwright 1.60), both sites local.
> Reference: `madarek-heronai-uiux` @ `feat/heronai-uiux-overhaul` (:5273) — the
> executable heronai-aligned twin. Subject: Ulara `main` @ `4576b68` (:5173).
> Method: `frontend-visual-qa` reference-parity decomposition — measured DOM
> inventory of the reference first, then the subject, then diff.
> Viewports: 1440×900 (desktop) + 390×844 (mobile). Evidence:
> `~/.hermes/cache/scratch/parity/` (JSON inventories + PNG captures).

## Verdict

Same skeleton, same type system, same motion vocabulary. Ulara is a
structurally faithful twin with **6 real visual divergences**: 2 additive
(Ulara-only chrome), 2 subtractive (reference elements missing in Ulara),
2 token-level (background + accent palette). Pixel diff: hero 9.0%, why 4.8%
(pixels differing >30/255).

## Parity confirmed (measured identical)

| Aspect | Measured value (both sides) |
|---|---|
| Section skeleton | header + 9 sections + footer; ids `live`/`chapters`/`product`/`roles`/`vision` |
| H1 | "رحلة تعلم واحدة من المحاضرة إلى الإتقان" 46.67px/600 at y=747, 772×126 (desktop); 31.76px mobile |
| H2 scale | 40 / 33.33 / 26.67px desktop; 31.76 / 23.82 / 19.85px mobile — all weight 600 |
| Body | IBM Plex Sans Arabic, 13.3333px, RTL; mono = Geist Mono |
| Scrub H2 | `.wr-scrub` `--wr-n:29`, identical aria-label + data-spec tree |
| Blueprint stage | `.bp-stage.hro-stage` 1440×676 |
| Chapters | `.jt-pin` 887px; 5× `jt-intro-finding`, 4× `jt-rail`/`jt-cms-row`, 3× `jt-anno`, 2× `jt-card`, `jt-map-col` — same class census both sides |
| Why head | `.wy-head` 269px, `[06]` plate prefix, same copy modulo brand name |
| CTA | `fo-cta-frame` 698px + `fo-cta-meta` 22px + `cg-strip` ~149px |
| Header | 56px desktop / 50px mobile, same nav geometry, z=60 |
| Footer strips | `fo-fstrip` 311/314px, `fo-grid` present |

## Divergences (reference = madarek-heron)

### D1 — Hero art composition (largest visual delta)
- **Reference:** full-bleed SVG 1440×520 with `<defs>` pattern field (dot
  grid, line pattern, circles) — a continuous blueprint pattern.
- **Ulara:** framed plate `.hro-plate` 1000×444 (1px `#282828` border)
  containing an inset SVG diagram (main group 701×164).
- Effect: reference hero reads as an open drafting field; Ulara reads as a
  framed figure. This drives most of the 9.0% hero pixel diff.

### D2 — Hero frame chrome (Ulara-only, additive)
- Ulara paints `hro-edge` ×4 (1px `rgb(179,179,175)` top/bottom/side/east)
  + `bp-plus` ×4 corner registration marks (12px).
- Reference: **zero** of these elements (`bpPlus=0, hroEdge=0`).

### D3 — Header positioning
- Ulara: `position: fixed` (hero starts y=0, h=887).
- Reference: `position: relative` (hero starts y=63, h=824).
- H1 lands at the same y=747 both sides, so visible text geometry matches;
  the difference is scroll behavior (fixed header overlays content).

### D4 — Why section (§06) structure (reference elements missing)
- **Reference:** `.wy-stage` 2218px = `wy-axis` (2218px, painted
  `rgb(179,179,175)`) + `wy-stage-in` + `wy-deck-chrome`, **plus**
  `figure.wy-cycle` 609px — the cycle diagram "دورة … في لوحة واحدة — من
  المشاهدة إلى الإتقان" (509px frame + 16px caption).
- **Ulara:** `.wy-scene` 1635px = `wy-furniture` (18) + `wy-spine` (1635) +
  `wy-track` (1515). No `wy-axis`, **no `wy-cycle` figure**.
- Section height: 1905 vs 3157 (−1252px). 4.8% why pixel diff.

### D5 — Background + accent tokens
- Body bg: Ulara `rgb(245,241,232)` (warm cream) vs reference
  `rgb(246,246,238)` (neutral cream).
- Accent census (desktop): Ulara `rgb(163,51,18)`×88 + `rgb(241,85,52)`×123
  (rust/vermilion pair); reference `rgb(199,46,0)`×32 + `rgb(250,54,0)`×58
  (deeper orange-red). Shared: `rgb(250,54,0)`, `rgb(219,58,0)`.
- Radii vocabulary: reference has 2 pill elements (`99px` radius); Ulara has
  **zero** non-zero border-radius elements.

### D6 — Footer (Ulara-only bands)
- Ulara footer 1234px (desktop) / 2092px (mobile); reference 903 / 1239.
- Ulara-only bands: `fo-plate` 47px ("PLATE · 09 لوحة الهبوط — …"),
  `fo-top-anchor-row` 36px ("[ العودة للأعلى // BACK TO TOP ]"),
  `fo-giant-banner` 113px ("++ULARA // أُلارا++").
- Type diff: footer H3 "التواصل" 15px (Ulara) vs 33.33px (reference).
- `fo-grid` 590 vs 546 and `fo-footer-bottom` 77 vs 42 = copy length only.

## Content deltas (brand-specific, not defects)

- Nav: Ulara الرئيسية/الكليات/**المسابقات** vs reference الرئيسية/الكليات/**التطبيق**.
- Chapters height 5747 vs 6300 (−553px): same block census, longer reference copy.
- Vision: Ulara adds `fo-cta-platezone` 257px (absent in reference); explains
  the 1589 vs 1332 section delta exactly.
- Titles/branding: أُلارا vs مدارك throughout.

## Page totals

| | Ulara | Reference | Δ |
|---|---|---|---|
| Desktop pageH | 14537 | 15778 | −1241 |
| Mobile pageH | 13705 | 12819 | +886 |

Desktop delta ≈ why-cycle (1252) + chapters copy (553) − vision platezone
(257) − footer… net explained. Mobile delta is footer amplification (the
three Ulara-only bands stack taller on 390px).

## Fix list (if parity is the goal, ordered by visual impact)

1. **D4** — add `wy-axis` + `wy-cycle` figure to the why section (biggest
   missing visual: the cycle diagram).
2. **D1** — swap hero art from framed plate to full-bleed pattern-field SVG
   (or at minimum drop the plate border to open the field).
3. **D5** — retune tokens: body bg → `rgb(246,246,238)`; accent pair →
   `rgb(199,46,0)`/`rgb(250,54,0)`; introduce the 2 pill (99px) elements.
4. **D2** — remove `hro-edge` ×4 + `bp-plus` ×4 (reference has none).
5. **D3** — header `fixed` → `relative` (or keep fixed only if the product
   needs a persistent nav — a judgment call, not a visual miss).
6. **D6** — drop `fo-plate`/`fo-top-anchor-row`/`fo-giant-banner` or accept
   as Ulara's own footer signature; fix footer H3 to 33.33px.

Items 1–5 are reference-parity gaps. Item 6 is a signature decision: the
giant banner + plate give Ulara a distinct footer identity that the
reference deliberately lacks.

## Deep pass — scroll, geometry, motion (second capture round)

> Same method, deeper probes: 21-step scroll captures (0–100% in 5s),
> SVG geometry census (all 73/83 SVGs), stylesheet rule diff, keyframe
> census, source-level mechanism check. Evidence:
> `~/.hermes/cache/scratch/parity/deep/` (per-step PNGs, probe JSON,
> full SVG dumps).

### Scroll — measured identical (no action)

| Aspect | Both sides |
|---|---|
| Engine | Lenis 1.1.5, `html.lenis` live on `/` (guest). Params: lerp 0.1, smoothWheel, syncTouch (syncTouchLerp 0.075), touchInertiaMultiplier 35, wheelMultiplier 1, vertical, infinite false |
| Mount | `lib/motion/sheetLenis.ts` → `initGuestLenis` on public window-scrolled routes (`/`, `/auth*`, `/404`, guests' `/colleges*`); identical code shape both repos |
| Chapters pin | `.jt-pin` sticky top 0, `100dvh − 1.56rem`, `::before` 1px line, `::after` 10px accent dot — byte-identical rules |
| Crawl ticker | `fo-ticker-rtl` 36s linear infinite, 10 cells, cell 17.16rem × 10.7rem, logo `grayscale(1) opacity(0.72)`, 1px sep — identical |
| Intro draw | `data-ink` 1–8, delays 250/340/440/570/710/860/1030/1200ms, `stroke-dashoffset` 1→0 over 0.4s — identical |
| Plan furniture | `.pm-fx` pathLength=1, `--pd` stagger, `.in-view` trigger — identical |
| Reveal engine | `html.js-reveal-armed` + `useReveal.ts` both sides |

Only delta: reference exposes `window.__mdrkLenis` debug handle; Ulara does
not (debug-only, no visual effect).

### Scroll-step pixel diff (21 steps, >30/255 threshold)

| Step | Desktop | Mobile | Region |
|---|---|---|---|
| 0% | 9.2% | 12.7% | hero |
| 5% | **23.1%** | **27.1%** | hero art (D1) |
| 25–45% | 13–14% | **21–22%** | chapters/why (D4, D11) |
| 50–55% | **14.2–15.7%** | 15.5–19.2% | why section (D4) |
| 95% | 8.7% | **28.7%** | footer (D6) |
| 100% | **37.5%** | 13.4% | footer (D6) |

Worst desktop step is the footer (37.5%); worst mobile band is
25–45% (chapters/why).

### Geometry — SVG census (73 Ulara vs 83 reference)

**Hero (D1, mechanism detail):** same subject — front elevation of the
learning building (lecture hall, checkpoint bridge, exam wing, library wing,
mastery tower, ground line, two trees) — different drafting vocabulary:

| | Ulara | Reference |
|---|---|---|
| Class family | `cp-*` | `bp-*` |
| Fills | flat washes: `cp-fill-wash` (grid-line @0.16), `cp-fill-wash-soft` (@0.09), `cp-fill-paper` (bg) | pattern fills: **5 `<pattern>` defs** — `bp-stipple-elv` (8×8 dot grid), `bp-hatch-elv` (7×7 45° lines), xhatch, shade — **83 rects** carrying pattern surfaces |
| Shapes | 85 paths, 0 rects, 0 patterns | 10 paths, 22 circles, 117 lines, 83 rects, 5 patterns |
| viewBox | 0 0 1440 640 | 151 164 1139 411 |
| Label font | 15.8px | 12px |
| Render | 1000×444 (framed plate) | 1440×520 (full-bleed) |

**CTA sketch:** identical drawing (`fo-cta-sketch-art` 713×386, same paths,
same aria). Ulara adds `pathLength=1` + `--pd` stroke-draw animation;
reference renders it static.

**Plan (jt-plan):** identical geometry (1200×760, `xMidYMid meet`, same
22p/77c/337l/89r/34t census; aria differs only by brand name). Rendered
949×**854** (Ulara) vs 949×**581** (reference) — container height differs
273px (D11).

**Chapter icons (200×200):** 4 in both, identical shape census
(2c/8l/2r · 2c/9l/3r · 1p2c2l9r · 1c10l3r).

**Ulara-only SVGs:** 4× `pm-furniture` 220×220 ruler (plan furniture, `--pd`
draw), 1× stacked brand logo 32×62.61.

**Reference-only SVGs:** 10× `st-crawl-svg` badges (104×66), 1×
`wy-map-svg` (816×265 circuit, D8), 1× `fo-mark-svg` (215×215 ring+dot
construction, D12), 1× `fo-strip-svg` (skyline webp 1427×314, D12), 1×
24×24 16-path icon, 1× 1×1 rect.

### New divergences (D7–D12)

- **D7 — Crawl cell rendering.** Ulara: HTML spans (`st-crawl-idx` +
  `st-crawl-phrase`). Reference: SVG badge (`st-crawl-svg` 104×66, number
  + name as `<text>`). Same container/ticker/cell size — inner rendering
  differs. Content is brand-specific (Ulara: مؤسستك تملك بياناتها / كلياتك… /
  منصّة واحدة… / عربية أولًا / تعليم أفضل; reference: المحاضرة التفاعلية /
  التصحيح بالملاحظات / مصفوفة الإتقان / فهرس البحث / سجلّ القسم والكلية) —
  keep Ulara's copy, match the SVG rendering.
- **D8 — Why mechanism (D3, source-level).** Reference `WhyScene.tsx`
  drives a 242.16rem (3874px) `.wy-track` with `.wy-map` circuit paths
  positioned via `--wy-sx/sy/sw/sh` CSS vars (JS per-scroll), `.wy-axis`
  at 85.56rem (0.12rem wide). Ulara: static `.wy-scene` 1635px,
  `.wy-spine` at 31.7rem (1px), no track/map/driver. The reference why is a
  long scroll stage with a live map; Ulara's is a compact static scene.
- **D9 — Keyframe sets.** Ulara-only: `ulara-group-reveal` (reference:
  `madarek-group-reveal` — same role, brand prefix), `pl-trace`, `pl-rise`,
  `pl-light`, `scr-split-top`, `scr-split-bot`. Reference-only:
  `mdrkArb/mrkBrb/mdrkWrb/mdrkPrb/mdrkArd/mdrkBrd/mdrkWrd/mdrkPrd` (8
  role-card reveals).
- **D10 — Plan xl layer opacity.** `.jt .jt-plan [data-xl]`: Ulara
  `opacity: 0.18; will-change: opacity` vs reference `opacity: 1`.
- **D11 — Plan render height.** Same SVG, 949×854 vs 949×581 (see above).
- **D12 — Footer mechanism.** Reference: `.fo-mark` 215×215 construction
  mark (`--fu` unit, veiled state, accent point) + `.fo-strip` skyline
  (webp, twin + chrome, dark/light variants). Ulara: `fo-cta-platezone`
  band + stacked logo; no `fo-mark`, no `fo-strip`.

### Motion inventory

| | Ulara | Reference |
|---|---|---|
| Keyframes | 20 | 23 |
| Transition rules | 151 | 136 |
| Animation rules | 18 | 12 |
| Reveal elements | 88 (83 in-view after full scroll) | 58 (54 in-view) |

Ulara animates 30 more elements than the reference — the extra reveals
track the extra chrome (D2 edges, D6 bands, pm-furniture).
