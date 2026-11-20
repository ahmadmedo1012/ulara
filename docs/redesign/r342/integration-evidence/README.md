# R342-final — the homepage integration evidence set

The composite `wip/homepage-final` branch (PRs #7 + #8 + #9 integrated,
repaired and refined), captured against the production build
(`vite build` → `vite preview :4173`) on the integration lead's
worktree. Every capture is the REAL integrated branch — never a
per-agent preview.

## The capture set (20 plates)

| plate | what it proves |
|---|---|
| `01-hero-settled-1440-light` | the composed hero: campus plate centered, drafting chrome, ticker |
| `02-hero-stations-open-1440-light` | the drag sweep opened all FIVE inspection stations; the collision-aware card layout (no clip, no overlap) |
| `04-header-onhide-1440-light` | the masthead's on-hide scroll state |
| `05-statement-rest-1440-light` | the statement at rest — ghost grey, drafting underlay, twins masked |
| `06-statement-mid-1440-light` | mid-progression — the ink-roll mid-flight, per-word, no doubled lines (the twin-mask fix), tashkeel intact |
| `07-pains-1440-light` | the four problem stories as distinct measurement instruments |
| `09/10/11-journey-*-1440-light` | the scrubbed journey at three beats (rooms assemble → dimensions/labels → violation register) — the house timeline engine |
| `13-product-1440-light` | the product presentation: real captures, callouts, demo disclosures |
| `15-why-mid-1440-light` | the why workflow: rail, stages, in-flow captions |
| `16-roles-1440-light` | the roles deck: ledger + open-row focus seat |
| `17-footer-1440-light` | the closing plate: colophon, registry, wordmark, legal row |
| `19-hero-1440-dark` | the dark theme pair |
| `22/23-hero-*-390-light` | the phone hero: symmetric ±10% edge-bleed crop, five tappable stations, flow cards |
| `24-menu-open-390-light` | the mobile menu (scroll-locked, focus-trapped) |
| `25-preloader-mid-1440-light` | the drawing preloader mid-trace (progress rule + registration cross) |
| `27/28-rm-*-1440-light` | the reduced-motion static sheet: complete, readable, no loader |

## The measured QA record (the lead's verification session)

- **Viewports**: 1440 · 1024 · 768 · 390 · 375 · 360 · 430 (the two
  regression laps added for the marker-clipping history)
- **Themes**: light + dark (`html[data-theme=dark]`)
- **Reduced motion**: the full sheet stands (no loader, no cursor
  layers, journey painted final, stations readable)
- **Interactions exercised**: preloader sequence + skip · drag-to-
  inspect (5 stations) · keyboard station toggles (cp + ex + lc) ·
  header scroll states · mobile menu (open/Escape/outside) · journey
  scrub forward AND reverse (state-exact at both directions — the
  undo-stack rollback) · role selector (5 panels) · footer links ·
  return-to-top reset
- **Geometry audits**: zero horizontal overflow at every width · zero
  clipped interactive controls · zero header-region text overlaps
  (DOM-rect audit) · the five station targets inside the viewport at
  360/375/390/430 (E2E-pinned)
- **The one visual defect found and fixed in this pass**: the
  statement's ink-roll twins escaped their word masks (the shared
  scrub belt's `overflow: visible` defeated the A-I1 mask) and
  overlapped the following line at rest — fixed by scoping the mask
  closed in `statement-ai1.css` (tashkeel verified intact after).

## Honest limits

- WebKit: not installed in this sandbox — the `ios-webkit` CI lane
  runs it (AGENTS §8's documented residual).
- DB-integration: not run locally (no disposable Postgres here; the
  CI lane owns it — production Neon was never touched).
- The conformance instrument (`scripts/conformance/`) that AGENTS.md
  §2 describes is NOT present in this repository (verified across the
  full git history) — no conformance percentages are claimed anywhere
  in this round; this evidence set + the pixel-exact E2E contracts are
  the visual verification of record.
