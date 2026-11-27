# Feature Spec 02: the product shell (LEDGER slice C, part 1)

Status: Clarified by study. Source of truth: the study (specs/00),
`world.css`, `frontend/src/components/layout/**`, the app's current
shell sheets.

## What a signed-in user sees and feels

The product stops feeling like a different site. The rail, top bar,
mobile bar, palette and notifications all speak the warm world: cream
or night ground, 22px cards, pill rows, the duotone icon language,
one amber reward signal, calm app-scale type (28–48px ladder, not the
display ladder). It feels like the landing's quieter sibling: same
paper, same ink, less theatre.

## The pieces

- **Rail (wide screens).** Pill nav rows with the duotone glyphs, the
  active row carrying the amber pill treatment (the landing's stage
  pill grammar), sections grouped as today, collapse behaviour kept.
  44px hit floor, full keyboard loop, `aria-current`.
- **Top bar.** Page title, the theme control, notifications, the user
  chip; the collector idea returns HONESTLY here: the bar shows the
  user's real نقاط إتقان total and streak from existing data (no
  endpoint changes; read what the gamification pages already read).
  Where no data exists yet, the chip shows a real zero state, never a
  fake number.
- **Mobile bar + More sheet.** Bottom bar with the five primary
  destinations as today; More opens a bottom sheet with the world's
  sheet corners, grouped pill rows, and a drag/close grammar matching
  the landing's dialog grammar (blur, ×, Esc, focus trap).
- **Command palette.** Re-skinned: 22px panel, pill rows, the duotone
  glyphs, amber active row; logic untouched.
- **Notifications.** Panel re-skinned; unread is a text state plus the
  amber dot, never colour alone; empty state is one honest line.

## Measured facts to honour

- Bar heights and hit areas ≥ 44px; rail width as today (layout
  stability; no reflow of role pages in this slice).
- Type: app ladder only (28–48px headings, 17px body floor where the
  app already uses it); display type never enters the shell.
- Motion: press springs and hovers from tokens; nothing pinned,
  nothing scroll-driven inside the product.

## States

- Loading: shimmer in world shapes (placeholder until slice 05's
  skeleton component, then swap).
- Empty notifications/More groups: one line, one door.
- Offline/error: a small honest banner, not a takeover.

## Responsive and theme

- Light and dark; the shell is the product's night counterpart, an
  intended dark design, not an inversion.
- Phone: bottom bar + sheet; tablet: collapsed rail; wide: full rail.
- RTL: rail on the correct side, sheet gestures mirrored.

## Honesty gates

- Points/streak shown only where the data already exists in the app
  state the gamification pages consume; otherwise a zero state.
- No new endpoints, no new sockets, no badge counts that are not
  backed by a real query.

## Acceptance

- Sheets at 1440/820/390 × light/dark for rail, top bar, mobile bar,
  More sheet, palette, notifications, with critique lines.
- Keyboard: rail, palette, sheet, and notifications fully operable;
  focus ring visible; reduced-motion pass; zero console errors.
- Overlap audit 0 findings; all role pages still render (smoke).
