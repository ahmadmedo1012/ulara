# R352 — TEST-PLAN

## Landed (measured in this branch)

### Unit (36 tests, all green)

| File | Pins |
|---|---|
| `r352-institutional-labels.test.ts` | Total enum-coverage: every value of the 14 pinned contract enums carries a non-empty Arabic label, no invented keys; the statutory wording (Law 21/2023 staff categories, license kinds); the tone vocabulary's fail-safety (unknown/missing → muted, never throw). |
| `r352-institutional-modules.test.ts` | The 13-section registry (routes + capability gates byte-matched to the contract §0 table); the kind rule (research hidden for the two stage-1/2 kinds, 12 sections then, every other section kept); the honest hidden-reason contract. |
| `r352-institutional-api.test.ts` | The wire contract via the transport seam (`api.defaults.adapter`): every family's method+path byte-matched (catalogs, org-units, governance incl. the minutes lifecycle, academic incl. credentials, compliance, operations, research, scoped roles), pagination params, request bodies, `cleanParams`. |
| `r352-institutional-gating.test.tsx` | Permission-sensitive rendering: the create button exists ONLY with the server-granted capability (and `/me/permissions` was actually consulted — never the role label); scope-gating (no institution context → zero doomed calls — **a real bug this test caught and fixed**); the shared 403 permission-denied panel; the kind-aware rail (13 vs 12 links). |

### E2E — hermetic journey (5 tests, green)

`tests/e2e/r352-institutional-workspace.e2e.ts` — the suite's established fixture
(real router/hooks/stores/render tree; only the /api/v1 wire is fixed):

1. The workspace boots: masthead names the institution's own kind; the rail
   carries the full section set.
2. The org tree renders the real hierarchy; the write affordance appears with
   the capability; unit selection → the detail with its ancestors path.
3. The capability-LESS session reads the same surface with zero write
   affordances (deny path renders, no redirect).
4. Governance depth: councils → council (memberships) → meeting (agenda,
   resolutions, minutes draft).
5. A server 403 on the profile surfaces the honest permission panel.

Fixtures mirror the contract's envelopes exactly (paged bodies raw — `meta` as a
sibling of `data`; the r178 `/auth/me` context fields; the `ula-auth` v1 shape).

### Visual capture (dev instrument, 8 suites green)

`tests/e2e/r352-visual-capture.e2e.ts` — 104 screenshots at 1440/820/390/360 ×
light/dark across all 13 sections, **plus the no-horizontal-overflow assertion
(scrollWidth − clientWidth ≤ 0) on every section at 360 and 390** (all green).
Archived under `screenshots/`.

### Existing suites (regression)

- Full vitest: **3060 passed / 0 failed** (was 3024 pre-PR + 36 new).
- `nav-routes-consistency`, `App-routes`, `route-titles-coverage`: green with
  the new seats/entries/titles.
- `r319-shell-chrome` (10 tests): green — the shared shell is untouched.

## Not executable in this sandbox (recorded residuals)

1. **Pixel-level screenshot verification of the authenticated shell** — a
   measured fleet limitation: the repo's OWN admin dashboard paints blank in
   headless captures here (both the headless-shell and the full chromium 1200
   binary under the 1223 protocol), while the landing paints and every DOM/
   geometry assertion passes. Full investigation trail in LOG.md. Verification
   therefore rests on the DOM/visibility/geometry assertions above; the
   screenshots are archived for review on a machine where the authed shell
   rasterizes.
2. **Full `scripts/verify.sh`** — lead-controlled by AGENTS.md while other
   agents share the fleet; individual gates mirrored instead (all green except
   the bundle ceiling — LOG.md).
3. **axe-core scans + NVDA/VoiceOver manual pass** — ACCESSIBILITY-PLAN residuals.

## Deliberately NOT weakened

No existing assertion, baseline, or ceiling was touched. The bundle ceiling file
(`scripts/check-bundle-size.mjs`) is untouched — the measured overage is
documented for the lead (LOG.md §bundle), not gate-hacked.
