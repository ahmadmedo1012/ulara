import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { PageTransition } from '../../src/components/motion/PageTransition';

describe('PageTransition', () => {
  beforeEach(() => {
    // Default: no reduced motion. matchMedia is stubbed in tests/setup.ts.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset View Transitions API stub between tests. (Cast to a plain
    // object type — lib.dom declares Document.startViewTransition as a
    // required method, which would make `delete` a TS2790 error.)
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  it('renders children inside the transition wrapper', () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    expect(screen.getByText('route content')).toBeInTheDocument();
  });

  it('exposes the route key as a data attribute on the wrapper', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    const wrapper = container.querySelector('.page-transition');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-route-key')).toBeTruthy();
  });

  /* r353 — the strips' seat contract: the paper strips
   * (motion.css's `.page-transition-inner::before/::after`, the
   * route-transition open leg) live on the KEYED inner node, which
   * React re-creates on every pathname change — that re-creation is
   * what replays the open leg per navigation (r351 had them on the
   * persistent wrapper: they ran once, then — fill-mode `backwards`
   * holding no end state — sat covering the viewport forever). The
   * wrapper itself stays the stable data-route-key mount. */
  it('renders the keyed inner node — the paper strips\' seat (r353)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    const wrapper = container.querySelector('.page-transition');
    const inner = container.querySelector('.page-transition-inner');
    expect(inner, 'the keyed inner node exists (the strips\' seat)').not.toBeNull();
    expect(wrapper?.contains(inner), 'the inner node is the wrapper\'s child').toBe(true);
    expect(inner?.getAttribute('key')).toBeNull(); // React consumes the key — the seat is positional
  });

  it('the inner node remounts per pathname (the replay engine)', () => {
    function Harness() {
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate('/y')}>go</button>
          <PageTransition>
            <p>route content</p>
          </PageTransition>
        </>
      );
    }
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <Harness />
      </MemoryRouter>,
    );
    const wrapperBefore = container.querySelector('.page-transition');
    const first = container.querySelector('.page-transition-inner');
    fireEvent.click(screen.getByText('go'));
    const wrapperAfter = container.querySelector('.page-transition');
    const second = container.querySelector('.page-transition-inner');
    expect(second).not.toBeNull();
    expect(first === second, 'a pathname change re-creates the inner node (and its pseudo-element strips)').toBe(false);
    // The wrapper itself stays the stable mount (the data-route-key contract).
    expect(wrapperAfter === wrapperBefore, 'the wrapper persists across routes (stable data-route-key contract)').toBe(true);
  });

  it('applies an additional className when provided', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition className="extra">
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    expect(container.querySelector('.page-transition.extra')).not.toBeNull();
  });

  it('does not throw when View Transitions API is unavailable', () => {
    // No startViewTransition on document → CSS fallback path.
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/x']}>
          <PageTransition>
            <p>route content</p>
          </PageTransition>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it('reduced-motion path: no exception, content renders', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>reduced content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    expect(screen.getByText('reduced content')).toBeInTheDocument();
  });
});
