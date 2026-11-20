# R345 — HANDOFF (the wave log)

## The round in one paragraph

The owner's deepening mandate after r344: enter the NEXT deeper and more
comprehensive phase — cleanup, comprehensive development and upgrade,
appearance improvement, and FULL matching of the retired reference with
focus on the FINEST details. The round re-measured the reference LIVE
(1440×900, trusted input + rAF sampling + a full scroll-state capture
ladder), built the parameter-level dossier (docs/redesign/r345/PLAN.md
Wave A), found the r344 pattern-parity already held at the PATTERN level,
and closed the three genuinely drifted parameters plus TWO live visual
defects the fresh captures exposed. Services re-verified healthy in
production (db ok, mail resend lit, build = main HEAD). The repository
stays main-only (r344's sweep held — zero branches besides `main`, all
16 PRs closed/merged).

## Wave A — the fresh measurement (all live, not carried)

| Parameter | Measured (fresh, this round) | ULARA seat |
|---|---|---|
| glide model | wheel 900px → settle ≈ 1.1–1.2s, constant-ratio decay 0.90/frame → lerp 0.1 | exact ✓ |
| ScrollTrigger conventions | 41 triggers; wrap `clamp(top bottom+=50%)→bottom top-=50%`; content `top+=40/45/55/65% bottom`; statement `center bottom+=10% → center top+=40%` | statement window exact ✓ |
| tween register | **NEW**: canonical reveal 0.8s power2.out (40/60); images 1.6s expo.out (6/60); heavy 1.0s power3 (7/60) | drifted → fixed (B1) |
| cursor follow | **NEW**: dot gap decays ≈0.55/100ms → lerp ≈ 0.1/frame (settle ≈ 1.1s); the r313 0.18 read missed the reference's second smoothing stage (the DOM dot's CSS `transition: 0.4s`) | drifted → fixed (B1) |
| header | 56px; hide `translateY(-101%)` on 0.4s transform | exact ✓ |
| corner plus marks | 10×10px | exact ✓ |
| marquee | `translateX(0→-100%)` linear 10s, track ≈403px → 40.3px/s | ULARA live: 1430px/36s = 39.7px/s — 1.5% drift, parity holds (no change) |
| journey pin | 700dvh; CUMULATIVE over-slate layers (walls→furniture→dimensions→violations); stage boundaries sampled; intro card at rel≈0.34; `[SCROLL TO CONTINUE]`→`[CLICK ON VIOLATION]` | 540dvh deliberate re-seat (documented r331/r342) — structure equivalent ✓ |
| tokens | paper ≈#F5F5EF (noise), ink #282828, brand #FA3600, border #B3B3AF, h1 46.67/700/−2%, BT Grotesk + Geistmono | dossier only — the brand law keeps ULARA's own registers |

## Wave B — the parameter corrections (each its own commit)

| Commit | What |
|---|---|
| `faecb3f` | **B1** — the measured motion register: cursor `LERP_K` 0.18 → **0.10** (the behavioral re-measure; the reference's DOM dot carries a CSS transition on top of its JS lerp — ULARA's canvas dot reproduces the EFFECTIVE glide with the single constant); the landing reveal family re-seats to the census canonical — `.reveal-up` 650ms-expo → **800ms easeOutQuad** (the register `.reveal-rise-h` already carried; duration±150ms is the census match edge and ease-family expo≠quad was a live FAIL), the card rung `--motion-duration-card` 900ms → **1600ms** (the measured 1.6s expo.out restored; the curve already rode --ease-out) |
| `79f2ba3` | **two chrome collisions, live-measured**: (a) the BootLog cell cleared the EdgeTab band — the tab (z 55, opaque paper rail, y368→532 @1440×900) painted over the counter's leading glyph (the «0» of `01/09` clipped); re-seated `calc(50% + 171px)` with the seat math documented at the rule; (b) the hero deco captions returned to the ink voice — the `.hro .hro-deco-text` paper-ink rule assumed ink plates the rebuilt plate no longer has (white-on-paper ≈ 0 contrast, live capture «المُعمل التعليمي» invisible) |
| `bf775be` | **the finale resolve button's clip**: the T-10f two-line stack (margin 1.4rem + 2×1.9rem) exceeded the measured button box (4.33/4.78/4.77rem across the desktop tiers) — line 2's glyphs clipped at the bottom edge at EVERY tier (live: line2 bottom 837 > button 834); margin 0.4rem seats the stack optically centred, hover-swap geometry untouched |

## Wave C — the comprehensive polish + services

- Mobile audit (390×844, 10 seats): hero/statement/pains/journey/product
  all hold; the one apparent collision is the journey's mid-scrub card
  swap in flight (transient, by design).
- The marquee lap parity re-derived live (39.7 vs 40.3 px/s — no change).
- **Services re-verified in production** (`/api/v1/status`, build
  `ba2d3b0` = main HEAD): `db ok (1768ms)`, `storageDriver postgres`,
  **`mailProvider resend`** — the r344 provisioning held. The Resend key
  re-probed: still send-only (`restricted_api_key` on the domains
  endpoint — the expected shape), so the honest residual stands: no
  verified domain → owner-address delivery only; the unlock is an
  owner-dashboard action at resend.com/domains, then flip `MAIL_FROM`.
- Local sandbox seat: `backend/.env` (gitignored) provisioned with the
  owner-provided credentials — DATABASE_URL (the Neon production
  cluster), JWT dev secrets, `MAIL_PROVIDER=resend` + the send-only key
  + `MAIL_FROM=أُلارا <onboarding@resend.dev>` — so the sandbox stack
  runs with the services lit, not stubbed. Env hygiene: secrets exist
  ONLY as environment variables (`.env` is in .gitignore; verified by
  `git status` after the write).

## Wave D — verification

- `bash scripts/verify.sh --fast` — **FAST PASS** (tsc · vitest · bundle
  753.7/770 KB gz · css ratchet · logo · a11y floor) after the motion
  register changes.
- Live browser evidence: the deco captions readable, the BootLog cell
  clear of the tab (blTop 556 ≥ tabBottom 532), the finale button's two
  lines fully inside the box (line2 829 ≤ button 834).
- Full gate set + push: this wave log closes the round (see the round's
  commit ladder).

## Honest residuals (carried)

- Mail domain verification (owner dashboard action) — unchanged from r344.
- WebKit + DB-integration lanes run in CI only (sandbox limits).
- The reference's brand registers stay its own (the law); every motion
  parameter measured this round is recorded in the r345 dossier for the
  next rounds to re-check drift against.
