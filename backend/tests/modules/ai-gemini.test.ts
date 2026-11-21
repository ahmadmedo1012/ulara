/**
 * tests/modules/ai-gemini.test.ts — r351 AI-1: the Gemini wiring pins.
 *
 * Google's OpenAI-compatibility endpoint is a first-class transport.
 * These pins freeze the measured contract (docs read live at
 * implementation time, 2026-11-21):
 *  · base `https://generativelanguage.googleapis.com/v1beta/openai/`
 *    (trailing slash) joins with `/chat/completions` — no double slash;
 *  · the provider label is `gemini` (never `openai`) — the transport
 *    mode is not a vendor claim;
 *  · the OpenRouter-only `models` array NEVER rides a Gemini wire (the
 *    chain driver pins one `model` per attempt instead);
 *  · stream usage is requested (`stream_options.include_usage`) and
 *    parsed from the final chunk; absence stays an honest 0;
 *  · Gemini's extra delta fields (reasoning/extra content, thought
 *    signatures) never leak into the student's content;
 *  · the ordered model-chain fallback runs on 429/503 ONLY — auth
 *    (401/403), model id (404), payload (400), timeout and the
 *    non-503 5xx (500/502) surface immediately without burning the
 *    second model's quota;
 *  · per-response model attribution survives the fallback (the second
 *    model's own `model` field is the truth, never the configured id).
 *
 * All fetch calls are stubbed — zero network, zero keys (the owner's
 * pasted key never appears anywhere; the key here is a placeholder).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  AI_TEMPERATURE,
  AI_MAX_OUTPUT_TOKENS,
  AiProviderError,
  buildChatMessages,
  callOpenAiCompatible,
  callProviderWithRetry,
  isGeminiBaseUrl,
  GEMINI_BASE_HOST,
  providerLabelFromBaseUrl,
  providerFailureMessage,
  streamOpenAiCompatible,
  streamProviderWithChain,
  providerHealthCheck,
  type AiProviderConfig,
} from '../../src/lib/ai.js';

const GEMINI_BASE = `https://${GEMINI_BASE_HOST}/v1beta/openai/`;
const GEMINI_URL = `${GEMINI_BASE}chat/completions`;

const CFG: AiProviderConfig = {
  baseUrl: GEMINI_BASE,
  apiKey: 'test-key-placeholder',
  model: 'gemini-3.1-flash-lite',
  models: [],
  timeoutMs: 1000,
};

const CFG_CHAIN: AiProviderConfig = {
  ...CFG,
  // The deployment recipe's ordered pair (docs/deployment.md §3.2).
  models: ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

const jsonRes = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const sseRes = (frames: string[], status = 200): Response =>
  new Response(frames.join(''), {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });

describe('isGeminiBaseUrl + providerLabelFromBaseUrl (the honest label)', () => {
  it('labels Google\'s compat endpoint gemini — the transport mode is not a vendor claim', () => {
    expect(providerLabelFromBaseUrl(GEMINI_BASE)).toBe('gemini');
  });

  it('isGeminiBaseUrl is host-scoped (a lookalike host is NOT Gemini)', () => {
    expect(isGeminiBaseUrl(GEMINI_BASE)).toBe(true);
    expect(isGeminiBaseUrl(`https://${GEMINI_BASE_HOST}.evil.example/v1/`)).toBe(false);
    expect(isGeminiBaseUrl('https://generativelanguage.evil.example/v1beta/openai/')).toBe(false);
    expect(isGeminiBaseUrl('https://api.openai.com/v1')).toBe(false);
    expect(isGeminiBaseUrl('not a url')).toBe(false);
  });

  it('the other known labels are untouched (openai/openrouter stay themselves)', () => {
    expect(providerLabelFromBaseUrl('https://api.openai.com/v1')).toBe('openai');
    expect(providerLabelFromBaseUrl('https://openrouter.ai/v1')).toBe('openrouter');
  });
});

describe('the Gemini wire (URL join + headers + body)', () => {
  it('joins the trailing-slash base with /chat/completions — no double slash, Bearer auth, no OpenRouter headers', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return jsonRes({
          model: 'gemini-3.1-flash-lite',
          choices: [{ message: { content: 'جواب قصير' } }],
          usage: { prompt_tokens: 12, completion_tokens: 7 },
        });
      }),
    );
    const out = await callOpenAiCompatible(CFG, buildChatMessages('sys', [], 'سؤال'));
    expect(out).toEqual({
      content: 'جواب قصير',
      inputTokens: 12,
      outputTokens: 7,
      model: 'gemini-3.1-flash-lite',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(GEMINI_URL);
    const init = calls[0]!.init as { headers: Record<string, string>; body: string };
    expect(init.headers.Authorization).toBe('Bearer test-key-placeholder');
    expect(init.headers['HTTP-Referer']).toBeUndefined();
    expect(init.headers['X-Title']).toBeUndefined();
    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body.model).toBe('gemini-3.1-flash-lite');
    expect(body.temperature).toBe(AI_TEMPERATURE);
    expect(body.max_tokens).toBe(AI_MAX_OUTPUT_TOKENS);
    // The OpenRouter-only `models` array never rides a Gemini wire.
    expect(body.models).toBeUndefined();
  });

  it('the chain driver pins ONE model per attempt (each call carries `model`, never `models`)', async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push((init.body as string));
        return jsonRes({
          model: 'gemini-4-hydrogen',
          choices: [{ message: { content: 'تم' } }],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        });
      }),
    );
    await callProviderWithRetry(CFG_CHAIN, buildChatMessages('sys', [], 'س'), () => undefined, () => Promise.resolve());
    expect(bodies).toHaveLength(1);
    expect((JSON.parse(bodies[0]!) as Record<string, unknown>).model).toBe('gemini-3.1-flash-lite');
    expect((JSON.parse(bodies[0]!) as Record<string, unknown>).models).toBeUndefined();
  });
});

describe('usage honesty (stream + non-stream)', () => {
  it('non-stream: the provider usage block is the ONLY token source', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonRes({
          choices: [{ message: { content: 'جواب' } }],
          usage: { prompt_tokens: 40, completion_tokens: 60 },
        }),
      ),
    );
    const out = await callOpenAiCompatible(CFG, buildChatMessages('s', [], 'q'));
    expect(out.inputTokens).toBe(40);
    expect(out.outputTokens).toBe(60);
  });

  it('non-stream: a MISSING usage block records 0 — never estimated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes({ choices: [{ message: { content: 'جواب' } }] })),
    );
    const out = await callOpenAiCompatible(CFG, buildChatMessages('s', [], 'q'));
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
  });

  it('stream: include_usage is REQUESTED and the final chunk\'s usage is parsed', async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(init.body as string);
        return sseRes([
          'data: {"model":"gemini-3.1-flash-lite","choices":[{"delta":{"content":"مرح"}}]}\n\n',
          'data: {"model":"gemini-3.1-flash-lite","choices":[{"delta":{"content":"با"}}]}\n\n',
          'data: {"model":"gemini-3.1-flash-lite","choices":[],"usage":{"prompt_tokens":25,"completion_tokens":11}}\n\n',
          'data: [DONE]\n\n',
        ]);
      }),
    );
    const deltas: string[] = [];
    const out = await streamOpenAiCompatible(CFG, 'gemini-3.1-flash-lite', [], (d) => deltas.push(d));
    expect(deltas.join('')).toBe('مرحبا');
    expect(out.content).toBe('مرحبا');
    expect(out.inputTokens).toBe(25);
    expect(out.outputTokens).toBe(11);
    expect(out.model).toBe('gemini-3.1-flash-lite');
    const body = JSON.parse(bodies[0]!) as Record<string, unknown>;
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it('stream: usage ABSENT from every chunk stays an honest 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          sseRes([
            'data: {"choices":[{"delta":{"content":"جواب"}}]}\n\n',
            'data: [DONE]\n\n',
          ]),
      ),
    );
    const out = await streamOpenAiCompatible(CFG, 'gemini-3.1-flash-lite', [], () => undefined);
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
  });
});

describe('Gemini delta hygiene (extra fields never leak)', () => {
  it('reasoning/extra content and thought signatures ride deltas without reaching the student', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          sseRes([
            // A reasoning-style delta: thinking text rides
            // reasoning_content, the visible answer rides content.
            'data: {"choices":[{"delta":{"reasoning_content":"أفكر خطوة خطوة داخليًا"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"الجواب"},"extra_content":{"thought_signature":"CkQB"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" هو 42"}}]}\n\n',
            'data: [DONE]\n\n',
          ]),
      ),
    );
    const deltas: string[] = [];
    const out = await streamOpenAiCompatible(CFG, 'gemini-3.1-flash-lite', [], (d) => deltas.push(d));
    expect(out.content).toBe('الجواب هو 42');
    expect(deltas).toEqual(['الجواب', ' هو 42']);
    // The internal reasoning and the signature never appear anywhere.
    expect(out.content).not.toContain('أفكر');
    expect(out.content).not.toContain('thought_signature');
  });

  it('a null content delta (choices present, content absent) is not content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          sseRes([
            'data: {"choices":[{"delta":{"content":null,"role":"assistant"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"سطر"}}]}\n\n',
            'data: [DONE]\n\n',
          ]),
      ),
    );
    const out = await streamOpenAiCompatible(CFG, 'gemini-3.1-flash-lite', [], () => undefined);
    expect(out.content).toBe('سطر');
  });
});

describe('error classes → honest Arabic with the right addressee', () => {
  const errorCase = (status: number, expectedKind: string, expectInMessage: string) => {
    it(`HTTP ${status} → kind=${expectedKind}, the Arabic message names the addressee`, async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('{"error":{"message":"nope"}}', { status })),
      );
      const err = await callOpenAiCompatible(CFG, buildChatMessages('s', [], 'q')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AiProviderError);
      const ape = err as AiProviderError;
      expect(ape.kind).toBe(expectedKind);
      expect(ape.status).toBe(status);
      expect(providerFailureMessage(ape.kind, ape.status)).toContain(expectInMessage);
    });
  };

  errorCase(400, 'provider_rejected', 'ضبط النموذج');
  errorCase(401, 'provider_rejected', 'مراجعة الإدارة');
  errorCase(403, 'provider_rejected', 'مراجعة الإدارة');
  errorCase(404, 'provider_rejected', 'مراجعة الإدارة');
  errorCase(429, 'rate_limited', 'انتظر دقيقة');
  errorCase(500, 'provider_error', 'حاول مرة أخرى');
  errorCase(503, 'provider_error', 'حاول مرة أخرى');

  it('without a status the per-kind defaults stand (other providers unchanged)', () => {
    expect(providerFailureMessage('provider_rejected')).toContain('تغيير صيغة السؤال');
    expect(providerFailureMessage('rate_limited')).toContain('انتظر دقيقة');
    expect(providerFailureMessage('timeout')).toContain('أعد المحاولة');
  });
});

describe('the ordered fallback (429/503 ONLY, attribution preserved)', () => {
  const noSleep = () => Promise.resolve();
  const log = () => undefined;

  it('429 on model 1 (twice) → model 2 answers → attribution is model 2\'s OWN reported id', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const model = (JSON.parse(init.body as string) as { model: string }).model;
        calls.push(model);
        if (model === 'gemini-3.1-flash-lite') {
          return new Response('quota', { status: 429 });
        }
        return jsonRes({
          model: 'gemini-4-hydrogen',
          choices: [{ message: { content: 'جواب البديل' } }],
          usage: { prompt_tokens: 9, completion_tokens: 4 },
        });
      }),
    );
    const out = await callProviderWithRetry(CFG_CHAIN, buildChatMessages('s', [], 'q'), log, noSleep);
    // model1 retried once (r176a) then fell through: 3 wire calls total.
    expect(calls).toEqual(['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen']);
    expect(out.content).toBe('جواب البديل');
    expect(out.model).toBe('gemini-4-hydrogen');
  });

  it('503 on model 1 → model 2 answers (the capacity class falls through too)', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const model = (JSON.parse(init.body as string) as { model: string }).model;
        calls.push(model);
        if (model === 'gemini-3.1-flash-lite') return new Response('boom', { status: 503 });
        return jsonRes({ model: 'gemini-4-hydrogen', choices: [{ message: { content: 'تم' } }] });
      }),
    );
    const out = await callProviderWithRetry(CFG_CHAIN, buildChatMessages('s', [], 'q'), log, noSleep);
    expect(calls[calls.length - 1]).toBe('gemini-4-hydrogen');
    expect(out.model).toBe('gemini-4-hydrogen');
  });

  it('non-503 5xx (500/502) SURFACES — only 429/503 fall through, other 5xx keep the honest manual retry', async () => {
    for (const status of [500, 502]) {
      const calls: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init: RequestInit) => {
          calls.push((JSON.parse(init.body as string) as { model: string }).model);
          return new Response('boom', { status });
        }),
      );
      const err = await callProviderWithRetry(CFG_CHAIN, buildChatMessages('s', [], 'q'), log, noSleep).catch(
        (e: unknown) => e,
      );
      // model 1 retried once on itself (the r176a transient policy), then
      // surfaced — model 2 is never billed for a non-capacity 5xx.
      expect(calls, `status ${status}`).toEqual(['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite']);
      expect(err).toBeInstanceOf(AiProviderError);
      expect((err as AiProviderError).kind).toBe('provider_error');
      expect((err as AiProviderError).status).toBe(status);
    }
  });

  it('401 (bad key) on model 1 SURFACES immediately — no second model is billed for the same mistake', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const model = (JSON.parse(init.body as string) as { model: string }).model;
        calls.push(model);
        return new Response('unauthorized', { status: 401 });
      }),
    );
    const err = await callProviderWithRetry(CFG_CHAIN, buildChatMessages('s', [], 'q'), log, noSleep).catch(
      (e: unknown) => e,
    );
    expect(calls).toEqual(['gemini-3.1-flash-lite']); // exactly one call
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('provider_rejected');
    expect((err as AiProviderError).status).toBe(401);
  });

  it('404 (bad model id) and 400 (rejected payload) surface immediately too', async () => {
    for (const status of [400, 404]) {
      const calls: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, init: RequestInit) => {
          calls.push((JSON.parse(init.body as string) as { model: string }).model);
          return new Response('nope', { status });
        }),
      );
      const err = await callProviderWithRetry(CFG_CHAIN, buildChatMessages('s', [], 'q'), log, noSleep).catch(
        (e: unknown) => e,
      );
      expect(calls, `status ${status}`).toEqual(['gemini-3.1-flash-lite']);
      expect((err as AiProviderError).status).toBe(status);
    }
  });

  it('a timeout surfaces immediately (the ceiling is already burned — no second slow wait)', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push((JSON.parse(init.body as string) as { model: string }).model);
        const timeoutErr = new Error('timeout');
        timeoutErr.name = 'TimeoutError';
        throw timeoutErr;
      }),
    );
    const err = await callProviderWithRetry(CFG_CHAIN, buildChatMessages('s', [], 'q'), log, noSleep).catch(
      (e: unknown) => e,
    );
    expect(calls).toEqual(['gemini-3.1-flash-lite']);
    expect((err as AiProviderError).kind).toBe('timeout');
  });

  it('the SSE path shares the policy: 429 twice → the second model streams, its OWN model id is reported', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const model = (JSON.parse(init.body as string) as { model: string }).model;
        calls.push(model);
        if (model === 'gemini-3.1-flash-lite') return new Response('quota', { status: 429 });
        return sseRes([
          'data: {"model":"gemini-4-hydrogen","choices":[{"delta":{"content":"بديل"}}]}\n\n',
          'data: {"model":"gemini-4-hydrogen","choices":[],"usage":{"prompt_tokens":6,"completion_tokens":3}}\n\n',
          'data: [DONE]\n\n',
        ]);
      }),
    );
    const deltas: string[] = [];
    const out = await streamProviderWithChain(CFG_CHAIN, [], (d) => deltas.push(d), log, undefined, noSleep);
    expect(calls).toEqual(['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen']);
    expect(out.model).toBe('gemini-4-hydrogen');
    expect(out.inputTokens).toBe(6);
    expect(deltas).toEqual(['بديل']);
  });

  it('the SSE path surfaces a 401 without touching the second model', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push((JSON.parse(init.body as string) as { model: string }).model);
        return new Response('unauthorized', { status: 401 });
      }),
    );
    const err = await streamProviderWithChain(CFG_CHAIN, [], () => undefined, log, undefined, noSleep).catch(
      (e: unknown) => e,
    );
    expect(calls).toEqual(['gemini-3.1-flash-lite']);
    expect((err as AiProviderError).status).toBe(401);
  });
});

describe('non-Gemini chains keep the r323 behavior (zero drift)', () => {
  it('a 400 on model 1 of a NON-Gemini chain still falls through (the measured OpenRouter policy)', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const model = (JSON.parse(init.body as string) as { model: string }).model;
        calls.push(model);
        if (model === 'first-model') return new Response('nope', { status: 400 });
        return jsonRes({ model: 'second-model', choices: [{ message: { content: 'تم' } }] });
      }),
    );
    const cfg: AiProviderConfig = {
      baseUrl: 'https://provider.example/v1',
      apiKey: 'k',
      model: 'first-model',
      models: ['first-model', 'second-model'],
      timeoutMs: 1000,
    };
    const out = await callProviderWithRetry(cfg, buildChatMessages('s', [], 'q'), () => undefined, () => Promise.resolve());
    expect(calls).toEqual(['first-model', 'second-model']);
    expect(out.model).toBe('second-model');
  });
});

describe('providerHealthCheck (r351 AI-4 — the owner connection probe)', () => {
  it('a healthy provider: ok + latency + the provider-reported model; the key NEVER appears', async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        bodies.push(init.body as string);
        expect(url).toBe(GEMINI_URL);
        return jsonRes({
          model: 'gemini-3.1-flash-lite',
          choices: [{ message: { content: 'جاهز' } }],
        });
      }),
    );
    const out = await providerHealthCheck(CFG);
    expect(out.ok).toBe(true);
    expect(out.model).toBe('gemini-3.1-flash-lite');
    expect(out.latencyMs).toBeGreaterThanOrEqual(0);
    // The probe is a measurement, not a chat: tiny ceiling, no stream,
    // no retry chain — and the key rides only the header, never a body.
    const body = JSON.parse(bodies[0]!) as Record<string, unknown>;
    expect(body.max_tokens).toBe(16);
    expect(JSON.stringify(body)).not.toContain('test-key-placeholder');
  });

  it('a 401 provider failure carries kind + status (the owner sees the honest class)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unauthorized', { status: 401 })));
    const out = await providerHealthCheck(CFG);
    expect(out.ok).toBe(false);
    expect(out.kind).toBe('provider_rejected');
    expect(out.status).toBe(401);
  });

  it('a timeout classifies as timeout (the probe has its own 15s ceiling)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const e = new Error('timed out');
        e.name = 'TimeoutError';
        throw e;
      }),
    );
    const out = await providerHealthCheck(CFG);
    expect(out.ok).toBe(false);
    expect(out.kind).toBe('timeout');
  });

  it('a 200 with no usable content is invalid_response (never a fake ok)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonRes({ choices: [] })));
    const out = await providerHealthCheck(CFG);
    expect(out.ok).toBe(false);
    expect(out.kind).toBe('invalid_response');
  });
});
