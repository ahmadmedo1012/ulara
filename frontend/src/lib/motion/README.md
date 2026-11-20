# ULARA Motion Engine — the contract (home-scroll-choreography)

The guest sheet's motion runs on ONE system. Other agents never
implement a scroll engine, a ticker, or a pin — they consume the
surfaces below. Nothing here requires GSAP knowledge.

## The one clock

`lib/motion/sheetConductor.ts` («الناظم») is the single rAF loop for
the whole landing. It sleeps when idle (zero awake frames — the r313
contract) and batches geometry reads per frame. The guest smooth
scroll (`lib/motion/sheetLenis.ts`, Lenis 1.1.5) rides the SAME clock;
the GSAP engine (`lib/motion/engine.ts`, gsap 3.15.1 + ScrollTrigger)
is registered once at engine init and its scrubber is synced from
Lenis's own scroll events (`ScrollTrigger.update`). There are no
competing rAF loops and no second smooth-scroll implementation.

## For other agents — the three sanctioned surfaces

### 1. Scroll-linked frames: `useSheetScroll(ref, frame, options?)`

`lib/motion/useSheetScroll.ts` — the house scrub driver. Subscribe a
frame callback; it receives measured metrics (`rect`, `vh`,
`traversal`, `pin`), and you write CSS vars / dataset only — never
React state. Reads are batched per frame; writes are idempotent
(`setSheetVar` skips unchanged values). Current consumers: the
statement word-ink scrub (LandingPage), the why cross-fade
(WhyScene), the journey's deterministic fallback (JourneyScene).

### 2. Block reveals: the house IO grammar (unchanged)

`lib/reveals.ts` arms the second half's reveal classes
(`.reveal-up`, `.reveal-card`, `.reveal-rise-h`, the rule draws) and
flips `.in-view` — one-shot, fling-hardened, RM-bailed. JSX authored
for it: the selectors it owns are documented in its header. Do NOT
add new hiding classes to stylesheets — content ships visible.

### 3. The pinned scene: the journey (owned — do not re-drive it)

`components/landing/journey/JourneyScene.tsx` + `journey/sceneChoreography.ts`
run the chapters walkthrough on ONE scrubbed GSAP timeline, scrubbed
by ONE ScrollTrigger (`journey-sequence`; the entrance runway is
`journey-drift`) over the CSS-sticky pin. The scene clock:
`t = 5.52 · seqU^(1|0.55)`; the discrete machine derives
`data-stage` (0..5), `data-finding` (0..5/done), `data-wash`
(none/lecture/checkpoint/exam/library/mastery) from it.

**Selectors/data attributes other agents may rely on:**

| seat | contract |
|---|---|
| `.jt[data-stage]` | 0 ghost/statement · 1 rooms · 2 card era · 3 findings · 4 annos · 5 close — CSS may key states off it |
| `.jt[data-wash]` | the bounded room highlight (chips, zones, leaders react via CSS — never via JS) |
| `.jt[data-finding]` | the `[nn/05]` counter + the intro card's finding rotation |
| `.jt[data-rm='on']` | the reduced-motion static sheet (every layer ON, camera full) |
| `.jt-close[data-open]` | the closing column's end state |
| `.jt-plan [data-xl='1'..'6']` | the plan's progressive layers — rest at the 18% ghost (r325 law); the timeline swaps each layer to 1 at its beat. **Do not write opacity on these groups or on `.pl-chip`/`.pl-zone` from JS** — the attr machine owns chips/zones, the timeline owns groups |
| `.jt-stack` | the entrance drift seat (`translateY`, driver-written) |
| `.jt-card1` / `.jt-card2w` | the two statement plaques' measured seats (plaque 1 stands at rest; plaque 2's wrapper rests at opacity 0 — r325 law) |
| `.jt-window .bp-svg` | the ONE plan instance; the ≤991 camera pans its `viewBox` (the R312 crop families) — nothing else may write it |

## Reduced motion (non-negotiable)

Under `prefers-reduced-motion: reduce`: no Lenis (`initGuestLenis`
returns false — native scroll), no ScrollTrigger, no timeline — the
journey paints its final sheet (`data-rm='on'`), reveals bail, the
progress rule never mounts. Motion code must treat `0ms` durations as
"play instant" (the tokens contract).

## The deliberate duration

The map band's track height = sticky frame + `--jt-scrub` (journey.css,
540dvh) — derived from the reference's measured 574vh pin scrub and
this scene's beat count. The ScrollTrigger windows re-derive from the
same box on every refresh; the sticky release and the scrub end
coincide by construction. **Do not hardcode track heights** — the CSS
var is the duration's single source.

## Engine seam (introspection only)

`window.__ulaMotionEngine` — read-only versions + the live
ScrollTrigger list (`triggers()`). `window.__ulaLenis` — the e2e
scroll-seating handle (r328 H7). Neither is a UI dependency.
