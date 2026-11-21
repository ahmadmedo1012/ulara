# r350 LOG — Merge → Complete → Match → Ship

Working journal for the final pass. Every step: command → result → before/after numbers → commit.

## Phase A — Merge (done)

| step | result | commit |
|---|---|---|
| clone + fetch | `origin/main` = `bf99196` (expected baseline ✓); branches `ui/public-experience` (9 ahead), `ui/authenticated-workspace` (4), `ui/native-mobile` (3) all 0 behind; PRs #30/#31/#29 open | — |
| merge 1: public | `bash scripts/verify.sh --fast` → FAST PASS (tsc ✓ · vitest ✓ · bundle 756.4/770 ✓ · css ratchet 52 ✓ · logo ✓ · **axe a11y gate ✓ 19 S/C vs floor S25/C0** — the previously-unrun gate now runs in this sandbox, chromium 1223 installed for pw 1.60) · `r349-public-clip` e2e → **18 passed** | `6ed9c56` |
| merge 2: authenticated | FAST PASS (bundle 756.4) · `notifications` e2e → **2 passed** | `701feed` |
| merge 3: native | All §5 gates in `apps/mobile`: tsc 0 · expo lint 0 err (16 pre-existing warnings) · contract-check ✓ no drift · tokens:check ✓ byte-identical · api:types → `git diff --exit-code` clean · jest **45 suites / 1233 passed** · expo export android ✓ ios ✓. Then FAST PASS on merged tree. **Mobile push = EAS OTA to production; gates ran BEFORE the push.** | `5f3ca6a` |
| CI regression found & fixed | CI `Test (frontend)` on `701feed` red: `/bin/sh: rg: not found` — `r349-ghost-families.test.ts` census used `rg` via execSync; CI runner lacks ripgrep → catch returned 0 → 4 floor pins failed. Fix: pure-Node `readdirSync` census, same counting semantics (verified node-vs-rg identical: table-wrap 31/31, list-row 77/77, form-feedback 25/25, flex-wrap 28/28). 18/18 pass. FAST PASS. | `c410e4b` |
| CI on c410e4b | **ALL GREEN**: CI ✓ · deadcode ✓ · Size gate ✓ · Deploy smoke ✓ · Deploy (Vercel) ✓ | — |
| Vercel | production deployments READY for `6ed9c56`, `701feed`, `5f3ca6a`, `c410e4b` (ulara-d7jfow3ph / h8s0wk675 = c410e4b). REST runtime-errors endpoint not available on this plan (404) → live-site browser check instead: `/`, `/auth`, `/app`, `/campus`, `/capabilities`, `/legal/privacy`, `/404` → **0 console errors, 0 page errors, 0 failed requests** (`.ref-tmp/live-health.json`) | — |

## B0 — Reference extraction (done)

Full package in `docs/redesign/r350/reference/` (+29 shots). Key extracted facts
(all measured, see `reference/REFERENCE.md`):

- Stack: Webflow + **Lenis 1.1.5 wrapper-mode** (scroller `.main-inner.lenis`, not window) +
  **GSAP 3.12.5/ScrollTrigger + SplitText 3.13 + TextPlugin + Barba + Swiper 11**; the real
  choreography is `heronai-bp.netlify.app/main.js` — **289 KB string-obfuscated** (could not
  read source; recorded behavior via runtime instrumentation instead — timelines,
  `ScrollTrigger.getAll()` dump, computed-style probes, live interaction recording).
- Tokens: ink `#282828`/`#414140`/`#626260`, hairline `#b3b3af`, paper `#fff/#fafafa/#e0e0da`,
  **brand orange `#f15534` (= ULARA accent) + `#fa3600`**, BT Grotesk + Geistmono,
  `.txt { letter-spacing: -.02em }`, heading scale h1 7.2rem/1 → h6 2.4rem/1.2.
- Preloader ~4.35 s counter (curve recorded) + exit ≈ 6.9 s: % counter + `X:1131PX/Y:1131PX`
  coords, ruler + crosshairs + coordinate labels, 4× SplitText masked title lines, mono spec
  sheet (TYPE/FOUNDED/FOCUS/LOCATION), boot lines `001 INITIALIZE CORE SYSTEM…`.
- Scroll: journey 13,255 px @1440 · 10,613 @390. **Zero GSAP pins** — scenes are CSS sticky:
  `.home-map-inner` top:0 (map scene ≈ y2458→9458, ~7,000 px scrub), `.home-platform-content-inner`
  top:427 (platform tabs); mobile swaps to `.home-map-main-stick-inner`. 41 ST (desktop) / 26
  (mobile). Reveal pattern `top+=X% bottom`; section parallax `clamp(top bottom+=50%) → bottom top-=50%`.
- Hero: crosshair lines + X/Y readout follow pointer; drag reveals violation markers
  (`IBC 1015.2 Guardrail required…`); marquee ticker; ruler strip; page frame with corner `+`.
- Ink filter (exact): `feTurbulence 0.045/0.055 fractalNoise octaves 4 seed 5` →
  `feDisplacementMap scale 100 R/G` → `blur 1.8` → `feFuncA linear slope 2.2 intercept -0.6`.
- Cursor: `.cursor-main` head + `.cursor-inner` 5×5 dot, `display:none` on touch; velocity
  trail via shared GSAP ticker.
- Barba transition (measured): `.main { clip-path: inset(var(--mask-percent)) }`,
  0→50 % close ≈0.6 s (accel), swap, 50→0 % open ≈0.7 s (decel), total ≈1.3 s.
- Mobile pattern: cursor off, journey −20 %, merged triggers, same hero interactives.
- NOT extracted: footer pointer-lens deltas (no clip/filter change observed on hover —
  likely pointer-driven inside obfuscated bundle; structure captured); readable main.js source.

## Baseline (re-measured on merged main, my instrument = body.innerText word count)

| page @1440 | words | console errs | failed reqs |
|---|---|---|---|
| / | 722 | 0 | 0 |
| /auth | 162 | 0 | 0 |
| /app | 438 | 0 | 0 |
| /campus | 240 | 0 | 0 |
| /capabilities | 244 | 0 | 0 |
| /legal/privacy | 478 | 0 | 0 |
| /404 | 36 | 0 | 0 |

(Owner's earlier numbers used a different counter; this table is the instrument for all
before/after comparisons in r350.)

## B1 — part 1 (commit `4cccf40`, pushed 2026-11-21; entry backfilled on resume)

Session continuity note: this entry was written by the resuming session — the commit landed
but its LOG row was never appended before the session dropped.

- **The one-title law**: topbar no longer repeats the PageHeader h1 (measured duplicated on
  all five roles before). The h1 is the single visible title; kicker+chips stay. ≤920px the
  topbar title folds (`display:none` since 4-A10) — no clipped/oversized label @390.
- **The rail's single toggle**: collapsed icon rail dropped its unlabeled 3-way theme control
  (topbar's compact toggle owns the flip); portaled tooltips on tour/logout buttons.
- **The FAB's honest seat**: feedback FAB clears the 78px bottom-nav (was 6px under it @390),
  44px tap floor.
- Files: AppShell/Sidebar/Topbar/components.css + r350-one-title.test.tsx (new, 151 lines) +
  updated r305-shell-ds.e2e.ts & r305-topbar-cluster.test.tsx.
- Author's verification: 3014 unit + 29 shell e2e green.
- Resume re-verification (this sandbox, node 24 / git 2.47): `bash scripts/verify.sh --fast`
  → **FAST PASS** (tsc ✓ · vitest 3014 ✓ · bundle 756.4/770 ✓ · css ratchet 52 ✓ · logo ✓ ·
  axe a11y 19 S/C vs floor S25/C0 ✓).

### B1 part 2 — the 5-role sweep (this session)

New instrument: `scripts/e2e/role-shots.mjs` (`npx tsx scripts/e2e/role-shots.mjs`) — hermetic
vite + the fixture corpus + role-seeded contexts, DSF-2 screenshots + the LOG word-count
instrument per cell. Results live in `docs/redesign/r350/shots/role-shots-results.json`.

**What the sweep found (logged, then closed — the loud-501 discipline):**

- **OWNER dashboard hard-crashed** (error boundary «حدث خطأ غير متوقع»): the corpus was
  audit-only for OWNER, so /owner/stats|realtime|alerts|activity|education all 501'd AND the
  activity body shape was never exercised (`events.map is not a function` — the hook returns
  axios res.data verbatim, so a paginated body must ride RAW {data,meta}, not ok()-wrapped).
- **TEACHER/ADMIN/QUALITY/STUDENT dashboards all hit corpus 501s** too (none of the five
  dashboards was ever hermetically exercised): /teacher/dashboard, /teacher/me/offerings,
  /teacher/risks, /admin/stats|faculties|reports|courses|papers?status=GRADED,
  /quality/overview|engagement|alerts, /me/gaps, /me/results. All added to
  `api-fixtures.ts` + `mock-transport.ts` with shapes verbatim from the source hooks.

**After (all 10 cells, light, DSF2):** 0 runtime errors · 0 failed requests · 0 unexplained 501s.

| role @1440 | words | shot |
|---|---|---|
| STUDENT | 297 | r350-role-student-light-1440.png |
| TEACHER | 277 | r350-role-teacher-light-1440.png |
| ADMIN | 171 | r350-role-admin-light-1440.png |
| QUALITY | 209 | r350-role-quality-light-1440.png |
| OWNER | 224 | r350-role-owner-light-1440.png |

(390 counterparts captured alongside; 390 words: student 283 · teacher 270 · admin 166 ·
quality 203 · owner 217.)

Verification: tsc ✓ · vitest 3014 ✓ · r305-shell-ds + notifications e2e **31 passed**.

Notes: (1) the word counts differ from the owner's old instrument (student 271) — this
session re-measures with the same body.innerText counter on the CURRENT tree; the B2 copy
cuts will be judged against THIS table. (2) Dev-mode axe logged one moderate finding on the
student dashboard («Page should contain a level-one heading») — the a11y gate only covers the
public pages and only serious/critical; recorded here, not hidden.

### B1 remaining (this session)
- [ ] 5-role × 1440/390 screenshots + word counts (student/teacher/admin/quality/owner) into
  `docs/redesign/r350/shots/` (owner dashboard is a new capture; student 271 in owner's old
  instrument).
- [ ] overlay consistency spot-check (SheetFrame/dialogs/notification/GlobalSearch focus, Esc,
  open/close motion) — the overlay-stack contract exists (lib/overlayStack + capture-phase Esc
  + useAnchorFocusReturn); verify by tests, not rebuild.

