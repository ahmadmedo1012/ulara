# r369 · phase 2 — evidence

What was actually looked at, what it showed, and what was changed because
of it. Every claim here was measured on the branch (`r369/new-identity`),
never inferred from the source.

Instruments (committed with this phase):

| file | what it does |
|---|---|
| `docs/redesign/r369/capture.mjs` | headless full-page + stepped-scroll frames at 390/768/1440/1920, light or `--dark`, intro skipped through its own session key. Drives the installed Chrome (`channel: 'chrome'`) because Playwright's own chromium build has no Ubuntu 26.04 package. |
| `docs/redesign/r369/audit.mjs` | the overlap/layering audit: 7 widths × both themes, fails on horizontal scroll, text-over-text, a CTA under a fixed layer, or a control below the 44px hit floor. |
| `docs/redesign/r369/verify.mjs` | scroll-engine probe: rail scale at rest vs mid-page, jar counter, and whether an anchor lands with its heading clear of the sticky nav. |

---

## S1 — icons

**What was wrong.** One stock `Star` carried twelve meanings across the
page (jar, brand mark, stat, streak, ladder, chips, bullet lists). In a
full-page capture it read as a placeholder set: every row of the product
strip wore the same glyph.

**What changed.** `frontend/src/components/icons/` — 46 original duotone
glyphs, one 24 grid, 2px round stroke, accent filled with `currentColor`
at 16 % (24 % in dark) so the second tone follows the text instead of
being a second palette. The landing now uses: star (reward), sparkle
(mission), flame (habit), ladder/target/clock (progress), graduation /
teacher / admin (roles), trophy / medal / certificate / leaderboard
(rewards), book / lecture / exam / assignment / grade (study), sun / moon
/ auto (theme). The shell's theme control moved to the new set as well.
Micro-motion is CSS only (twinkle, flicker, ring, nudge, draw, pop) with
one `prefers-reduced-motion` kill switch. `/__design` opens with the full
sheet, both themes.

**What remains.** Lucide is still the icon source for the legacy app
chrome (admin tables, dialogs). Replacing it wholesale is S7 work, not a
landing fix — and doing it in one sweep without an audit would be worse
than the status quo.

## S2 — scroll engine

**What was wrong.** The star jar filled from a one-shot
IntersectionObserver, so it was 0 or 6 and never in between; there was no
progress indicator; anchors dropped the reader under the sticky nav,
because no section had an id or a `scroll-margin`.

**What changed.** One rAF-throttled, passive scroll reader
(`useScrollProgress`) feeds both the 2px rail under the nav (amber, grows
with `transform: scaleX`) and the jar (0 → 6 continuously, RTL-correct
origin). Bands and the roles section got real ids (`#story`, `#levels`,
`#roles`) with `scroll-margin-block-start: var(--sp-11)` so a jump lands
with the heading visible under the bar. Reduced motion kills the rail
transition.

**Measured.** rail `matrix(0,…)` at rest → `matrix(0.6218,…)` at 55 % of
the page; jar 0 → 4 of 6; anchor click puts the `#levels` heading at
`top: 315` with the nav's `bottom: 71` — nothing hidden.

**What remains.** No pinned/sticky multi-scene storytelling (the brief's
S2d). It is a large, risky change to the band layout and I did not want to
ship a half-pinned page that breaks at 768–1024; it is the first item of
the next batch.

## S3 — reveal choreography

**What was wrong.** Content was hidden by CSS and force-revealed by a
1.2 s `setTimeout`. Two real consequences, both seen in capture: a
full-page screenshot showed bands with a heading and **no body at all**,
and a reader arriving by deep link could never reveal the band they were
looking at.

**What changed.** Inverted the contract: nothing is hidden by default.
The reveal arms ONLY an element that starts below the fold
(`data-reveal="pending"` set from JS after measuring), flips once to
`"in"`, and never re-hides on scroll-up. Print (`beforeprint`) and a
mid-page hash reveal everything immediately. Cards settle with a stagger
(`--motion-duration-micro` × index), opacity/transform only. The capture
rig now walks the page like a reader before the full-page shot.

**Measured.** After the fix the desktop full-page capture shows every
band body (phone mockup, progress card, three reward cards, streak strip,
20-level grid) — previously 4 of 6 bands were empty.

## S4 — overlap + layering

**What was wrong.** Ad-hoc z-indexes (0/1/55/60/900/1000) with no ladder;
nav links 41px tall, the brand link 34px, the theme control's option
buttons 30×28 — all under the 44px thumb floor at phone widths.

**What changed.** One ladder in `tokens.css`
(`--z-content/raised/sticky/nav/menu/dialog/cookie/toast/cursor`) and
every landing layer now picks a rung. Nav links, brand link and skip link
get a 44px hit height; the landing's theme control gets 44×44 per option.

**Measured.** `audit.mjs` → **0 findings** across 320/360/390/768/1024/
1440/1920 in light and dark: no horizontal scroll, no text-over-text, no
CTA under a fixed layer, no undersized hit target.

## The honest gaps

- The phone full-page capture ends in black after ~9 000px. That is a
  Chrome full-page compositing limit, not the page: the same region
  screenshotted in the viewport renders correctly (FAQ + CTA + footer
  verified individually).
- S5 (celebrate, mascot idle/blink/pointer-follow, press springs, custom
  cursor, sound), S6 (inner public pages), S7 (shell/role surfaces),
  S8 (baseline regeneration, Lighthouse) are **not** in this batch.
