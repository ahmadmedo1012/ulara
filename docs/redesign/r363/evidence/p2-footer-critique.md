# r363 P2 — the footer to the owner's rulings: the fidelity record

The rulings (pre-decided): ONE horizontal uppercase/mono link row (RTL-mirrored,
wrapped in place, never column stacks) · the mega statement and the cookie/notice
strip SHARE ONE grid row · hover underline draw · scroll reveal · ACCEPT is the
signal colour, REJECT bare text · dead links fixed/removed.

## What changed

- **The ONE link row** (`.fo-linkrow`, mono `[ INDEX · الفهرس ]` label + a
  wrapped flex ribbon of 14 doors + the funnel pair) replaces the col2
  three-group column stack AND the CONTACT/ADDRESS groups. Every door audited
  live: routes exist, `#chapters` resolves (MountOnVisible's anchorId seat),
  `/colleges` added (it was missing from the footer entirely).
- **The final row** (`.fo-final-row`): the giant outline wordmark + the
  ConsentBanner in ONE grid row (auto track collapses on answer — the row's
  height is always the wordmark's, so nothing below ever shifts; the tail-seam
  measurer retired with the old tail seat). ≥1200 two cells; below, one column.
- **ACCEPT is the signal** (royal fill + the owner-verified `--accent-fg`
  label, ≥4.5:1 both themes); REJECT stays bare text; «اعرف أكثر» rides the
  accent TEXT rung (the reference's orange LEARN MORE seat).
- **The underline draw**: a 1px signal hairline sweeps inline-start → end on
  hover (RTL: right → left), on the link row AND the © policy doors. Keyboard
  focus keeps the universal base.css ring (the family's zero-`:focus-visible`
  law — the draw is hover-only by design).
- Identity band caps at 46rem (col2 gone); plate row, skyline, © bar kept.

## The fidelity gate (both rounds, VLM on the sheet `p2-footer-sheet.webp`)

Round 1 found 6 gaps → fixed: the link row breathes between doors
(`--sp-4` cadence), the notice sentence steps to 14px, the void above the mega
row cut, the action pair breathes (`--sp-3`), the underline clears the Arabic
descender ink (0.25rem seat), and — after a geometry probe — the per-item
border separators RETIRED (the reference's own link row carries none; a wrapped
row wore stray marks at every line start: measured `strayLinkSeps` before →
`[]` after).

Round 2 verdict, all 7 points (composition/void, link-row rhythm,
statement/notice balance, hairlines, colour discipline, early-access panel,
giant wordmark row): **MATCH — no further fixes.**

The probe (decide by measurement, not taste): `actionsGap` 8→12px @1440; link
lines 14-in-1 @1440, 4+3+4+3 wrapped @390; `strayLinkSeps` `[]` both widths.
The © row's `·` separators can dangle at wrapped line ends (the pinned §A2
grammar's wrap artifact) — documented, kept.

## RTL/mobile adaptations (one line each)

- The notice cell rides the row's inline-end = the LEFT edge (the mirrored
  bottom-right pin); below 1200 it stacks under the wordmark (the measured
  cell math leaves the nowrap giant text too little track).
- The link row wraps in place at phones (4 lines @390) — the reference's
  mobile collapse is a 2-column cell grid, which the ruling's anti-pattern
  ("never stack into three columns") deliberately forbids.

## The phone-height truth (measured, not judged)

Production main at 390 with the footer actually mounted (consent unanswered):
**5,913px** — the ≤5,000px law was ALREADY violated on main by ~913px (the
earlier "held" claims measured the unmounted placeholder state). This change
is height-neutral: after = 5,961px (+48). The diet to ≤5,000 is P1's own item,
next.

## Tests

- r349 colophon re-pinned to the one-row grammar (14 doors + no `.fo-lgroup`);
  r323 + r325 re-pinned to scroll the lazy footer in before measuring the gate.
- Unit: the contact-cell pin rides the row's tuple + the © literal door; the
  underline draw is hover-only (zero-`:focus-visible` family law holds).
- The r325 "translate family" local-only belt fails on pristine main too
  (pre-existing; the project is not in CI's `test:e2e`) — noted, not mine.
