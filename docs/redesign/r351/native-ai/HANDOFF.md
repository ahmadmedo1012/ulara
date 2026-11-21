# r351 A3 — HANDOFF (native + AI)

Branch `r351/native-and-ai` · base `main` @ `35793f7` · one PR at the end.
Read with: `PLAN.md` (work packages), `LOG.md` (evidence journal),
`NATIVE_AUDIT.md` (the measured native state), `shots/` + `capture-web.json`.

## What shipped (per work package)

| WP | state | one-line summary |
|---|---|---|
| AI-1 | DONE + hardened | `gemini` label, Gemini-safe client, ordered fallback **429/503 ONLY** (non-503 5xx surface — pinned), status-aware Arabic errors, stream usage + delta hygiene; 32 pins in ai-gemini alone |
| AI-2 | DONE | brevity-first Arabic prompt, Socratic-before-solutions on graded work, grounded numbered citations, teacher patterns, PII-free mastery, metadata-only telemetry |
| AI-3 | DONE | web assistant redesigned into `components/ai/*` (1,376→583 lines), copy 114→44 words (−61%), numerals/bidi/wrapping defects fixed, every behavior kept |
| AI-4 | DONE | owner console `/ai/status` (label, route, key-presence boolean, last failure class, today tokens) + one-probe connection check |
| AI-5 | DONE | hermetic AI corpus + 4 journeys (stop/retry/quota/axe); caught + fixed a REAL bug (chat log never scrolled) |
| AI-6 | DONE | mobile parity verified (contract already full) + completion haptic + providerBadgeLabel with pins |
| N0 | DONE + corrected | 46-cell RN-web instrument committed; **session-2 found + fixed an instrument bug** (dashboard cells now use explicit `/<role>/dashboard` paths) |
| N1 | DONE | BootStrip cold-boot sequence (≤1.2s, warm-skip, reduced-motion static) on top of the r350 design language |
| N2 | DONE | **LargeTitleScreen** (the collapsing large-title header) + AppTopBar crossfade seat on all 5 role dashboards; stagger/PressableScale/sheets/tab-crossfade/pull-to-refresh verified already-shipped |
| N3 | DONE (audit) | route names unchanged (deep-link contract), zero needless merges — nothing to do |
| N4 | DONE + re-swept | teacher 130→78 (−40%), owner 89→37 (−58%); **0 screens >80 words** on the corrected instrument |
| N5 | DONE (audit) | DataList/ChipGroup/unified states hold across the 46 cells |

## NATIVE-AFFECTING changes (for the merge agent)

**NONE.** Everything is JS/OTA-safe. No new native modules, no `app.config.ts`
native-field changes, no new dependencies (backend or mobile). The mobile
bundle budget: android hbc 7.5MB (was ~7.11MB at r350 base; signal ceiling 8MB
— not raised, still inside).

## Requests to other slices

- **A1/A2 (fixtures):** the AI fixtures live in the `// ── AI fixtures (A3) ──`
  marker block in `mock-transport.ts` (per §4). If you move/reformat the route
  table, keep the block delimited — my e2e journeys ride it.
- **Merge agent (zero-trace):** the 5 remaining zero-trace hits are
  main-inherited (CHANGELOG.md content, r350 HANDOFF/LOG content, 2 r350
  commit subjects). My branch adds none. Whether to scrub r350 history is the
  4th agent's call (r350 is already merged on main).

## Deployment notes (owner)

- The Gemini env contract is in `docs/deployment.md` §3.2 and `.env.example`
  (no secret values anywhere). `AI_MODELS` = the ordered pair
  `gemini-3.1-flash-lite` (daily driver) + `gemini-4-hydrogen` (fallback);
  fall-through happens on 429/503 ONLY.
- The owner's pasted chat key must never enter any file — it is the
  deployment secret `AI_API_KEY` (and should be rotated).
- Live Gemini smoke: `NOT MEASURED` (no `GEMINI_API_KEY` in the sandbox;
  mocked pins cover URL join, headers, usage, every error class, fallback
  attribution).

## Known device-UNVERIFIED (no emulator in the sandbox)

- The collapse's animated values (jest pins the rest state + the pure clamp +
  the worklet discipline; the 60fps character is UI-thread work).
- Native haptics, safe-area under real notches, iOS sheet physics, the
  native-splash → BootStrip cross-fade.
- `/student/` on the WEB export resolves to the FIRST manifest match
  (`ai.tsx`), not the first tab — harmless inside the app (all links use
  explicit paths; ROLE_TABS paths are the contract), but if the web export
  ever becomes a product surface, add an index redirect. Documented in the
  capture instrument's header.

## Target table (measured, for the PR)

| metric | base | now |
|---|---|---|
| mobile screens > 80 words (static copy surface) | teacher 130, owner 89 (mislabeled before; truly unmeasured) | **0** (teacher 78, owner 37) |
| AI web page words | 114 | **44** (−61%) |
| Gemini client unit tests (mocked) | 0 | 32 (URL join, headers, usage stream+non-stream, every error class, fallback attribution, delta hygiene) |
| hermetic AI page 501s | 2 endpoints | **0** (corpus + journeys) |
| mobile render net | 112 pass | **1251/1251** (all routes + 10 new pins) |
| live Gemini smoke | — | `NOT MEASURED` (no key in sandbox) |
| 46-cell RN-web sweep | — | **0 overflowX · 0 console errors** |

## Protocol notes for the merge agent (the review pass's contract findings)

The independent reviewer flagged file touches that sit OUTSIDE the
literal §1 list but INSIDE the "tests follow code" protocol. They are
logged, deliberate, and behavior-following — the merge agent may wave
them through or ask for reverts:

1. `frontend/src/pages/student/aiReplyFormat.ts` — the AI page's own
   formatter (one hunk: inline-backtick stripping, following AI-2's
   prompt allowing bounded markdown). Its test's pins were re-pinned by
   AI-3 already.
2. Nine AI-adjacent test files re-pinned (they pin AI-surface code this
   slice owns): `AiAssistantPage-{chat-hygiene,config,conversations,
   engine-tag}.test.tsx`, `G-final-shared-surfaces`, `r168b-truthfulness`,
   `r305a7-ai-ds`, `r323-ai-stream`, `r319-student-pages-b.e2e.ts` +
   the new `AiMessage-citations.test.tsx`. Every change carries its
   reason in-test.
3. `mock-transport.ts` carries ONE delimited `// ── AI fixtures (A3) ──`
   route block at the end of the table + its minimal 9-line top import
   (ESM imports cannot sit inside the block). Nothing else in the file
   is A3's.

## Post-review hardening shipped in the same pass

- Web **source chips** (the citations referent — was dropped; mobile
  parity): `AiCitation` through both grammars, chips in AiMessage,
  5 unit pins + e2e assertions.
- `aiStatusLimiter` on `/ai/status` + `/ai/status/check` + 3 owner-route
  pins (local shape, honest refusal, OWNER gate).
- The vacuous r305a7 privacy assertion fixed (regex, partial match).
- capture-web.mjs docblock honesty (minimal fixtures, always).
