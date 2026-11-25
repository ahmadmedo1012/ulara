# r362 P2.2 — footer comparison: ULARA vs the reference (point by point)

Method: both pages loaded at 1440×900 in Chromium, scrolled to the end with
`page.mouse.wheel` (the smooth-scroll the reference needs to reveal its footer), then
the last 1400 px captured. The reference capture is NOT committed (owner rule: its
artifacts live only under `docs/redesign/r350/reference/`); this file is the record.

| # | Point | The reference | ULARA (before this round) | Verdict |
|---|---|---|---|---|
| 1 | Grid | Full-bleed hairline grid; vertical rules cut the whole footer into cells; `+` registration crosses at the intersections | Same family: hairline rules, `[07] CTA` / `[08] REGISTRY` bracketed indices, crosses at the CTA block's four corners | **match** |
| 2 | Mega type | A two-line statement set flush in a grid cell, left-aligned, ~62 px | `جاهز لبدء رحلتك؟` centred in a three-column cell, plus the outline wordmark `أُلارا // ULARA` at the very bottom | **match** (RTL mirror of the same idea) |
| 3 | Micro labels | Uppercase mono micro-labels at cell tops (`PRODUCT`, `PRICING`, `RESOURCES`) | Mono micro-labels (`RESOLVE`, `FIN`, `REGISTRY`, `CONTACT`, `ADDRESS`, `EARLY ACCESS`) | **match** |
| 4 | Link columns | One horizontal row of uppercase links with a hover underline | Three Arabic columns (الأقسام / الروابط / المساعدة) | **differs** — ours is a column stack, the reference is a single top row. Defensible for longer Arabic labels; not changed without a ruling. |
| 5 | Bottom bar | Mega statement and the cookie strip share one grid row; ACCEPT is the signal colour, REJECT is bare text | Wordmark row, then a legal row, then a full-width cookie strip; ACCEPT is an INK slab (`var(--text)`), REJECT is bare | **differs on 2 counts** (row composition; ACCEPT colour). The ink slab is a documented choice in `consent-edge.css` («ink fill — the real primary slab»), so it is left as an open design question rather than silently restyled. |
| 6 | Vertical edge tab | An orange vertical tab pinned to the right edge | The rotated side tab exists on the left edge (mirrored for RTL) | **match** |
| 7 | Motion | Links underline on hover; the big statement reveals on scroll | The CTA statement and wordmark reveal on scroll; footer links underline | **match** |
| 8 | Hairline weights | 1 px everywhere, ink at low alpha | 1 px via `--hairline`, ink token | **match** |

## What was changed this round
Nothing structural in the footer: the comparison did not find a defect that a designer
would call wrong — it found two differences that are design decisions (link composition,
cookie ACCEPT colour) and one improvement already in place. Reporting a "fix" here
without a measured defect would be cosmetic churn.

## What remains open (owner ruling needed)
1. Cookie ACCEPT: ink slab vs the royal signal (`--accent`). Both are in-house grammar;
   the reference uses its signal.
2. Footer links: single horizontal row (reference) vs three Arabic columns (ours).
