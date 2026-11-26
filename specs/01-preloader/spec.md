# Feature Spec 01: Preloader / boot sequence

Status: Clarified (no markers remain) | Source of truth: the r350 corpus (`docs/redesign/r350/reference/`) measured at 1440x1000 and 390x844.

## What a visitor sees and feels
- A full-screen paper sheet with a giant percentage counter at the top and a mono X/Y coordinate readout beneath it.
- Full-bleed horizontal and vertical hairlines with plus marks and mono coordinate labels frame the sheet.
- The title appears as four masked rows revealing line by line, with a mono spec sheet (type, founded, focus, location) and typed boot lines that lock to progress.
- A credit line at the foot. At 100% a wipe retires the sheet and the page is revealed under it.

## Measured facts (from the reference)
- Counter duration about 4.35 s, exit included about 6.9 s at 1440.
- Counter curve: fast to 45% in 0.9 s, slow 45 to 60% in 1.5 s, fast 60 to 100% in 1.8 s (samples in preloader-timeline.json).
- Anatomy: loading-progress (counter + item-bot coordinate), loading-ruler, loading-main > loading-content (title rows, spec sheet, boot lines, credit).
- Spec sheet and labels are mono 10 px; boot lines typed (TextPlugin style) and progress-locked.
- Exit: loading element goes display:none after the wipe.

## States and motion
- Counter runs on a three-phase ease; boot lines type in at fixed progress thresholds.
- Skip path: sessionStorage['ulara-intro-skip']='1' bypasses it (hermetic capture and returning visitors).
- Reduced motion: static sheet at 100%, no typing, immediate retire.

## Responsive and theme
- Phone: counter and title re-staged for 390 width, rulers keep plus marks, spec sheet collapses to two lines.
- RTL: counter stays Latin digits; title rows flow right to left; coordinates mirrored; light and dark both supported.

## Content that may differ (the 1%)
Title words, spec-sheet values and the credit line are ULARA's own Arabic copy (no reference text, no agency credit).

## Acceptance (written fidelity critique)
A side-by-side sheet at each viewport in the evidence folder, opened and critiqued, ending in an honest line: "nearly indistinguishable apart from language/brand".

## Clarifications (resolved by measuring, none open)
- Q: Does the counter curve differ on phone?
  A: Same three-phase curve; the corpus phone run shows the same breakpoints (measured, preloader-timeline.json).
- Q: What retires the sheet?
  A: A wipe then display:none; no fade (measured frames).
- Q: Is there sound or a skip control?
  A: None observed in the DOM.
