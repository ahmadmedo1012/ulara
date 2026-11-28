# r365 — the reference's PRODUCT grammar (what the logged-in product must do)

Scope of this note: the reference's **product UI** (its logged-in dashboard + chat-widget
compositions), not its public site (that grammar already lives in
`docs/redesign/r350/reference/REFERENCE.md` and is r364's concern). "The reference"
only — no name, no domain, no agency anywhere.

Evidence base for this note:
- A genuine product-dashboard capture (1920×916) surfaced from the vendor's own public
  documentation (`docs/redesign/r365/evidence/ref-product-dashboard.png`, local copy;
  live crawling is blocked by the edge wall — recorded honestly in the ledger).
- The r350 corpus (`docs/redesign/r350/reference/*`): measured tokens, mono/ink/hairline
  system, blueprint-sheet aesthetic.
- The product grammar already seated in this repo by R319/R359 (`patterns/Sheet.tsx`,
  `sheet-frame.css`, `shared/r359-grammar.css`) — the established translation of the
  reference's aesthetic into ULARA's paper-and-ink language.

## 1. Shell anatomy (from the real product capture)

- **Fixed left rail, ~270px, paper white, ONE hairline right border.** Logo block at top
  (mark + wordmark), then flat nav items: thin-line icon + label, generous height,
  active state = soft tinted pill + accent ink. No shadows anywhere — depth is hairlines.
- **Workspace header above the content: uppercase small-caps section kicker + horizontal
  tabs** (active = accent ink + accent underline, sitting on a hairline rail). This is the
  reference's "you are here" grammar — ULARA renders it as the mono eyebrow + PageHeader.
- **One content panel per page** on a slightly-off-paper ground; the panel is a bordered
  sheet, not a floating card stack.

## 2. The table IS the product

The reference's core composition is a **dense data table on a bordered sheet**:
- Header row: plain ink labels, sort chevrons, hairline rules above/below.
- Rows: **hairline-only separators** (no zebra, no card-per-row), tall enough to breathe
  (~72–90px desktop), generous horizontal padding.
- Row anatomy left→right: [row control (star/checkbox)] · **primary link in accent ink** ·
  **mono ID caption underneath** · status pills (small, outlined, rounded-sm) · clock +
  relative timestamps · **inline metric cells with icons** ("10 / 10 Processed") ·
  **inline signal flags** (warning triangle, error circle — flat, no fill) · kebab menu.
- Selected/hover row: one flat light-grey wash, nothing else.
- Toolbar directly above the sheet: search field, outlined selects with **floating
  labels** (label sits on the border), primary action button right-aligned — the toolbar
  is borderless and attached to the sheet.
- **ULARA mapping:** `DataSheet` + `LedgerRow`/`RowList` + `CalloutTag` + mono captions;
  royal blue plays the accent role (`--accent` = `#2540D9`, dark `#8AA0FF`); `Num`
  bidi-isolates every numeral; flat signal flags = `StatTone up/down/flat` +
  `AlertRow`.

## 3. Dashboard composition (the mission's grammar, corpus-confirmed)

- **KPI band first: huge numerals** (display face, tight leading, 40–72px) each sitting in
  a hairline cell of one wide sheet; delta flags are **flat triangles/arrows + mono
  captions** — never colored card confetti.
- **Hairline grid cells** with bracket indices and registration marks (`SheetFrame`,
  `RegCross`) — the blueprint-sheet construction: paper `#FFFFFF` on warm ground,
  ink `#282828` analog (`--text-strong`), hairlines `#b3b3af` analog (`--border`),
  **mono measurement labels 10–14px** (`--font-mono`, Geist Mono) for codes, coords,
  timestamps, counts.
- **Dark info cards**: detail/summary panels invert (ink ground, paper text) while the
  page stays paper — used for the "spotlight" fact block beside a table or under a KPI.
- **Thick-line plan drawings** (`plan-*` art plates) as section backdrops / empty states —
  structural, not decorative.
- **Charts**: hairline axes, mono ticks, single accent series (royal), flat fills,
  hover read-out in a paper tooltip with hairline border (Chart.js via `chartTheme`).
- **States**: empty = plan art + mono caption + one clear action; loading = skeleton with
  the same cell anatomy (no spinners inside sheets); error = flat flag + retry.

## 4. Chat-widget grammar (the reference's assistant panel)

- Floating launcher button bottom-corner (accent ink circle, safe-area aware); opens a
  **paper panel with one hairline border and a header bar** (title + close), messages as
  cards: assistant = bordered paper cell, user = soft accent-tinted cell; mono timestamps;
  **suggested actions as flat outlined chips** with approve/dismiss semantics; composer as
  a hairline input row; typing state = three mono dots; panel ≤ sheet radius, no shadows
  beyond the elevation ladder.

## 5. Motion (from the r350 corpus, unchanged law)

Mechanical, not bouncy: reveals slide/fade on the existing motion tokens
(`--motion-*`, `ease` tokens in `shared/design-tokens.json`), number count-ups for KPI
numerals (`CountIn`), fixed route-transition behaviour stays, everything honours
reduced-motion.

## 6. What r365 must fix (the working defect list)

Every authenticated page, per role, must satisfy ALL of these; a page that fails any one
goes on the defect list for the next loop:
1. Page opens with the PageHeader grammar (mono eyebrow → big title → actions) inside the
   sheet frame — no naked h1s, no off-grammar hero cards.
2. Data lives in `DataSheet`/`RowList` hairline anatomy (or a justified exception), with
   mono captions, flat flags and row actions — not ad-hoc card grids.
3. Dashboards open with a KPI band of huge numerals + delta flags in hairline cells.
4. Empty/loading/error/offline states exist for every list and use the shared state kit
   with plan art where the reference uses drawings.
5. Phones are composed (bottom bar + bottom sheets + sticky action bars), not scaled-down
   desktops; dialogs become bottom sheets ≤920px.
6. Dark theme and RTL verified for the page (mirrored arrows, `Num` isolation, logical
   properties) — no unstyled corners.
7. Motion only from the token set; reduced-motion fallback intact.

Sheets + critiques per page go to `docs/redesign/r365/evidence/` (side-by-side against
the closest reference composition, WebP, small).
