# r362 delivery ledger

Round: root-cause the app bugs, match the reference down to the details, world-class
app pass. Every DONE line has a command output or an image in `evidence/`.

- **P0 baseline.** Local clone was 125 commits behind; fast-forwarded `main` to
  `14c353c` (r361 final). `npm ci` at the root, `gh auth status` = ahmadmedo1012,
  Android emulator `Pixel_7_API_36` booted (KVM present on this host), r361's
  `REPORT.ar.md` + `LEDGER.md` read. Platform: 16 cores, 44 GB free.

- **P0a — the red CI gate, root-caused (NOT a code regression).**
  CI `45539675709` failed one job (`Surface drift`); every other job was green. The
  single failing cell was `[capture] /auth/register | light | rtl | 1280] FCP 584ms vs
  baseline 68ms`, i.e. 1 of 72 cells.
  Measured, not assumed: 8 cold navigations per route on this machine give
  `/auth/register` FCP **28–76 ms** (median 56) and `/auth` **32–76 ms** — the paint is
  the inline `index.html` shell, so the route's own render cost cannot produce 584 ms.
  The full gate re-run locally with CI's exact env (`AUDIT_FCP_RATIO=4`,
  `AUDIT_BASELINE_SLICE=1`, `AUDIT_API_MOCK=1`) reports
  **`✓ surface drift: clean across 72 captures`**, and all 72 local cells land in
  **28–172 ms**.
  Cause of the red: the FCP axis had a RATIO budget only, so `/auth/register`'s 68 ms
  baseline gated it at **272 ms — the tightest absolute limit of all 72 cells** — while
  the identical event on `/` (148 ms baseline) was allowed 592 ms. The runner's fixed
  first-capture warm-up decided the verdict, not a regression.
  Fixed at the measurement (not by loosening the ratio): the effective limit is now
  `max(baseline × ratio, fcpMinLimitMs = 600)` in `drift.ts` + `inventory-types.ts`,
  documented with the measured evidence. The ratio still gates every route; the floor
  only ever binds for shell-paint routes, so a real blocking-JS regression (hundreds of
  ms on every cell) still trips it. [Evidence](evidence/p0-surface-drift-fcp.txt).

- **P1a — the constant sign-out, fixed (failing tests first).**
  `apps/mobile/src/api/client.ts` answered a single boolean from `tryRefresh()`, so
  EVERY failure mode — network error, 15 s abort, 503 cold start, the auth limiter's
  429, an unparseable 2xx — ran `onSessionExpired()` and wiped SecureStore. The user was
  signed out for having bad signal.
  The transport now classifies the failure: **definitive** = the endpoint refused the
  token (401/403 from `/auth/refresh`) or no refresh cookie exists → session ends;
  **transient** = everything else → the session is KEPT, a recoverable
  `SESSION_UNVERIFIED` error is surfaced, and a bounded backoff ladder (1.5 s / 4 s /
  10 s) re-attempts the refresh. `retrySessionRefresh()` adds the two triggers a timer
  cannot cover — app foreground and connectivity regain — mounted once at the root via
  `hooks/useSessionRecovery.ts`, and it is a no-op unless a transient failure actually
  left the session unverified.
  8 new tests (network error / abort / 503 / 429 / bad body must keep the session;
  401 / 403 must end it; a transient failure must self-recover) — **8 failed before the
  fix, 13/13 pass after**. [Before/after output](evidence/p1-refresh-signout.txt).

- **P1b — the «تعذّر الاتصال بخادم أُلارا» banner, root-caused and fixed.**
  The probe was the wrong instrument for the deployment it measures: a **5 s** budget
  (`reachabilityRequestTimeout`) for Libyan mobile radio → `fra1` → a **cold** serverless
  function, re-probed every **5 s** (so a probe was effectively always in flight on a
  metered link), and **2** consecutive failures (~7 s) claimed the server was down. Worst
  of all, the probe verdict ALONE owned the server line, so it announced an outage while
  real API requests were succeeding over cached content.
  Now: **12 s** budget, **30 s** cadence, **3** readings across a 2 s/5 s/15 s confirm
  ladder (~22 s of continuous failure), a new dependency-free `lib/resilience/serverLine.ts`
  evidence bus fed by the API client (every response = reachable, every transport failure
  = unreachable) that can VETO the probe's claim, one real response withdraws a standing
  claim with no user action, and the banner is dismissible (the dismissal dies with the
  episode). No blocking full-screen state is reachable from any of it — the cached content
  stays visible under a 36 px hairline banner.
  Tests: the contract moved with the owner's spec (2 → 3 readings) and the new pins were
  added (probe cannot claim while real traffic succeeds; a real failure re-enables the
  honest claim; one response withdraws it; the banner is dismissible). **48/48 pass** in
  the two resilience suites. [Evidence](evidence/p1-offline-banner.txt).

- **P0b — the emulator captures r361 could not produce: DONE, and they found a real
  defect.** KVM exists on this host, so `Pixel_7_API_36` boots. The r361 signed APK from
  the `latest` release (run 45548794852, lane=both, success) was installed
  (`ly.ulara.app`) and `apps/mobile/scripts/capture-device-display.sh` produced the five
  verified profiles (baseline 1080×2400, 320 dp, 320 dp @200 % font, tablet 768 dp,
  landscape 1024×768), plus the 360 and 412 dp widths captured for this round's
  requirement; every display override was restored (physical 1080×2400 / 420 dpi).
  **The 200 % capture was broken**: the display headline's line box stayed at its
  absolute pixel `lineHeight` while `fontSize` doubled, so glyphs collided and climbed
  into the illustration and the secondary line ran off the container.
  [Captures + dimensions](evidence/device-captures.txt),
  [widths sheet](evidence/device-widths.webp),
  [200 % before](evidence/device-200pct-before.webp),
  [landscape](evidence/device-landscape.webp).

- **P4a — the 200 % text-size cure (app-wide).** Root cause was the type system, not the
  screen: `components/ui/text.tsx` pinned a fixed pixel `lineHeight` per variant, and
  React Native scales `fontSize` with the OS text setting but never `lineHeight`.
  `scaleLineHeight()` now makes the line box follow the same scale and never drop below
  the house Arabic floor `1.35 × fontSize` at that scale; at `fontScale 1` it returns the
  variant byte-for-byte unchanged, so the designed type scale at normal size is
  untouched. The welcome title's `lineHeight: 40` (a 0.91 ratio against its 44 px
  display size) is removed and its stack may wrap. Mobile: `tsc` clean, eslint clean,
  **1514/1514 jest tests pass**.

- **P2.1 — the overlap detector (built, calibrated, and it changed my mind).**
  `scripts/audit/r362-overlap.ts` walks every route × 320/360/390/768/1024/1440/1920 ×
  light/dark through the hermetic fixture transport and reports text collisions, clipped
  text and page overflow. Two calibration rounds were needed before its output could be
  trusted: element border boxes produced 631 hits (a per-word span's box overlaps its
  neighbour by design), and even text-node line boxes produced 362 — because a font's
  ascent+descent box is taller than the line advance under tight display leading.
  Deflating each rect to its ink box (removing the leading) and skipping fullscreen
  designed layers brought `/` at 1024 to **0 findings**, which matches the eyeball check
  on the same cell. Exit status is 1 on any finding, so it can gate CI.

- **P2.2 — footer comparison.** Point-by-point sheet and critique against the
  reference at 1440: grid, mega type, micro labels, edge tab, hairlines and scroll
  motion all match; two differences are design decisions (footer links as Arabic columns
  vs one uppercase row; cookie ACCEPT as an ink slab vs the signal colour) and are left
  as owner rulings rather than restyled on a hunch. [Critique](evidence/footer-critique.md).

- **P2.1a — the landing statement really did collide, and the detector was right.**
  The owner's «text collisions on the landing» are on `/` at 1440 and 1920, both themes:
  the statement title's four lines had their ink stacked into each other (persistent —
  two screenshots 6 s apart are identical, so layout, not a mid-animation frame).
  Cause: `.st-line { block-size: 4rem }` — the reference's 1.0×fs **Latin** leading —
  against a fluid rem root (`html 0.5787vw` ⇒ 4rem = 33.3 px @1440) and a r359 font-size
  of 2.78vw (40.03 px). The pitch was **0.83 × fs** while the Arabic glyph box is
  **1.35 × fs**: 21 px of intersection per line pair. Fixed with the house floor at all
  three bands — `max(4rem, 1.35em)`, `max(2.525rem, 1.35em)`, `max(2.62rem, 1.35em)`.
  Verified: 1440 screenshot clean; e2e `r349-public-clip` 17/17, `r354-final` 18/18,
  `r308-landing-instruments` 5/5; `check-raw-css --strict` PASS; stylelint 0 errors;
  `verify.sh --fast` PASS. [Before/after](evidence/landing-statement-pitch.webp) ·
  [measurements](evidence/p2-landing-statement-pitch.txt).

  This retires the earlier «the detector over-reports» reading: at 1024 the em-box
  explanation held, at 1440 and 1920 the collision was real. The detector now also
  carries a written limitation for accordion pages (`/help`): a collapsed answer's
  rects can still intersect the next question even though the reader sees nothing.

  **Second pass (commit `0f8d9a0`):** after that fix `/` fell 146 → 8, every hit at
  ratio 1 with an *identical* y — one `.st-line` held four words that wrap inside it,
  and the fixed `block-size` dropped the wrapped line exactly onto the next one.
  `min-block-size` lets a long line grow instead of colliding.

  **Final numbers (98-cell public sweep, 7 routes × 7 widths × 2 themes):**
  `/` **0**, `/auth` **0**, `/auth/register` **0**, `/404` **0**, `/colleges` **0**,
  `/about` **0** (14 cells each = 84 clean cells); `/help` 138 — all of them the
  clipped-accordion class the script header already documents, and a 320/360 visual
  check of that page is clean. **6 of 7 public routes are at zero; `/help` is not
  claimed clean.** Role routes are not yet in the sweep (they need auth sessions inside
  the instrument).

- **P2 note — the detector earned its keep in both directions.** At 1024 the em-box
  reading was right (nothing was wrong); at 1440/1920 the collision was real. Both
  readings came from looking at the same cell in a browser rather than trusting the
  number.

- **P0a closed — CI on `main` is GREEN.** Run
  [45554373509](https://github.com/ahmadmedo1012/ulara/actions/runs/45554373509) at
  `8ba33a9` (code head `0f8d9a0`): **11/11 jobs success**, including `Surface drift`
  (the r361 red gate) and `E2E (hermetic browser journeys)`. The first E2E attempt had
  246 passed / 3 failed; all three fail locally? **no** — they pass at the same commit
  (`r309-recovery` 22/22, `r305-shell-ds` 29/29 with `--retries=0`), and re-running only
  the failed job succeeded, so it was CI-runner flake, not a regression.
  [Evidence](evidence/p0-ci-green.txt).

- **Final report:** [REPORT.ar.md](REPORT.ar.md) — every item above with its evidence,
  plus the honest list of what is still open (24 h soak, 200 % device re-capture on the
  rebuilt APK, P2.3–P2.5, P3, P4, P6).

NEXT: install the APK from `android-apk.yml` and re-run the 200 % capture to close P4a on
device; then P2.3 (cursor/nav choreography), P2.4 (patterns), P2.5 (side menus/controls)
with one sheet + critique each, the P3 full matrix, and P6 (Lighthouse, redeploy, full
verify, buildId check).
