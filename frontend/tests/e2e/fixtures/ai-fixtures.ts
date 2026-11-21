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
 *    factory (token frames + the done frame — the r323 wire grammar);
 *  · AI_SERVICE_STATUS / AI_CONNECTION_* — the owner console's
 *    GET /ai/status + POST /ai/status/check (r351 AI-4);
 *  · aiRoutes()         — the route list mock-transport's A3 marker
 *    block appends to the standard table.
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

/** The persisted turn both transports converge on. */
export function aiChatDone(opts: { reply?: string; model?: string } = {}) {
  return {
    conversationId: 'conv_fix_1',
    messageId: 'msg_fix_1',
    reply: opts.reply ?? 'جواب المساعد التجريبي',
    engine: 'local',
    model: opts.model ?? 'gap-aware-composer',
  };
}

/** The JSON grammar's full envelope (the r166d/r323 additive shape). */
export function aiChatJsonReply(opts: { reply?: string } = {}) {
  return aiChatDone(opts);
}

/** The SSE grammar (token frames + done + quota telemetry). */
export function aiChatSseReply(opts: { reply?: string; remaining?: number } = {}) {
  const done = aiChatDone(opts);
  const doneFrame = { ...done, ...(opts.remaining !== undefined ? { remaining: opts.remaining } : {}) };
  return [
    `event: token\ndata: ${JSON.stringify({ t: done.reply })}\n\n`,
    `event: done\ndata: ${JSON.stringify(doneFrame)}\n\n`,
  ].join('');
}

/* ── the owner console (r351 AI-4) ───────────────────────────────── */

/* GET /owner/ai-metrics — the OwnerAiPage metrics arm (chat feature,
 * a stable 7-day trend, 100% success — the hermetic steady state). */
export const OWNER_AI_METRICS = {
  totalRequests: 128,
  totalTokens: 46_800,
  successRate: 100,
  avgLatencyMs: 840,
  byFeature: [
    { feature: 'chat', count: 128, tokens: 46_800 },
  ],
  trend: [
    { date: '2026-11-15', count: 12 },
    { date: '2026-11-16', count: 18 },
    { date: '2026-11-17', count: 25 },
    { date: '2026-11-18', count: 14 },
    { date: '2026-11-19', count: 30 },
    { date: '2026-11-20', count: 21 },
    { date: '2026-11-21', count: 8 },
  ],
};

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
