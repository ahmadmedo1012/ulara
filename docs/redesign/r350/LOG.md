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
