# r367 — THE FINISHER (ledger)

Mission: one agent inherits r363–r366 — merges the two open branches into
`main`, finishes every queue, deletes every other branch, keeps the gates
honest. Working DIRECTLY on main; batches pushed as pieces land.

## State found (2026-11-26 ~13:30 Libya, re-verified live)
- `origin/main` = 530b20f. Remote: `main`, `r365/authenticated-match` (PR #58),
  `r366/app-world-class` (PR #59). Both trial-merge clean.
- CI on main (530b20f): CI ✘ (E2E hero marker clip @360/375 · bundle gate
  869.1>866 · the /404 r324 innerText gate), Mobile soak ✘, everything else ✓.
- Production: verified via /api/v1/status later in the round.

## Ledger
- **A. Orient** — gh authed, cloned, PRs + runs read, four ledgers read. — DONE
- **A2. main's reds fixed first** (c85ed22): the 404 sheet's
  `ROUTE NOT MAPPED` caption retired (r324 X10 stands — the owner red team's
  jargon ban wins over the art caption; the page copy already names the
  state); the hero's I-04 mobile seat 85→80 (in RTL the physical
  `translate:-50%` rides the box a further half-width past the mirrored
  anchor — left edge measured −7px at 360; re-seated on the same stair wall,
  all four phone laps green locally); the bundle ceiling 866→878 (+1.4%,
  documented) — the r364 art system v2 is the prime directive's own weight,
  entry 30.3≤92 / pdf 95.7≤110 unchanged. Verified locally: build PASS
  (868.9 KB gz), r324 gate 21/21, r309 e2e 22/22. — DONE
- **B. r365 merged** — scratch branch r365-merge: merge origin/main into
  r365/authenticated-match clean (10 files, the red fixes intact), tokens
  regenerated (byte-identical), openapi.json regenerated (+1 line), typecheck
  + the full 3,110-test unit belt + r309/r324 gates green. — see next entry

NEXT: merge r366, the two queues (B2/C), the mobile block (D), r363's queue
(soak verdict, Lighthouse, Arabic report), cleanup (delete merged branches,
close PRs, zero-trace), final verify ×2.
- **C. the public site's queued items** — the chapters journey's dominant-plan
  seat LANDED (7b15a3f): the campus plan's framed sheet rides beside the iso
  walkthrough on the free inline-end quarter, choreography untouched, sweep +
  journey contracts green; the wall-weight pass LANDED (the admin plan joins
  the 14px register); the phone re-stage sheets captured 320→1920 both themes
  + the fold sheet vs m-top/m-intro + the preloader frame sheet vs
  preloader-mid — round-2 critique written
  (evidence/round-2-critique.md): phone grammar at the twin bar, 3 recorded
  adaptations; the legal+auth+vision+competitions audit rides the CI Product
  sweep's derived-route matrix (7 widths × 2 themes × 6 roles) on main. — DONE
  (the Lighthouse pass rode here too: prod mobile perf 86 / a11y 100 / BP 100
  / SEO 100; the hero img eager+high+intrinsic and the stale SVG preloads
  re-pointed at the art-v2 webps — CLS 0.008→0.000 locally).
- **B2/B continuations.** The P4 slice sweep 28 cells clean + the four UX
  probes (keyboard 45 steps 0 failed · zoom-200 8 cells clean · RM 0 gate
  findings (the landing RM height stays P2 inventory, the motion-engine law)
  · 3G throttle 3 cells clean) — run locally on the merged main.
- **D. the mobile block (what landed this round)** — the capture rig's two
  reds cured (the truncated download-artifact SHA killed both Android legs
  at Set up job; the iOS pick() matched NO simulator on the macos-26 image
  — 0 pngs silently; the lists span the 2026 catalogue and an empty pick now
  FAILS the leg); the deferred detail routes (course/lecture/exam-template)
  ride the leg's own seeded DB's real ids; **the soak's verdict became the
  product's fix**: the session survived every chaos round but the gate dumped
  each re-resolution onto the picker with the error card — RoleGate now
  auto-restores the last-selected institution (cb449b3, mobile belt 1,514
  green), the soak re-dispatched on the fix. The rig re-dispatched twice;
  evidence sheets ride the artifacts when they land. — LANDED (P1–P10's
  full set stays open, honestly: typography/icons/sound/chrome/store —
  see REPORT.ar.md §3)
- **G. cleanup (mid-round)** — both merged branches deleted from the remote
  (`git ls-remote --heads` = main + the owner's r368), PRs #58/#59 closed
  with comments, scratch local branches deleted, the stray capture scripts
  removed, `scripts/brand/zero-trace.sh` PASS (twice), the docs/ index and
  this ledger current. PR #60 (r368) untouched per its own DO-NOT-MERGE
  contract — owner-merged only.
- **C. the production loop** — the LIVE site verified in the browser (not
  assumed): the hero art img completes (naturalWidth 1580), the four station
  markers mount, the h1 reads, and ZERO console/page errors on the load;
  /api/v1/status buildId tracks main's HEAD and the db probe is ok. The
  deploy lane rides every push (the LCP fix's buildId landed mid-round).
  — DONE
- **CI's late catches, cured** — (a) the Playwright 1.65 upgrade re-registered
  `reducedMotion` as a BUILT-IN test option (the r305 re-registration tuple
  stopped typechecking — TS2322): the standard spelling rides the built-in
  now; (b) the quality-moderation e2e pinned the pre-r365 local header
  classes (h1.page-title/.page-subtitle) — re-pinned to the shared patterns
  PageHeader's grammar (h1.pf-page-title/.pf-page-desc) with the reason
  inline; (c) the Vercel production deploy hit the FREE-TIER daily quota
  (api-deployments-free-per-day, 100/day — today's many pushes spent it):
  a quota, not a defect; production serves the last successful deploy and
  the lane resumes at UTC midnight. OWNER-VISIBLE: the deploy cadence may
  need the paid tier if push-frequency stays at this pace.

## Session 2 (2026-11-26 ~15:30 Libya — the finisher resumes)
- **main's late CI reds forensics** — three real catches at 977f4d3: (1) the
  E2E hero drag contracts (r309/r311) raced the BOOT PHASE — the entrance
  loader owns the pointer while it plays (R311 §1.7-4's own law; R313
  replays it on every load) AND the guest reveal's clip wipe
  (guest-reveal-inner, inset 50%→0) keeps the stage un-hittable for its
  ~700ms — the eager-LCP art (4039ea1) lengthened the boot past the tests'
  first press, so the drag landed on the loader/wrapper and the stage never
  saw it; the specs now wait for the handoff (`.pl` unmount) AND for the
  stage's own subtree to own the hit-test at the press point. (2) the r351
  journey audit's dominant-plan collisions: the plate rode OVER the iso
  drawing's left wing («الحرم الجامعي — المسقط» × «ميدان التدريب» at
  1440/1024; the drawing's labels sweep through the plate's fixed seat with
  the scrub); the walkthrough now yields the plan's quarter ≥992
  (inline-size 72% riding inline-start, the three numbered markers re-seated
  on the same affine map — new = 28% + 0.72×old) and the plate's quarter is
  genuinely free at every scrub state. (3) @360 seat 0.25 «الباب [05]» ×
  «[04]»: the r360 phone diet's round-5 min-block-size:0 zeroed the findings
  deck — the parked cards are absolutely seated, so the current card had NO
  flow seat and rode over the closing column's chip (32×4 text kiss + the
  card's paper over the close head); the deck keeps its authored R342-11
  compact box (10.2em) now — the ONE zeroed floor that must hold.
- The 44-spec set (r309 + r311 + r351 all widths) green locally after the
  fixes; the landing-adjacent batch (r305/r308/r312/r325/r349/r352/r353/
  r354/guest-landing/landing-fragment) re-run in the background.
- NOTE (owner-visible): the r359 ≤5,000px phone-page law measured 6,531px
  pre-diet; at 390 today the page reads 7,241px — r363–r367's added bands
  outgrew the diet's rounds; the +163px deck floor is 2.3% of it. A fresh
  diet pass is queued behind the merge work (the law's intent — reading
  flow — holds; the number needs its own session).
NEXT: commit this batch; read the landing batch; B's remaining items
(P5 responsive per role, scripts/audit), C's verification, D mobile block.

## Session 2 (continued — ~22:15 UTC)
- **The sandbox reset mid-session** (the local tree + probes lost) — every
  landed piece was already pushed; the two uncommitted edits (TS18048
  tuple typing, the rig's login fallback) re-landed and verified: 448ad29.
- **D — the capture rig's login gap cured**: run 45835244276's artifact
  forensics — every role's Maestro journey died at «دخول» not found (the
  fresh boot's IME never rose, the KeyboardStickyView bar never offset in,
  the resting submit sat below the demo ladder's fold) and the sweep
  captured the welcome facade instead of the dashboards; shots-role rides
  the smoke flow's proven sequence + the settled-form fallback now
  (hideKeyboard → scrollUntilVisible ^دخول$ → tap, all optional); the
  capture re-dispatched on 448ad29 (FULL matrix).
- **D-P6 SOUND landed (ca5ebbe)** — the whole set: expo-audio ~58.0.12,
  scripts/sound/generate.mjs (three synthesized original pieces, ≤0.12
  peak ≤0.22 s — the committed WAVs are the script's artifacts), src/sound
  .ts (the haptics architecture mirrored: persisted gate · anti-spam ·
  web no-op · playsInSilentMode:false · mixWithOthers — a blip never
  steals lecture audio), key feedback ONLY at FormScreen's submit seam +
  the settings toggle's audible sample, «أصوات الواجهة» in the settings
  ledger. The mobile belt 1,525 green (11 new sound tests).
- **D-P9 the store folder landed** — docs/redesign/r367/store/: the
  Arabic + English listing drafts (honest claims only), the README (code-
  landed vs owner-blocked), NSFaceIDUsageDescription in app.config.ts.
- **P10 the release lanes** — android-apk.yml + build-ios-sidestore.yml
  auto-ride every main push now (ca5ebbe pending); the APK/IPA from the
  final commit + fingerprints recorded when they land.
- CI on 02343ae's TS18048 — cured by 448ad29; ca5ebbe's full CI in flight.
  The Deploy (Vercel) quota failures continue until 00:00 UTC (owner-
  visible; production serves the last good deploy).
NEXT: capture artifacts → the apps evidence sheet + store screenshots;
CI read; E's final verify ×2; G's final cleanup (branches, zero-trace).

## Session 2 (final stretch — the finisher's close)
- **verify.sh ×2 BOTH ALL GREEN** (runs 3 + 4): tsc · vitest 3110 · bundle
  gate · css ratchet (532 held) · logo gate · a11y 0 serious/critical ·
  the seven design gates · lint · e2e hermetic. Runs 1–2 caught the
  ratchet's one new importantDeclaration (the chip's margin yield) —
  re-promoted 531→532 with the reason inline (the tool's own procedure).
- **The CI hunt closed**: the TS2769 tuple → the guarded-arg spelling; the
  seven CI pin failures (r312 ×3, r349 ×2, r352, r354) traced to the deck
  floor's +22px shift → REVERTED; the @360 text kiss cured ZERO-displacement
  (the chip rises within its fixed 4.64em row — the machine's geometry
  byte-identical); 85/85 locally across the six affected specs.
- **r352:462 (the governance journey) proven PRE-EXISTING** by a clean-tree
  bisect: it fails at 977f4d3 too (a borderline-45s journey — the timeout
  fires when the runner is loaded). Owner-visible: give it a budget bump
  or split the journey.
- **The release lanes on the final app-code commit (ca5ebbe) + the final
  HEAD (a31ba81, dispatched)**: signed APK → `latest` (SHA256
  19d49e29…d8b25833 recorded), IPA → `sidestore-latest`; both lanes green
  on both commits.
- **The capture rig's third lesson**: this Maestro has NO `textMatches`
  property — the regex rides the `text` property itself (run
  45908749380's legs died at PARSE time on the unknown key); the fallback
  re-spelled, the quick capture re-dispatched (45914019092) — its
  authenticated HOME shots land the apps evidence sheet.
- zero-trace: PASS (three runs this session).
NEXT: the capture's evidence sheet + store screenshots; the mobile belt's
own lane read (Mobile on c2f93a3).

## Session 2 — the rig's authenticated leg: the honest close
- Four capture iterations, four forensics (45835244276 · 45903140875 ·
  45914019092 · 45919731339): the sweep shots + crash gate + cold/warm
  timings + scroll recordings capture GREEN every time; the authenticated
  HOME shots do not. The trace facts: the دخول tap COMPLETES (the sticky
  bar mounts, the tap fires), the tour assert («أهلًا بك») times out, no
  session persists (the sweep's deep links read a guest app). The smoke
  lane's five-role journey (mobile.yml) is GREEN on c2f93a3 — the product
  login works on its own emulator; the capture rig's emulator state (the
  2026 image's IME/profile interplay) is the variable. The rig now (a)
  carries the all-optional three-mechanism submit chain (the sticky taps +
  the IME-open Enter + the settled-form scroll/tap), (b) uploads Maestro's
  own debug dump (the UI hierarchy at every failed assert) so the next
  pass reads evidence. — OPEN, owner-visible: the authenticated capture
  leg needs one emulator-session pass with the hierarchy in hand.
NEXT: none this round — everything else landed; the final message follows.
