/**
 * PrCallouts — R344-LS4 — the product captures' annotation overlays.
 *
 * Each real capture carries 2–3 drafting callouts: a mono chip naming
 * the capability VISIBLE IN THAT CAPTURE (never a feature the screen
 * does not show), a 1px leader line drawn chip→target, and a diamond
 * dot seated ON the target region. The overlay mounts inside the census
 * image boxes (.pr-img / .pr-rowimg) as decorative chrome — the
 * captures keep their own data-spec seats untouched.
 *
 * Geometry: the dot IS the anchor (--co-x/--co-y are physical % of the
 * capture box). `mode='lead'` hangs the chip LEFTWARD off the dot
 * (translate −100%); `mode='trail'` hangs it RIGHTWARD (row-reverse).
 * Choreography (platform.css): the group rides the house reveal rung
 * (RevealCssClass → .in-view); the callouts draw on a --pd delay ladder
 * (delays are the motion-token gate's documented exemption); the sweep
 * runs once and stops. Reduced motion: the global belt collapses
 * durations and delays — the furniture lands complete, nothing loops.
 */
import { RevealCssClass } from '../../../hooks/useReveal';

interface Callout {
  /* physical percent seats of the capture box (the dot's anchor) */
  x: string;
  y: string;
  text: string;
  /* lead = chip hangs leftward off the dot · trail = rightward */
  mode: 'lead' | 'trail';
  /* the stagger ladder (ms) */
  pd: string;
}

function CalloutRow({ c }: { c: Callout }) {
  return (
    <div
      className={`pr-co${c.mode === 'trail' ? ' pr-co--trail' : ''}`}
      style={{ ['--co-x' as string]: c.x, ['--co-y' as string]: c.y, ['--pd' as string]: c.pd }}
    >
      <span className="pr-co-t">{c.text}</span>
      <span className="pr-co-l" />
      <span className="pr-co-d" />
    </div>
  );
}

export function PrCallouts({ kind }: { kind: 'exam' | 'tutor' }) {
  const callouts: Callout[] =
    kind === 'exam'
      ? [
          { x: '86%', y: '33%', text: 'المؤقّت', mode: 'lead', pd: '260ms' },
          { x: '78%', y: '67%', text: 'تصحيح تلقائي للموضوعي', mode: 'lead', pd: '540ms' },
          { x: '18%', y: '52%', text: 'المقالية تصل إلى الأستاذ', mode: 'trail', pd: '820ms' },
        ]
      : [
          { x: '52%', y: '24%', text: 'سؤال الطالب', mode: 'lead', pd: '260ms' },
          { x: '60%', y: '68%', text: 'شروحات مخصَّصة', mode: 'lead', pd: '540ms' },
          { x: '62%', y: '88%', text: 'خطط مراجعة حسب الأداء', mode: 'trail', pd: '820ms' },
        ];
  return (
    <RevealCssClass as="div" className="pr-callouts">
      {callouts.map((c) => (
        <CalloutRow key={c.text} c={c} />
      ))}
      <span className="pr-sweep" />
    </RevealCssClass>
  );
}
