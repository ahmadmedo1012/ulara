# ULARA Public-Site Match Constitution (r368)

## Core Principles

### I. The Reference Wins for Appearance (99/1) (NON-NEGOTIABLE)
Only the site's content (language, words, brand) may differ from the reference. Composition, scale, grid, type treatment, spacing, hairlines, colour roles, art style, motion and states match. Where a repo rule (DESIGN.md prose, token rules, ART-GRAMMAR, size/bundle ceilings, lint/deadcode/surface/a11y baselines, the FCP floor, earlier "deliberate adaptation" notes) blocks the match, change the rule in the same commit with a one-line reason.

### II. Zero-Trace (NON-NEGOTIABLE)
The reference's name, domain and its agency's name never appear in any file, filename, commit, branch, PR, ledger or Spec Kit artifact. Write "the reference". `scripts/brand/zero-trace.sh` stays green. Copy construction (composition, geometry, type treatment, motion, illustration style), never its image files, text or partner logos: redraw original art in the same style with ULARA's Arabic university content.

### III. Fidelity Loop Is the Definition of Done
A slice is done only when the reference and ULARA were captured at the same viewport and scroll (desktop 1440, laptop, tablet, phone 390/360/320, ultrawide), a side-by-side sheet was opened and a written critique exists in `docs/redesign/r368/evidence/`, every point was fixed, and the re-capture is nearly indistinguishable apart from language and brand. "Looks fine" without a critique does not count.

### IV. Visual Test-First (Spec Kit gates interpreted)
Simplicity, anti-abstraction and test-first gates apply to visual work as follows: the executable tests are the capture script, the side-by-side script and the fidelity critique. They are written BEFORE the slice implementation, shown failing, then shown passing. Prefer the existing art generator and primitives over new abstractions.

### V. Binding Floors
Typecheck, behaviour tests (update tests that only encode the old look), accessibility basics (visible focus, labels, reduced-motion fallback), the logo geometry gate and no secrets in the tree stay binding. Tokens and credentials live in environment variables only.

### VI. Arabic-First, RTL, Themes
Arabic-first RTL with light and dark parity. Phones are composed, not scaled-down desktop (320 to 1920). Arabic copy is short, strong, complete sentences with no repeated words or fragments. Royal #2540D9 (dark #8AA0FF) is the signal colour and plays the role of the reference's orange.

### VII. Measure, Never Ask
Unknowns become [NEEDS CLARIFICATION] and are resolved by measuring the reference (capture, DOM, computed styles, frame sequences). The owner is not asked. Slow jobs run in the background; never block on them or on CI.

### VIII. Scope and Delivery
Own `frontend/src/components/landing/**`, every pre-login public page, preloader, nav, footer, cookie bar, cursor and the art system (`scripts/art/**`, build on art v2, no second generator). Shared primitives change additively. Never touch `apps/mobile/**`, backend logic or authenticated pages. Work stays on branch `r368/speckit-public-match` (no per-feature branches), batched commits, merge origin/main hourly (merge, not rebase; regenerate generated baselines from main). Never push to main, never force-push. Only the owner merges, after Ready and a final comment R368-FINAL.

## Governance
This constitution governs all r368 specs, plans and tasks. Amendments need a one-line reason in the ledger.

**Version**: 1.0.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-26
