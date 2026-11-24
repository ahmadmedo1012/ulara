# R358 Reference-Spec — the measured reference (Phase A)

> **Instrument of record.** `scripts/audit/r358/reference-parse.mjs` parses the
> r350 corpus deterministically → `docs/redesign/r358/reference/reference-numbers.json`.
> The reference's live deployment is dark (404s — temporary demo); the corpus
> (full formatted stylesheet + measured timelines: preloader samples,
> ScrollTrigger dump, driven/mobile scroll states) is the sanctioned extraction
> record. A live-engine replay was probed and parked (re-initializing the real
> bundle on the saved mid-animation DOM explodes the layout to 33.5M-px
> wrappers — nested GSAP artifacts; probe evidence in the r358 ledger); the
> corpus parse + the r350 measured timelines cover every spec number below.
> Zero-trace: "the reference"; no names, domains, agencies.
>
> **The one sanctioned translation.** The reference's signal accent is a warm
> orange (`#fa3600` deep / `#f15534` measured accent). ULARA's signal colour
> stays ROYAL `#2540D9` (light) / `#8AA0FF` (dark) — the mission's single hue
> swap. Everything else matches the reference's construction. The warm coral
> family remains strictly decorative.

## 1. Type system — the fluid-root law (the headline finding)

The reference's root font-size is FLUID by breakpoint (parsed from the
inline stylesheet):

| Breakpoint | root font-size | Computed at 1440 / 991 / 390 |
|---|---|---|
| ≥ 992px (desktop) | 16px (no override) | 16px @1440 |
| ≤ 991px (tablet) | `1.1990407674vw` | 11.9px @991 · 9.2px @768 |
| ≤ 767px (mobile) | `2.5445292621vw` | **9.92px @390** · 9.16px @360 |

ALL rem-based type rides this root — the whole scale breathes with the
viewport on mobile (the "modern" feel). ULARA maps this to a fluid
`clamp()` ladder (Arabic floors respected).

| Role | Reference (parsed) | @1440 (root 16) | @390 (root 9.92) |
|---|---|---|---|
| `.heading.h1` | `5.6rem` · uppercase · tracking `-.02em` | 89.6px | — |
| `.tb-h1` (≤991) | `7.2rem` | — | 71.5px@991 · 39.7px@390 via `mb-h1` 4rem |
| `.tb-h2` (≤991) | `4.8rem` | — | 47.6px@991 · 26.5px@390 (`mb-h*` set) |
| `.tb-h4` (≤991) | `3.2rem` | — | 31.7px@991 · 17.7px@390 (`mb-h4` 2rem) |
| `.heading.h3` | `4rem` · weight 600 | 64px | — |
| `.txt-N` | `N/10 rem` (`txt-10`=1rem, `txt-12`=1.2rem, `txt-14`=1.4rem, `txt-16`=1.6rem) | 16 / 19.2 / 22.4 / 25.6px | 9.9 / 11.9 / 13.9 / 15.9px |
| `.txt-font-mono` | letter-spacing 0 · **uppercase** | mono micro-labels incl. the bracket indices | (r350 note records the micro seats at 10–14px absolute — the class ladder above is the mechanism; ULARA pins mono labels at 10–14px absolute with the 390 root ≈ 9.92px for the fluid seats) |
| `.heading` base | tracking `-.02em`, uppercase-capable, tight leading (`h1 7.2rem/1`) | | |

Fonts (parsed `@font-face`): display **BT Grotesk** 400/500/600/700 (commercial — banned for
ULARA per AGENTS.md) · mono **Geistmono** 500. ULARA keeps Alexandria (display) +
IBM Plex Sans Arabic (body) at these PROPORTIONS; Arabic-first law: letter-spacing 0
(the reference's `-.02em` tracking is a Latin-display device — Arabic never tracks).

## 2. Palette + the hairline law (parsed `:root`)

| Seat | Value |
|---|---|
| `--content--primary` (ink) | `#282828` |
| `--content--terriary` | `#282828b8` (88% ink wash) |
| `--content--granite-gray` | `#626260` |
| `--content--surface` | `#72726f` |
| `--content--border` (hairlines) | `#b3b3af` |
| `--content--disable` | `#b4b4b0` |
| `--content--brand` (deep signal) | `#fa3600` → **ULARA: `#2540D9`/`#8AA0FF`** |
| accent (measured usage) | `#f15534` |
| paper | `#fff` / `#fafafa` / `#e0e0da` |
| overlays | `#0000000a`–`#0000001a`, `#0006` |

**Geometry laws (parsed):**
- `--size--border: max(1px, .1rem)` — every border/ruler line is this HAIRLINE
  (scales 1px → 1.6px desktop, 1px floor mobile). ULARA already carries
  `neutral-300 #B3B3AF` ≡ the hairline colour.
- `--size--padding-hero: calc(4.4rem + 1rem*2)` — the hero band's top inset law.
- `--size--max-screen-height: calc(100dvh - 1.6rem)` — the sticky scene
  height law (the map/platform sequences ride this).
- `.home-intro-content { padding: 6.4rem 15rem 3.2rem }` — desktop container
  insets (15rem sides) — wide, airy gutters.
- `.header { top: .8rem }` · `.header-inner { transition: transform .4s }`
  (the hide-on-scroll masthead).
- Radii: none in the parsed grammar — sharp geometry (the r355 card-radii row
  is superseded for the landing; app surfaces keep their own token radii).

## 3. Section rhythm (corpus `driven-scroll-states.json` @1440)

| Section | top | height |
|---|---|---|
| hero | 7 | 987 |
| intro/statement | 993 | 723 |
| problem | 1716 | 743 |
| map (sticky scrub) | 2458 | **7,000** |
| platform (sticky tab rail) | 9458 | 710 |
| why | 10168 | 698 |
| use-case | 10867 | 987 |
| cta | 11853 | — |
| footer | ≈12700 | — |

Journey total: **14,057px** parsed (states census; REFERENCE.md recorded
13,255 with the engine running — use the states-JSON as the layout truth) ·
mobile journey ≈ 10,613px (r350 measured) · **41 ScrollTriggers, 0 pins**
(all stickiness is CSS position:sticky), 1 scrub census + section parallax.

## 4. Motion (parsed CSS census + measured timelines)

| Piece | Value |
|---|---|
| Transition census | `color .4s` ×27 · `opacity .4s` ×16 · `transform .4s` ×5 · `.5s` ×6 (hover/press family ~.3-.5s) |
| btn-fill micro | `border-color .3s, color .3s cubic-bezier(.625,.05,0,1)` |
| Preloader timeline | 60 samples · **8.85s** total incl. exit (r350 recorded counter ~4.35s + exit; the sample tail runs to 8.85s — the full boot moment) |
| Page transition (barba) | 0→50% inset ~0.6s power2.in, 50→0% ~0.7s power2.out (r350 measured) |
| Reveal grammar | ScrollTrigger `top+=X% bottom` starts, masked-line rises (r350 dump) |
| Ink displacement filter | feTurbulence 0.045/0.055 · octaves 4 · seed 5 · scale 100 · blur 1.8 · alpha slope 2.2 / intercept −0.6 |

## 5. Component anatomy (parsed + r350 notes)

- `.btn-fill` — full-width fill with brand border (hairline), label
  top/bot roll swap + fill wipe on hover; padded variants `1.2rem` with
  `height:100%`.
- Chrome: page frame hairline inset + `+` corner marks; ruler strips with
  crosshair marks + mono `X:/Y: …PX` readouts; dashed rules; marquee;
  custom cursor (desktop only, off on touch).
- Preloader: giant % counter + coordinate readout + ruler + masked line
  title + mono spec-sheet + typed boot lines (001–010) + credit + the
  1712×890 intro illustration.
- Mobile: journey shortens, root font fluid (2.5445vw), cursor off, hero
  interaction retained, different sticky wrapper.

## 6. Landing acceptance deltas (§7B)

Type ±1 step · spacing ±8px · motion ±100ms · same hierarchy · hero = ONE
large composed plate filling the fold (hero band ~987px @1440 with the
illustration dominating; ULARA's current hero plate ratio is measured in
the r358 scan and must land ≥ ~85% of the art band). Each section's delta
lands in `docs/redesign/r358/evidence/diff-report.md` with its side-by-side
sheet.
