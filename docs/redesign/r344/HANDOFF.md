# R344 — HANDOFF (the wave log)

## The round in one paragraph

The owner's super-development mandate: match the retired reference in its fine
details, fix the services, sweep the repository to `main`-only, commit as we go.
The fresh reference measurement (browser + bundle deobfuscation, 1440×900, 16
captures) produced a 20-pattern gap matrix against the r342 homepage: **19 of
20 patterns already carried a measured, brand-native equivalent** (the sticky
journey pin, the CSS-var page reveal, line-mask reveals, the drafting geometry,
dashed hairlines, the direction-aware header, the canvas cursor, the counter
preloader, Lenis-on-one-clock…). The single absent signature — **the
pixel-dissolve CTA fill** — was built, measured, broken, diagnosed, and fixed
inside this round. In parallel: the production smoke was fixed with the REAL
student journey (the t14 fail-closed 403 is the designed shape), the mail
transport was lit via Resend on Vercel with the honest domain residual
recorded, and the CI lanes that caught the round's own mistakes were paid in
full.

## Wave A — the pixel-dissolve signature

| Commit | What |
|---|---|
| 82392bf | the r344 plan (the gap matrix, the waves, the sweep contract) |
| 498d859 | the sprite (scripts/art/pixel-mask.mjs, seed 344, 20 slices × 10×10 @ 4px, slice0 empty → slice19 full), the `--ease-pixel: steps(19, end)` rung in tokens.css, the `.btn--pixel` seat + the finale/nav/mobile arms, the 9-test pin |
| 850cf10 | **the letterbox fix** — the dev-build capture showed the dissolve dead: without `preserveAspectRatio="none"` the 20:1 sprite letterboxes inside the 2000%-scaled mask box and the position-100% window lands on empty padding (isolated by canvas band-sampling + clean-element probes: 2× mask-size works, 20× fails, 50% position works, 94%/100% land on padding). The sprite carries the attribute now; the seats pin `mask-mode: alpha` + `will-change`. The finale was re-seated onto THREE scoped layers (rbtn transparent over an isolated ::before rest slab; the ink dissolve as rbtn::after; label+icons lifted z:1) because the rbtn is the PERMANENT slab — masking it hid the button entirely. |
| c1ae1d0 | **the CI lessons**: the r309 loader clock stamps on the first rAF (doneAt ≥ floor by construction — the mount→effect skew is closed structurally, no test touched); the mask grammar deduplicated into patterns.css as the 8th canonical pattern (jscpd 260→259, re-pinned); the plan doc scrubbed of the retired reference's name (zero-trace PASS). |

Verification trail (all measured):
- Dev build (vite :5304, real browser): the finale dissolves in dithered ink
  patches mid-flight and seats the recorded ink slab at hover end; the nav cell
  walks to the seated slab on keyboard focus; rest = slice 0 (invisible fill).
- `bash scripts/verify.sh` FULL: ALL GREEN (tsc · vitest 2843/225 files ·
  bundle 753.6/770 · css ratchet · logo · a11y 0-over-floor · 7 design gates ·
  lint · e2e 29/29) — with the one r309 loader-timing flake passing 3/3 on
  re-run before the structural clock fix landed.
- stylelint ratchet: errors 39 ≤ 45 held, rawZIndex ratcheted DOWN 79→78.
- deadcode: knip at baseline, jscpd improved 260→259 (re-pinned same commit).
- zero-trace: PASS (after the plan-doc scrub).

## Wave B — the services honesty

- **The smoke false alarm**: `4576b68` production was GREEN; all 12 logins
  passed; `GET /me/dashboard → 403 INSTITUTION_CONTEXT_REQUIRED` — the t14
  fail-closed context guard working as designed (contextless multi-membership
  login → the UI's chooser). The 1.0-era step predated the contract; issues
  #5/#6/#11 false-alarmed. The smoke now walks the REAL journey (verified
  live against production before writing): contextless 403 + exact code
  asserted → first ACTIVE membership from the login payload →
  `select-institution` → `/me/dashboard` 200.
- **Resend lit**: `MAIL_PROVIDER=resend` + `MAIL_API_KEY` + `MAIL_FROM=«أُلارا
  <onboarding@resend.dev>»` + `APP_ORIGIN` provisioned encrypted on Vercel
  (production + preview). A live send ACCEPTED by the restricted key (message
  id returned). The honest residual recorded in `docs/deployment.md §3.1`: no
  verified domain yet — `onboarding@resend.dev` delivers to the owner address
  only; every other recipient is a provider 403 the transport handles without
  leaking; the unlock is an owner-dashboard action (verify a domain) then flip
  `MAIL_FROM`.
- **The database truth**: the provided Neon string probed (102 tables, the
  granular lineage ledger, 46 users) — it IS the production DB Vercel already
  targets. No change; health verified.

## Wave C — after the merge (this round's closing sweep)

- `main` becomes the ONE branch: delete `feat/home-art-direction`,
  `feat/home-editorial-scenes`, `feat/home-scroll-choreography`,
  `feat/landing-motion-core`, `feat/landing-story-scenes`,
  `wip/homepage-final` (and this round's head after the merge). The owner's
  ruling supersedes the r342 "branches retained" note — git history keeps
  everything.
- Issues #5/#6/#11 close with the green smoke run.
- Production browser verification of the deployed signature.

## Honest limits

- The capture browser used for the visual verification emulates a coarse
  pointer (`(hover: none)`), so the pointer-gated arms were verified via the
  ungated keyboard-focus path + the ungated finale arm; the pointer arms ride
  the same mask mechanics and stay CI/browser-verifiable on real-pointer runs.
- Mail remains domain-blocked for non-owner recipients until the owner
  verifies a domain at resend.com (dashboard-only action with the current
  send-only key).
- WebKit + DB-integration lanes run in CI only (sandbox limits, unchanged).
