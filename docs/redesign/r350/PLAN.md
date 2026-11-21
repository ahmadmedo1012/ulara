# r350 PLAN — Merge → Complete → Match → Ship

> The working plan for the r350 final pass. Evidence journal: `LOG.md`.
> Session 1 (2026-11-21): Phase A merge + B0 extraction (commits `6ed9c56`…`c410e4b`,
> `669f12b`, `4cccf40`). Session 2 (this session, resuming): B1 finish, B2 part 1,
> CI repairs, §8 owner patch, B7 docs.

## Phase ordering (owner's brief §4/§6)

| phase | scope | state |
|---|---|---|
| A | merge `ui/public-experience` → `ui/authenticated-workspace` → `ui/native-mobile`, full gates, push | **done** (session 1; resume-verified FAST PASS in session 2) |
| B0 | extract the reference site (stack, tokens, preloader, scroll, ink filter, cursor, transitions) into `reference/` | **done** (session 1; artifacts renamed `refsite-*` in `0227904`) |
| B1 | the authenticated shell (one-title law, rail, FAB, 5-role evidence) | **done** (`4cccf40` + `a439ea9`: 5-role sweep, corpus closure, owner crash fixed) |
| B2 | cut copy drastically | **part 1 done** (`b33dce4`: /app −52%, settings −25%, university −13%); landing/capabilities/campus measured at target; legal kept |
| B3 | page & route organization (orphan pages, redirects, nav consistency) | pending — needs the route inventory sweep |
| B4 | match the reference at full fidelity (preloader, drag-reveal, pinned scenes, ink masks, cursor, lens, ticker, transitions) | pending — the extracted data sits in `reference/`; fidelity gaps to be measured against `REFERENCE.md` |
| B5 | skeletons / loading / logo / transitions unification | pending (audit-led) |
| B6 | small screens & native apps (44px taps, 360–430 overflow, splash script move) | pending (audit-led) |
| B7 | follow-ups (docs, CHANGELOG, AGENTS amendment) | **done in part** (this commit); grows as phases land |
| §8 | owner decision: demo-accounts panel in production | **patch prepared, UNPUSHED** — branch `owner-decision/auth-panel-hide` (06a7d9c) + `/home/z/ulara-auth-panel-hide.patch` |

## Hard constraints carried from the brief

- Rule 0.7: no `--no-verify`, no force-push, no disabling tests, no prod-data writes.
- Rule 6: ceilings are signals — raise with a LOG line, never delete features.
- Zero-trace gate: the reference site's NAME is retired everywhere (content, names,
  commits). B4 fidelity work implements measured techniques under neutral names.
- Every push touching `apps/mobile` triggers an EAS OTA — §5 gates run BEFORE such pushes.

## Owner decisions queue (does not block the work)

1. §8 demo-accounts panel (options a/b/c in the final report).
2. One-time history rewrite authorization (zero-trace residual: one commit message).
3. Expo/EAS: the EXPO token in the brief's chat was not usable here (no MCP / no
   eas session) — EAS workflow health is `NOT MEASURED` this session.
