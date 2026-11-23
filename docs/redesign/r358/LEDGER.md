# R358 — Visual Match Program Ledger

Mission: sync, clean, then match the reference. Owner verdict driving this round: the current look is still far from the reference — close the gap with measurement, not taste-guessing. This ledger is the plan and the proof trail.

## 0. Instruments on this box (the skills inventory, contract §0.8)

| Instrument | Status | Use |
|---|---|---|
| Node 24 / npm 11 / tsx | present | gates, scripts |
| Playwright + chromium-1200 (shared cache) | present | captures, e2e, replay probes |
| PIL (python3) | present | side-by-side sheets, WebP encode |
| ffmpeg | present | motion frames if needed |
| Vercel MCP (connected) + `/api/v1/status` | present | production verification |
| GitHub REST via curl + PAT (`GIT_ASKPASS`, never in files/URL/commits) | present | PR/branch ops |
| `tools/daemon.js` (double-fork) | present | the ONLY way background jobs survive the tool-shell lifecycle — plain `setsid … &` dies at call end (canary-proven) |
| gh CLI · ImageMagick · Lighthouse binary | ABSENT | curl+PAT · PIL · `npx lighthouse` instead |
| Windows/Git Bash/WSL | ABSENT — this is the Linux fleet box of AGENTS.md §8 | bash; tests with `TZ=UTC` |

## 1. Decisions & disambiguations log (one line each, contract §0.1)

| UTC | Decision / Ambiguity | Resolution |
|---|---|---|
| 11-23 23:0x | Mission preamble says the owner's Windows box; reality is the Linux fleet sandbox | Same fleet that built r355–r357; nothing mission-critical is Windows-only; continue (AGENTS.md §8 conventions). |
| 11-23 23:0x | Background processes die at tool-call end | All long jobs (installs/gates/captures) ride `tools/daemon.js`; canary-verified across calls. |
| 11-23 23:0x | Live reference site + its engine-host answer 404 (temporary demo dark) | Phase A reference numbers extracted deterministically from the r350 corpus (`reference-parse.mjs`) — the sanctioned extraction record; live-engine replay probed and PARKED (see §2 REPLAY-01). |
| 11-23 23:0x | Mission expected `/catalog/regulatory-authorities` + `/catalog/credential-types` fixtures to answer 501 | Stale: both exist (`institutional-fixtures.ts`) and are routed in `mock-transport.ts`; the r358 capture elevates any 501 to a MISSING_FIXTURE P1 (zero-501 assertion). |
| 11-23 23:1x | Dependabot full batch → gate RED (3× r313 Lenis-parity failures from lenis 1.3.27; bundle 859.6/815 with pdfjs-dist 6 pushing the pdf chunk to 131.8/110) | Selective composition: types/node 26 + dotenv 18 + the minor-patch BACKEND/ROOT seats merged; frontend dep seats stay at main's exact versions (the 815 ceiling law — measured 818.2 gz with the batch's frontend bumps; Phase C needs the headroom). Lenis stays 1.1.5 (the r313 tests pin the reference's measured Lenis params — the reference runs 1.1.5; upgrading it is contrary to this mission). |
| 11-23 23:1x | pdfjs-dist 6 (PR #49) | CLOSED, not merged: +36 KB gz on the pdf ceiling (131.8/110) — the viewer upgrade is not worth the weight this round; the v6 render/canvas+destroy patch was prototyped then dropped with the reset. |
| 11-23 23:2x | lucide-react 1.77 (PR #52) | CLOSED, not merged: +3.3 KB gz measured with everything else reverted — over a frozen ceiling with zero feature need this round. |
| 11-23 23:3x | §7.C (perf ≥ 85) vs r355's documented 0.68–0.75 boot tradeoff | Both live contracts: Phase C1 makes the intro non-blocking for LCP (shorter/skippable preloader) while preserving the reference choreography for opted-in sessions. Logged, not dropped. |
| 11-23 23:3x | `npm ci` in apps/mobile | via daemon `nice -n 10`, started during the root gate's vitest step (network-bound, low CPU). |

## 2. §1 clean-base record

- **Sync:** fresh clone → main @ `fe12b12` (hard reset; nothing local worth keeping).
- **Production at start:** `/api/v1/status` → `buildId:"fe12b120a01d"` == main head → READY and matching. Vercel MCP connected for the post-push verification.
- **Baseline gate:** `verify.sh --fast` on clean main = **FAST PASS** (tsc ✓ · vitest 3,064 ✓ · bundle 813.0/815 ✓ · css-ratchet 52 ✓ · logo ✓ · axe S12/C0 ✓; log: `r358-verify.log`, not committed).
- **Open PRs found:** #48 minor-patch (21) · #49 pdfjs-dist 6 · #50 @types/node 26 · #51 dotenv 18 · #52 lucide-react 1.77.
- **Merged (integration branch `chore/r358-deps-batch`, final gate below):** #50 + #51 + #48 (backend/root seats; frontend seats pinned to main — commit `chore(r358): frontend dep seats stay at main — the 815KB ceiling law`). Merged into main as the clean base.
- **Closed with reason:** #49 (pdf weight), #52 (icon weight over frozen ceiling). Remote dependabot branches deleted after merge/close; only `main` remains.
- **Cleanup:** untracked junk = the transient daemon pid/log files (gitignored `*.log`; pids deleted pre-commit) + the Phase A drafts (committed on `r358/visual-match`, not main). Deadcode ratchet run recorded in §3 CLEAN-01. Docs consolidation: r355/r356/r357 ledgers already truth-aligned (r357's truth-ledger round); no contradicting stale docs found needing the §1.4 sweep beyond what r357 cured.
- **Mobile:** `npm ci` in `apps/mobile` via daemon (nice) — §1.2 satisfied.

### REPLAY-01 — the live-engine replay probe (parked, evidence kept)

The reference's engine bundle (289 KB, obfuscated Lenis/GSAP/ScrollTrigger/SplitText/barba) rides in the corpus. A local replay was probed three ways: (a) full engine on the saved DOM → layout explodes to 33.5M-px wrappers (2^25 browser cap) — the saved DOM is the mid-animation state and re-init stacks GSAP artifacts; (b) lazy-load stripped → no heal (lazy was a symptom, not the cause); (c) engine-off static replay → layout still 12× too tall (150K px) because the saved DOM carries the engine's pinned/translated state. The corpus CSS + measured timelines cover every spec number deterministically — so `reference-parse.mjs` is the instrument of record and the replay code (`reference-replay.mjs`) stays parked in the tree with this note. The 29 corpus shots remain the visual truth for the side-by-side sheets.

## 3. Work items ledger (the plan)

| Item | Phase | Status | Evidence |
|---|---|---|---|
| SYNC-01 sync + clean base | §1 | DONE | this §2 + merge commits on main |
| DEPS-01 dependabot batch | §1 | DONE | §2 record; PR closures; branch deletions |
| CLEAN-01 repo cleanup | §1 | RUNNING | deadcode ratchet output → appended below |
| AUDIT-01 Phase A instruments (parse + capture + sheets) | A | DONE (code) | `scripts/audit/r358/**` committed on `r358/visual-match` |
| SPEC-01 `reference-spec.md` | A | DONE | `docs/redesign/r358/reference-spec.md` + `reference/reference-numbers.json` |
| SCAN-01 ULARA full scan (fixtures, zero-501, visual metrics) | A | RUNNING | `evidence/defects-master.json` + `visual-metrics.json` when landed |
| DIFF-01 side-by-side sheets + numeric deltas | A | PENDING | `evidence/diff-report.md` + `evidence/sheets/**` |
| DS-01 token foundation to reference proportions (fluid-root ladder, hairline law, sharp geometry, type confidence) | B | PENDING | tokens:check + /__design both themes RTL |
| LAND-01 landing rebuild (hero plate scale, rhythm, intro LCP) | C1 | PENDING | captures + Lighthouse ≥85/95 |
| ART-01 plates/illustrations royal palette | C2 | PENDING | inventory + shots |
| PUB-01 public pages | C3 | PENDING | captures |
| ROLES-01 role shells/pages (KPI grids, tabs, sheets, 44px) | C4 | PENDING | per-role DONE rows |
| MOB-01 mobile same tokens + launch/onboarding | C5 | PENDING | emulator shots + workflows |
| ACC-01 acceptance re-run (§7 A–F) + Arabic report | §7/8 | PENDING | this ledger + `REPORT.ar.md` |

## 4. Evidence paths

- Reference numbers: `docs/redesign/r358/reference/reference-numbers.json` (+ spec)
- ULARA scan: `docs/redesign/r358/evidence/**` · sheets: `evidence/sheets/**`
- Gate logs (uncommitted): `/home/z/ulara/r358-*.log` via daemon pid files (deleted pre-commit)
