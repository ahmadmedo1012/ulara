# R352 — ACCESSIBILITY-PLAN

## Contract honored (inherited from the platform, verified for the workspace)

- **Skip link**: the AppShell's single skip-link remains the first Tab stop for
  every `/institution/**` route (the workspace renders inside `#main`).
- **Semantic landmarks**: `nav` (the rail, aria-labelled «أقسام مساحة العمل
  المؤسسية»), the page content within the shell's `main`.
- **One h1 per route** — the patterns PageHeader; sections use h2/h3
  (`InstSection` → h3 with the section's own hierarchy documented).
- **Tables**: `th scope="col"` headers; the platform's `data-label` mobile
  stacking keeps every cell named on narrow screens; `aria-label` on every
  table.
- **Forms**: every field is a labelled control (`label htmlFor` + `id`); required
  fields carry `*` (aria-hidden) + the validation message names the field in
  Arabic; errors render `role="alert"`.
- **Dialogs**: `role="dialog"`/`alertdialog` + `aria-modal` + `aria-label`;
  Escape closes; mousedown on the backdrop closes; focus lands on the first
  control on open.
- **Buttons**: no icon-only button without an accessible name (every tree
  toggle/edit/add action carries its aria-label naming the entity).
- **Status**: chips are text (never color-alone); the tone dot is decorative
  (`::before` — screen readers never see it).
- **Icons**: the platform's `Icon` wrapper (aria-hidden default; informative
  glyphs opt out with their own label) — Lucide only.
- **Keyboard**: tree nodes are buttons (Enter/Space activate); table rows that
  act as links are focusable rows with Enter handlers; focus-visible rings from
  the token system everywhere.
- **Motion**: `prefers-reduced-motion` disables the workspace's own transitions;
  the platform spinner is the loading indicator (no decorative animation).
- **Touch**: 44px minimum on every interactive element (rail links, filters,
  selects, tabs, attendance options, dialog actions).

## Workspace-specific decisions

1. **The rail is a `<nav>` with an accessible name** — screen-reader users can
   jump to section navigation directly; `aria-current="page"` comes from
   NavLink's automatic handling (verified by the e2e snapshot).
2. **Numbered meeting phases (١·٢·٣·٤)** — the Arabic-Indic ordinals are part of
   the heading text, so the reading order IS the workflow order (preparation →
   attendance → resolutions → minutes).
3. **The capability notes** name the missing capability in text (`inst-cap-note`)
   — the "why can't I act" answer is never color/icon-only.
4. **Attendance picker** — per-person `role="group"` with the person's name in
   the aria-label; `aria-pressed` toggle buttons (not radios) so the unsaved
   draft state stays honest.
5. **Breadcrumbs** on detail routes (PageHeader) with `aria-current="page"` on
   the leaf — the platform contract.

## Measured

- Route-title coverage test: every new route resolves a specific Arabic title
  (WCAG 2.4.2) — `tests/unit/route-titles-coverage.test.tsx` green.
- The hermetic e2e asserts heading/table/tree roles and accessible names.
- 360/390px overflow = 0 on all 13 sections (no horizontal scrolling trap for
  low-vision / zoom users).

## Residuals

- A dedicated screen-reader pass (NVDA/VoiceOver manual walkthrough) is not
  executable in this sandbox — flagged in HANDOFF for QA on a real machine.
- axe-core automated scans of the institutional routes are follow-up (the repo's
  `@axe-core/react` dependency exists; wiring the scan into the capture
  instrument is mechanical).
