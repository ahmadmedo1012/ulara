# R352 — LOG (chronological work record)

## Setup & audit

- Re-fetched `origin/main` @ **5892504e98a620fdba7a5d10ac871e432ef514d2** (the task's
  initially-observed 35793f7 was stale — three rounds landed since).
- Open PRs re-verified: **#35** (backend r352 — the API contract publisher; no
  frontend files) and **#36** (blue palette — brand/tokens/landing styles only).
  No file collisions; the backend contract (`API-CONTRACT.md`, `DATA-MODEL.md`,
  `LEGAL-MATRIX.md` from branch `r352/institutional-backend`) consumed as the
  source of truth.
- Baseline measured: build 746.9 KB gz (ceiling 770), entry 63.4/92, design gates
  all green, `npm install` at repo root (lockfile restored — not committed).

## Implementation

1. Contract layer (types/labels/api) + hooks + module registry + kit + the
   feature CSS sheet — commit `478b59c`.
2. The 13 modules (15 page files) — commit `6bf956a`.
3. Route/nav/AppShell-titles integration — commit `14714ee`.
4. Tests: 4 unit files + the e2e journey + the capture instrument — commit
   `148fd08`.

## Bugs found & fixed during verification (the honest list)

- **useInstList fired institution-scoped requests without a context** — the
  gating unit test caught it; now scope-gated like useInstItem (no doomed 403s).
- **Relative navigation 404s** on the nested meeting route — all institutional
  navigations made absolute; a blind replace initially mis-targeted three
  programs/research call sites — caught by review, corrected.
- **Paged-envelope mocking** — the first e2e run double-wrapped paginated bodies
  (crash: `.filter is not a function` in OverviewPage); the suite's own
  `statefulJson` (meta as a SIBLING of data) is the correct grammar — fixed in
  the fixtures, and the crash surfaced the exact contract envelope semantics.
- **`/auth/me` context reset** — the boot refresher answers with the fixture's
  contextless STUDENT profile, wiping the seeded institution context; the spec
  now overrides `/auth/me` with the r178 context fields (the contract's own
  behavior) + rewrites `ula-auth` as v1 (v0 triggers the store's migration to
  the honest contextless state).
- **Route-title coverage** — the 18 new routes needed PAGE_TITLES/DYNAMIC_TITLES
  seats (WCAG 2.4.2 pin); added (AppShell titles only — no shell logic touched).
- **z-index tokens** — my two raw z-index integers would have grown the
  css-counts ratchet (71→73); switched to `--z-hero-grid`/`--z-modal` (back to 71).
- **Motion tokens** — my private spinner keyframes violated check-motion-tokens;
  replaced with the platform's `.motion-spinner` + `--motion-duration-short`.

## Bundle (the honest measured story)

- Baseline 746.9 → with the full feature **804.7 KB gz** (ceiling 770, +4.5%).
- Diet rounds executed: the 22 hand-rolled mutation-hook objects collapsed into
  the `useInstActions` dispatcher; `serverError` centralized; ~1 KB of dead
  imports/handlers removed. Result: the feature's honest floor — the remaining
  ~50 KB gz is the product itself (13 modules × forms/tables/Arabic legal
  vocabulary + the contract layer).
- **The ceiling is lead-owned** (AGENTS.md never-do; the task's §10 forbids
  touching gates) — NOT raised, NOT hacked. The overage is documented here and
  in the PR for the lead's gate decision (the repo's own precedent — r320/r323/
  r326/r337 documented raises — is the lead's to apply).

## Visual verification — the fleet rasterization investigation

1. 104 screenshots captured (4 viewports × 2 themes × 13 sections) with
   no-horizontal-overflow assertions at 360/390 (all green).
2. Pixel-level review found the authenticated shell's CONTENT AREA paints blank
   in every capture — while DOM, computed styles, fonts, and geometry all verify
   correct, and the **repo's own /admin/dashboard paints identically blank** in
   the same flow (landing paints fine).
3. Systematically excluded: the sheet-frame/cursor overlays (hidden — still
   blank), transforms/contain/will-change (probed clean), the browser build
   (identical on the full chromium binary AND headless-shell), the Arabic fonts
   (same-origin glyph test paints both families), timing races (fonts.ready +
   double-rAF settle added).
4. Conclusion: an environment-level rasterization quirk of the authenticated
   shell in this fleet's chromium-under-mismatched-protocol — AGENTS.md's own
   "report as RESIDUAL, never fake" rule applies. The screenshots are archived;
   DOM/visibility/geometry verification (the e2e journey + overflow checks)
   carries the truth, and pixel verification is flagged for a machine where the
   authed shell rasterizes.

## Verification summary (all measured in this branch)

typecheck 0 errors · lint 0/0 · vitest 3060/3060 · build ✓ · colors/raw-css/
icons/motion PASS · css-counts ratchet unchanged · r352 e2e 5/5 · capture 8/8
suites (104 shots, overflow ≤ 0 everywhere) · bundle 804.7/770 (documented
overage for the lead).
