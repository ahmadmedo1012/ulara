/**
 * Celebrate (r369 slice 05 / spec 05) — the celebration contract:
 *
 *   · The fact line is announced on a POLITE live region; the +N rise
 *     and the halo dot are aria-hidden flourishes (focus never moves).
 *   · Once-only: the same event id never re-arms the settle clock.
 *   · onSettle fires after the flourish (~1.1s, under the 1.2s
 *     ceiling) so the parent can retire the moment.
 *   · prefers-reduced-motion: the static line renders and NO settle
 *     timer runs — the static fact is not a transient.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Celebrate } from '../../src/components/gamification/Celebrate';

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('Celebrate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('announces the fact once on a polite live region', () => {
    render(<Celebrate id="ula-level:u1:4" rise="+1" label="مستوى جديد — فضي" />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('مستوى جديد — فضي');
    // the flourish is hidden from the a11y tree; the label is not
    const rise = status.querySelector('.g369-celebrate-rise');
    expect(rise?.getAttribute('aria-hidden')).toBe('true');
    expect(status.querySelector('.g369-celebrate-halo')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('settles after the flourish, under the 1.2s ceiling', () => {
    const onSettle = vi.fn();
    render(<Celebrate id="ula-level:u1:4" rise="+1" label="مستوى جديد — فضي" onSettle={onSettle} />);
    expect(onSettle).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1099);
    });
    expect(onSettle).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it('never re-arms the settle clock for the same event id', () => {
    const onSettle = vi.fn();
    const { rerender } = render(
      <Celebrate id="ula-level:u1:4" rise="+1" label="مستوى جديد — فضي" onSettle={onSettle} />,
    );
    act(() => {
      vi.advanceTimersByTime(400);
    });
    rerender(<Celebrate id="ula-level:u1:4" rise="+1" label="مستوى جديد — فضي" onSettle={onSettle} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it('reduced motion: the static line renders with no settle timer', () => {
    mockReducedMotion(true);
    const onSettle = vi.fn();
    render(<Celebrate id="ula-level:u1:5" label="مستوى جديد — ذهبي" onSettle={onSettle} />);
    expect(screen.getByRole('status').textContent).toContain('مستوى جديد — ذهبي');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onSettle).not.toHaveBeenCalled();
  });
});
