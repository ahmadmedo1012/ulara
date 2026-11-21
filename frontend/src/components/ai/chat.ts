/**
 * components/ai/chat.ts — the AI chat surface's shared vocabulary
 * (r351 AI-3, extracted from the 1,376-line AiAssistantPage so the
 * page is orchestration only).
 *
 *  · ChatMsg — one transcript row (optimistic turns, failed exchanges,
 *    streaming bubbles, per-turn engine attribution).
 *  · transcriptFromRows / apiErrorCode — the pure helpers the page
 *    exported before (unit-test pin targets keep importing the page —
 *    they re-export from here).
 *  · the copy tables — SHORT by design (r351's content law): one
 *    greeting line, three suggestions, two local-honest quick chips.
 */
import type { AiMessageRow } from '../../hooks/resources/ai';

export interface ChatMsg {
  role: 'bot' | 'user';
  text: string;
  /** Failed exchange — renders as a recoverable error row with retry. */
  error?: boolean;
  /** The user text to re-send when retrying a failed exchange. */
  retryText?: string;
  /** The backend envelope's own support code (UPPER_SNAKE), verbatim. */
  code?: string;
  /** Per-turn engine attribution (the honest provider label). */
  engine?: string;
  /** Per-RESPONSE model attribution (the provider's own `model` field). */
  model?: string;
  /** The honest degraded-turn notice (quota spent → local composer). */
  notice?: string;
  /** Marks the bubble tokens are arriving into. */
  streaming?: boolean;
  /** The persisted assistant row's id (arms the feedback buttons). */
  messageId?: string;
  /** The optimistic thumbs state (±1; reverted if the write fails). */
  rating?: 1 | -1;
}

/* The greetings — ONE short line each (the old three-line intros
 * explained the engine twice; the header badge already carries the
 * mode). Honest in both directions, per the standing contract. */
export const LOCAL_GREETING_STUDENT =
  'مرحبًا! أحلّل إتقانك محليًّا وأقترح خطة مذاكرة لفجواتك. كيف أساعدك؟';
export const LOCAL_GREETING_OTHER =
  'مرحبًا! مساعد تحليليّ محليّ لأسئلة التدريس والتقييم. كيف أساعدك؟';
export const REAL_GREETING_STUDENT =
  'مرحبًا! أرى إتقانك ومقرّراتك لأجيب بما يناسب مستواك. كيف أساعدك؟';
export const REAL_GREETING_OTHER =
  'مرحبًا! أساعدك في التدريس والتقييم وتنظيم المقرّرات. كيف أساعدك؟';

/* r351: ≤3 suggested prompts (the old five-card wall was noise). */
export const STUDENT_SUGGESTIONS = [
  'ما المفاهيم التي أحتاج إلى مراجعتها؟',
  'اقترح خطة مذاكرة لفجواتي',
  'اختبرني في أضعف مفاهيمي',
] as const;
export const OTHER_SUGGESTIONS = [
  'اقترح طريقة لتقييم فهم الطلاب بعد المحاضرة',
  'كيف أصوغ أسئلة تقيس الفهم لا الحفظ؟',
  'اقترح أنشطة تفاعلية للمحاضرة',
] as const;

/* The honest privacy disclosure — ONE line, real-engine mode only. */
export const PRIVACY_DISCLOSURE =
  'تُرسَل رسائلك وبيانات إتقانك إلى مزوّد الذكاء الخارجيّ لتوليد الردّ.';

/* The daily-quota card's fallback note (the server's own rejection
 * copy wins when one arrived). */
export const DAILY_QUOTA_FALLBACK_NOTE =
  'انتهت حصّتك اليوميّة من الأسئلة — عُد غدًا.';
/** The streamed-turn quota sentinel: `done.remaining` omitted = unknown. */
export const QUOTA_UNKNOWN = -1;

/**
 * Map stored conversation rows to the transcript shape. SYSTEM rows
 * are dropped defensively; an empty result degrades to the welcome
 * bubble. Pure (DB-free pin target).
 */
export function transcriptFromRows(rows: readonly AiMessageRow[], greeting: string): ChatMsg[] {
  const mapped = rows
    .filter((r) => r.role !== 'SYSTEM')
    .map((r): ChatMsg => ({ role: r.role === 'USER' ? 'user' : 'bot', text: r.content }));
  return mapped.length > 0 ? mapped : [{ role: 'bot', text: greeting }];
}

/**
 * The backend error envelope's own support code, verbatim — the code
 * is UPPER_SNAKE and MEANT for a support chip; absent → null.
 */
export function apiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { error?: { code?: unknown } } } })
    ?.response?.data?.error?.code;
  return typeof code === 'string' && code.length > 0 && code.length < 64 ? code : null;
}
