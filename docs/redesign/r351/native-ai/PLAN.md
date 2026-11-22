# r351 A3 — Native apps + AI assistant · PLAN

Branch `r351/native-and-ai` from `main` @ `35793f7` (verified equal to origin/main
at branch creation). Two tracks, one branch, one PR. Track AI first (AI-1 unblocks
the owner), then alternate so neither starves.

## Track AI — work packages

| WP | scope | status |
|---|---|---|
| AI-1 | Gemini backend wiring: `gemini` provider label, Gemini-safe client (URL join, OpenRouter-only fields stay OpenRouter-only, stream usage, error mapping 400/401/403/404/429/5xx, extra delta fields never leak, timeout respected), ordered two-model fallback on 429/503 only with per-response attribution, env contract in deployment.md + .env.example, mocked-fetch unit tests (URL join, headers, usage stream+non-stream, each error class, fallback attribution) | DONE |
| AI-2 | System prompt rewrite: concise-first, knowledge.ts retrieval with source titles, Socratic-before-answers on graded work, role variants, injection hygiene, minimal mastery summary, metadata-only logging; prompt-assembly tests | DONE |
| AI-3 | Web AiAssistantPage redesign → calm world-class chat, split into components/ai/*, ≤3 suggested prompts, composer Enter/Shift+Enter, stream stop/retry/regenerate/copy, source chips, mastery chips bidi fix, honest provider badge, empty/error/offline/quota states, skeleton geometry, 360–430 responsive, a11y, reduced-motion, ≥40% fewer words | DONE |
| AI-4 | OwnerAiPage: provider status (label, model, last error class, today's tokens), server-side connection check, key presence boolean only | DONE |
| AI-5 | ai-fixtures.ts (config/conversations/messages/SSE), e2e send/stream/stop/retry/error/quota + axe | DONE |
| AI-6 | Mobile assistant parity: streaming/stop/retry/copy/markdown/sources/quota states, keyboard-controller, haptics, tests | DONE |

## Track NATIVE — work packages

| WP | scope | status |
|---|---|---|
| N0 | Audit without simulators: `expo export --platform web` + Playwright 390×844 / 820×1180 captures per role → NATIVE_AUDIT.md | DONE (25-screen capture pass) |
| N1 | Design language: paper surfaces, hairline rules, mono micro-labels, `#F15534` accent, one scale, one Pressable feedback + haptics | DONE (SplashMark boot sequence, boot ≤1.2s warm-skip, Pressable feedback audit) |
| N2 | Motion: staggered list entrance, collapsing headers, skeletons matching geometry, reduced-motion via AccessibilityInfo | DONE (Stagger, CollapsibleHeader, useReducedMotion; splash-mark boot ≤1.2s) |
| N3 | Navigation: keep route names (deep links contract); merge needless screens only with redirects | DONE (audited — zero needless merges found; route names unchanged) |
| N4 | Copy cut ≥40% on screens >80 words, one instrument | DONE (word-instrument sweep, 12 heavy screens cut 46–65%) |
| N5 | Forms/lists/states: unified empty/error/offline, DataList/ChipGroup, safe areas | DONE (parity with r350 pass, remaining screens swept) |
| N6 | Gates mirroring mobile.yml before every push: tsc, expo lint, contract-check, tokens:check, api:types drift, jest, exports android+ios | DONE |

## Key measured facts (implementation-time reads)

- Gemini OpenAI-compat (read live from the official docs page, 2026-11-21):
  base `https://generativelanguage.googleapis.com/v1beta/openai/` (trailing
  slash), `/chat/completions`, Bearer key, `stream_options.include_usage`
  supported, `reasoning_effort` maps to thinking levels (cannot disable thinking
  on Gemini 3/4). Model codes read from the official models page:
  `gemini-3.1-flash-lite` (stable, "frontier-class performance at a fraction of
  the cost"), `gemini-4-hydrogen` (docs' default compat model, "cutting-edge
  intelligence with speed and efficiency").
- The existing client already: strips trailing slashes before joining
  `/chat/completions`; gates the OpenRouter `models` array on
  `isOpenRouterBaseUrl`; sends `stream_options.include_usage`; classifies
  429/4xx/5xx; attributes per-response model. AI-1 adds: `gemini` label,
  Gemini-scoped fall-through (429/503 only), finer status→Arabic messages,
  delta-field hygiene tests, env docs.

## Order of execution

1. AI-1 (backend wiring + tests) → push.
2. AI-2 (prompt) → push. 3. AI-3 (web UI) → push. 4. AI-4 (owner) → push.
5. AI-5 (fixtures+e2e) → push. 6. AI-6 (mobile parity) → push.
7. N0 audit → N4 copy cuts → N1/N2 motion where measured gaps → push.
8. Full verify + zero-trace + sub-agent review → PR.
