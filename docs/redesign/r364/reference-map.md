# r364 — the reference map (every public surface ↔ its reference counterpart)

Source of truth: the r350 corpus (`docs/redesign/r350/reference/` — REFERENCE.md,
29 shots, section HTML, scroll choreography JSON). The live site sits behind a bot
gate this round; the corpus is the measured ground truth (extracted live 2026-11-21
at 1440×1000 + 390×844, Playwright, every number below measured, nothing assumed).

## The one-line grammar

Architectural drafting sheet on paper: cream paper + film grain, charcoal ink,
hairline rules with crosshair `+` marks, ONE signal colour (the reference's orange
plays ULARA's royal blue #2540D9 — owner-ruled), giant tight-leaded uppercase
display type in hairline grid cells, mono measurement labels everywhere, ONE huge
dense hand-inked architectural illustration per scene, thick-wall floor plans with
dimension strings + room tags + signal callout squares + dark info cards, bold FLAT
signal geometry (solid circle / tall slab / pale circle) against monochrome art, a
lone human figure for scale, density in every viewport, zero empty bands.

## Page → page map

| Reference surface | Evidence | ULARA surface | r364 work |
|---|---|---|---|
| Preloader (counter + coords + boot lines + spec sheet + masked title) | preloader-timeline.json, shots/preloader-mid | Preloader | frame parity pass |
| Hero (drag-to-reveal ink elevation + crosshair + coords + violation markers + display H1 + marquee + ruler) | shots/shot-top, hero-hover, hero-after-drag | Hero | **art v2: full-stage ink elevation of the campus gate building; royal callout squares; drag sweep** |
| Intro scroll-text (giant centered lines on paper) | shots/shot-intro | Statement | density + scale parity |
| Problems 4-col ruled grid + giant interstitial line | shots/shot-problem | Live (pains) | composition parity |
| Floor-plan walkthrough (sticky 7,000px scrub: thick-wall plans, tags, dimension strings, callouts, dark cards) | shots/shot-map-1/2, driven-scroll-states.json | Chapters | **art v2: real thick-wall plans (lecture hall → library → lab → exam hall), royal callouts, dark info cards** |
| Platform (plan + feature ledger rows + chat widget + [01] index) | shots/shot-platform-1/2/3 | Product | **art v2 plan + ledger parity** |
| Why (duotone brutalist scene: flat signal circle + slab + pale circle + lone figure) | shots/shot-why | Why | **art v2: duotone campus podium scene with the flat-shape kit** |
| Use-cases (hover/tap list + image reveals; plan grids with title bars + CHECKING/LEARNED dark cards) | shots/shot-usecase | Roles | **art v2: per-role plan/scene reveals** |
| CTA (hairline grid + coordinate labels + giant centered heading + signal button) | shots/shot-cta | Vision | composition parity |
| Footer (accordion roles list + duotone collage above) | shots/shot-footer, footer-top, footer-hover | Footer | **art v2 collage band + accordion parity; ACCEPT in royal** |
| Cookie strip (bottom-right, LEARN MORE + ACCEPT/REJECT) | all shots | ConsentBanner | ACCEPT royal fill — verify |
| Right-edge tab (vertical, signal block + label) | all shots | EdgeTab | ULARA-branded tab — verify |
| Nav (hairline bar, menu choreography) | header.html | SheetNav | collision-free at every width |
| Cursor (point + dot + ink pulse, fine pointers only) | corpus §6 | SheetCursor | verify |
| Pricing-style page | refsite-pricing.html, shots/pricing-top | AppDownloadPage | APK/IPA cards in the same page grammar |
| Sub-pages (legal/about/contact-style) | site-wide grammar | PublicPages (about/help/contact), legal, colleges, campus, capabilities, vision, competitions, auth, errors, maintenance | **each gets hero art v2 + the same type/grid/flat-shape grammar** |

## The flat-shape kit (P1 deliverable)

- Solid royal circle (large, cropped by the frame) — reference: footer collage top-left.
- Tall solid royal slab/bar — reference: footer collage top-right.
- Pale grey/ink-tint circle — reference: footer collage mid-left, behind the scene.
- Thin royal construction lines + crosshair ticks — everywhere.
- Royal callout squares with mono digits — plans + hero markers.
- Dark info cards (ink #262019 slab, paper mono text) — CHECKING/LEARNED equivalents.

## The art v2 system (P1 deliverable)

Original art only — nothing copied from the reference. Style parity, content ULARA:
university gate elevation (hero), lecture hall / library / lab / exam hall plans,
campus podium-stair duotone scene with a lone student figure, tower elevation,
per-role scenes. Pipeline: `scripts/art/` (build-time only) → SVG plans generated
programmatically; ink/duotone scenes produced as optimized WebP (raster allowed
where tonal richness demands it — mission §0).
