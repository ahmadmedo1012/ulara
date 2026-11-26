# Research notes

- Counter duration about 4.35 s, exit included about 6.9 s at 1440.
- Counter curve: fast to 45% in 0.9 s, slow 45 to 60% in 1.5 s, fast 60 to 100% in 1.8 s (samples in preloader-timeline.json).
- Anatomy: loading-progress (counter + item-bot coordinate), loading-ruler, loading-main > loading-content (title rows, spec sheet, boot lines, credit).
- Spec sheet and labels are mono 10 px; boot lines typed (TextPlugin style) and progress-locked.
- Exit: loading element goes display:none after the wipe.

Sources: `docs/redesign/r350/reference/REFERENCE.md`, `preloader-timeline.json`, `scroll-choreography.json`, `driven-scroll-states.json`, `scrolltrigger-dump.json`, `shots/`.
