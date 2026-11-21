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
