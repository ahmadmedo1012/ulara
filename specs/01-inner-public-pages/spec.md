# Feature Spec 01: the inner public pages (LEDGER slice B)

Status: Clarified by study; templates defined below. Source of truth:
the reference study (specs/00), the landed landing page, and the
current routes in `frontend/src/App.tsx` + `frontend/src/pages/**`.

## What a visitor sees and feels

Every public route speaks the same warm world the landing already
speaks: cream paper or indigo night, the circled-index kicker, the
huge friendly Arabic headline with one underlined amber word, 22px
cards, pill actions, the five-fact honesty voice. Each page is one
clear argument with one primary action, real loading/empty/error
states, and the same nav, stage rhythm (where the page tells a story),
and footer the landing uses.

## Templates (the LEDGER named T1–T5 without definitions; this spec fixes them)

- **T1 · Article** — long-form reading: prose column (max ~70ch),
  pull facts as pill chips, sticky in-page index on wide screens.
  Used by: legal pages, about.
- **T2 · Hub** — a kicker + headline + grid of cards linking onward,
  with search or filter where the set is large. Used by: help,
  colleges, competitions.
- **T3 · Detail** — one entity: headline band, fact rail, tabbed or
  banded body, related cards at the foot. Used by: college detail,
  leaderboard.
- **T4 · Showcase** — the landing's grammar reused: numbered bands,
  one interactive moment per band, media plates. Used by: campus,
  capabilities, vision.
- **T5 · Focus** — one job, centred card, no stage nav: auth
  (login/register/forgot/reset), contact, app download, 404.

## The routes (14; the LEDGER said 13 — see README open questions)

| route | template | content | states to build |
|---|---|---|---|
| /about (نبذة) | T1 | mission, the independence paragraph, facts row | static |
| /help | T2 | help topics grid, search, contact door | empty search result |
| /contact | T5 | form (name, email, topic, message), success panel | sending, sent, error |
| /app | T5 | download doors (iOS/Android/web), feature chips | static |
| /legal/* | T1 | the existing legal sheets re-shaped | static |
| /colleges | T2 | college cards from live data | loading skeleton, empty, error |
| /leaderboard | T3 | ranked table, period switch | loading, empty, error |
| /colleges/:id | T3 | college facts, colleges' media, programmes | loading, not-found, error |
| /campus | T4 | campus media bands | loading plates |
| /capabilities | T4 | capability bands with the duotone icons | static |
| /vision | T4 | vision bands | static |
| /competitions | T2 | competition cards, status chips | loading, empty, error |
| /auth/* (4 routes) | T5 | existing auth flows re-shaped, logic untouched | as today |
| 404 | T5 | one headline, one door home, one door back | static |

## Measured facts to honour (from the study)

- Section heads 85px cap at 1.06 leading; article heads 46–72px.
- Band padding 96–176px; a page is dense because of content, not air.
- Kicker: circled index + spaced label, same component the landing
  uses; page-level kickers may number within the page.
- One emphasised word per headline: colour + hand-drawn underline.

## States and motion

- Reveals: the landing's once-only, below-the-fold, print/hash-safe
  pattern; staggered settle capped at six children.
- Loading: shimmer skeletons in the world's shapes (the real skeleton
  component arrives in slice 05; until then, token-correct pulse
  placeholders, no spinners larger than 24px).
- Error: one card, one sentence, one retry button; never a red page.
- Empty: one card, one honest sentence, one useful door.

## Responsive and theme

- Every page composed at 390/360/320 and 820, not scaled; T4 bands
  stack, T3 fact rail becomes a card stack.
- Light and dark both designed; night variants only where the landing
  already uses night (showcase finales).
- RTL everywhere; the stage navigator appears only on T4 pages.

## Honesty gates

- Colleges, leaderboard, competitions render REAL data through the
  existing public endpoints; no invented counts, no placeholder
  universities, no stock quotes. If an endpoint is missing, the state
  says so and offers the contact door.
- Legal pages keep the legal nine-link row and the independence
  paragraph contracts already pinned.

## Acceptance

- Side-by-side sheets per template at 1440/820/390, light and dark,
  in `docs/redesign/r369/evidence/01-inner-pages/`, with a written
  critique per sheet ending in an honest line.
- A route sweep: all 14 routes load, tab-order is sane, one h1 each,
  focus ring everywhere, reduced-motion pass, zero console errors.
- The overlap audit stays at 0 findings at 7 widths × 2 themes.
