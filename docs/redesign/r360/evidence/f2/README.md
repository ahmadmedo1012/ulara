# F2 — hero scale evidence

## The gate (VLM point-by-point on the side-by-side sheets)

Desktop 1440 (sheet-1440-light-v2: LEFT reference / RIGHT ours):
1. Viewport fill: yes — the drawing spans ~73% of the viewport width
   (was 67%; the reference's own is ~71%), seats lower (the air lives
   above the roof, the reference's own law).
2. Dead band: none — the drawing's ground line meets the content band.
3. Balance: drawing + flanking trees fill the canvas, the headline
   anchored bottom, seats defined.
4. Verdict: "a designer could no longer argue the reference wins
   clearly on SCALE/FILL — v2 is fuller; the reference's edge is
   restraint, not scale. Pass."

Mobile 390 (sheet-390-light-v3): the drawing was a 149×213 letterboxed
sliver (the CSS box's 960/546 aspect lock was written for the FALLBACK
crop while the MOUNTED art is A2's own tall doc 390×560). The box now
aspect-locks to the doc: the drawing fills 374×441 (96% × 52% of the
viewport, zero letterbox). Verdict: "fills comparably, no dead band —
the dotted frame keeps the whitespace intentional. Pass."

## The numbers

```
desktop art:  967x470 (67% x 52%)  -> 1049x510 (73% x 57%)   [hro-art 94% -> 105%, stage pads 7.5%/1.5%]
mobile art:   149x213 effective     -> 374x441 (96% x 52%)   [box aspect 960/546 -> 390/560, the mounted doc's]
mobile seats: desktop vx/vy %      -> STATIONS_MOBILE (RTL-mirrored, pinned to the doc's own features)
hero law:     the mobile hero's paddings pay for the taller art (round 11) — the page law holds 4,980px @390
```

## Verification

- e2e r308+r309 27/27 (the mobile callout contract passes at 360/375/
  390/430 — the seats keep every marker + tag arm inside).
- typecheck green; the height law re-measured (4,980 @390).
