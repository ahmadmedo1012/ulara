# R344 — «التطوير الفائق»: مطابقة المرجع بالتفصيل + صدق الخدمات + تنظيف المستودع

The owner's mandate (2026-11-20): enter the super-development phase — match the
retired reference (heronaiapp.com) in its fine details (scroll method, geometric
shapes, their appearance, overlap, motion), inspect/research/compare, write the
plan, execute with commits as we go, clean the repository to ONE branch (`main`),
and fix the services (mail via Resend, the failing production smoke, env hygiene).

Law unchanged (AGENTS.md): never paste the reference's source/text/images/fonts —
reproduce MEASURED parameters in our own code, in our own Arabic-first identity.
Fonts stay Alexandria/IBM Plex + Geistmono. The 770/92/110 ceilings never move.

## The state this round starts from

- `main` @ `4576b68` = the r342-final composite (PRs #7+#8+#9 merged, repaired,
  refined). CI green, size-gate green, deadcode green, production deployed
  (buildId `4576b689700d`, health ok). **Deploy smoke FAILED** on that SHA.
- The reference analysis (fresh, measured 2025-11-20, 1440×900): Lenis 1.1.5
  wrapper-mode + GSAP/ScrollTrigger/SplitText, ONE CSS-sticky pin (~5,413px),
  41 ScrollTriggers with the `top+=45% bottom`-style convention, drafting-board
  geometry (frame lines, rulers, crosshair, dashed hairlines, paper noise,
  corner-tick grid), SplitText line-mask reveals, pixel-dissolve button fill
  (`steps(19)` over a 20-slice mask sprite), preloader → `clip-path: inset`
  un-inset reveal, self-running CSS loop panels, canvas cursor with trail.

## The honest gap matrix (reference §H patterns × ULARA r342)

| # | Reference pattern | ULARA r342 state | r344 action |
|---|---|---|---|
| 1 | One sticky pin + scrub | journey pin (`--jt-scrub` 540dvh, house engine) | shipped |
| 2 | CSS-var page reveal | preloader clip-path wipe exit | shipped |
| 3 | Line-mask text reveals | R333 P-C + hero mask-line + statement A-I1 | shipped |
| 4 | `top+=45% bottom` reveals | `initReveals` house IO grammar | shipped |
| 5 | **Pixel-dissolve button fill** | **absent** (universal `.btn::before` ink slide) | **BUILD** |
| 6 | SVG self-drawing schematics | pains cards + preloader + cta sketch | shipped |
| 7 | N-fragment fly-in assembly | journey ghosts/stages assembly | shipped |
| 8 | Ruler/tick + crosshair targeting | hero inspection instruments + cursor | shipped |
| 9 | Drafting paper + corner-tick grid | paper/ink token ground + patterns | shipped |
| 10 | Dashed hairline system | pains meta rules + hero ruler + preloader | shipped |
| 11 | Self-running CSS loop panels | why-cycle scrub cross-fade (own mechanic) | own take |
| 12 | Canvas cursor + trail | SheetCursor | shipped |
| 13 | Direction-aware header | SheetNav on-scroll/on-hide | shipped |
| 14 | Statement scrub | statement word-ink scrub (useSheetScroll) | shipped |
| 15 | Cascade differential parallax | why cross-fade + reveals | shipped |
| 16 | Opposite marquee rows | patterns/Marquee (universities ticker) | shipped |
| 17 | Numbered hover callouts | hero deco cards / inspection stations | shipped |
| 18 | Counter preloader + glyph draw | Preloader (% counter + stroke-draw) | shipped |
| 19 | Lenis + single clock | sheetLenis on the conductor (rAF slept when idle) | shipped |
| 20 | Fluid vw-rem type | own token scale (fs-* rungs @1440/390) | own take |

**Conclusion: the ONE missing reference signature is the pixel-dissolve CTA
fill — that is r344's visual core. Everything else already carries a
measured, brand-native equivalent.**

## Wave A — the pixel-dissolve fill (the signature)

`A1` The sprite (OUR OWN, deliberately different grain): a dithered 4px-grid
mask, 20 slices, coverage ramp ~4%→100% with a fixed seeded pattern; shipped as
`frontend/public/media/brand/pixel-mask.svg`; consumed via `mask-image` +
`mask-size: 2000% 100%` + `steps(19)` tokenized in `shared/design-tokens.json`
(`--ease-pixel`) — generated through `npm run tokens:build`, never hand-edited.

`A2` The seat: `.btn--pixel` — an opt-in variant that masks the existing
`::before` wipe layer (the colors/contrast seats are UNCHANGED: accent still
wipes to the AA ink slab; light `#DB3A00` law untouched). Applied to the
landing's three signature buttons (hero accent, finale accent, nav masthead CTA).
Inner pages/auth keep the ink slide (contract-heavy surfaces untouched).

`A3` Contracts preserved: label swap + focus-visible + in-flight freeze
(`:not([data-loading])`) + reduced-motion (mask collapses — static final state)
+ `prefers-reduced-motion` static belt + RTL direction-neutral (the dither is a
temporal density dissolve, not a sweep). Transition property list contains no
layout properties (motion-gate §5 clean).

`A4` Tests: r308/r305 pins assert counts/geometry/a11y — untouched. New unit
pin: the `.btn--pixel` seats exist exactly where declared (landing-funnel's
ONE-accent law still holds — same elements, new variant class).

## Wave B — the services honesty (the owner's explicit asks)

`B1` **Deploy smoke** — the failure on `4576b68`: all 12 logins passed, then
`GET /me/dashboard → 403 INSTITUTION_CONTEXT_REQUIRED`. That is the t14
fail-closed context guard working AS DESIGNED (the chooser flow); the 1.0-era
smoke script predates it. Fix = the smoke walks the REAL student journey:
login → resolve an institution id → `POST /auth/select-institution` →
`/me/dashboard` 200; keep an explicit pass-note for the honest 403 shape.
Issues #5/#6/#11 close when the lane goes green.

`B2` **Mail via Resend** — the transport layer shipped in r323 and is honest-OFF
in production (no `MAIL_*` on Vercel). This round wires: `MAIL_PROVIDER=resend`,
`MAIL_API_KEY`, `MAIL_FROM=«أُلارا <onboarding@resend.dev>»`, `APP_ORIGIN`.
Measured reality (probed live): the provided Resend key is send-only and the
account has NO verified domain — `onboarding@resend.dev` delivers to the owner
address only; every other recipient is a 403 refusal the transport already
handles honestly (generic 200 + server warn, never a leak). Production mail is
therefore LIVE for the owner path and *domain-blocked* for the rest until a
domain is verified at resend.com/domains (an owner dashboard action — recorded
as the honest residual). Flip `MAIL_FROM` to `no-reply@<domain>` after.

`B3` **Database** — the provided Neon connection string was probed (102 tables,
the granular lineage + `0001`/`0002` ledger, 46 users): it IS the production
database Vercel already targets. No change; health verified (1679ms cold → ok).

## Wave C — the repository sweep (the owner's explicit ask)

`C1` After the PR merges: delete `feat/home-art-direction`,
`feat/home-editorial-scenes`, `feat/home-scroll-choreography`,
`feat/landing-motion-core`, `feat/landing-story-scenes`, `wip/homepage-final` —
**`main` becomes the only branch** (the owner's ruling supersedes the r342
"branches retained" note; git history keeps everything).
`C2` Local worktrees reconciled to main; stale sandbox probe files documented.
`C3` This directory (r344) records the wave log + evidence.

## Wave D — verification

- Local: `bash scripts/verify.sh` (full) on the branch before the PR.
- Browser: the landing's golden path on the deployed site (preloader → hero →
  journey scrub → finale pixel fill → footer), + the smoke lane green on main.
- Production: read-only probes only (health, landing renders, mail env resolved
  at boot via the serverless seatbelt — never destructive flows).
