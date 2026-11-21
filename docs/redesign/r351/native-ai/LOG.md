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
