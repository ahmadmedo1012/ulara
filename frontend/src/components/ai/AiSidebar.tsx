/**
 * components/ai/AiSidebar.tsx — the side column (r351 AI-3): the
 * conversations list (open / current marker / two-step delete) and
 * the suggested prompts. Quiet labels, no section numerals — the chat
 * page is one surface, not a numbered report.
 */
import { AlertCircle, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Card, AlertRow } from '../primitives';
import { Skeleton } from '../primitives/States';
import { EmptyCell } from '../student';
import { Icon } from '../Icon';
import { formatRelativeAr } from '../../lib/format';
import type { AiConversation } from '../../hooks/resources/ai';

/* Local (de-exported in the r351 A3 debt-pay): no importer anywhere —
 * the component is consumed as JSX via the barrel, never as a type. */
interface AiSidebarProps {
  conversations: AiConversation[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  deleteError: string | null;
  deletePending: boolean;
  conversationId?: string;
  confirmDeleteId: string | null;
  busy: boolean;
  suggestions: readonly string[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onAskDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
  onSuggestion: (q: string) => void;
}

export function AiSidebar({
  conversations,
  isPending,
  isError,
  refetch,
  deleteError,
  deletePending,
  conversationId,
  confirmDeleteId,
  busy,
  suggestions,
  onOpen,
  onNew,
  onAskDelete,
  onDelete,
  onSuggestion,
}: AiSidebarProps) {
  return (
    <aside className="ai-side">
      <div className="ai-side-head">
        <h2 className="ai-side-label">محادثاتك</h2>
        <button type="button" className="btn ghost sm" onClick={onNew} disabled={busy}>
          <Icon icon={Plus} size={13} />
          جديدة
        </button>
      </div>
      <Card>
        {isPending ? (
          <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="list-row" aria-hidden>
                <div className="list-row-body">
                  <Skeleton width="70%" height={12} />
                  <Skeleton width="35%" height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <AlertRow
            color="red"
            icon={AlertCircle}
            title="تعذَّر تحميل المحادثات"
            actions={
              <button type="button" className="btn ghost sm" onClick={refetch}>
                <Icon icon={RefreshCw} size={13} />
                إعادة المحاولة
              </button>
            }
          />
        ) : conversations.length === 0 ? (
          /* The family's reserved-but-empty region (the §B2 hatched
           * cell) — r351 AI-3: the SHORT copy (one label, one note). */
          <EmptyCell label="لا محادثات بعد" note="ابدأ بسؤال وستظهر هنا." />
        ) : (
          <div className="flex-col">
            {deleteError && (
              <div className="ai-conv-error-pad">
                <AlertRow color="red" icon={AlertCircle} title="تعذَّر حذف المحادثة" description={deleteError} />
              </div>
            )}
            {conversations.map((c) => {
              const current = c.id === conversationId;
              const title = c.title ?? 'محادثة';
              const confirming = confirmDeleteId === c.id;
              return (
                <div key={c.id} className="list-row ai-conv-row" aria-current={current ? 'true' : undefined}>
                  <button
                    type="button"
                    className="list-row-body ai-conv-open"
                    onClick={() => onOpen(c.id)}
                    disabled={busy}
                    aria-label={`فتح محادثة: ${title}`}
                  >
                    {current && <span className="ai-current-dot" aria-hidden />}
                    <span className="list-row-title ai-conv-title">{title}</span>
                    <span className="list-row-sub">{formatRelativeAr(c.createdAt)}</span>
                  </button>
                  {confirming ? (
                    <div className="ai-conv-actions">
                      <button
                        type="button"
                        className="btn danger sm"
                        onClick={() => onDelete(c.id)}
                        disabled={deletePending}
                        aria-disabled={deletePending || undefined}
                        title="سيُحذف سجلّ هذه المحادثة نهائيًا"
                      >
                        <Icon icon={Trash2} size={13} />
                        تأكيد
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => onAskDelete(null)}
                        disabled={deletePending}
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="ai-conv-actions">
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => onAskDelete(c.id)}
                        disabled={busy || deletePending}
                        aria-label={`حذف محادثة: ${title}`}
                        title="حذف هذه المحادثة نهائيًا"
                      >
                        <Icon icon={Trash2} size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <h2 className="ai-side-label">أسئلة مقترحة</h2>
      <Card>
        <div className="flex-col gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSuggestion(q)}
              className="list-row"
              disabled={busy}
            >
              <Icon icon={Sparkles} size={14} />
              <span className="list-row-body text-sm ai-suggestion-text">{q}</span>
            </button>
          ))}
        </div>
      </Card>
    </aside>
  );
}
