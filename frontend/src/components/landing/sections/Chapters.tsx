/* P2-0 (r335 split) — [4] الفصول — the pinned map (the walkthrough).
 * r308: chapters 01–04 live in the pinned
 * «رحلة التعلّم» walkthrough. R315 (K-E): the 05–06 demo
 * rows are retired — the reference's map band is the
 * walkthrough alone; the honest ledger lives on
 * /capabilities.
 *
 * R342-04 — the head band is retired: the closing column IS the
 * section's own head (the reference's home-map content column —
 * chip + h2 + copy + the ledger), visible from frame one.
 *
 * R342-final — the walkthrough runs on the ONE scrubbed timeline
 * (journey/sceneChoreography.ts) on the house scrub engine (the
 * shared conductor via useSheetScroll inside the scene; the CSS
 * sticky pin stays — the reference's own architecture; the track
 * height is the deliberate --jt-scrub duration, not an arbitrary
 * 700dvh block). This section is a pure mount, no composer refs.
 *
 * R346 — the isometric port: the 2D floor-plan scene retires FROM
 * THE MOUNT (JourneyScene.tsx stays on disk for rollback — its r312
 * source pins keep reading it); the window now carries the ISO
 * CAMPUS SHEET + the r346 assembly choreography (see
 * journey/IsoJourneyScene.tsx). */
import { IsoJourneyScene } from '../journey/IsoJourneyScene';

export function Chapters() {
  return (
    <section className="chapters" aria-labelledby="chapters-title">
      {/* r360 F1 — the #chapters anchor moved to the mount-gate wrapper
       * (LandingPage) so hash navigation lands on the seat even while
       * the section is still unmounted; the aria-labelledby contract is
         unchanged (the h2 id rides inside). */}

      {/* r308 — «رحلة التعلّم»: the pinned walkthrough. Chapters
          01–04 play out across one persistent drawing while the
          scroll is the timeline (CSS sticky pin; stacked readable
          sequence ≤991px). R346: the walkthrough's drawing is the
          ISOMETRIC campus — the plate's fragments assemble as the
          scroll advances, the numbered system markers pop, the
          capability panel unfolds. The h2 (id=chapters-title)
          lives inside the closing column. */}
      <IsoJourneyScene />
    </section>
  );
}
