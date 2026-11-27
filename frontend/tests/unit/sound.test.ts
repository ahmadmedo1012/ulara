/**
 * lib/sound (r369 slice 05 / spec 05) — the sound contract:
 *
 *   · DEFAULT SILENT: no preference written → nothing plays, and no
 *     Audio object is ever constructed.
 *   · Opt-in only: after setSoundEnabled(true) a play constructs and
 *     plays the player; flipping off pauses + drops it (the next
 *     opt-in fetches fresh — the lazy contract).
 *   · System vetoes: prefers-reduced-motion and data-saver mute
 *     completely, opt-in or not.
 *   · Playback failures are swallowed (sound is a garnish, never an
 *     error surface).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSoundEnabled, setSoundEnabled, playSound } from '../../src/lib/sound';

const playSpy = vi.fn().mockResolvedValue(undefined);
const pauseSpy = vi.fn();
let audioConstructed = 0;

function mockAudio() {
  audioConstructed = 0;
  playSpy.mockClear();
  pauseSpy.mockClear();
  vi.stubGlobal(
    'Audio',
    class {
      currentTime = 0;
      play = playSpy;
      pause = pauseSpy;
      constructor(_src: string) {
        audioConstructed++;
      }
    },
  );
}

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('lib/sound', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAudio();
    mockMatchMedia(false);
  });
  afterEach(() => {
    setSoundEnabled(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is silent by default — no Audio is constructed', () => {
    expect(getSoundEnabled()).toBe(false);
    playSound('tap');
    expect(audioConstructed).toBe(0);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('plays after opt-in, reusing one player per name', () => {
    setSoundEnabled(true);
    playSound('tap');
    playSound('tap');
    expect(audioConstructed).toBe(1);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('flipping off pauses and drops the players', () => {
    setSoundEnabled(true);
    playSound('confirm');
    expect(audioConstructed).toBe(1);
    setSoundEnabled(false);
    expect(pauseSpy).toHaveBeenCalled();
    playSound('confirm');
    expect(audioConstructed).toBe(1); // no player survives the off flip
  });

  it('reduced motion mutes completely, opt-in or not', () => {
    mockMatchMedia(true);
    setSoundEnabled(true);
    playSound('milestone');
    expect(audioConstructed).toBe(0);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('data-saver mutes completely', () => {
    Object.defineProperty(window.navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    });
    setSoundEnabled(true);
    playSound('tap');
    expect(playSpy).not.toHaveBeenCalled();
    Object.defineProperty(window.navigator, 'connection', {
      value: undefined,
      configurable: true,
    });
  });

  it('swallows playback rejections', async () => {
    playSpy.mockRejectedValueOnce(new Error('autoplay policy'));
    setSoundEnabled(true);
    expect(() => playSound('tap')).not.toThrow();
    await Promise.resolve();
  });
});
