/**
 * components/ai/AiMessage.tsx — one transcript row (r351 AI-3):
 * the role label, the bubble (markdown-lite reply / verbatim user
 * text), the source chips (the citations' referent), the recoverable
 * error row, the streaming caret, the per-turn engine tags, and the
 * per-answer affordances (copy / thumbs / regenerate). Purely
 * presentational — the page owns every handler.
 */
import {
  Bot,
  Check,
  Copy,
  RefreshCw,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import { Icon } from '../Icon';
import { formatReplyBlocks } from '../../pages/student/aiReplyFormat';
import type { AiCitation } from '../../lib/ai-stream';
import type { ChatMsg } from './chat';

function RoleLabel({ who }: { who: 'bot' | 'user' }) {
  return (
    <span className="r305ai-role">
      <Icon icon={who === 'bot' ? Bot : UserRound} size={12} />
      {who === 'bot' ? 'المساعد' : 'أنت'}
    </span>
  );
}

/** User text renders VERBATIM (typed by a human, no markup to strip). */
function Multiline({ children }: { children: string }) {
  return (
    <>
      {children.split('\n').map((line, i) => (
        <p key={i} className={line ? 'r305ai-line' : 'r305ai-line r305ai-line--breath'}>
          {line}
        </p>
      ))}
    </>
  );
}

/** The assistant bubble's markdown-lite content. */
function ReplyText({ text }: { text: string }) {
  return (
    <>
      {formatReplyBlocks(text).map((block, i) =>
        block.kind === 'list' ? (
          <ul key={i} className="r305ai-list">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          block.lines.map((line, j) => (
            <p key={`${i}-${j}`} className={line ? 'r305ai-line' : 'r305ai-line r305ai-line--breath'}>
              {line}
            </p>
          ))
        ),
      )}
    </>
  );
}

/** The source chips — the referent of the reply's inline «المصدر:
 * [رقم]» citations (r351 AI-2/AI-3 parity with the mobile chips):
 * a chip WITH a url is an openable anchor (deep link to the
 * material); a chip without one is informational (its title carries
 * the locator). The index rides in mono — the same [رقم] the answer
 * itself prints. */
function CitationChips({ citations }: { citations: AiCitation[] }) {
  return (
    <div className="ai-cite-row" aria-label="المصادر">
      {citations.map((c) =>
        c.url ? (
          <a
            key={c.index}
            className="ai-cite-chip"
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            title={c.locator ?? c.title}
          >
            <span className="ai-cite-index">[{c.index}]</span>
            {c.title}
          </a>
        ) : (
          <span key={c.index} className="ai-cite-chip ai-cite-chip--info" title={c.locator ?? c.snippet}>
            <span className="ai-cite-index">[{c.index}]</span>
            {c.title}
          </span>
        ),
      )}
    </div>
  );
}

export interface AiMessageProps {
  msg: ChatMsg;
  index: number;
  /** No affordances on the greeting placeholder (no turn behind it). */
  greetingOnly: boolean;
  /** Regenerate belongs to the last completed answer alone. */
  isLastAnswer: boolean;
  busy: boolean;
  copied: boolean;
  onCopy: (index: number, text: string) => void;
  onRate: (index: number, messageId: string, rating: 1 | -1) => void;
  onRegenerate: (index: number) => void;
  onRetry: (index: number) => void;
}

export function AiMessage({
  msg: m,
  index: i,
  greetingOnly,
  isLastAnswer,
  busy,
  copied,
  onCopy,
  onRate,
  onRegenerate,
  onRetry,
}: AiMessageProps) {
  return (
    <div className={`chat-msg ${m.role}`}>
      <RoleLabel who={m.role} />
      {m.error ? (
        <div className="chat-error" role="alert">
          <span>{m.text}</span>
          {m.code && (
            <span className="r305ai-err-meta">
              <span>رمز الدعم:</span>
              <span className="r305ai-err-code">{m.code}</span>
            </span>
          )}
          {m.retryText && !busy && (
            <button type="button" className="chat-retry" onClick={() => onRetry(i)}>
              <Icon icon={RefreshCw} size={12} />
              أعد الإرسال
            </button>
          )}
        </div>
      ) : (
        <div className="chat-bubble">
          {m.role === 'bot' ? <ReplyText text={m.text} /> : <Multiline>{m.text}</Multiline>}
          {m.streaming && <span className="ai-stream-cursor" aria-hidden />}
          {!m.streaming && m.role === 'bot' && m.citations && m.citations.length > 0 && (
            <CitationChips citations={m.citations} />
          )}
          {m.notice && (
            <div className="font-mono text-xxs ai-engine-tag" role="status">
              {m.notice}
            </div>
          )}
          {m.engine && (
            <div className="font-mono text-xxs text-subtle ai-engine-tag">
              {m.model ?? m.engine}
            </div>
          )}
          {m.role === 'bot' && !greetingOnly && !m.streaming && m.text.trim().length > 0 && (
            <div className="ai-msg-actions">
              <button
                type="button"
                className="ai-msg-action"
                onClick={() => onCopy(i, m.text)}
                aria-label="نسخ الردّ"
                title="نسخ الردّ"
              >
                <Icon icon={copied ? Check : Copy} size={13} />
                {copied && <span className="ai-msg-action-note">تم النسخ</span>}
              </button>
              {m.messageId && (
                <>
                  <button
                    type="button"
                    className="ai-msg-action"
                    onClick={() => onRate(i, m.messageId!, 1)}
                    aria-label="ردّ مفيد"
                    aria-pressed={m.rating === 1 || undefined}
                    title="ردّ مفيد"
                  >
                    <Icon icon={ThumbsUp} size={13} />
                  </button>
                  <button
                    type="button"
                    className="ai-msg-action"
                    onClick={() => onRate(i, m.messageId!, -1)}
                    aria-label="ليس ردًّا مفيدًا"
                    aria-pressed={m.rating === -1 || undefined}
                    title="ليس ردًّا مفيدًا"
                  >
                    <Icon icon={ThumbsDown} size={13} />
                  </button>
                </>
              )}
              {isLastAnswer && (
                <button
                  type="button"
                  className="ai-msg-action"
                  onClick={() => onRegenerate(i)}
                  aria-label="إعادة توليد الردّ"
                  title="إعادة توليد الردّ"
                  disabled={busy}
                >
                  <Icon icon={RotateCcw} size={13} />
                  إعادة توليد
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
