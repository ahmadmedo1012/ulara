# r351 A3 — LOG (evidence journal)

## Session 1 — AI-1 Gemini wiring

**Base verified:** `git rev-parse origin/main` → `35793f799929a2f9ace9cf69c40b641250c0122c` (== briefing base; branch `r351/native-and-ai` created from it).

**Docs read live (implementation time, 2026-11-21):**
- `https://ai.google.dev/gemini-api/docs/openai` (HTTP 200, 35.5 KB): base `https://generativelanguage.googleapis.com/v1beta/openai/`, `/chat/completions`, Bearer key, `stream_options.include_usage` supported, `reasoning_effort` ↔ thinking levels (cannot disable thinking on Gemini 3/4).
- `https://ai.google.dev/gemini-api/docs/models` (HTTP 200, 25.7 KB): model codes extracted — recommended pair `gemini-3.1-flash-lite` (stable, "frontier-class performance at a fraction of the cost") + `gemini-4-hydrogen` (the docs' compat default, "cutting-edge intelligence with speed and efficiency").

**AI-1 implementation** (`backend/src/lib/ai.ts`, `ai.routes.ts`, `env.ts`, `docs/deployment.md` §3.2, `.env.example`):
- `isGeminiBaseUrl` + `GEMINI_BASE_HOST` (host-scoped); `providerLabelFromBaseUrl` → `gemini`.
- URL join already trailing-slash-safe (`.replace(/\/+$/,'')` + `/chat/completions`) — pinned by test.
- OpenRouter-only `models` array gated on `isOpenRouterBaseUrl` (pre-existing) — pinned to never ride a Gemini wire.
- `stream_options.include_usage` requested (pre-existing) + usage parsed last-wins — pinned stream + non-stream; absent → 0.
- Delta hygiene: only `delta.content` read; reasoning_content/extra_content/thought_signature structurally invisible — pinned.
- `providerFailureMessage(kind, status?)`: 401/403 → «يلزم مراجعة الإدارة», 404 → model-unavailable admin message, 400 → «يُراجَع ضبط النموذج»; no-status defaults unchanged (other providers zero drift).
- `geminiFallThroughAllowed`: Gemini chain falls through ONLY on rate_limited/provider_error; 400/401/403/404/timeout surface immediately (no second-model billing for the same mistake). Non-Gemini chains keep the r323 policy — pinned.
- Route call sites thread `AiProviderError.status` into the message (JSON catch + SSE error event).

**Gate outputs (commands + results):**
- `npx vitest run tests/modules/ai-gemini.test.ts` → `Tests 27 passed (27)`.
- `npx vitest run` (full backend) → `Test Files 93 passed | 1 skipped (94)` · `Tests 1982 passed | 19 skipped (2001)`.
- `npm run typecheck` → clean. `npm run typecheck:tests` → clean.
- 3 stale pins updated (intended behavior change, documented in-test): ai-chat-routes 400 message (status-aware now), ai-provider + r323-ai-stream-protocol source-pins now expect the status-threaded call shape.

**Zero-trace:** `bash scripts/brand/zero-trace.sh` → FAIL on 5 PRE-EXISTING hits inherited from main (CHANGELOG.md + docs/redesign/r350/{HANDOFF,LOG}.md content — files identical to main, `git diff origin/main -- <files>` empty; plus 2 r350 commit messages already in main's history). r350's own session-2 row documented this as "the one documented red". **Zero hits in my files/commits.** History rewrite is forbidden and CHANGELOG is NOBODY-edits → reported in HANDOFF for the 4th agent.

**Live smoke:** no `GEMINI_API_KEY` in this sandbox env (`env | grep -i gemini` empty) → live behavior `NOT MEASURED` (per-task contract; the owner sets `AI_API_KEY` as a deployment secret and should rotate the chat-pasted key).

## Session 1 — AI-2 prompt rewrite

**Implementation** (`backend/src/lib/ai.ts`):
- `buildStudentSystemPrompt` (r351 AI-2): brevity-first («الإيجاز أصلٌ… أقصر إجابة مفيدة أولًا»), bounded markdown allowed (the raw-text mandate retired — both surfaces render markdown now), grounded citations rule («المصدر: [رقم]» from the numbered materials context ONLY — citing outside it is fabrication), Socratic-before-solutions on graded work, no-pretended-abilities clause, injection hardening extended to the retrieved materials block, mastery summary explicitly names+percentages only.
- `buildGenericSystemPrompt`: same brevity/markdown/honesty clauses + the teacher work patterns (feedback drafts, lecture outlines, question banks) + no-fabricated-citations + no-pretended-abilities.
- Telemetry verified metadata-only (userId/feature/model/tokens/latency/success/errorClass — no content) — pinned by a source-slice test; MasteryFact verified PII-free structurally (4 fields: concept/course/level/lectureTitle) — pinned.

**Gate outputs:**
- AI test files: `Tests 212 passed (212)`.
- Full backend: `Test Files 93 passed | 1 skipped (94)` · `Tests 1986 passed | 19 skipped (2005)`.
- `npm run typecheck` + `typecheck:tests` → clean.
- 2 stale pins updated (the retired plain-text mandate — intended behavior change, documented in-test); 4 new pins added (student contract, teacher patterns, telemetry metadata-only, mastery no-PII).

## Session 1 — AI-3 web assistant redesign

**Structure** (1,376-line page → orchestration + components):
- NEW `frontend/src/components/ai/`: `chat.ts` (types/copy/tables), `AiMessage.tsx`, `AiComposer.tsx`, `AiSidebar.tsx`, `AiGaps.tsx` (+`AiGapsSkeleton`), `index.ts` barrel.
- Page rewritten: 583 lines (was 1,376, −58%), keeps EVERY behavior (SSE streaming/stop/retry/regenerate/copy/thumbs/quota/a11y focus-restore/auto-scroll guard/IME-safe Enter).
- The r305rp wrapper + ds-research.css/pages.css imports RESTORED (the `r305ai-*` bubble styles + EmptyCell live there — §0 contract intact).

**Defects fixed (the owner's §0 list):**
- Section numerals 01/02/03: RETIRED (quiet labels — a chat page is one surface, not a numbered report).
- Wrapped header chips line («مساعد محلّي / واعٍ بمستوى إتقانك»): the banded head retired; ONE disclosure line (privacy, real mode) + header description.
- bidi «%200»: `.ai-gap-pct` now `dir="ltr"` (digits+percent are one unit).
- Gaps strip: title+hint one row; card CTA line removed (the card IS the button; a11y label carries it).
- Current-conversation marker: sienna dot + aria-current (was the CURRENT mono chip).

**Copy cuts** (measured via the temporary Playwright harness `__measure-ai.e2e.ts`, deleted before commit):
- Greetings: 3-line → 1-line each; suggestions 5→3; quick chips real-mode 4→2; error/empty rows one line + one action.
- BEFORE/AFTER (`.pf-page` textContent words, hermetic, same fixtures): 1440 light 114→**44** (−61%) · 390 light 114→**44** · dark same · reduced-motion same. Target was −40%.
- overflowX 0→0 · scrollH 900/844 stable · console errors 0→0 · screenshots in `shots/` (before+after × light/dark × 1440/390 + reduced-motion).

**Test updates (all intended behavior changes, in-test documented):** 6 test files re-pinned (config, conversations, chat-hygiene, engine-tag, r305a7 §2 deep-band→quiet-disclosures, G-final empty copy). e2e re-pinned (short copy, EmptyCell two-line, dot marker). 2 diacritic-order byte alignments (test-canonical NFC).

**Gates:**
- `TZ=UTC npx vitest run` → `Test Files 243 passed (243)` · `Tests 3015 passed (3015)`.
- `npx tsc --noEmit -p tsconfig.json` clean · `typecheck:tests` clean.
- e2e ai-assistant journey → passed (hermetic, dev 5303).
- `bash scripts/verify.sh --fast` → **FAST PASS** (tsc/vitest/bundle/css-ratchet/logo/a11y floor S25/C0 unchanged).

## Session 1 — AI-4 owner console

**Backend** (`lib/ai.ts` + `ai.routes.ts`):
- `providerHealthCheck(cfg)`: ONE minimal round trip (one-word ask, max_tokens 16, 15s ceiling, NO retry chain — a probe is a measurement). Returns ok/latencyMs/model or kind+status. Key never in body/result.
- `GET /ai/status` (OWNER): provider label, route, **keyPresent boolean** (never the key/prefix/length), last failure class from telemetry (kind only), today's tokens (UTC-day aggregate).
- `POST /ai/status/check` (OWNER): the live probe + the client-safe Arabic line (AI-1's status-aware messages). Local mode answers honestly with the setup-recipe pointer.
**Frontend**: `useAiServiceStatus`/`useAiConnectionCheck` (hooks/resources/ai.ts — my file), the «حالة المزوّد» card on OwnerAiPage (provider/route/key/today-tokens/last-error + فحص الاتصال button with live result; local mode shows the env recipe), provider-card CSS in ai.css.

**Gates:** backend `Tests 1990 passed (19 skipped)` incl. 4 new health-check pins (31/31 in ai-gemini) · typecheck + typecheck:tests clean both sides · frontend unit `3015/3015` (after fixing a tests-tree TS6133 my earlier edit introduced) · zero-trace: only the 5 pre-existing main-inherited hits.
**Env note (sandbox):** a workspace-scoped `npm ci` wipes siblings — the correct install is the ROOT `npm ci` (all workspaces; documented here for resume).

## Session 1 — AI-5 hermetic coverage

**Corpus** (`frontend/tests/e2e/fixtures/ai-fixtures.ts` + ONE marker block in mock-transport.ts, per §4 protocol): /ai/config, /ai/conversations, /ai/conversations/:id/messages, /ai/status, /ai/status/check, /owner/ai-metrics. POST /ai/chat deliberately 501s in the static table (per-journey stateful, like every mutating journey).
**New e2e journeys** (ai-assistant.e2e.ts, 4 added): stop-during-connecting (held response → real in-flight cancel, no error row), provider-failure → retry-in-place succeeds (envelope code chip pinned), quota-exhausted card (done.remaining=0), axe serious/critical = 0 light+dark (in-journey axe injection — the standing public gate doesn't cover authed pages).
**A REAL PRE-EXISTING BUG CAUGHT + FIXED**: `.chat-area` had NO `overflow-y` anywhere (not on main) — the transcript beyond the surface frame was clipped behind the composer, unreachable. Fixed in ai.css (`overflow-y: auto` + `overscroll-behavior: contain`) with the finding documented in-file.
**One stale pin updated** (smallest hunk, logged): r319-student-pages-b.e2e.ts /student/ai block — the numbered [01]/[02]/[03] bars retired with the r351 calm design; quiet labels + gap-card radius + sheet contract stay pinned. (The AI-3 commit had also missed r323-ai-stream.test.tsx's rename pins — included here.)
**Infra findings (documented for resume)**: (a) workspace-scoped `npm ci` wipes sibling deps — always install from the ROOT; (b) a stale Vite optimizer cache produced phantom e2e failures (admin/auth specs red on a months-old server, green on a clean `--force` restart — bisected to infra, not code); (c) detached long test runs are reaped by the sandbox — run e2e in ≤10-min chunks.

**Gates:**
- Full e2e (35 spec files, 4 chunks): `18+67+49+39 = 173 passed, 0 failed`.
- Frontend unit: `243 files / 3015 tests passed`. typecheck + typecheck:tests clean.
- `bash scripts/verify.sh --fast` → **FAST PASS** (a11y floor S25/C0 unchanged).

## Session 1 — AI-6 mobile assistant parity

**State found**: the mobile Assistant (763 lines) already carries the full contract — XHR-SSE streaming, stop («أُوقف الردّ» honest label), retry-in-place, copy/share, markdown, citation chips with deep links, quota/error states via humanizeError, keyboard-controller (KeyboardAvoidingView + KeyboardToolbar), safe areas, sheets.
**Added**:
- The completion haptic (`haptics.selection()` when a turn completes — both grammars; send already had impact-light, stop medium, quota warning, error error).
- `providerBadgeLabel` + `LOCAL_PROVIDER_NOTE` extracted to logic.ts (was inline) with 4 new pins — gemini rides the named-provider rail verbatim (r351 AI-1 parity).
**Gates (N6 set, all green):** tsc 0 · expo lint 0 errors/16 pre-existing warnings · contract-check no drift · tokens:check byte-identical · api:types regenerated + `git diff --exit-code` clean · jest `1237/1237` (1233 base + 4 new) · expo export android + ios OK.

## Session 1 — Track NATIVE (N0/N1/N4)

**N0 audit** (committed instrument `apps/mobile/scripts/capture-web.mjs` + corpus-backed pass): 46 cells at 390×844 + 820×1180, 0 overflow, 0 capture errors. Full table in NATIVE_AUDIT.md. Verdict: the >80-word screens (admin dashboard/reports 136, student results 95, quality engagement 92) are DATA-bound, not explanation-bound — the r350 copy sweep holds.
**N4 cuts**: admin hero hint removed (label suffices), results kicker 9→4 words. Zero screens carry >80 words of explanation.
**N1 boot sequence (BootStrip, boot.tsx)**: mono counter 0→100% on the ds ease (900ms ≤ the 1.2s ceiling) + the mark's own X:120 Y:120 coordinate readout + the hairline ruler — cold boot only (module flag, warm remounts skip), reduced-motion static-complete. 4 new pins (cold frame / static-complete / warm-skip / ceiling source-pin).
**Gates (N6)**: tsc 0 · expo lint 0/16 pre-existing · contract no drift · tokens byte-identical · jest `1241/1241` (1237+4) with clean exit · expo export android + ios OK.

## Session 2 — AI-1 hardening (review findings, commit 0a3bc61)

**Finding:** the committed gate (`geminiFallThroughAllowed`) fell through on `rate_limited` + ALL `provider_error` (5xx), while the contract (owner text, test-file header, deployment docs) says **429/503 ONLY**. A mid-flight WIP diff had started re-wording the docs to say 429+5xx — the wrong direction. The code was narrowed instead:

- `geminiFallThroughAllowed(baseUrl, err)` now allows `rate_limited` (429) and `provider_error` **with status 503** only. 500/502 keep the r176a same-model retry then surface honestly (manual retry re-routes the chain from the top).
- New pin: non-503 5xx (500/502) → exactly 2 wire calls (model-1 retry only), model 2 never billed. ai-gemini 32/32.
- The timeout client line no longer promises «سيُختار نموذج آخر غالبًا» (a timeout never falls through — that promise was dishonest). ai-chat-routes pin updated with the reason in-test.
- 400 wording: «يُراجَع» → «يلزم مراجعة» (owner-matter, stated plainly).
- Web bubble: `stripInlineMarkdown` now collapses inline `code` backtick pairs (AI-2's prompt allows bounded markdown; the web surface renders de-marked inert text while mobile renders real code — the CODE stays, its markup does not). Unpaired backticks pass verbatim. 2 pins in chat-hygiene (13/13).

**Gates:** backend AI suites 8 files 246/246 + STT 10/10 · tsc clean (backend + frontend) · frontend chat-hygiene 13/13 · `verify.sh --fast` **FAST PASS** (a11y floor S25/C0 unchanged) · zero-trace: tracked paths clean; the 2 history hits are r350-era commits inherited from main (pre-existing, documented — owned by the merge agent).

**Push:** `7214e75..0a3bc61` on r351/native-and-ai.

## Session 2 — N2 the collapsing large-title header + the N4 residuals the corrected instrument exposed (commit 05e8315)

**The gap:** PLAN row N2 overstated ("CollapsibleHeader, useReducedMotion") — `useReduceMotion` existed, stagger/PressableScale/sheets-with-gesture-dismissal (gorhom v5)/tab crossfade (`animation:"fade"`)/pull-to-refresh (DataList) all shipped, but the **large-title collapse was absent** (StackHeader's docblock even said "deliberately NOT implemented" — an r350-era stance the r351 owner directive overrides).

**Built:**
- `shell/collapse.ts` — the ONE geometry source (threshold 72, drift 24, fade windows) + the pure `collapseProgress` clamp (pinned numerically).
- `shell/LargeTitleScreen.tsx` — kicker + h1 large title IN the scroll content; ONE scroll handler writes a shared value; `Math.*` worklets (NO captured functions — the CountUp R336 remote-call freeze rule; NO `interpolate` — its jest mock is a NOOP that would hollow the rest-state pins); reduced-motion drops the drift (opacity-only degradation); pull-to-refresh with the accent tint.
- `AppTopBar` — optional backward-compatible crossfade seat: the brand-word slot crossfades «أُلارا» → the screen title (two stacked absolute fills; both labels stay screen-reader-visible — an honest breadcrumb; a per-frame a11y flip would need JS work inside the gesture, which the motion contract forbids — documented in-file). The ~30 bare AppTopBar screens render byte-identically.
- Applied to all five role dashboards (student: the greeting IS the large title, institution as the mono kicker, «الرئيسية» as the seat; teacher/admin/quality/owner: explainer subtitles retired with the cut law).
- 10 new pins: pure clamp, geometry sanity, rest state (title visible / seat transparent), barTitle override, bar actions, reduced-motion rest + source gate, the R336 worklet-discipline source contract (no identifier-calls but Math.*), one-geometry-source.

**The instrument bug (found by evidence, not by claim):** re-measuring AFTER the integration, the student "dashboard" shot was byte-identical to the AI shot (md5 equal). The capture instrument navigated dashboard cells to `/<role>/` — on the exported web bundle that resolves to the manifest's first match (for STUDENT: `/student/ai`, the alphabetically first file). **The first-pass audit's dashboard rows were mislabeled** (the old "admin dashboard 136" was actually reports; the real dashboards were never captured). Fixed: the instrument now uses the explicit `/<role>/dashboard` paths (the deep-link contract). NATIVE_AUDIT.md carries the correction note + the re-measured table.

**The corrected re-measure exposed REAL N4 residuals** (hidden until now):
- TEACHER dashboard 130 words → **78** (−40%): 5 empty-state explainer sentences («ستظهر هنا…»), the chart subline, and one duplicated empty title cut; titles + CTAs kept.
- OWNER dashboard 89 → **37** (−58%): 7 menu explainer sublines + the footer hint paragraph cut.
- `EmptyState` gains explicit-empty suppression: `message=""` overrides the room default (the one-line law needs an opt-out from the «ستظهر هنا…» filler without dropping the room art) — states tests 12/12.

**Final sweep (46 cells × 2 viewports, minimal fixtures): 0 overflowX · 0 capture errors · 0 screens >80 words.** Dashboards: student 26, teacher 78, admin 51, quality 12, owner 37.

**N6 gates (all green, run in full):** `npx tsc --noEmit` 0 · `npx expo lint` 0 errors/16 pre-existing warnings · `npm run contract-check` no drift · `npm run tokens:check` byte-identical · `npm run api:types` + `git diff --exit-code` clean · `npm test -- --ci` **1251/1251** (1241+10) · `npx expo export` android (7.5MB hbc ≤ 8MB budget) + ios OK.

**Honesty:** the collapse's animated values are UI-thread work — device-UNVERIFIED (no emulator; RN-web cannot show native threads). Jest pins the REST state + the pure clamp + the worklet discipline. VLM screenshot check confirmed the large heading + kicker + bar render (Arabic OCR by the VLM is weak; the instrument's numbers are the authority).

**Zero-trace:** tracked names clean (the 5 file/history hits are the pre-existing main-inherited ones — CHANGELOG + r350 docs + 2 r350 commit subjects; owned by the merge agent).

**Push:** `1fa9ac3..05e8315`.
