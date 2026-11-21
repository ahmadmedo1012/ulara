# r351 — A1 PUBLIC EXPERIENCE — HANDOFF

Branch `r351/public-experience` (base `main`@`35793f7`). PLAN + GAP + LOG in this folder.

## What shipped (per work package)

- **P0** — `GAP.md`: the measured gap matrix (landing 14,637px/1440 vs ref 13,255;
  12,457px/390 vs ref 10,613; 1,038 rendered words) + the ranked per-section gaps.
- **P1** — the hero is the signature moment: giant leading H1 (95px @1440, masked
  line reveal), ONE lead sentence, ONE roll+fill CTA, the stage decluttered
  (zone labels / corner coords / scale bar retire from the hero seat — they keep
  their seat on the journey plate; deco cards + the hero login secondary retired;
  login lives in the masthead + mobile menu).
- **P2** — the preloader rides the measured counter curve (fast→45/slow→60/fast→92,
  compressed into the honest window — the ≥2000ms floor law and the r309 belt
  untouched), X:/Y: px readout, survey ruler + plus marks (phone sheet keeps none),
  a 10-row progress-locked boot ledger.
- **P3** — the reference's band economy: statement 723 (=ref), pains 743 (=ref),
  product 712 (≈710), roles 886 (≤987), cta 768 (≈698 — the sketch band retired at
  every width), footer 840 (was 1,596). Landing **12,737px real / 12,853 fresh ≤
  13,255 ✓ @1440**; @390 **11,882 real** (target 10,613 — the delta = the consent
  tail band + the pinned legal rows + the honesty prose; per-section accounting in
  LOG row 4). `contain-intrinsic-size` re-pinned (wy 2488→1317, cta 1164→768).
- **P4** — statement courtyard rides the shared displacement-ink filter (B0 §5
  constants verbatim, static); footer wordmark pointer-lens (OUR OWN radial-mask
  design — the reference's was never extracted); route transition = the measured
  clip-path open leg (0.7s power2.out) on the keyed remount; SheetCursor's velocity
  trail already shipped (verified).
- **P5** — `tests/e2e/r351-public-audit.e2e.ts`: no text-on-text, no clipped
  captions, zero horizontal overflow at 1440/1024/768/390/360 (perceived-text
  filters for parked decks + masked lines). Long-task census: 1440 → 0; 390@1× → 0;
  390@4× → 12 tasks 52–65ms (= 13–16ms @1×, inside the frame budget; profile in
  LOG row 6).
- **P6** — landing 1,038→793 rendered words (−23.6%); the scrub manifesto is one
  4-line sentence; FAQ 5→3; panel one-liners; registry cloud = the three real
  faculties. Public pages: /app 224, /capabilities 247, /contact 161. The −50%
  target on the pinned sheets is floor-bound (see LOG row 7): the nine-FAQ register
  (R320 §D), the tenant/demo-data disclosures (r168b/r306), the legal policy text.
- **P7/P8** — tap seats ≥44px everywhere on the landing (footer doors, contact
  biglink, back-to-top, consent pair + learn-more); zero overflow at
  360/375/390/430/768; reduced-motion = the complete static sheet.

## REQUESTS TO OTHER SLICES

- **A2 (authenticated)**: the route transition's CLOSE leg (0.6s power2.in,
  `clip-path: inset(0→50%)`) has its CSS seat ready —
  `.page-transition.is-route-leaving .page-transition-inner` (styles/motion.css).
  Flip the class on your pending-navigation state and swap after ~0.6s; the open
  leg already plays on the keyed remount. `PageTransition`'s API is untouched.
- **A2**: `components/motion/**` + `lib/motion/**` exported APIs unchanged
  (additive-only honored — zero edits to those files this round except motion.css
  additions; `Skeleton.tsx` never touched).
- **4th agent (merge)**: zero-trace exits 1 on the BASE commit too (identical
  output on `main`: pre-existing traces in `CHANGELOG.md`, `docs/redesign/r350/`
  + two git-history rows — the documented red r350 shipped with). A1 adds zero
  new traces; every push re-ran the gate against the base state.

## Test deltas (intended-behavior changes, all logged in LOG.md)

- `r349-public-clip`: the leader-label pins re-target the journey seat (the hero
  decluttered — labels live on the journey plate only).
- `landing-funnel` + `r307-landing-media`: login surfaces 6→5 (the hero login
  secondary retired to the masthead).
- `r308-landing-instruments`: the journey close-copy pin reads the dieted line
  (the honesty claim kept verbatim).
- `r168b` + `r306`: UNCHANGED — the pinned honesty wording was restored verbatim
  after the copy cut tripped them (the assistant's local-completion line, the
  registry's «لا جامعة ولا انتماء», the LIVE_COUNT honest numbers).

## NOT MEASURED / hard reasons

- The reference's footer pointer-lens: NOT EXTRACTED in the B0 data — our lens is
  our own design (logged in LOG row 5), not a reproduction claim.
- 390 height target (10,613): 11,882 measured — the floor analysis in LOG row 4
  (consent band in flow + pinned legal rows + honesty prose). Every UNPINNED band
  matches or undercuts the reference (hero/pains exact, statement/chapters/cta under).
- Word −50% on the pinned sheets: floor analysis in LOG row 7.
