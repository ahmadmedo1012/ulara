/**
 * r351 AI-2/AI-3 — the source-chip pins (components/ai/AiMessage.tsx).
 *
 * The rewritten AI-2 prompt mandates inline «المصدر: [رقم]» citations
 * in every grounded answer; the review pass found the web surface
 * silently dropped the done-frame's `citations` array (mobile rendered
 * chips, web showed bare numbers with no referent). These pins freeze
 * the fixed contract:
 *  · a done turn with citations renders ONE chip per citation under the
 *    bubble, each carrying its mono [رقم] + the material title;
 *  · a citation WITH a url is an openable anchor (deep link, new tab);
 *  · a citation WITHOUT a url is an informational span (no dead links);
 *  · a turn with an EMPTY array renders NO chips row (the honest
 *    «nothing retrieved» state — never a fake source);
 *  · user rows and streaming bubbles never render chips;
 *  · transcriptFromRows (persisted history) carries no citations —
 *    chips are a live-turn affordance (persisted rows have content
 *    only; mobile parity).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AiMessage } from '../../src/components/ai/AiMessage';
import type { AiCitation } from '../../src/lib/ai-stream';

afterEach(() => cleanup());

const CITES: AiCitation[] = [
  {
    index: 1,
    title: 'محاضرة الاستعلامات المركّبة',
    locator: 'محاضرة 7',
    url: 'https://example.invalid/materials/lecture-7',
    snippet: 'شرح الاستعلامات.',
  },
  { index: 2, title: 'ورقة عمل الفهارس', locator: null, url: null, snippet: 'تدريبات.' },
];

const noop = () => undefined;
const base = {
  index: 0,
  greetingOnly: false,
  isLastAnswer: false,
  busy: false,
  copied: false,
  onCopy: noop,
  onRate: noop,
  onRegenerate: noop,
  onRetry: noop,
};

describe('AiMessage source chips (the citations referent)', () => {
  it('renders one chip per citation — mono [رقم] + title — under a done bot turn', () => {
    render(<AiMessage {...base} msg={{ role: 'bot', text: 'جواب', citations: CITES }} />);
    const row = screen.getByLabelText('المصادر');
    expect(row.children).toHaveLength(2);
    expect(screen.getByText('محاضرة الاستعلامات المركّبة')).toBeTruthy();
    expect(screen.getByText('ورقة عمل الفهارس')).toBeTruthy();
    expect(screen.getByText('[1]')).toBeTruthy();
    expect(screen.getByText('[2]')).toBeTruthy();
  });

  it('a citation WITH a url is an openable anchor; without one, an informational span', () => {
    render(<AiMessage {...base} msg={{ role: 'bot', text: 'جواب', citations: CITES }} />);
    const link = screen.getByText('محاضرة الاستعلامات المركّبة').closest('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://example.invalid/materials/lecture-7');
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
    // the no-url citation is NOT a link (no dead hrefs, ever)
    const plain = screen.getByText('ورقة عمل الفهارس').closest('a');
    expect(plain).toBeNull();
  });

  it('an EMPTY citations array renders NO chips row — never a fake source', () => {
    render(<AiMessage {...base} msg={{ role: 'bot', text: 'جواب', citations: [] }} />);
    expect(screen.queryByLabelText('المصادر')).toBeNull();
  });

  it('no citations field → no chips (old-backend additive degradation)', () => {
    render(<AiMessage {...base} msg={{ role: 'bot', text: 'جواب' }} />);
    expect(screen.queryByLabelText('المصادر')).toBeNull();
  });

  it('streaming bubbles and user rows never render chips', () => {
    const { rerender } = render(
      <AiMessage {...base} msg={{ role: 'bot', text: '…', streaming: true, citations: CITES }} />,
    );
    expect(screen.queryByLabelText('المصادر')).toBeNull();
    rerender(<AiMessage {...base} msg={{ role: 'user', text: 'سؤال', citations: CITES }} />);
    expect(screen.queryByLabelText('المصادر')).toBeNull();
  });
});
