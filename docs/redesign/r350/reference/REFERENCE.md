# B0 — reference-site.example reference extraction (r350)

Extracted **live** on 2026-11-21 with Playwright (chromium 148 / pw 1.60) at 1440×1000 and
390×844 (dpr 2). Everything below is measured from the real site; nothing is assumed.
Raw artifacts sit next to this file (HTML, CSS, obfuscated JS, JSON timelines, 29 shots).

## 0. What the site IS (stack)

A **Webflow** site (`w-mod-js`, webflow.io runtime, jQuery 3.5.1) whose real engine is a
separate, **string-obfuscated** bundle: `https://refsiteai-bp.netlify.app/main.js` (289 KB,
javascript-obfuscator string-array + base64-shift). Library stack, in load order:

| library | version | role |
|---|---|---|
| Lenis | 1.1.5 | smooth scroll, **wrapper mode** — scroller is `.main-inner.lenis` (not window; `docH` stays 1000; `wrapper.scrollTop` drives everything) |
| GSAP | 3.12.5 | core ticker — one shared ticker drives Lenis + ScrollTrigger + cursor + masks |
| ScrollTrigger | 3.12.5 | 41 triggers (desktop) / 26 (mobile) — reveals + section parallax, **zero pins** |
| SplitText | 3.13.0 | line/char splits (`.bp-line` masked line reveals) |
| TextPlugin | 3.13.0 | preloader boot-line typing |
| @barba/core + prefetch | latest | SPA page transitions via `.main { clip-path: inset(var(--mask-percent)) }` |
| Swiper | 11 | logo carousel + use-case gallery |

`config.js` probes `localhost:3000/@vite/client` → the agency dev overlay (`refsite-dev-mode`);
production just loads `main.js`. Analytics (Clarity/Mixpanel/GA) are irrelevant to visuals.

**Could NOT extract:** readable source of `main.js` (obfuscated). Compensated with runtime
instrumentation: DOM sampling timelines, `ScrollTrigger.getAll()` dump, computed-style probes
at fixed scroll offsets, and direct interaction recording. Behavior data is complete; the
*code* construction is inferred from that data.

## 1. Design tokens (measured from CSS)

Palette (`:root` + computed usage):

| token | value | use |
|---|---|---|
| `--content--primary` | `#282828` | primary ink (text) |
| `--content--secondary` | `#414140` | secondary ink |
| `--content--granite-gray` | `#626260` | tertiary ink |
| `--content--surface` | `#72726f` | muted ink |
| `--content--border` | `#b3b3af` | hairline borders/rulers |
| `--content--disable` | `#b4b4b0` | disabled ink |
| `--content--brand` | `#fa3600` | deep orange (hover/active states) |
| accent (measured) | `#f15534` | **the brand orange — identical to ULARA's accent** |
| paper | `#fff`, `#fafafa`, `#e0e0da` | backgrounds |
| overlays | `#0000000a/0f/1a`, `#0006` | 4–10% ink washes |

Type: **BT Grotesk** (display/sans — commercial; nearest free pairs: Alexandria/Space Grotesk;
ULARA Arabic-first → IBM Plex Sans Arabic / Alexandria) + **Geistmono** (all measurement
labels, coords, boot lines, spec sheets). Base `.txt` tracking: `-0.02em`.

Heading scale (desktop `tb-*` / mobile `mb-*`): h1 `7.2rem/1` · h2 `4.8rem/1` · h4 `3.2rem/1`
· h5 `2.8rem/1` · h6 `2.4rem/1.2` — huge, tight, uppercase-capable display type; mono labels
at `10–14px`.

The whole aesthetic = **architectural blueprint sheet**: paper white, ink #282828, hairline
`#b3b3af` rulers with crosshair `+` marks, orange survey accents, mono measurement labels,
`X:/Y: …PX` coordinate readouts, dashed `line-dash` rules, clipped corner frames.

## 2. Preloader (timeline in `preloader-timeline.json`, DOM in `preloader-dom.html`)

Duration **~4.35 s** counter + exit ≈ **6.9 s** total at 1440. Counter curve: fast to 45 %
(0.9 s), slow 45→60 % (1.5 s), fast 60→100 % (1.8 s) — measured samples in the JSON.
Anatomy (`.loading`, 5 children):

- `.loading-progress` — giant % counter (top item) + `.item-bot` **X:1131PX / Y:1131PX**
  coordinate readout, mono.
- `.loading-ruler` — full-bleed horizontal + vertical hairlines with `+` plus marks and
  mono coordinate labels (`txt-font-mono txt-10`).
- `.loading-main` → `.loading-content`:
  - Title **“WELCOME TO REFSITE AI”** as 4 `.bp-mask-line-mask > .bp-line` rows (SplitText
    lines, masked line-by-line reveal).
  - Spec sheet (mono, `10px`): `TYPE : Technology/AI Software Company` · `FOUNDED : 2026`
    · `FOCUS : AI-powered building code compliance…` · `LOCATION : 1801 California St…`
  - Boot lines (TextPlugin typing): `001 INITIALIZE CORE SYSTEM` · `002 LOAD AI MODELS`
    · `003 CO…` (progress-locked).
  - Credit: `DESIGNED BY BEARPLUS, THE AWARD-WINNING DESIGN AGENCY`.
- Exit: `.loading.loaded { display: none }` after a wipe; page reveals under it.

CSS state machine (inline `<style>`): `[df-init] { opacity: 0 }` until init;
`.loading.loaded` hidden; `.main` carries the barba mask variable.

## 3. Scroll architecture (measured)

- **Lenis wrapper mode**: scroller = `.main-inner.lenis`. `document.scrollHeight` is pinned
  at viewport height; all motion = `wrapper.scrollTop`. Driving it directly
  (`el.scrollTop = y`) works with overflow:hidden and is how everything was measured.
- Total journey: **13,255 px @1440×1000** · **10,613 px @390×844**.
- **41 ScrollTriggers @1440** (full dump with start/end in `scrolltrigger-dump.json`).
  Patterns: reveals start `top+=X% bottom` (element top crosses viewport bottom + offset);
  section-level parallax uses `clamp(top bottom+=50%) → bottom top-=50%` scrub; the
  `.home-intro-content-title` runs a scrubbed drift `center bottom+=10% → center top+=40%`.
- **Zero GSAP pins.** The “pinned scenes” are **CSS position:sticky**:
  - `.home-map-inner` (top:0, h=987) — the long map sequence ~y 2458→9458 (**~7,000 px**
    of scrub through map stages under a sticky viewport);
  - `.home-platform-content-inner` (top:427px, h=145) — the tab rail of the
    Observe→Advise→Act→Learn platform sequence (~y 9458→10655).
  - Mobile swaps to `.home-map-main-stick-inner`.
- Section order & measured tops @1440: hero 7 · intro 836 · problem 1683 · map 2458 ·
  platform 9458 · why 10168 · usecase 10867 · cta 11853 · footer ≈12700 (states at every
  offset in `driven-scroll-states.json` / `mobile-scroll-states.json`).

## 4. Hero (drag-to-reveal)

`.home-hero` (7→~1007px tall, full-bleed):

- `.home-hero-img-interact-wrap` — the interactive canvas image with:
  - crosshair: `.home-hero-curor-line` ×2 (full-width horizontal + full-height vertical
    1px lines at `opacity .16`) following the pointer via transform;
  - `.home-hero-img-coordi` — `X: nnn PX Y: nnn PX` mono readout following the pointer;
  - hint chip `.home-hero-interact-txt`: “Click and drag your mouse to see violations”.
- **Drag interaction** (recorded live): pointer-down + move sweeps a survey pass; violation
  markers `.home-hero-img-deco item1/item2` fade in (`-bg` wash to ~.75 opacity, mono code
  `IBC 1015.2` + label `Guardrail required for fall protection`, `IBC 1011.11 Handrails
  required.`). Markers sit on the sub (surveyed) image layer revealed through the drag.
- Headline block (`.home-hero`): “An AI agent that works inside your design tools” (h2-scale)
  + one-sentence sub + `.btn-fill` CTA “Discover more” (label top/bot roll swap + orange
  fill wipe on hover).
- `.home-hero-work-inner.marquee-left.anim` — infinite marquee “Faster iterations · Fewer
  mistakes · Less busywork”.
- `.home-hero-ruler` — ruler strip with `line-dash` hairlines + plus marks + mono numbers.
- Frame: `.bg-border` — 1px page frame inset with `+` plus marks at the 4 corners
  (`bg-border-plus top left` etc.).

## 5. Ink mask (the SVG signature)

`svg-filters.svg` — 9 filters; the shared one (used 4×):

```svg
<filter id="sharedDisplacementFilter">
  <feTurbulence type="fractalNoise" baseFrequency="0.045 0.055" numOctaves="4" seed="5" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="100" xChannelSelector="R" yChannelSelector="G"/>
  <feGaussianBlur stdDeviation="1.8" result="blurred"/>
  <feComponentTransfer in="blurred" result="contrast">
    <feFuncA type="linear" slope="2.2" intercept="-0.6"/>
  </feComponentTransfer>
</filter>
```

Applied to `.ink-mask-img.sub.ink-filter` layers (`.ink-mask` wraps `main` + `sub` images,
`sub` carries the displacement). The mask wipe is scroll-scrubbed (scale/baseFrequency
animating or clip driven by the shared ticker). A second filter `path-filter` roughens SVG
paths (turbulence 4/4, octaves 3, seed 5387, scale 2).

## 6. Custom cursor

`.cursor` (fixed, pointer-events none, **display:none on touch/mobile**):
`.cursor-main` = the head (0×0 point, transform-driven, follows with easing),
`.cursor-inner` = 5×5 dot (opacity 0 at rest; grows/fades on interactive hover,
`data-pointer-ink-pulse` attribute pulses ink). Velocity trail comes from the shared ticker
(GSAP ticker → lerp toward mouse; measured following at matrix(…794.452, 556.024)).

## 7. Barba page transition (measured sample curve)

`.main { clip-path: inset(var(--mask-percent)) !important }`. Click nav →
inset **0→1.1→3.6→9.5→16.2→26.0→39.3→50 %** (~0.6 s, accelerating = power2.in),
content swap behind full inset, then **50→44.2→21.9→13.3→6.8→2.2→0.3→0 %**
(~0.7 s, decelerating = power2.out). Total ≈ 1.3 s.

## 8. Footer

Big `.footer-logo` (357×355 SVG) corner-anchored; footer title uses the same
`.bp-mask-line-mask` reveals; `.footer-form` (email input + submit) with `w-form` success
state swap; `footer-menu`, `footer-info`, `footer-copyright` on hairline `line` rules.
Hover-lens behavior on the logo did **not** show clip/filter deltas in this pass — recorded
as NOT EXTRACTED (the pointer “lens” effect is likely inside the obfuscated bundle; the
footer-logo.svg structure is in `section-footer.html`).

## 9. Mobile simplification pattern (390×844, measured)

- Custom cursor: `display:none` (touch).
- Journey shortened 13,255→10,613 px; map scene ~4,800 px (vs ~7,000).
- Different sticky: `.home-map-main-stick-inner` (desktop uses `.home-map-inner`).
- 26 (vs 41) ScrollTriggers — fewer/merged reveals.
- html font-size ~9.92px (Webflow 390 breakpoint scale).
- Hero keeps the interactive image + coords + hint; headings scale via `mb-h*` classes.

## 10. What ULARA reuses vs adapts (decision)

- Reuse construction: Lenis-wrapper scroll, one shared GSAP ticker, CSS-sticky scenes,
  ScrollTrigger reveals with the same start patterns, bp-line masked headline reveals,
  btn-fill roll CTAs, barba-style inset clip transition, ink displacement filter (exact
  constants above), crosshair+coords hero layer, marquee, ruler/crosshair frame language,
  preloader counter+coords+boot-lines+spec-sheet, page frame with corner plus marks.
- Adapt to ULARA: Arabic-first RTL copy (ULARA's own content), IBM Plex Sans Arabic /
  Alexandria type, ULARA logo/mark, `#f15534` accent (already identical), keep ULARA's
  design tokens/CSP/a11y contracts and reduced-motion static sheet.
