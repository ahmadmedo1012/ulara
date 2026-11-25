# P2 FIDELITY-GATE — side-by-side sheets critique (r363)

Author: sheets sub-agent (P2-SHEETS). Read-only for the repo except this file + the four
`.webp` sheets beside it. Reference site is called **"refsite"** everywhere (zero-trace).

## 0. Sheets + provenance

| Sheet | Path | Size | Left column | Right column |
|---|---|---|---|---|
| footer @1440 light | `evidence/p2-footer-1440-light.webp` | 197 KB | r350 extraction stills `footer-top/footer-hover.webp` | cap `ulara-footer-1440-light/` f036, footer-settled, hover-04 |
| footer @390 light | `evidence/p2-footer-390-light.webp` | 109 KB | r350 still `m-footer.webp` | cap `ulara-footer-390-light/` f039, hover-04 |
| nav @1440 | `evidence/p2-nav-1440.webp` | 131 KB | r350 still `shot-top.webp` + 2 spec cards | cap `ulara-nav-1440-light/` f012 + 2 spec cards |
| cursor @1440 | `evidence/p2-cursor-1440.webp` | 88 KB | r350 stills + committed-CSS spec cards | cap `ulara-cursor-1440-light/` f010/f006/f007 @3x |

Corpus health (full detail: `/home/z/art/cap/MANIFEST.json`, `-notes.md`):

- **`refsite-footer-1440/` burst is MISLABELED**: all 19 frames show the refsite **hero**,
  not the footer. The three other refsite burst folders (`footer-390`, `nav-1440`,
  `cursor-1440`) are **EMPTY (0 frames)**. Every refsite-side cell therefore cites the
  committed r350 extraction stills (`docs/redesign/r350/reference/shots/`) — neutral
  filenames, in-repo, zero-trace safe. Wordmark/underline/cursor claims are additionally
  anchored in the committed `reference/refsite.css` / `header.html`.
- **Hover capture failure**: `hover-01..04` are **byte-identical** to `footer-settled`
  (max pixel diff 0) on both desktop and mobile — no drawn underline exists in any frame.
- `ulara-nav-1440-light` never captures the hidden-bar or menu-open states; the cursor
  burst never parks the glyph ON a link/button.

Sheet zooms are full-res crops; judging mixed vision-model reads with pixel measurements
(diff bboxes, accent-hairline scans, band profiles). All px figures are @1440 unless said.

---

## 1. p2-footer-1440-light.webp — footer @1440 light

**Point-by-point**

- **Composition.** refsite: dense ruled grid — 3 link columns (COMPANY/PRODUCT/RESOURCES)
  + a second ruled row (SUBSCRIBE/ADDRESS/NEW BUSINESS/SOCIAL), isometric mark on the
  right edge, everything sharing hairline borders. ulara: ONE horizontal index row of 14
  doors (12 tuple doors + funnel pair, `Footer.tsx:58–71`), right-aligned RTL identity
  band, early-access card, skyline strip, back-to-top, wordmark row + consent card, dark
  legal band. The one-row vs columns difference is the **owner-ruled adaptation**
  (audit R4/R11/R12: never columns, RTL mirror) → not a gap.
- **Density.** refsite ≈85% fill in the upper band; ulara carries deliberately larger
  empty-paper runs (identity band air, r348 values; mid-band blank where refsite packs
  columns). Reads airier than refsite at the same depth. See GAP-5.
- **Type — link row.** refsite: mono `txt-14` (14px), uppercase mono micro-labels for
  column heads, **persistent underline** under the mono link set. ulara: body face at
  `--fs-body` 13.33px w500, letter-spacing 0 (Arabic joins law, `footer.css:282–283`),
  mono reserved for the `[ INDEX · الفهرس ]` label. Size class matches (≈13–14px);
  uppercase/underline language differs — adjudicated Arabic mapping (audit R27) → ADAPT.
- **Type — giant wordmark (the big delta).** refsite: hairline outline "blueprint"
  letterforms with **tick marks + crosshair ornaments inside the letter construction**,
  spanning ~full width, **cap-height ≈180–200px** (measured on the still; visible clipped
  portion 130–140px). ulara: clean outline stroke, no letter-internal ornaments, band at
  y≈725–800 (≈75px tall; letters ≈45–50px cap; code `footer.css:638–654` font-size
  56.67px @1440, line-height .95, 1.5px stroke). **Ratio ≈0.25–0.3 of reference.** The
  in-repo r362 critique cite is "~62px" — which equals the owner token h1 (62.22px), so
  the record and the still disagree; needs owner arbitration. → GAP-2 (and GAP-4 for the
  lost ornament construction).
- **Hairlines.** 1px both sides, same muted register; wordmark band framed by rules and
  `+` marks on both (ulara's `+` live at band corners via `.fo-giant-plus`,
  `footer.css:686–696`). ulara loses vertical cell rules where bands are empty (no
  content to carry them) — consequence of the one-row law, cosmetic.
- **Colour.** Both hold paper/ink/secondary + ONE signal; refsite signal is orange-red,
  ulara royal blue — deliberate token swap (`tokens.generated.css`), discipline held.
- **Motion (consecutive frames).** f032→f034: CTA heading + wordmark/link row mid-rise
  (house register: 14px rise, 800ms quad-out, once). f034→f037: the **skyline strip's
  clip release is visible mid-flight** (large pixel diff y520–660) and the strip is fully
  painted in the settled state. This **contradicts audit R20** ("armed clip never
  releases; skyline never paints") for THIS capture — likely the capture ran with
  reduced-motion or the reveal fired. R20's static analysis stands; re-capture in armed
  mode before closing it.
- **Underline draw (money shot).** Not captured: hover frames byte-identical to settled;
  no accent-hairline rows found by pixel scan. Code law: `::after` 1px accent,
  `scaleX(0→1)`, `transform-origin: 100% 50%` (RTL inline-start → draws right→left),
  `--t-fast` 320ms (`footer.css:296–315`). Reference law (committed `refsite.css`):
  `.footer-link` = mono 14 **persistent underline** + hover **colour roll** to brand
  (`.3s`); policy items `.4s`; **no scaleX draw anywhere**. So the draw itself is the
  owner-ruled extrapolation (audit R8/R15–R18) → the *behavior* is ADAPT; the *evidence*
  is a capture gap → GAP-6 (re-shoot).

**VERDICT: ADAPT** — RTL/Arabic one-row law is deliberate and clean; real gaps are the
wordmark scale (vs the still) and the unprovable hover draw (capture).

---

## 2. p2-footer-390-light.webp — footer @390 light

**Point-by-point**

- **Composition.** refsite mobile (m-footer still): 2-column link grids
  (Company/Product/Resources) + subscribe + cookie bar; giant wordmark not visible in
  frame (capture ends above that band — cannot arbitrate whether mobile has one).
  ulara mobile: link rows → brand mark + mission → EARLY ACCESS panel → sketch strip →
  BACK TO TOP → giant wordmark band («أُلارا /// ULARA», hollow stroke, ≈7–8% of sheet
  height, ✳ flanks) → consent panel → dark legal band. Band order re-authored by design.
- **Link rows.** refsite keeps **2 columns** at mobile; ulara wraps the single row to
  **3 lines @390** (measured in the zoom strip; matches the LEDGER's own 3-line record).
  Anti-column ruling (R11/R13) → ADAPT.
- **Type.** ulara Arabic doors ≈13px (`--fs-xxs` phone block) vs refsite small caps
  labels — size class comparable; RTL alignment right — ADAPT.
- **Hairlines / colour.** 1px register matches; one-accent discipline matches (orange↔blue
  swap). Consent: refsite REJECT = outlined chip; ulara أرفض = bare text — owner ruling
  R23 (bare text) → ADAPT, not a gap.
- **Hover.** Same capture failure as desktop (frames byte-identical; no underline).
- **Anomalies.** Top row clipped by the viewport scroll position (not layout); zoom-crop
  edges clip text (sheet artifact). No overflow, no broken bands, no horizontal scroll.

**VERDICT: ADAPT** — mobile is a faithful re-authoring under the one-row/anti-column law;
only the hover evidence is missing (same GAP-6).

---

## 3. p2-nav-1440.webp — nav @1440

**Point-by-point** (row 1 = real captures; rows 2–3 = spec cards, no capture exists on
EITHER side)

- **Row 1 — header visible.** Bar cell order matches 1:1 per side in its own reading
  direction: logo cell inline-start → nav seats → trigger/cluster inline-end. Vertical
  hairline separators: PRESENT on both (ulara confirmed at full res f012; refsite per
  committed `header.html`). Bar height ≈48–52px vs ≈44–48px (~3.5% vs ~3.2% of
  viewport) — within tolerance; both bars transparent paper over the sheet, 1px bottom
  rule. **Labelled "Menu" trigger**: refsite has the mono label + 3-line burger at
  desktop; ulara shows icon-only trigger and **no labelled trigger ≥992px** → this is
  p2-nav-spec GAP-2, re-confirmed visually → GAP-3.
- **Type.** refsite nav = uppercase mono/grotesque micro-labels; ulara = Arabic body face
  at ≈13–14px. Arabic uppercase is N/A; family discipline differs by language → ADAPT.
- **Colour.** Both monochrome ink-on-paper + one signal at the login/CTA/active seats.
- **Row 2 — header hidden (spec cards).** Declared mechanics are equivalent: hide at
  >5× bar scrolling down (100ms debounce + guards on both per r331 decode), show on any
  upward scroll, inner bar `translateY(-101%)` on `.4s` ease. (Note: >1× bar is the
  "on-scroll" no-paint arming state, not a different hide threshold.) No frames on
  either side to arbitrate — untestable this round.
- **Row 3 — menu open (spec cards).** refsite: labelled trigger → 4 ruled `btn-fill`
  item cells (dual label roll, fill-wipe, arrow swap, corner brackets) + outline CTA
  cell; mobile-only CTA row in panel. ulara mobile: panel wipe `inset(0 0 100%)→inset(0)`
  0.4s + row mask-line stagger 0.25 (+0.02; CTA 0.2) on 0.8s power2.out — r331-measured
  parity already recorded. Architecture equivalent; desktop trigger + cell-level
  micro-interactions missing (GAP-3 again). No desktop-open capture exists anywhere.

**VERDICT: ADAPT** (row 1 strong parity; the labelled-trigger absence is the known,
self-declared GAP-3) — header hide/show unverifiable (capture), menu-open unverifiable.

---

## 4. p2-cursor-1440.webp — cursor @1440

**Point-by-point**

- **ulara observed (3× zooms, pixel-measured):** solid accent-blue **SQUARE ≈9–10px**,
  ALWAYS visible — present over empty ground (f010), unchanged over caption text (f006)
  and beside the outlined CTA (f007); 1px diagonal velocity trail present even at rest.
  No grow/state change anywhere in the burst.
- **refsite ground truth (committed `refsite.css` + rest still):** eased-follow point;
  inner glyph = **0.6rem (~5px) circle**, `border-radius: 50%`, ground #dd6013,
  **opacity 0 at rest** (`transition: all .4s`), appears/grows on interactive hover;
  velocity trail on the shared ticker; `display:none` on touch. The rest still shows
  **no glyph** over empty paper → the §b [STILL-PIN] evidence conflict is now settled on
  both sides: the reference is invisible-at-rest; ulara's r313 telemetry ("10px square
  read at rest") is confirmed as what the code actually renders.
- **Delta table:** shape square↔circle; rest visibility always-on↔hidden; size ~2×;
  colour blue↔orange signal; grow-on-hover absent↔present. All five properties diverge.
- **Capture limits:** no ulara frame parks the glyph ON a link or button (f007 is beside
  the CTA), and no refsite interactive-hover still isolates the grown glyph unambiguously
  (the hero-hover square may be art decoration) — grow behaviour is CSS-declared, not
  still-proven.

**VERDICT: GAP** — identity-level mismatch (shape + rest visibility + size + behaviour).
Fix: `SheetCursor.tsx` + `styles/landing/cursor.css` — swap the square for a
`0.6rem` circle, `opacity: 0` at rest, `transition: all .4s`, grow on
interactive-hover (link/button/text-input seats), keep the velocity trail and the
touch `display:none`; correct the stale telemetry comment (`SheetCursor.tsx:14–31`)
to match the measured truth first.

---

## 5. Ranked GAP LIST (real gaps only; deliberate adaptations marked ADAPT above)

1. **[P0] Cursor identity mismatch** — always-on ~10px accent square + rest trail vs the
   reference's invisible-at-rest ~5px circle that grows on interactive hover. Measured:
   9–10px square present over empty paper (f010 zoom); reference rest still shows none;
   committed CSS says opacity 0 at rest. Proposal: `SheetCursor.tsx` + `cursor.css` —
   circle 0.6rem, opacity 0 at rest, `transition: all .4s`, grow on interactive seats,
   keep trail + touch guard; fix the stale telemetry comment first. (Stills now settle
   p2-nav-spec GAP-1/GAP-4's [STILL-PIN].)
2. **[P1] Footer giant wordmark scale** — ulara ≈45–50px cap @1440 vs refsite ≈180–200px
   cap (still-measured); ratio ≈0.25–0.3. The in-repo record cites "~62px" (= the h1
   token — likely conflated). Proposal: owner arbitration, then `footer.css:638–654`
   clamp — literal 62px parity → cap `7.44rem`; ~50% of the still-measured reference →
   cap ≈ `11.5rem` (≈115px @1440). Do not move without the ruling.
3. **[P1] Desktop nav missing the labelled "Menu" trigger + menu register ≥992px**
   (p2-nav-spec GAP-2/GAP-5, re-confirmed on the sheet): refsite bar ends with mono
   "Menu" + burger and opens 4 ruled `btn-fill` cells + outline CTA; ulara shows an
   icon-only trigger. Proposal: `SheetNav.tsx` + `landing/nav.css` — add the mono
   "القائمة/Menu"-labelled trigger and the ruled item-cell register at ≥992; keep the
   mobile wipe choreography as measured.
4. **[P2] Wordmark construction ornaments** — refsite letterforms carry internal tick
   marks + crosshairs ("blueprint" construction); ulara's stroke is clean with `+` marks
   only at band corners. Proposal (if ruled a gap): an ornament pass on
   `.fo-giant-text` (background tick/crosshair layer or SVG stroke decoration in
   `Footer.tsx`); otherwise record as ADAPT in the ledger.
5. **[P2] Footer mid-band density** — ulara carries larger empty-paper runs than refsite
   at footer depth (identity-band air vs refsite's packed columns). Consequence of the
   one-row law; confirm with owner whether the air is intended (r348 values in
   `footer.css`) or should compress; do not re-grid into columns either way.
6. **[P2 — capture, not code] Hover-underline draw unprovable from this corpus** —
   hover frames byte-identical to settled on both viewports; draw law lives only in
   code (`footer.css:296–315`, scaleX origin 100% 50%, 320ms) + the previous round's
   `p2-footer-hoverdraw.webp`. Proposal: re-shoot the footer hover with the pointer
   held on a door across ≥3 burst frames inside the 320ms window; also re-shoot
   armed-mode footer (to re-arbitrate audit R20's skyline claim — this corpus shows the
   skyline PAINTED in the settled state), header-hidden, desktop menu-open, and cursor
   parked ON a link/button. Refsite-side burst folders (`footer-390`, `nav-1440`,
   `cursor-1440`) are empty and `footer-1440` is mislabeled (hero frames) — re-capture
   before the next gate round.

**Deliberate adaptations (ADAPT, no action):** one-row RTL door law (vs refsite columns);
colour roll/persistent-underline language replaced by the ruled scaleX draw; uppercase
mono Latin labels mapped to Arabic body face + mono micro-labels; orange→blue signal
swap; REJECT as bare text (R23); mobile 3-line wrap (anti-column law); band order
re-authoring on mobile.
