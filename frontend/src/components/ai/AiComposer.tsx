/**
 * components/ai/AiComposer.tsx — the input rail (r351 AI-3): the
 * daily-quota state card, the quick chips (honest per engine mode),
 * the textarea (Enter sends / Shift+Enter breaks / IME safe) with the
 * send↔stop slot, and the two honest counters (draft length, remaining
 * asks). Presentational — the page owns send/stop and every string of
 * state.
 */
import { Clock3, Send, Square } from 'lucide-react';
import { Icon } from '../Icon';

export interface AiComposerProps {
  busy: boolean;
  streaming: boolean;
  input: string;
  quotaLimited: string | null;
  /** The honest remaining-ask label (null = server said nothing). */
  quotaRemainingLabel: string | null;
  isRealLlm: boolean;
  setInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onQuick: (text: string) => void;
}

export function AiComposer({
  busy,
  streaming,
  input,
  quotaLimited,
  quotaRemainingLabel,
  isRealLlm,
  setInput,
  onSend,
  onStop,
  onQuick,
}: AiComposerProps) {
  return (
    <div className="ai-composer">
      {quotaLimited && (
        <div className="ai-quota-card" role="status">
          <Icon icon={Clock3} size={16} className="ai-quota-icon" />
          <div className="ai-quota-body">
            <p className="ai-quota-title">وصلتَ حدَّ اليوم</p>
            <p className="ai-quota-note">{quotaLimited}</p>
          </div>
        </div>
      )}
      <div className="ai-quick-actions">
        {isRealLlm ? (
          <>
            <button type="button" className="ai-quick-chip" onClick={() => onQuick('لخّص لي الفصل الأخير من المقرّر')} disabled={busy}>
              لخّص الفصل الأخير
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => onQuick('أنشئ لي اختباراً قصيراً (5 أسئلة)')} disabled={busy}>
              اختبار قصير
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ai-quick-chip" onClick={() => onQuick('اشرح لي مفهوماً صعباً واجهته اليوم')} disabled={busy}>
              اشرح مفهوماً
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => onQuick('ما المفاهيم التي أحتاج إلى مراجعتها؟')} disabled={busy}>
              أسوأ فجواتي
            </button>
          </>
        )}
      </div>
      <div className="chat-input-row r305rp-next r305ai-input-rail">
        <textarea
          className="chat-input"
          placeholder="اكتب سؤالك…"
          aria-label="اكتب سؤالك للمساعد"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter breaks the line; IME composition
            // is never hijacked.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={busy}
          maxLength={4000}
          rows={1}
        />
        {streaming ? (
          <button
            type="button"
            className="btn accent chat-send ai-stop"
            onClick={onStop}
            aria-label="إيقاف التوليد"
            title="إيقاف التوليد"
          >
            <Icon icon={Square} size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn accent chat-send"
            onClick={onSend}
            disabled={!input.trim() || busy}
            aria-disabled={busy || undefined}
            aria-label="إرسال"
          >
            <Icon icon={Send} size={15} />
          </button>
        )}
      </div>
      {input.length > 3600 && (
        <p className="text-xxs text-subtle ai-counter">
          {input.length}/4000
        </p>
      )}
      {!quotaLimited && quotaRemainingLabel && (
        <p className="text-xxs text-subtle ai-counter ai-quota-remaining">
          {quotaRemainingLabel}
        </p>
      )}
    </div>
  );
}
