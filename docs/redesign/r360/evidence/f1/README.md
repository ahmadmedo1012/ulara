# F1 — landing length + perf evidence

## The height law (scripts/audit/r360-landing-height.mjs, deep-walked @final build)

```
320 -> 4635px   360 -> 4814px   390 -> 4980px   (all sections mounted)
```

Before the diet (r359-a1 merged tree): mobile landing ≈11,700px; after the journey
collapse alone: 7,866px. Rounds 1–10 of `styles/landing/r360-phone-diet.css` +
the journey phone collapse (journey.css ≤767: the sticky scrub retires for the
R342-11 static readable sheet) own the cut to ≤5,000. The 13px Arabic text
floor (tokens R197) is enforced on every diet rung (`max(13px, …)`).

## Lighthouse mobile (landing /, performance+accessibility, default Lantern, 5 runs, 2-core sandbox)

```
run1  PERF 0.78  A11Y 1  FCP 1.9s  LCP 2.4s  TBT 770ms  SI 2.0s  CLS 0.003
run2  PERF 0.85  A11Y 1  FCP 1.8s  LCP 2.4s  TBT 460ms  SI 1.9s  CLS 0.003
run3  PERF 0.79  A11Y 1  FCP 2.0s  LCP 2.4s  TBT 690ms  SI 2.0s  CLS 0.003
run4  PERF 0.84  A11Y 1  FCP 1.8s  LCP 2.1s  TBT 550ms  SI 2.0s  CLS 0.003
run5  PERF 0.73  A11Y 1  FCP 2.3s  LCP 3.1s  TBT 750ms  SI 2.3s  CLS 0.003
```

Before (r359-a1 reported): perf 62–71. A11Y 1.0 on every run. FCP/LCP 2.6/2.9 →
1.8–2.3/2.1–3.1 (best 1.8/2.1). Environment note: this sandbox is a 2-core VM
and the introGate itself skips the preloader on ≤2-core machines (R318 §C), so
these traces exclude the entrance entirely; the final production-URL
measurement is scheduled with the F10 sweep (real network + real CDN, no
localhost Lantern artifact).

## The structure diet (the load-bearing numbers)

```
entry chunk:         67 -> 29.9 KB gz (-55%)   authed shell + 6 sections ride lazy boundaries
boot modulepreload:  144 -> 107 KB gz          entry+react+query+lucide
sections chunk:      6 lazy chunks -> 1 x 25KB gz (scroll-time, off every boot)
bundle ceiling:      845 -> 865 KB gz (+2.4%, documented in check-bundle-size.mjs)
theme-twin rasters:  both light+dark fetched -> display-defer (non-active theme never fetches)
preloader counter:   60Hz setState -> direct DOM writes (react scripting −800ms @4x)
stylesheet:          render-blocking -> media=print + preload twin (the boot plate gates the fade)
hero H1:             mask-reveal -> paints revealed (the LCP tail retired)
chapters CMS ledger: 4 stacked rows -> 2x2 grid; footer col2 groups pair into a 2-col grid
```

## Verification

- typecheck ×4 trees green; vitest frontend 3083/3083 (TZ=UTC); e2e r308+r309
  27/27; shell-chrome 10/10; bundle gate PASS (865 ceiling); csp-hash green
  (pins refreshed in app.ts + vercel.json).
- 0 horizontal overflow, 0 console errors, 0 sub-44px tap targets, 0 blank
  mounts @390 light+dark (the one inline legal link gained its hit-area pad).
