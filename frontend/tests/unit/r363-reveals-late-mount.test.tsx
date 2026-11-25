/**
 * r363-reveals-late-mount.test.tsx — the late-mount seam's unit belt.
 *
 * The bug (measured in the round's own footer capture): the landing's
 * second half rides React.lazy boundaries — the footer (skyline strip,
 * giant wordmark, rise blocks) and the CTA sheet mount AFTER
 * initReveals()'s one-shot element sweep, so their elements were never
 * armed, never observed. `.fo-fstrip` never received `.in-view`, and
 * footer.css keys the skyline's armed clip off the ROOT seam class —
 * the strip stood at `inset(100% 0 0 0)` forever: the skyline never
 * painted for JS-on visitors (the round's 1440 footer capture shows
 * the band blank; the vision read confirms it).
 *
 * The fix: a debounced MutationObserver re-admits late-mounted elements
 * through the SAME family table (same classes, same IO bucket, same
 * pending pool). These tests fail on the one-shot engine (late
 * elements are never armed) and pass on the rescan engine.
 *
 * jsdom notes: getBoundingClientRect returns zeros everywhere, so
 * every element would read as "passed" and reveal instantly — the
 * tests pin below-the-fold rects on the elements they need ARMED;
 * IntersectionObserver is a recording stub (setup.ts's silent no-op
 * cannot assert observation); MutationObserver is real jsdom.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { initReveals } from '../../src/lib/reveals';

/** Recording IO stub — captures observed targets per bucket instance. */
class RecordingIO {
  static instances: RecordingIO[] = [];
  observed = new Set<Element>();
  private cb: IntersectionObserverCallback;

  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    RecordingIO.instances.push(this);
  }

  observe(el: Element): void {
    this.observed.add(el);
  }

  unobserve(el: Element): void {
    this.observed.delete(el);
  }

  disconnect(): void {
    this.observed.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** test driver: an intersecting entry for one target */
  intersect(el: Element): void {
    this.cb(
      [
        {
          target: el,
          isIntersecting: true,
          boundingClientRect: { bottom: 400 },
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

/** jsdom rects are all-zero → isPassed() would be true for everything;
 * pin a below-the-fold rect so the element arms instead of revealing. */
function belowFold(el: Element): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        bottom: 900,
        top: 820,
        left: 0,
        right: 200,
        width: 200,
        height: 80,
        x: 0,
        y: 820,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

function installMatchMedia(): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** the rescan debounce is 60ms — wait past it plus a margin. */
const tick = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('reveals — the late-mount seam (r363)', () => {
  let handle: ReturnType<typeof initReveals> | null = null;

  beforeEach(() => {
    RecordingIO.instances = [];
    installMatchMedia();
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      RecordingIO as unknown as typeof IntersectionObserver;
    document.body.innerHTML = '<div id="host"></div>';
  });

  afterEach(() => {
    handle?.destroy();
    handle = null;
    vi.restoreAllMocks();
  });

  const ioTargets = () => RecordingIO.instances.flatMap((io) => [...io.observed]);

  it('mount-time elements arm and observe (the contract the fix keeps)', () => {
    const host = document.getElementById('host')!;
    const el = document.createElement('p');
    el.className = 'fo-c1-top';
    host.appendChild(el);
    belowFold(el);

    handle = initReveals();
    expect(el.classList.contains('reveal-up')).toBe(true);
    expect(el.classList.contains('reveal-rise-h')).toBe(true);
    expect(ioTargets()).toContain(el);
    expect(document.documentElement.classList.contains('js-reveal-armed')).toBe(true);
  });

  it('a lazy-chunk element (the footer strip) arms AFTER init — the skyline class', async () => {
    const host = document.getElementById('host')!;
    const early = document.createElement('p');
    early.className = 'fo-c1-top';
    host.appendChild(early);
    belowFold(early);

    // the one-shot engine's world ends here — everything below mounts late
    handle = initReveals();

    const strip = document.createElement('div');
    strip.className = 'fo-fstrip'; // mounts with the lazy footer chunk
    host.appendChild(strip);
    belowFold(strip);

    await tick(120); // the rescan debounce + margin

    expect(strip.classList.contains('reveal-up')).toBe(true);
    expect(strip.classList.contains('reveal-rise-h')).toBe(true);
    expect(strip.classList.contains('reveal-rise-h--ty')).toBe(true);
    expect(ioTargets()).toContain(strip);
  });

  it('the late strip REVEALS on intersection — the armed skyline clip releases', async () => {
    const host = document.getElementById('host')!;
    handle = initReveals();

    const strip = document.createElement('div');
    strip.className = 'fo-fstrip';
    host.appendChild(strip);
    belowFold(strip);
    await tick(120);

    expect(strip.classList.contains('in-view')).toBe(false);
    const holder = RecordingIO.instances.find((io) => io.observed.has(strip));
    expect(holder, 'the strip was admitted to an IO bucket').toBeTruthy();
    holder!.intersect(strip);
    expect(strip.classList.contains('in-view')).toBe(true);
  });

  it('the giant wordmark joined the rise family (R21 — no --ty seat)', async () => {
    const host = document.getElementById('host')!;
    handle = initReveals();

    const banner = document.createElement('div');
    banner.className = 'fo-giant-banner';
    host.appendChild(banner);
    belowFold(banner);
    await tick(120);

    expect(banner.classList.contains('reveal-rise-h')).toBe(true);
    expect(banner.classList.contains('reveal-rise-h--ty')).toBe(false);
    expect(ioTargets()).toContain(banner);
  });

  it('destroy() tears the seam down — nothing arms after destroy', async () => {
    const host = document.getElementById('host')!;
    handle = initReveals();
    handle.destroy();
    handle = null;

    const late = document.createElement('p');
    late.className = 'fo-c1-top';
    host.appendChild(late);
    await tick(120);

    expect(late.classList.contains('reveal-up')).toBe(false);
    expect(document.documentElement.classList.contains('js-reveal-armed')).toBe(false);
  });
});
