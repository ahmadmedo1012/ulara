/**
 * r351 A3 — the hermetic corpus speaks the production grammar.
 *
 * The AI fixture factories (tests/e2e/fixtures/ai-fixtures.ts) author
 * the r323 wire bodies every ai-assistant journey rides. They were
 * born at the AI-5 split and immediately duplicated inline in the
 * spec's three SSE sites — the debt-pay commit wires the spec to the
 * factories and pins them HERE, round-trip, against the PRODUCTION
 * frame parser (src/lib/ai-stream.ts createAiSseParser):
 *
 *  · aiChatSseReply() output, fed chunk-by-chunk (including a split
 *    mid-frame — the parser's documented tolerance), decodes to the
 *    token delta(s) then the done frame — the exact AiStreamDone the
 *    page's handlers switch on;
 *  · the done frame carries the ids/engine/model the engine tag pins,
 *    and the citations array (the chips' referent) verbatim from
 *    AI_CITATIONS — the openable + informational pair;
 *  · remaining rides through to the done frame ONLY when given (the
 *    quota card arms on 0, an absent field stays absent — the honest
 *    «server said nothing» state);
 *  · id opts override the corpus defaults (a journey names its own
 *    conversation) while the defaults themselves stay the static
 *    corpus's ids;
 *  · aiChatJsonReply() returns the SAME persisted turn (the JSON
 *    grammar's envelope is the done payload — the two transports
 *    converge on one shape).
 *
 * If the factory ever drifts from the parser's grammar, every journey
 * silently degrades to the page's error states — this pin is what
 * makes that impossible to miss.
 */
import { describe, expect, it } from 'vitest';
import { createAiSseParser, type AiSseEvent, type AiStreamDone } from '../../src/lib/ai-stream';
import {
  AI_CITATIONS,
  aiChatDone,
  aiChatJsonReply,
  aiChatSseReply,
} from '../e2e/fixtures/ai-fixtures';

/** Feed a wire body through the production parser; assert the frame
 * sequence is exactly [token, done] and hand back the done payload. */
function parseDone(body: string, chunks: string[] = [body]): AiStreamDone {
  const events: AiSseEvent[] = [];
  const parser = createAiSseParser((ev) => events.push(ev));
  for (const chunk of chunks) parser.push(chunk);
  parser.end();
  expect(events.map((e) => e.kind)).toEqual(['token', 'done']);
  const done = events[1];
  if (!done || done.kind !== 'done') throw new Error('unreachable — the kinds are pinned above');
  return done.final;
}

describe('ai-fixtures × createAiSseParser — the round-trip grammar pin', () => {
  it('the SSE body decodes to the token then the done frame (single chunk)', () => {
    const final = parseDone(aiChatSseReply({ reply: 'جواب المساعد التجريبي' }));
    expect(final).toEqual(aiChatDone());
  });

  it('a frame split across chunk boundaries still decodes (the parser owns reassembly)', () => {
    const body = aiChatSseReply({ reply: 'ردّ مُقسَّم' });
    const mid = Math.floor(body.length / 2); // inside the done frame's JSON
    const final = parseDone(body, [body.slice(0, mid), body.slice(mid)]);
    expect(final.reply).toBe('ردّ مُقسَّم');
  });

  it('the done frame carries the engine tag contract + the citations the chips render', () => {
    const final = parseDone(aiChatSseReply());
    expect(final.engine).toBe('local');
    expect(final.model).toBe('gap-aware-composer');
    expect(final.conversationId).toBe('conv_fix_1');
    expect(final.messageId).toBe('msg_fix_1');
    // The chips' referent — the openable + informational pair, verbatim.
    expect(final.citations).toEqual([...AI_CITATIONS]);
    expect(final.citations?.[0]?.url).toBe('https://example.invalid/materials/lecture-7');
    expect(final.citations?.[1]?.url).toBeNull();
  });

  it('remaining rides through when given (0 arms the quota card) and stays absent otherwise', () => {
    expect(parseDone(aiChatSseReply({ remaining: 0 })).remaining).toBe(0);
    expect('remaining' in parseDone(aiChatSseReply())).toBe(false);
  });

  it('a journey names its own conversation — id opts override the corpus defaults', () => {
    const final = parseDone(
      aiChatSseReply({ reply: 'نجحت المحاولة', conversationId: 'conv_r2', messageId: 'm_r2' }),
    );
    expect(final.conversationId).toBe('conv_r2');
    expect(final.messageId).toBe('m_r2');
    expect(final.reply).toBe('نجحت المحاولة');
  });

  it('the JSON grammar returns the SAME persisted turn (both transports converge)', () => {
    expect(aiChatJsonReply({ reply: 'جواب', conversationId: 'conv_j', messageId: 'm_j' })).toEqual(
      aiChatDone({ reply: 'جواب', conversationId: 'conv_j', messageId: 'm_j' }),
    );
  });
});
