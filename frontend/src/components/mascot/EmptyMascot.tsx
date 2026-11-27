import { Mascot, type MascotPose } from '../landing/r369/Mascot';

/**
 * EmptyMascot — نجّوم inside the PRODUCT (r369 slice 05 / spec 05).
 *
 * The ruling: the star stays OFF the public surface; inside the
 * product it may appear in EMPTY STATES ONLY — never during tasks,
 * never in flows that grade or record. This wrapper is the only
 * product seat: it applies the measured idle (a slow bob, ≥3s,
 * transform-only) and, for open-eyed poses, the occasional blink
 * (the .m369-eyes-open hook — both animations live in
 * r369-app.css §9 so prefers-reduced-motion kills them in one place).
 *
 * Always decorative here: the empty state it accompanies carries the
 * message (the SheetEmpty title/desc), so the mascot is aria-hidden.
 */
export function EmptyMascot({ pose = 'think', size = 64 }: { pose?: MascotPose; size?: number }) {
  return (
    <span className="g369-mascot-empty" aria-hidden="true">
      <Mascot pose={pose} size={size} className="g369-mascot-idle" />
    </span>
  );
}
