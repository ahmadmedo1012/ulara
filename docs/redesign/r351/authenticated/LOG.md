# r351 A2 — LOG (evidence journal)

Format: command → result → decision/commit. Numbers are measured, never copied.

## Session 1 — setup + Q0

- `git clone …ulara.git` → ok. `git rev-parse origin/main` →
  `35793f799929a2f9ace9cf69c40b641250c0122c` = task baseline ✓.
- `git worktree add ~/agent02/ulara-work -b r351/authenticated-web 35793f7…` →
  `HEAD is now at 35793f7` ✓ (branch `r351/authenticated-web`).
- Read: `frontend/src/lib/routes.ts` (105 routes), `lib/nav.ts` (5 role maps,
  STUDENT 31 / TEACHER 23 / ADMIN 12 / QUALITY 10 / OWNER 13 nav destinations),
  `App.tsx` (role-guarded route blocks), `scripts/verify.sh` (fast = tsc+vitest
  +build+bundle+css-ratchet+logo+a11y), `scripts/brand/zero-trace.sh` header
  (fragment-assembled patterns), `AGENTS.md` (npm only; commits `type(rNNN): …`).
- Read reference extraction `docs/redesign/r350/reference/REFERENCE.md`:
  paper white / ink #282828 / hairline #b3b3af / mono labels / accent #f15534.
  Barba transition = inset clip-path 0→50% (~0.6s power2.in) then 50→0%
  (~0.7s power2.out). Shell adaptation: calm hairlines, mono registers,
  ≤220ms overlay motion with the clip-path feel.
- Wrote `scripts/e2e/route-audit.mjs` (A2 instrument): every nav route ×
  {1440,1024,768,390} light + dashboards dark, metrics words/scrollHeight/
  h-overflow/taps<44/501s/fixed∩content overlaps. Port 5302.
  (runs pending: npm ci in progress)

## Q1 — the shell (commit 3)

Measured AFTER (after-q1 dashboards matrix, 40 cells + 10 re-run):
- topbar visible controls @1440 (student): was 6 (search pill + AI btn +
  inst chip + theme + bell + user) → **3** (search · bell · user) + passive
  chips in the title block (institution chip moved there; ≤4 budget met
  incl. the multi-membership switcher).
- identity elements: was 2 (topbar chip + sidebar footer avatar block) →
  **1** (topbar user menu: name + role line + email + profile/theme/
  feedback/logout).
- FAB: retired (`fb-fab` gone from DOM + CSS). Feedback opens from the
  user menu + ⌘K palette (feedbackSeat.ts event channel). Rect audit
  (`route-audit.mjs`, fixed interactive UI only — aria-hidden/
  pointer-transparent chrome excluded): **0 fixed-UI ∩ content at
  1440/1024** on all 5 dashboards (was: the FAB pill over list rows).
- tap targets in shell: sidebar rows 55×36 → **44px min-block-size**
  (the second .nav-item rule's 36px floor was the live one — unified);
  rail collapse btn 28×28 → 44px; tour trigger 32 → 44px. Remaining
  sub-44 on dashboards: content text links (Q5's rows), e.g. «ابدأ
  التصحيح» h:32.
- search band: pill ↔ icon breakpoint 920 → **1200px** (1024 tablets
  get the icon + palette).
- bottom-nav clearance: mobile content pad sp-13(52px) →
  78px dock + safe-area + sp-4 (the last row can now scroll above the
  fixed dock).
- overlay motion: ulara-popover-in gains the reference's inset clip
  (inset(0 0 22% 0) → 0) over the existing 200ms opacity+translate —
  one motion language ≤220ms.
- verify.sh --fast: ALL GREEN (vitest 3014 · bundle 755.6/770 · css
  ratchet 52 · logo · a11y 19 under floor S25/C0).
- Tests updated (behavior legitimately changed, logged): r305-nav-maps
  (chip census → retirement pin), flow-09 (role label → topbar menu),
  bottom-stack (FAB sections → dock/toast only), r325 + r305 CSS
  contracts (theme/sidebar-user seats → retired; topbar-user-role
  clamp), Sidebar-Topbar focus cycle (logout → tour btn), r176e D-07
  (one logout seat), shell-logout-race (topbar menuitem query).
- role-shots.mjs: fleet browser pin (chromium 1200 executablePath —
  symlinks blocked in the sandbox).

## Q2 — hierarchy & typography (commit 4)

- [0N] numeral register RETIRED: 44 `.w11-idx` gutter spans + 90
  `index="NN"` props (patterns + primitives PageHeader, SectionBar and
  the teacher dashboard's three local carriers) + the SectionBar prop
  itself. Reason: teacher dashboard rendered 02→01→03, AI pages
  02/05/03; sequential-in-DOM cannot be kept honest across filtered
  states. The legal policy pages' SectionBar TOC numbering stays (a
  document's own sequential structure, r351 decision).
- Num helper (components/primitives/Num.tsx): the ONE dir="ltr" bidi
  isolate for number+unit strings; applied to the matrix legend ranges
  (the measured «(80%+)» scramble) + the dashboards' gap/progress
  percents.
- tabular figures verified in place (118 tabular-nums declarations;
  .font-mono/.metric-value/.stat-cell families covered).
- section ladder verified: page 24px → section 18px → body 16px
  (patterns.css pf-section-title, r304).
- tests updated with reasons: PageHeader index pin → retirement pin,
  r319 student-sheet SectionBar, R305 dashboards/courses/supplemental
  indexes, r176e unused var. verify.sh --fast ALL GREEN (3014 tests,
  bundle 754.9/770 — the [0N] cut also shaved 0.7KB).
