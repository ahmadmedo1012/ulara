/**
 * ai-fixtures.ts — r351 AI-5: the hermetic AI corpus.
 *
 * The AI surfaces (/student/ai, /teacher/ai, /owner/ai) answered 501
 * in every hermetic journey until now — the page rendered its honest
 * error states instead of a conversation. This corpus gives the
 * assistant family its data:
 *
 *  · AI_SERVICE_CONFIG  — GET /ai/config (local mode: the honest
 *    default a bare deployment reports);
 *  · AI_CONVERSATIONS   — GET /ai/conversations (two rows);
 *  · AI_CONVERSATION_MESSAGES — GET /ai/conversations/:id/messages;
 *  · aiChatJsonReply()  — the POST /ai/chat JSON envelope factory;
 *  · aiChatSseReply()   — the POST /ai/chat?stream=1 SSE body
 *    factory (token frames + the done frame — the r323 wire grammar,
 *    citations included since AI-2's inline «المصدر: [رقم]»);
 *    consumed by the ai-assistant e2e journeys and pinned round-trip
 *    (factory output → the production createAiSseParser) by
 *    tests/unit/ai-fixtures-roundtrip.test.ts;
 *  · OWNER_AI_METRICS / AI_SERVICE_STATUS_LOCAL /
 *    AI_CONNECTION_CHECK_LOCAL — the owner console's
 *    GET /owner/ai-metrics + GET /ai/status + POST /ai/status/check
 *    (r351 AI-4). The AI ROUTES themselves (the A3 marker block) live
 *    in mock-transport.ts — this file is data only.
 *
 * Streaming note: MockRouteDef.fulfill is a static body — the SSE
 * reply arrives as one chunk (the parser splits frames; timing
 * realism is the live-path's job, not the hermetic one).
 */
import { FIXED_NOW_ISO } from './api-fixtures';

export const AI_SERVICE_CONFIG = { provider: 'local', model: null };

export const AI_CONVERSATIONS = [
  { id: 'conv_fix_1', title: 'خطة مراجعة قواعد البيانات', createdAt: FIXED_NOW_ISO },
  { id: 'conv_fix_2', title: null, createdAt: FIXED_NOW_ISO },
];

export const AI_CONVERSATION_MESSAGES = [
  { id: 'm1', role: 'USER' as const, content: 'ما المفاهيم التي أحتاج إلى مراجعتها؟', createdAt: FIXED_NOW_ISO },
  { id: 'm2', role: 'ASSISTANT' as const, content: 'ركّز على الاستعلامات المركّبة أولًا.', createdAt: FIXED_NOW_ISO },
];

/** One cited material — the backend's KnowledgeCitation shape (one
 * openable — a url — and one informational, so the chip grammar's
 * both branches are exercised by every journey that rides this
 * corpus). */
export const AI_CITATIONS = [
  {
    index: 1,
    title: 'محاضرة الاستعلامات المركّبة',
    locator: 'محاضرة 7 — دقيقة 12:40',
    url: 'https://example.invalid/materials/lecture-7',
    snippet: 'شرح الاستعلامات المركّبة مع أمثلة.',
  },
  {
    index: 2,
    title: 'ورقة عمل الفهارس',
    locator: null,
    url: null,
    snippet: 'تدريبات على الفهارس.',
  },
] as const;

/** The persisted turn both transports converge on. The ids ride the
 * opts so a journey can name its own conversation (the defaults are
 * the static corpus's ids) — consumed by the ai-assistant journeys
 * and pinned round-trip by tests/unit/ai-fixtures-roundtrip.test.ts. */
export function aiChatDone(
  opts: { reply?: string; model?: string; conversationId?: string; messageId?: string } = {},
) {
  return {
    conversationId: opts.conversationId ?? 'conv_fix_1',
    messageId: opts.messageId ?? 'msg_fix_1',
    reply: opts.reply ?? 'جواب المساعد التجريبي',
    engine: 'local',
    model: opts.model ?? 'gap-aware-composer',
    citations: [...AI_CITATIONS],
  };
}

/** The JSON grammar's full envelope (the r166d/r323 additive shape) —
 * same opts pass-through as the SSE factory (minus remaining, which
 * is stream-telemetry only). */
export function aiChatJsonReply(
  opts: { reply?: string; model?: string; conversationId?: string; messageId?: string } = {},
) {
  return aiChatDone(opts);
}

/** The SSE grammar (token frames + done + quota telemetry). Ids and
 * remaining ride the opts through to the done frame. */
export function aiChatSseReply(
  opts: { reply?: string; remaining?: number; conversationId?: string; messageId?: string } = {},
) {
  const done = aiChatDone(opts);
  const doneFrame = { ...done, ...(opts.remaining !== undefined ? { remaining: opts.remaining } : {}) };
  return [
    `event: token\ndata: ${JSON.stringify({ t: done.reply })}\n\n`,
    `event: done\ndata: ${JSON.stringify(doneFrame)}\n\n`,
  ].join('');
}

/* ── the owner console (r351 AI-4) ───────────────────────────────── */

/* GET /owner/ai-metrics lives ONCE — `api-fixtures.OWNER_AI_METRICS`
 * (the owner dashboard's corpus). r351 integration: A2 and A3 each defined
 * the same interface with different numbers; the duplicate is gone, the
 * remaining single source is api-fixtures'. */

export const AI_SERVICE_STATUS_LOCAL = {
  provider: 'local',
  model: null,
  keyPresent: false,
  lastError: null,
  todayTokens: 0,
  local: true,
};

export const AI_CONNECTION_CHECK_LOCAL = {
  ok: false,
  local: true,
  message: 'الوضع المحليّ — لا يوجد مزوّد لفحصه. راجع وصفة الإعداد في docs/deployment.md §3.2.',
};
