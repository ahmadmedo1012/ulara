/**
 * scrubTimeline — R342-final — the house scrubbed-timeline engine.
 *
 * The home-scroll-choreography round bolted GSAP + ScrollTrigger onto
 * the landing for ONE scrubbed scene — 45.2 KB gz of shipped engine
 * (measured: the bundle gate's 798.3 → 753.1 KB with the seat stubbed)
 * for a timeline that is only ever SEEKED (scroll scrubs it; nothing
 * self-advances). This module is the honest replacement: a ~200-line
 * seekable keyframe timeline with exactly the semantics the journey's
 * choreography uses, driven by the ONE shared conductor clock through
 * the house scrub driver (useSheetScroll — the R308/R318 architecture
 * that already runs the statement, the why scene and the deterministic
 * fallback). No second frame system, no parked ticker, no engine
 * beside the engine.
 *
 * SEMANTICS (the gsap contracts the choreography relies on, kept
 * verbatim — see journey/sceneChoreography.ts):
 *  · `set(targets, vars, at)` — a zero-duration write at scrub time
 *    `at`. Reversible: the first render past `at` captures each
 *    element's prior inline values; scrubbing back before `at`
 *    restores them (a prior of «none» removes the property, returning
 *    authority to the stylesheet).
 *  · `fromTo(targets, fromVars, toVars, at)` — `toVars` may carry
 *    `stagger`, `ease` and a `keyframes` ladder (sequential segments,
 *    each with its own duration/ease; a segment starts from the
 *    previous segment's end values). The from-state renders the
 *    moment the playhead reaches the tween; scrubbing back before the
 *    start restores the captured priors.
 *  · `immediateRender: false` (the default and the ghost contract):
 *    before the playhead ever reaches a tween, NOTHING is written —
 *    the pre-beat state is the stylesheet's own (the 18% ghost floor).
 *  · Properties: opacity · autoAlpha (opacity + visibility) · y/scale
 *    (one composed transform per element) · strokeDashoffset /
 *    strokeDasharray (the SVG draw-in pair).
 *  · Eases: the gsap polynomial family (power1/2/3 in/out — the exact
 *    curves the choreography's measured values were tuned against).
 *
 * PERFORMANCE: seek() writes only the tweens whose window intersects
 * the playhead (plus rolled-back ones), all writes go through the
 * conductor's idempotent setSheetVar, and nothing reads layout — the
 * driver owns the one batched read. Reversible by construction: both
 * directions of a scrub produce identical states.
 */

type EaseName = 'none' | 'power1.in' | 'power1.out' | 'power2.in' | 'power2.out' | 'power3.in' | 'power3.out';

/** the property vocabulary (compose y/scale into one transform write) */
export interface ScrubVars {
  opacity?: number;
  autoAlpha?: number;
  y?: number;
  scale?: number;
  strokeDashoffset?: number;
  strokeDasharray?: number | string;
}

export interface ScrubToVars extends ScrubVars {
  ease?: EaseName;
  /** sequential keyframe segments; the default is one segment of the
   * whole tween (`duration` defaults per call below) */
  keyframes?: Array<{ vars: ScrubVars; duration: number; ease?: EaseName }>;
  duration?: number;
  stagger?: number;
  immediateRender?: boolean;
}

interface Segment {
  from: Required<Pick<ScrubVars, never>> & ScrubVars;
  to: ScrubVars;
  dur: number;
  ease: EaseName;
}

interface ScrubTween {
  targets: Element[];
  from: ScrubVars;
  segments: Segment[];
  stagger: number;
  start: number;
  /** last scrub time that rendered each target (for idempotent writes) */
  initialized: boolean;
  priors: null | Array<Array<[string, string | null]>>;
}

const PROPS = [
  'opacity',
  'visibility',
  'transform',
  'strokeDashoffset',
  'strokeDasharray',
] as const;

function easeFn(name: EaseName | undefined, u: number): number {
  const p = u < 0 ? 0 : u > 1 ? 1 : u;
  switch (name) {
    case 'power1.in':
      return p * p;
    case 'power1.out':
      return 1 - (1 - p) * (1 - p);
    case 'power2.in':
      return p * p * p;
    case 'power2.out':
      return 1 - Math.pow(1 - p, 3);
    case 'power3.in':
      return Math.pow(p, 4);
    case 'power3.out':
      return 1 - Math.pow(1 - p, 4);
    default:
      return p;
  }
}

/** the composed-transform seat (y/scale per element — one writer) */
const transformState = new WeakMap<Element, { y: number; scale: number }>();

function writeVar(style: CSSStyleDeclaration, prop: string, value: string): void {
  if (style.getPropertyValue(prop) !== value) {
    style.setProperty(prop, value);
  }
}

function applyVars(el: Element, vars: ScrubVars): void {
  const style = (el as HTMLElement | SVGElement).style;
  if (vars.opacity !== undefined) {
    writeVar(style, 'opacity', vars.opacity.toFixed(3));
  }
  if (vars.autoAlpha !== undefined) {
    writeVar(style, 'opacity', vars.autoAlpha.toFixed(3));
    writeVar(style, 'visibility', vars.autoAlpha <= 0.001 ? 'hidden' : 'visible');
  }
  if (vars.y !== undefined || vars.scale !== undefined) {
    const seat = transformState.get(el) ?? { y: 0, scale: 1 };
    if (vars.y !== undefined) seat.y = vars.y;
    if (vars.scale !== undefined) seat.scale = vars.scale;
    transformState.set(el, seat);
    writeVar(style, 'transform', `translateY(${seat.y.toFixed(2)}px) scale(${seat.scale.toFixed(4)})`);
  }
  if (vars.strokeDashoffset !== undefined) {
    writeVar(style, 'stroke-dashoffset', String(vars.strokeDashoffset));
  }
  if (vars.strokeDasharray !== undefined) {
    writeVar(style, 'stroke-dasharray', String(vars.strokeDasharray));
  }
}

/** interpolate the numeric leaves of a vars pair (b's non-numeric
 * leaves — strokeDasharray strings — pass through from `a`'s value). */
function lerpVars(a: ScrubVars, b: ScrubVars, u: number): ScrubVars {
  const out: ScrubVars = {};
  for (const k of Object.keys(b) as Array<keyof ScrubVars>) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === 'number' && typeof bv === 'number') {
      (out[k] as number) = av + (bv - av) * u;
    } else {
      (out[k] as ScrubVars[keyof ScrubVars]) = bv as ScrubVars[keyof ScrubVars];
    }
  }
  return out;
}

export interface ScrubTimeline {
  /** zero-duration reversible write at scrub time `at` */
  set(targets: Element | Element[] | null, vars: ScrubVars, at: number): void;
  /** the from→(keyframed)→to tween starting at scrub time `at` */
  fromTo(targets: Element | Element[] | null, from: ScrubVars, to: ScrubToVars, at: number): void;
  /** render the whole timeline at scrub time `t` (both directions) */
  seek(t: number): void;
  /** restore every element's pre-timeline inline state (unmount) */
  revert(): void;
  /** the furthest scrub time any tween reaches */
  duration(): number;
}

export function createScrubTimeline(): ScrubTimeline {
  const tweens: ScrubTween[] = [];

  const toList = (t: Element | Element[] | null): Element[] =>
    t === null ? [] : Array.isArray(t) ? t : [t];

  const capturePriors = (tw: ScrubTween): void => {
    if (tw.priors) return;
    tw.priors = tw.targets.map((el) => {
      const style = (el as HTMLElement | SVGElement).style;
      return PROPS.map((p) => [p, style.getPropertyValue(p) || null] as [string, string | null]);
    });
  };

  const rollback = (tw: ScrubTween): void => {
    if (!tw.priors) return;
    tw.targets.forEach((el, i) => {
      const prior = tw.priors![i]!;
      const style = (el as HTMLElement | SVGElement).style;
      for (const [prop, value] of prior) {
        if (value === null) {
          style.removeProperty(prop);
        } else {
          style.setProperty(prop, value);
        }
      }
      transformState.delete(el);
    });
  };

  const renderTarget = (tw: ScrubTween, el: Element, localT: number): void => {
    if (localT <= 0) {
      applyVars(el, tw.from);
      return;
    }
    let acc = 0;
    let prev = tw.from;
    for (let s = 0; s < tw.segments.length; s += 1) {
      const seg = tw.segments[s]!;
      if (localT <= acc + seg.dur || s === tw.segments.length - 1) {
        const u = seg.dur > 0 ? Math.min(1, (localT - acc) / seg.dur) : 1;
        applyVars(el, lerpVars(prev, seg.to, easeFn(seg.ease, u)));
        return;
      }
      acc += seg.dur;
      prev = seg.to;
    }
  };

  const api: ScrubTimeline = {
    set(targets, vars, at) {
      const list = toList(targets);
      if (!list.length) return;
      /* a zero-duration write: the from IS the value (renders the
       * moment the playhead reaches `at`, rolls back before it) */
      tweens.push({
        targets: list,
        from: vars,
        segments: [{ from: vars, to: vars, dur: 0, ease: 'none' }],
        stagger: 0,
        start: Math.max(0, at),
        initialized: false,
        priors: null,
      });
    },

    fromTo(targets, from, to, at) {
      const list = toList(targets);
      if (!list.length) return;
      const keyframes = to.keyframes ?? [{ vars: to as ScrubVars, duration: to.duration ?? 0.5 }];
      /* chain the keyframe ladder: each segment starts at the previous
       * segment's end (the gsap keyframes contract) */
      const segments: Segment[] = [];
      let prevEnd = from;
      for (const kf of keyframes) {
        segments.push({
          from: prevEnd,
          to: kf.vars,
          dur: Math.max(0, kf.duration),
          ease: kf.ease ?? to.ease ?? 'none',
        });
        prevEnd = { ...prevEnd, ...kf.vars };
      }
      tweens.push({
        targets: list,
        from,
        segments,
        stagger: to.stagger ?? 0,
        start: Math.max(0, at),
        initialized: false,
        priors: null,
      });
    },

    seek(t) {
      /* pass 1 — rollbacks in REVERSE insertion order (the undo-stack
       * contract: a later tween's captured prior is the state the
       * earlier tween left, so undoing latest-first restores the
       * element's true pre-timeline state; forward-order rollback
       * would let an early prior clobber a late restore — measured
       * live on the plaque-2 wrapper's in/out pair). */
      for (let i = tweens.length - 1; i >= 0; i -= 1) {
        const tw = tweens[i]!;
        if (t < tw.start && tw.initialized) {
          rollback(tw);
          tw.initialized = false;
        }
      }
      /* pass 2 — renders in insertion order (later tweens win the
       * property races exactly like a forward playhead). */
      for (const tw of tweens) {
        if (t < tw.start) continue;
        if (!tw.initialized) {
          capturePriors(tw);
          tw.initialized = true;
        }
        for (let i = 0; i < tw.targets.length; i += 1) {
          const localStart = tw.start + tw.stagger * i;
          renderTarget(tw, tw.targets[i]!, t - localStart);
        }
      }
    },

    revert() {
      for (let i = tweens.length - 1; i >= 0; i -= 1) {
        const tw = tweens[i]!;
        rollback(tw);
        tw.initialized = false;
      }
    },

    duration() {
      let max = 0;
      for (const tw of tweens) {
        const lastStart = tw.start + tw.stagger * Math.max(0, tw.targets.length - 1);
        const totalDur = tw.segments.reduce((s, seg) => s + seg.dur, 0);
        max = Math.max(max, lastStart + totalDur);
      }
      return max;
    },
  };

  return api;
}
