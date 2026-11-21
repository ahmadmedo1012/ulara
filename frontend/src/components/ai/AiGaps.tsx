/**
 * components/ai/AiGaps.tsx — the mastery-gaps context strip (r351
 * AI-3, student-only): the top-3 priority gaps as one-tap question
 * cards above the chat surface. The whole card is the button (the old
 * in-card «اسأل المساعد…» CTA line was a label duplicating the tap);
 * the percentage rides dir="ltr" so the bidi algorithm can never
 * split «42%» into «%200»-style debris inside the RTL row.
 */
import { AlertCircle } from 'lucide-react';
import { Icon } from '../Icon';
import { Skeleton } from '../primitives/States';

export interface AiGap {
  conceptId: string;
  conceptName: string;
  courseName: string;
  level: number;
}

export function AiGapsSkeleton() {
  return (
    <div className="ai-gaps" aria-busy="true" aria-live="polite">
      <div className="ai-gaps-head">
        <h2 className="ai-side-label">فجواتك</h2>
      </div>
      <div className="ai-gaps-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="ai-gap-card" aria-hidden>
            <Skeleton width="60%" height={10} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="45%" height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface AiGapsProps {
  gaps: AiGap[];
  busy: boolean;
  onAsk: (conceptName: string) => void;
}

export function AiGaps({ gaps, busy, onAsk }: AiGapsProps) {
  return (
    <div className="ai-gaps">
      <div className="ai-gaps-head">
        <h2 className="ai-side-label">فجواتك</h2>
        <p className="ai-gaps-hint">اضغط مفهومًا لطرحه على المساعد</p>
      </div>
      <div className="ai-gaps-row">
        {gaps.slice(0, 3).map((g) => (
          <button
            key={g.conceptId}
            type="button"
            className="ai-gap-card"
            onClick={() => onAsk(g.conceptName)}
            disabled={busy}
            aria-label={`اسأل المساعد عن مفهوم ${g.conceptName}`}
          >
            <div className="ai-gap-head">
              <Icon icon={AlertCircle} size={14} className="ai-gap-warn" />
              <span className="text-xxs text-subtle">{g.courseName}</span>
              {/* dir="ltr": the digits+percent stay one visual unit —
                  the bare «NN%» inside an RTL row could otherwise
                  shatter into mirrored debris. */}
              <span className="ai-gap-pct" dir="ltr">{Math.round(g.level * 100)}%</span>
            </div>
            <div className="ai-gap-name">{g.conceptName}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
