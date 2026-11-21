import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '../../components/primitives';
import { Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader } from '../../components/patterns';
import { useReducedMotion } from '../../components/motion';
import { useAuthStore } from '../../stores/auth.store';
import {
  useAiChat,
  useAiConfig,
  useGaps,
  useAiConversations,
  useDeleteAiConversation,
  fetchAiConversationMessages,
} from '../../hooks/useResources';
import { apiErrorMessage, countAr } from '../../lib/format';
/* r323 B1.1 — the SSE streaming client (lib/ai-stream): fetch +
 * ReadableStream consumption, the pure frame parser, the typed
 * pre-stream HTTP error, the per-answer feedback call, and the daily
 * quota phrase matcher. The JSON mutation (useAiChat) STAYS as the
 * fallback transport — same endpoint, same engine, honestly labeled. */
import {
  AiStreamHttpError,
  canStreamAi,
  isDailyQuotaMessage,
  sendAiFeedback,
  streamAiChat,
} from '../../lib/ai-stream';
import { queryClient } from '../../lib/queryClient';
/* r351 AI-3 — the page is orchestration only; every presentational
 * piece lives in components/ai/* and the copy/tables in chat.ts. */
import {
  AiMessage,
  AiComposer,
  AiSidebar,
  AiGaps,
  AiGapsSkeleton,
} from '../../components/ai';
import {
  LOCAL_GREETING_STUDENT,
  LOCAL_GREETING_OTHER,
  REAL_GREETING_STUDENT,
  REAL_GREETING_OTHER,
  STUDENT_SUGGESTIONS,
  OTHER_SUGGESTIONS,
  PRIVACY_DISCLOSURE,
  DAILY_QUOTA_FALLBACK_NOTE,
  QUOTA_UNKNOWN,
  transcriptFromRows,
  apiErrorCode,
  type ChatMsg,
} from '../../components/ai/chat';
import '../../styles/ai.css'; /* r261: سطح المحادثة المركّز — البنية الجديدة فقط */
import '../../styles/shared/ds-research.css'; /* R305-A7 «ds»: لغة العائلة التقنيّة — يُستورد مباشرة بعد ai.css (عقد §0؛ يغذّي .r305rp .r305ai-* و سكة الإدخال) */
import '../../styles/student/pages.css'; /* EmptyCell (البطاقة المفرّغة للائحة المحادثات الفارغة) */

/** A conversation switch in flight / failed. */
type ConvLoad =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; id: string; message: string };

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const chat = useAiChat();
  const gaps = useGaps();
  const conversations = useAiConversations();
  const delConversation = useDeleteAiConversation();
  /* Which engine answers — drives the badge, the one-line description
   * and the greeting. Any non-local, non-null label is a REAL external
   * LLM; the label itself stays honest (gemini/openrouter/openai/…). */
  const aiConfig = useAiConfig();
  const isRealLlm = aiConfig.data?.provider != null && aiConfig.data.provider !== 'local';
  const reducedMotion = useReducedMotion();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const isStudent = user?.role === 'STUDENT';
  const greeting = isRealLlm
    ? isStudent
      ? REAL_GREETING_STUDENT
      : REAL_GREETING_OTHER
    : isStudent
      ? LOCAL_GREETING_STUDENT
      : LOCAL_GREETING_OTHER;
  const suggestions = isStudent ? STUDENT_SUGGESTIONS : OTHER_SUGGESTIONS;
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: 'bot', text: greeting }]);
  /* The transcript's initial greeting renders DERIVED from the config
   * (the state row is a placeholder instance): once the user sends
   * anything, the state-owned transcript takes over for good. */
  const transcript: ChatMsg[] =
    messages.length === 1 && messages[0]!.role === 'bot' && !messages[0]!.error
      ? [{ role: 'bot', text: greeting }]
      : messages;
  const [input, setInput] = useState('');
  const [convLoad, setConvLoad] = useState<ConvLoad>({ phase: 'idle' });
  /* Two-step delete confirm — clearing a conversation is destructive. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  /* The SSE streaming state machine. 'connecting' = the request is in
   * flight (no token yet); 'writing' = deltas are landing. The
   * AbortController rides a ref (stop cancels without a re-render). */
  const [streamPhase, setStreamPhase] = useState<'idle' | 'connecting' | 'writing'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  /* The daily-quota card state + the last known remaining count. */
  const [quotaLimited, setQuotaLimited] = useState<string | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number>(QUOTA_UNKNOWN);
  /* Transient «تم النسخ» state for the per-answer copy affordance. */
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copiedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  /* Everything that could strand or duplicate an in-flight exchange is
   * disabled while a reply or a conversation switch is pending. */
  const busy = chat.isPending || convLoad.phase === 'loading' || streamPhase !== 'idle';

  /* a11y — the busy-window focus restore: disabling the FOCUSED control
   * drops focus to <body>; track the last focused element and hand
   * focus back when the window closes (only if genuinely stranded). */
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const track = () => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el !== document.body) lastFocusedRef.current = el;
    };
    document.addEventListener('focusin', track);
    return () => document.removeEventListener('focusin', track);
  }, []);
  useEffect(() => {
    if (busy) return;
    const memo = lastFocusedRef.current;
    if (!memo || !memo.isConnected) return;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      memo.focus();
      lastFocusedRef.current = null;
    }
  }, [busy]);

  /* Auto-scroll only when the user is AT (or near ≤80px) the bottom —
   * a student scrolled up to reread is never yanked down. */
  const autoScroll = useRef(true);
  const handleScroll = () => {
    const el = scroller.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
  };

  useEffect(() => {
    if (!autoScroll.current) return;
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, chat.isPending, reducedMotion]);

  /* ── the reply delivery dispatcher ──────────────────────────────
   * The SAME user turn rides whichever transport the environment
   * supports, against the SAME endpoint (POST /ai/chat): STREAM
   * (default) then the JSON fallback for pre-stream transport
   * failures only — a REAL rejection renders honestly (re-asking
   * would double-consume the daily quota). */

  const openStreamingBubble = (streamed: { value: boolean }): void => {
    if (streamed.value) return;
    streamed.value = true;
    setStreamPhase('writing');
    setMessages((m) => [...m, { role: 'bot', text: '', streaming: true }]);
  };

  const appendToken = (delta: string): void => {
    setMessages((m) => {
      const next = [...m];
      const last = next.length - 1;
      if (last >= 0 && next[last]?.streaming) {
        next[last] = { ...next[last]!, text: next[last]!.text + delta };
      }
      return next;
    });
  };

  const deliverStreamed = async (t: string): Promise<void> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreamPhase('connecting');
    const streamed = { value: false };
    try {
      const done = await streamAiChat({
        conversationId,
        message: t,
        signal: controller.signal,
        onToken: (delta) => {
          openStreamingBubble(streamed);
          appendToken(delta);
        },
      });
      // The SERVER's final turn replaces the client buffer (honest by
      // construction — the persisted answer is exactly what renders).
      openStreamingBubble(streamed);
      setMessages((m) => {
        const next = [...m];
        const last = next.length - 1;
        const finalMsg = {
          role: 'bot' as const,
          text: done.reply,
          engine: done.engine,
          model: done.model,
          notice: done.notice,
          messageId: done.messageId,
        };
        if (last >= 0 && next[last]?.streaming) {
          next[last] = finalMsg;
        } else {
          next.push(finalMsg);
        }
        return next;
      });
      setConversationId(done.conversationId);
      if (typeof done.remaining === 'number') {
        setQuotaRemaining(done.remaining);
        setQuotaLimited(done.remaining <= 0 ? DAILY_QUOTA_FALLBACK_NOTE : null);
      }
      void queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    } catch (err) {
      if (controller.signal.aborted) {
        // STOP pressed — the server persisted nothing: the partial text
        // (if any arrived) stays as an honest untagged bubble; an empty
        // one disappears entirely.
        setMessages((m) =>
          m.flatMap((msg, i) => {
            if (i === m.length - 1 && msg.streaming) {
              return msg.text.trim().length > 0 ? [{ role: 'bot' as const, text: msg.text }] : [];
            }
            return [msg];
          }),
        );
        return;
      }
      if (err instanceof AiStreamHttpError) {
        if (isDailyQuotaMessage(err.serverMessage)) {
          setQuotaLimited(err.serverMessage);
          return;
        }
        setMessages((m) => [
          ...m,
          { role: 'bot', text: err.serverMessage, error: true, retryText: t, code: err.code },
        ]);
        return;
      }
      throw err;
    } finally {
      abortRef.current = null;
      setStreamPhase('idle');
    }
  };

  const deliverJson = async (t: string): Promise<void> => {
    try {
      const res = await chat.mutateAsync({ conversationId, message: t });
      setConversationId(res.conversationId);
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: res.reply,
          engine: res.engine,
          model: res.model,
          notice: res.notice,
          messageId: (res as { messageId?: string }).messageId,
        },
      ]);
    } catch (err) {
      const serverMsg = apiErrorMessage(err, '');
      if (serverMsg && isDailyQuotaMessage(serverMsg)) {
        setQuotaLimited(serverMsg);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: serverMsg || 'تعذَّر الاتصال بالمساعد الآن.',
          error: true,
          retryText: t,
          code: apiErrorCode(err) ?? undefined,
        },
      ]);
    }
  };

  const deliver = async (t: string): Promise<void> => {
    if (canStreamAi()) {
      try {
        await deliverStreamed(t);
        return;
      } catch (err) {
        if (err instanceof AiStreamHttpError && err.status === 401) {
          await deliverJson(t);
          return;
        }
        if (err instanceof AiStreamHttpError) {
          if (isDailyQuotaMessage(err.serverMessage)) {
            setQuotaLimited(err.serverMessage);
          } else {
            setMessages((m) => [
              ...m,
              { role: 'bot', text: err.serverMessage, error: true, retryText: t, code: err.code },
            ]);
          }
          return;
        }
      }
    }
    await deliverJson(t);
  };

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    await deliver(t);
  };

  /* Retry a failed exchange IN PLACE: the failed row is removed and
   * the same prompt re-delivered — no duplicate question bubble. */
  const retryExchange = (index: number) => {
    const failed = messages[index];
    if (!failed?.error || !failed.retryText || chat.isPending) return;
    setMessages((m) => m.filter((_, i) => i !== index));
    void deliver(failed.retryText);
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const copyAnswer = (index: number, text: string) => {
    const clip = navigator.clipboard;
    if (!clip) return;
    clip
      .writeText(text)
      .then(() => {
        setCopiedIdx(index);
        if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => {
          setCopiedIdx((cur) => (cur === index ? null : cur));
          copiedTimer.current = null;
        }, 2000);
      })
      .catch(() => undefined);
  };

  const rateAnswer = (index: number, messageId: string, rating: 1 | -1) => {
    setMessages((m) => m.map((msg, j) => (j === index ? { ...msg, rating } : msg)));
    sendAiFeedback(messageId, rating).catch(() => {
      setMessages((m) => m.map((msg, j) => (j === index ? { ...msg, rating: undefined } : msg)));
    });
  };

  /* Regenerate the LAST answer: the question is re-delivered in the
   * SAME conversation while the local log swaps the old answer out. */
  const regenerateAnswer = (botIndex: number) => {
    if (busy) return;
    let question: string | undefined;
    for (let i = botIndex - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') {
        question = messages[i]!.text;
        break;
      }
    }
    if (!question) return;
    setMessages((m) => m.slice(0, botIndex));
    void deliver(question);
  };

  const openConversation = async (id: string) => {
    if (busy || id === conversationId) return;
    setConfirmDeleteId(null);
    setConvLoad({ phase: 'loading' });
    try {
      const rows = await fetchAiConversationMessages(id);
      setConversationId(id);
      setMessages(transcriptFromRows(rows, greeting));
      setConvLoad({ phase: 'idle' });
    } catch (err) {
      setConvLoad({ phase: 'error', id, message: apiErrorMessage(err, 'تعذَّر فتح المحادثة.') });
    }
  };

  const startNewConversation = () => {
    if (busy) return;
    setConversationId(undefined);
    setMessages([{ role: 'bot', text: greeting }]);
    setConvLoad({ phase: 'idle' });
    setConfirmDeleteId(null);
  };

  const deleteConversation = async (id: string) => {
    try {
      await delConversation.mutateAsync(id);
      setConfirmDeleteId(null);
      if (id === conversationId) {
        setConversationId(undefined);
        setMessages([{ role: 'bot', text: greeting }]);
        setConvLoad({ phase: 'idle' });
      }
    } catch {
      setConfirmDeleteId(null);
    }
  };

  const askAboutGap = (conceptName: string) => {
    void send(`اشرح لي مفهوم «${conceptName}» — لديّ فجوة فيه.`);
  };

  const convList = conversations.data ?? [];

  /* The transcript's action-row context. */
  const greetingOnly = messages.length === 1 && messages[0]!.role === 'bot' && !messages[0]!.error;
  let lastAnswerIndex = -1;
  transcript.forEach((m, i) => {
    if (m.role === 'bot' && !m.error && !m.streaming && m.text.trim().length > 0) lastAnswerIndex = i;
  });

  const quotaRemainingLabel =
    quotaRemaining !== QUOTA_UNKNOWN
      ? countAr(quotaRemaining, [
          'سؤال واحد متبقٍّ اليوم',
          'سؤالان متبقّيان اليوم',
          'أسئلة متبقّية اليوم',
          'سؤالًا متبقّيًا اليوم',
        ])
      : null;

  return (
    /* r305rp: غلاف لغة العائلة التقنيّة — مقرّ أنماط r305ai-* (فقاعات
     * الردّ/السطور/الرقائق) من ds-research.css؛ الشريط العميق نفسه
     * تقاعد مع r351 AI-3 (الهدوء المقصود). */
    <div className="r305rp">
    <PageFrame>
      <PageHeader
        title="المساعد الذكيّ"
        description={
          isRealLlm
            ? 'نموذج لغويّ يرى إتقانك ومقرّراتك.'
            : 'مساعد تحليليّ محليّ بلا نموذج خارجيّ.'
        }
        actions={
          /* The badge names the real model when one answers — an LLM
           * badge on template replies (or the reverse) is a lie. */
          <Badge color="gold" icon={Sparkles}>{isRealLlm && aiConfig.data?.model ? aiConfig.data.model : 'AI'}</Badge>
        }
      />

      {/* The mastery-gaps context strip (students only) — the source
       * context above the surface; absence is honest absence. */}
      {gaps.isPending ? (
        <AiGapsSkeleton />
      ) : gaps.isError ? null : gaps.data && gaps.data.length > 0 ? (
        <AiGaps gaps={gaps.data} busy={busy} onAsk={askAboutGap} />
      ) : null}

      <div className="ai-layout">
        <section className="ai-surface" aria-label="محادثتك مع المساعد">
          {/* The one honest disclosure of the real-engine mode (one
           * quiet line — the old banded head duplicated the header). */}
          {isRealLlm && <p className="ai-privacy-line">{PRIVACY_DISCLOSURE}</p>}
          <div
            className="chat-area"
            ref={scroller}
            onScroll={handleScroll}
            role="log"
            tabIndex={0}
            aria-live="polite"
            aria-label="سجلّ المحادثة مع المساعد"
            aria-busy={busy}
          >
            {convLoad.phase === 'loading' ? (
              <div aria-busy="true" aria-live="polite" className="flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="chat-msg bot" aria-hidden>
                    <span className="r305ai-role">المساعد</span>
                    <div className="chat-bubble ai-bubble-skeleton">
                      <Skeleton width={i === 1 ? '90%' : '60%'} height={12} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {transcript.map((m, i) => (
                  <AiMessage
                    key={i}
                    msg={m}
                    index={i}
                    greetingOnly={greetingOnly}
                    isLastAnswer={i === lastAnswerIndex}
                    busy={busy}
                    copied={copiedIdx === i}
                    onCopy={copyAnswer}
                    onRate={rateAnswer}
                    onRegenerate={regenerateAnswer}
                    onRetry={retryExchange}
                  />
                ))}
                {convLoad.phase === 'error' && (
                  <div className="chat-msg bot">
                    <span className="r305ai-role">المساعد</span>
                    <div className="chat-error" role="alert">
                      <span>{convLoad.message}</span>
                      <button
                        type="button"
                        className="chat-retry"
                        onClick={() => void openConversation(convLoad.id)}
                      >
                        أعد الفتح
                      </button>
                    </div>
                  </div>
                )}
                {(chat.isPending || streamPhase === 'connecting') && (
                  <div className="chat-msg bot">
                    <span className="r305ai-role">المساعد</span>
                    {/* Pre-stream honesty: the reply is being prepared —
                     * once tokens flow, the growing bubble is the
                     * indicator. The text keeps the moment accessible
                     * (the dots alone say nothing to AT). */}
                    <div className="chat-typing">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="r305ai-status-text">المساعد يجهّز الردّ…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <AiComposer
            busy={busy}
            streaming={streamPhase !== 'idle'}
            input={input}
            quotaLimited={quotaLimited}
            quotaRemainingLabel={quotaRemainingLabel}
            isRealLlm={isRealLlm}
            setInput={setInput}
            onSend={() => void send()}
            onStop={stopStreaming}
            onQuick={(text: string) => void send(text)}
          />
        </section>

        <AiSidebar
          conversations={convList}
          isPending={conversations.isPending}
          isError={conversations.isError}
          refetch={() => void conversations.refetch()}
          deleteError={
            delConversation.isError
              ? apiErrorMessage(delConversation.error, 'لم تُحذف المحادثة — حاول مرة أخرى.')
              : null
          }
          deletePending={delConversation.isPending}
          conversationId={conversationId}
          confirmDeleteId={confirmDeleteId}
          busy={busy}
          suggestions={suggestions}
          onOpen={(id: string) => void openConversation(id)}
          onNew={startNewConversation}
          onAskDelete={setConfirmDeleteId}
          onDelete={(id: string) => void deleteConversation(id)}
          onSuggestion={(q: string) => void send(q)}
        />
      </div>
    </PageFrame>
    </div>
  );
}

/* r351 AI-3 — the pure helpers stay importable from the page path
 * (the unit-test pins' import surface is frozen). */
export { transcriptFromRows, apiErrorCode };
