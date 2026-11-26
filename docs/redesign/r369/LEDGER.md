# r369 — LEDGER

One line per landed piece. The `NEXT: (final gate batch re-run after the last CSS edit — all green)
- tokens:check PASS · build PASS · bundle PASS (819.2 KB gz · entry 29.5)
- raw-css --strict PASS · colors --strict PASS · icons PASS · csp PASS ·
  zero-trace PASS · frontend vitest 247 files / 3046 tests green.

The next batch, in order of value:
1. DELETE the retired landing tree + sheets (components/landing/{sections,
   hero,journey,chrome,cursor,plates,kernel,patterns}, styles/landing/*
   minus r369.css + inner.css) together with the tests that still read
   them (assets.test's hero pin, r307-landing-media, r183-public-funnel,
   r305-shell-ds, r319-*). That is the "retire, don't pile up" debt this
   session consciously left, because deleting it without re-pinning those
   tests would have shipped a red suite.
2. Re-compose the public inner pages (about/help/legal/campus/capabilities/
   colleges/vision/competitions/auth doors/404) on the r369 primitives.
3. Re-skin the logged-in app surfaces + wire the gamification widgets to
   the EXISTING achievements/mastery/leaderboard data (no new endpoints).
4. Mobile: re-compose screens on the new tokens; dispatch android-apk.yml
   and build-ios-sidestore.yml.
5. Sound (off by default) + the owner decisions listed in the report.
6. Regenerate baselines (surface/a11y/stylelint/deadcode) from the final
   sources.
