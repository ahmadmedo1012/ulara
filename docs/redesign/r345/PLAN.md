# R345 — «المرحلة الأعمق»: parameter-level parity + the comprehensive polish

The owner's mandate (2026-11-20, after r344): once the round is confirmed
complete, enter the NEXT deeper and more comprehensive phase — cleanup,
comprehensive development and upgrade, appearance improvement, FULL matching
of the retired reference with focus on the FINEST details.

Law unchanged (AGENTS.md): never paste the reference's source/text/images/fonts —
reproduce MEASURED parameters in our own code, in our own Arabic-first identity.
Brand surfaces (paper/ink/accent colors, the Alexandria/Plex/Geistmono fonts,
the campus art) stay ULARA's own; MOTION PARAMETERS (durations, eases, windows,
thresholds, distances) are the matching surface of this round.

## Wave A — the fresh measurement dossier (2026-11-20, live, 1440×900)

Everything below was re-measured live on the retired reference this round
(browser eval + Playwright trusted input + sampled rAF curves), NOT carried
from the r341/r344 digests. The new findings are marked **NEW**.

### A1 — scroll engine (re-confirmed)

| Parameter | Reference measured this round | ULARA seat |
|---|---|---|
| glide model | wheel 900px → settle ≈ 1.10–1.20s, exponential decay ratio ≈ 0.90/frame → **lerp 0.1** (r313 digest's read re-confirmed behaviorally) | `DS_LENIS_PARAMS.lerp = 0.1` ✓ exact |
| scroll architecture | Lenis wrapper `.main-inner` (overflow:hidden, scrollTop-driven) | window wrapper (deliberate, r313 4-b) — curve identical |
| idle contract | — | 150ms quiet flag ✓ (r321) |

### A2 — ScrollTrigger conventions (re-confirmed, 41 triggers)

- Section wrap reveal window: `clamp(top bottom+=50%) → bottom top-=50%`
- Content reveals: `top+=40% bottom` (platform/cta-main/cta-deco),
  `top+=45% bottom` (bodies, img items, why items),
  `top+=55% bottom` (footer rows), `top+=65% bottom` (problem/why heads)
- Statement title scrub: `center bottom+=10% → center top+=40%`, scrub true
  — ULARA's useSheetScroll seat is ALREADY this exact window ✓
- CTA/footer state triggers: `top bottom+=100vh` (13× — nav/scroll-state seats)

### A3 — tween register (**NEW**)

| Family | Count | Duration | Ease |
|---|---|---|---|
| canonical content reveal | 40 | **0.8s** | **power2.out** (easeOutQuad) |
| heavier reveals | 7 | 1.0s | power3 |
| image/frame reveals | 6 | **1.6s** | **expo.out** |
| sets/tilts | 6 | 0 | — |

**ULARA drift**: the house `.reveal-up` runs `var(--t-slower) var(--ease-out)`
= **650ms + easeOutExpo** (cubic-bezier(0.16,1,0.3,1)) — snappier than the
reference's measured 800ms easeOutQuad glide. This round seats a landing-scoped
reveal register (0.8s, easeOutQuad family) WITHOUT touching the DS-wide token
(other surfaces keep 650ms; the landing is the reference-matched surface).

### A4 — cursor (**NEW**)

- Reference: DOM dot `0.6rem`, `#DD6013` (a DIFFERENT tone than the brand
  `#FA3600` — measured, kept in the dossier), rest `opacity: 0`,
  `transition: 0.4s`; follow lerp measured ≈ **0.1/frame** (gap decay ratio
  ≈ 0.55/100ms → settle ≈ 1.1s)
- ULARA: `LERP_K = 0.18` (settle ≈ 0.56s — snappier than measured)
- **Correction**: LERP_K 0.18 → 0.10 (the measured glide), trail threshold
  re-checked against the slower follow (1.5 px/frame stays — the trail is
  ULARA's own signature, retained by design)

### A5 — chrome (re-confirmed)

- Header: height **56px**, hide = `translateY(-101%)` on `.header-inner`
  with `transition: transform 0.4s` — ULARA SheetNav already exact ✓
- Corner plus marks: **10×10px** — ULARA chrome.css already 10×10 ✓
- Border token: `max(1px, .1rem)`, hairline `#B3B3AF` — ULARA uses its own
  rule-strong register (brand law — keep)
- Dropdown plus icon: `rotate-icon 0.8s steps(1)` (**NEW** — noted; ULARA's
  nav uses its own choreography, kept)

### A6 — marquee (**NEW**)

- Reference hero capability ticker: `translateX(0 → -100%)` **linear
  infinite 10s**, 5 duplicated tracks, track ≈ 403px → ≈ 40px/s
- ULARA: `fo-ticker-rtl var(--fo-ticker-lap, 36s)` linear infinite — speed
  depends on ULARA's own track width; **live parity check this round** (the
  lap is re-derived from the measured px/s at 1440, not copied blind)

### A7 — journey pin (re-confirmed + stage map)

- Pin window: section 6300px @900vh = **700dvh**; sticky frame holds
  2360→7758 (the pin releases with the platform section rising beneath —
  the deliberate overlap)
- Stage layers are CUMULATIVE over-slates (walls SVG → furniture →
  dimensions+doors → violations; each fades IN over the previous — never out)
- Sampled boundaries (rel = (y−2360)/6300): ghost phrase 1 ink ≈ 0→0.06,
  fade ≈ 0.10→0.15; phrase 2 ink ≈ 0.20→0.26, fade ≈ 0.33→0.42; walls
  ≈ 0.32→0.45; furniture ≈ 0.42→0.55; dimensions ≈ 0.52→0.60; violations
  ≈ 0.58→0.74; intro card fades in at rel ≈ 0.34, text swaps per station,
  caption `[SCROLL TO CONTINUE]` → `[CLICK ON VIOLATION]`
- ULARA: 540dvh deliberate re-seat (r331/r342 documented — the beat count
  differs); stage map re-checked against ULARA's own beats ✓ (structure
  equivalent, boundaries ride ULARA's own choreography)

### A8 — tokens (dossier only — brand law)

Reference: paper ≈ #F5F5EF (with noise), ink #282828, brand #FA3600,
secondary ink 72%, border #B3B3AF, h1 46.67px/700/−2%, body BT Grotesk +
Geistmono. ULARA keeps its own registers (paper #F6F8FA, ink #262019,
signal #C43E16, Alexandria/Plex/Geistmono) — recorded here as the measured
context, NOT adopted.

## Wave B — the parameter corrections (this round's code)

| # | Seat | Change |
|---|---|---|
| B1 | SheetCursor `LERP_K` | 0.18 → 0.10 (measured glide; trail threshold unchanged) |
| B2 | landing reveal register | landing-scoped 0.8s easeOutQuad on `.reveal-up`/`.reveal-card` (DS token untouched; RM belt intact) |
| B3 | marquee lap | live px/s parity check at 1440; re-derive `--fo-ticker-lap` only if the measured drift is > ±25% |
| B4 | image reveal rung | landing-scoped 1.6s expo for the drawn-frame art reveals (the `.reveal-card` family already carries scale; duration re-seated) |

Every change keeps: RM belts, the JS-off arm order, the motion-gate §5
property law, the a11y floors.

## Wave C — the comprehensive polish

- Live side-by-side QA at the 9 matched scroll seats (reference vs local vs
  production), spacing/scale/alignment fixes only where a measured imbalance
  shows
- Full gate set (`verify.sh`) green before push; size ceiling 770 unchanged
- Services: mail transport health re-read (Resend env is Vercel-side; the
  code path + honest residuals stay), DB health probe (read-only)

## Wave D — evidence + the honest residuals

- Captures of the corrected rounds land in `docs/redesign/r345/`
- The dossier above IS the evidence (every number measured this round)
- Residuals carried from r344 (owner-side actions): mail domain verification,
  WebKit/DB CI-only lanes
