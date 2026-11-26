# r366 delivery ledger

Round: the two apps reach world class — screens, shapes, bars, loading,
sound, clarity, type, everything, on Android and iOS, every role and every
shared screen, driven by the fidelity loop (capture rigs first, side-by-side
sheets + written critiques until nearly indistinguishable from the
best-in-class bar and the web's visual language).

- **P0 baseline.** Branch `r366/app-world-class` from `origin/main`
  `d333d1a`; draft PR opened with the DO NOT MERGE notice as its first
  lines; pushes batched, never to `main`, never forced. Installs: root
  (`backend`+`frontend`) and `apps/mobile` (standalone lockfile).
- **Environment facts for this round.** This sandbox has no Android SDK, no
  KVM, no macOS — every emulator/simulator job runs as a dispatched GitHub
  Actions workflow and is polled, never awaited in the foreground. No `gh`
  CLI here: GitHub work goes through the REST API with the token (env-only,
  never in a tracked file). One sandbox quirk matters for the tree: the
  filesystem mishandles files whose names contain `[...]` route brackets —
  the meeting-detail rename below is therefore performed at the REMOTE side
  through the Git Data API (the D14 path), not by a local `git mv`.
- **P0 recon.** The full route inventory walked into
  [screen-map.md](screen-map.md): 133 route files, 13 layouts, five role tab
  shells over one config (`roleTabs.ts`), guards only in section layouts
  (`RoleGate`), deep links `ulara://` custom-scheme only, no tablet two-pane
  anywhere, loading/empty/error furniture already real
  (`states.tsx`/`boot.tsx`/`motion/Skeleton.tsx`), fonts already the web's
  three families with the splash held until hydration. CI recipes read
  end-to-end (`android-apk.yml`, `mobile.yml` lanes A–D, `build-ios-sidestore.yml`,
  `mobile-builds-ledger.yml`): the repo's ONE Android recipe is
  `scripts/build-android-local.sh` (prebuild → key.properties →
  assembleRelease), iOS is the unsigned SideStore lane on macos-26, the
  seeded demo backend is `tools/boot-pg.sh` + migrate + seed +
  `ULARA_TEST_ACCOUNTS=1` on :4000, and the Maestro journeys
  (`shots-onboarding`, `shots-role`, `shots-size`, `smoke-role`) already
  exist.
- **P0 found defect — the meetings detail route was a dead end.**
  `app/institution/councils/[id]/meetings/eetingId].tsx` reached `main` with
  its `[m` lost, so expo-router registered a static garbage route and every
  meeting-detail push from `councils/[id].tsx` landed on `+not-found`. The
  rename to `[meetingId].tsx` lands on this branch (via the Git Data API —
  environment note above). No code change needed inside the file.
- **P0 rule change (one line of reason): the portrait lock retires.**
  `app.config.ts` `orientation: "portrait"` → `"default"`. The prime
  directive names the lock as a rule standing between the app and
  world-class (landscape + tablets); the capture rig's landscape/tablet legs
  are the proof burden this change carries. Two-pane tablet layouts remain
  to be composed in P5 — until then tablets render the single-column
  layouts, now with correct rotation.
- **P0 the fidelity-loop rigs (dispatchable, pollable).**
  [mobile-capture-r366.yml](../../../.github/workflows/mobile-capture-r366.yml):
  `build-apk` (the one recipe, throwaway keystore, embedded-API base URL
  baked) → `android-capture` (KVM emulator matrix, each leg with its own
  seeded backend on :4000, Maestro journeys + deep-link route sweeps ×
  light/dark × font 1.0/2.0 × portrait/landscape, cold/warm start timings,
  a scroll recording, logcat crash gate, evidence artifacts per device) →
  `ios-capture` (macos-26 Debug SIMULATOR build, unsigned; iPhone SE-class
  light/dark/accessibility-XXXL passes, Pro Max-class, iPad; best-effort
  student journey against the live API). Drivers:
  `apps/mobile/scripts/capture/{capture-device,capture-combo,capture-deeplinks,capture-ios}.sh`
  + the route lists `routes-{PUBLIC,STUDENT,TEACHER,ADMIN,QUALITY,OWNER}.txt`.
  Capture-only: no lane contract moves; the four owned workflows keep their
  exact behaviour. Dispatch note: `workflow_dispatch` needs the file on the
  default branch, so on this branch the rig rides scoped pushes (the rig's
  own paths); on `main` after the merge it is dispatchable directly.
- **The sweep's deferred set (needs seeded ids wired):** detail routes with
  params render via their list screens only — wiring the seed's real ids
  into `routes-*.txt` (offerings, lectures, exam templates, competitions,
  tracks, institution records) is the first P1 item after evidence lands.

NEXT: poll the dispatched capture runs; download the per-device artifacts;
build the side-by-side sheets (ULARA vs the reference's phone compositions)
in `docs/redesign/r366/evidence/`; write the ruthless per-screen critiques
(spacing, type, Arabic alignment/bidi, hairlines, bar heights, density,
motion timing, states); fix every point and re-capture — then P1 typography
audit (per-script leading, hard-coded `Text` sizes sweep) with the evidence
in hand.
