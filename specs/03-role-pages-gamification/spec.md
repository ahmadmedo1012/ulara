# Feature Spec 03: role pages + the gamification layer (LEDGER slice C, part 2)

Status: Clarified by study. Source of truth: the study (specs/00),
`world.css`, the role page trees under `frontend/src/pages/{student,
teacher,admin,owner,institutional}/`, the existing gamification page
and its data.

## What a signed-in user sees and feels

Every role's pages inherit the warm world without losing their
density: tables become rounded/clipped, chips become pills, cards lift
on hover, the duotone icons replace any remaining legacy marks, and
the amber signal marks only what is genuinely reward-shaped. The
product stays a tool; the world makes it a kind one.

The gamification layer becomes real and visible: نقاط الإتقان (XP),
streaks, levels and badges render from the data the platform already
computes, presented in the reference's grammar (level ladder, streak
week, milestone messages) with university words. No new endpoints.
Where data is absent the surface says so honestly.

## The work, per family

- **Student (~35 routes):** dashboard, courses, schedule, results,
  library, MOOC, jobs, AI, gamification, skills, alerts, messages,
  social, downloads, university, live, payment, map, matrix, research,
  profile, webinars, labs, calendar, catalog, AR/VR, course detail,
  lecture player. Re-shape through tokens + world; page-specific
  sheets retired into the world where possible.
- **Teacher, Admin, Owner, Institutional:** the same pass over their
  trees; authoring surfaces (assignment authoring, attendance, grade
  flows) keep their logic, gain the world's shape.
- **Gamification surface:** the existing gamification page becomes the
  reference's 03/04/05 grammar made honest: a /N progress readout of
  real XP, a streak week row from real activity, the 20-level ladder
  with the generated badges (already built for the landing) driven by
  the real level rule, milestone text in the maturity voice. The
  approval/milestone messages speak university (إتقان، توثيق، انتظام),
  never childish reward talk.

## Measured facts to honour

- App type ladder (28–48px), 17px body floor, 44px hit floor.
- Cards 22px + double shadow; hover lift 3px + deeper shadow + gold
  border tint; pill chips; 14px fields; rounded tables.
- The level ladder reuses the landing's generated badges
  (rays 3→7, four ink tiers); no new assets.

## States and motion

- Every list: loading (shimmer), empty (honest line + door), error
  (retry card). Real data only.
- Press springs and hovers from tokens; the `+N` rise line (not
  confetti) confirms XP-earning moments the app already records.
- Reduced motion: everything settles instantly; ladders and streaks
  render statically.

## Responsive and theme

- Each family composed at 390/360/320/820; dense tables get the
  card-stack treatment already used in the app.
- Both themes; RTL; role tints (violet/teal/coral/sky/leaf families)
  keep their mobile-contract names.

## Honesty gates

- XP/streak/level/badge numbers come only from existing app data;
  a missing source renders a zero/hidden state, never a placeholder
  number.
- No endpoint, socket, or schema work in this slice; anything the
  surface needs but cannot get is listed in the ledger as an honest
  gap, not faked.

## Acceptance

- Sheets per family at 1440/820/390 × light/dark with critiques.
- The gamification page: a full behaviour pass (counter, streak row,
  ladder picker, milestone text) with zero console errors.
- Flow e2e suites that exist today (r325 flows) stay green; visual
  pins that only encoded the old look are updated per slice protocol.
- Overlap audit 0 findings; bundle ≤ 832 KB gz.
