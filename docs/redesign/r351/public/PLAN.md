# r351 — A1 PUBLIC EXPERIENCE — PLAN

Branch `r351/public-experience` from `main`@`35793f7`. Docs folder: `docs/redesign/r351/public/`.

## Work packages (in order)

- **P0** — gap matrix: ULARA landing captured at the reference's measured scroll offsets
  (1440×900 + 390×844, wheel-free window.scrollTo — Lenis syncs via onNativeScroll), numbers
  + section map + per-section gap, in `GAP.md`. Raw shots in `shots/p0/`.
- **P1** — hero = the signature moment: ONE giant display H1 (masked line reveal), one lead,
  ONE primary CTA (label roll + fill wipe), drag-to-reveal instrument kept, hero stage
  decluttered (static zone labels + corner coords retire from the hero seat — they live on
  the journey plate; deco cards retire from the hero; login secondary stays in the masthead).
- **P2** — preloader: add the measured X:/Y: px readout + the ruler with plus marks; boot
  lines ≥10; keep the honest-timing contract (≥2000ms floor law — pinned, untouched).
- **P3** — scroll rhythm + height targets: tighten statement/pains/product/why/cta/footer to
  the reference's measured band heights; landing ≤13,255px @1440, ≤10,613px @390.
- **P4** — ink mask on the statement art (the shared displacement filter constants),
  footer logo pointer-lens, page transition curve verification (API untouched).
- **P5** — geometry motion + overlap/clip fixes + `r351-public-*` DOM-rect audit e2e.
- **P6** — copy cut (−50% rendered words; every section = heading + ≤1 sentence).
- **P7** — public chrome unification (masthead, footer, sheets, consent, auth, errors).
- **P8** — small screens (360/375/390/430/768, tap targets, reduced-motion static sheet).

## Gate discipline

`bash scripts/verify.sh --fast` per step; full `verify.sh` (+`--specs` when e2e touched)
before the PR; `typecheck:tests` rides verify.sh's tsc (tests tree included — verified in
tsconfig graph); `bash scripts/brand/zero-trace.sh` before every push.

## Ownership reminder

A1 owns `components/landing/**`, `styles/landing/**`, public pages, the motion engine,
assets, public tests. `App.tsx` — public-route block only. `components/motion/**` exported
API: additive-only (A2 depends on it). `Skeleton.tsx` belongs to A2 — never touched.
