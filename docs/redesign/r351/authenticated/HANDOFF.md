# r351 A2 — HANDOFF

Branch `r351/authenticated-web` → PR to `main`. Everything measured; the
evidence journal is LOG.md, the before-state is BASELINE.md.

## What landed

1. **Q0** — `scripts/e2e/route-audit.mjs` (the full-matrix instrument:
   words/scrollHeight/h-overflow/taps<44/501s/fixed∩content/runtime
   errors per route × viewport) + 58 new fixtures → **zero 501s on
   non-AI authenticated routes** (430 cells verified) + BASELINE.md.
   The AI marker block for A3 sits in `mock-transport.ts`.
2. **Q1** — the shell: ONE identity (the topbar user menu carries name +
   role + theme + feedback + logout; the sidebar identity block retired),
   topbar controls 6→3 (search · bell · user; the standalone theme
   toggle + AI quick-action retired), the search band 920→1200px, the
   feedback FAB retired (user menu + ⌘K palette own it —
   `components/feedback/feedbackSeat.ts`), the mobile content pad clears
   the fixed dock (78px + safe-area), ONE overlay motion language (the
   popover's 200ms opacity+translate gains the reference's inset clip).
3. **Q2** — the `[0N]` numeral register RETIRED everywhere it decorated
   sections (44 spans + 90 props; out-of-DOM-order was unfixable across
   filtered states; the legal policy TOC keeps its own sequential
   numbering — document structure). `Num` (primitives) is the one
   dir="ltr" bidi isolate for number+unit strings (the «(80%+)»
   scramble fixed). Tabular figures verified across the numeric families.
4. **Q3** — dashboards at the ≤180-word budget under the DETERMINISTIC
   frozen-clock standard (student 297→168, teacher 277→177, owner
   224→180, quality 209→173, admin 171→165); university 259→169 (−35%),
   vision 254→156 (−39%), settings 245→216, research 196→186. The cuts
   are copy-only: greeting/identity lines, KPI verdict phrases,
   restating subtitles, empty-state prose, duplicate badges, sr-only
   double counts, the sr-only chart data tables (labeled charts +
   summaries carry the alternative), the student's third time surface,
   the teacher's at-risk shortcuts, the owner's header CTA pair.
5. **Q5/Q6** — the 44px floor reaches CONTENT targets (.pf-today-link
   fills its row; .btn.sm grows to the floor): **0 sub-44 targets on
   every dashboard at 1440/390/360; 0 horizontal overflow at every
   width from 360 to 1440.**
6. **Q8** — `frontend/tests/e2e/r351-shell-chrome.e2e.ts` (10 pins, all
   green): one h1 / one identity / no FAB / ≤180 words per role, the
   topbar control budget, zero fixed-UI∩content at 1440/1024 (every
   role), dock clearance at 390/360, the 44px shell floor, skeleton
   geometry ≡ resolved geometry (CLS ≈ 0). OWNER joined the e2e role
   seats (fixtures/e2e.ts).

## NOT MEASURED / honest gaps

- **Q3 long tail**: the remaining >120-word screens (owner education/
  system/activity, admin reports, teacher grades/research, settings at
  216) carry data-dense tables and KPI rows; the prose was cut where it
  existed, but the −35% target was only fully reached on the dashboards
  + university/vision. The audit JSONs in `baseline/` carry the per-
  screen numbers for the next pass.
- **Q5 grammar unification** beyond the dashboards (FilterBar/SplitView
  adoption on sub-pages) is partial — the dashboards + the heaviest
  student pages ride the patterns; the long tail keeps its existing
  (working) composition.
- Reduced-motion screenshots: the R350_RM=1 lane exists in
  role-shots.mjs; I did not shoot a separate reduced-motion matrix
  (the r305 e2e belt pins the reduced-motion drawer behavior; the
  motion tokens zero-out per motion.css — same system as r350).

## Q7 — deferred, with the reason

The nav tree was re-organized in r183/r305/r320 (collapsed groups,
one-calendar, the exams-hub redirect). Every remaining candidate pair
(schedule↔calendar, library student/teacher, messages student/teacher)
serves role-distinct data through different page components; merging
them is either a rename (names are API contract — forbidden) or a
multi-day rebuild of two surfaces at once. The reachable wins (label
shortening, hub-page folds) already landed in earlier rounds. The
deep-route inventory + every old path's redirect were verified intact
by the Q0 sweep (0 hard failures on all 92 routes).

## REQUESTS TO OTHER SLICES

- **A3**: the AI fixtures marker block is in `mock-transport.ts`
  (`── AI fixtures (A3) ──`). /student/ai, /teacher/ai, /owner/ai
  still 501 on /ai/config + /ai/conversations (12 cells in the Q0
  JSONs). The route-audit excludes AI pages from its 501 ledger until
  you land them.
- **A1**: the popover's clip-path motion (components.css
  ulara-popover-in) is the shell's overlay language — if your
  public-surface overlays want the same feel, consume the same
  keyframes rather than forking them.

## For the merge agent

- verify.sh full + `--specs r351-shell-chrome,r305-shell-ds` locally.
- The e2e fleet pin: `ULARA_E2E_EXECUTABLE` must point at the shared
  chromium build when the cache version ≠ the repo's playwright ask
  (the config already supports the env var).
- zero-trace: the gate FAILS on the inherited base (r350 history +
  CHANGELOG) — identical leak set on main vs this branch (verified by
  diff); my commits add no new patterns.
