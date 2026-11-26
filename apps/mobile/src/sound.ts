/**
 * r367 D-P6 — Sound: the app's ONE door to the audio feedback engine.
 *
 * The haptics.ts architecture, mirrored for the ear:
 *
 *  1. ENABLED GATE — a persisted user kill-switch in the `ula-mobile-*`
 *     AsyncStorage family (the same seat as the haptics switch). Default
 *     ON: the set is quiet by construction (≤0.12 peak, ≤0.22 s — see
 *     scripts/sound/generate.mjs) and the OS silent switch mutes it on
 *     iOS regardless; the toggle is for the people who want silence in
 *     loud rooms too.
 *  2. ANTI-SPAM — the same shape as haptics: a global floor between ANY
 *     two plays plus a per-kind cooldown; blocked attempts never re-stamp
 *     the window.
 *  3. SILENT-SWITCH HONESTY — `playsInSilentMode: false` (the audio mode
 *     is set once at init): on iOS the ring/silent switch mutes the set;
 *     on Android there is no such switch, so the files' own quietness and
 *     the gate carry it.
 *  4. AUDIO-FOCUS POLITENESS — `interruptionMode: "mixWithOthers"`: a
 *     UI blip NEVER interrupts lecture/live audio (expo-video's own mode
 *     still wins while a lecture plays; the blip simply mixes under it).
 *  5. PLATFORM HONESTY — web never creates a player (the lazy factory
 *     only runs on native), and every engine error is swallowed: feedback
 *     must never crash a flow.
 *
 * The three pieces (success / error / tick) are original synthesized WAVs
 * (scripts/sound/generate.mjs — the source of truth; the committed files
 * are its artifacts). Key feedback ONLY: submit outcomes + the settings
 * toggle sample — never a sound per keystroke or per scroll.
 *
 * Unit net: ./sound.test.ts (clock + platform + engine are injectable via
 * __soundInternals — the haptics.ts pattern).
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SoundKind = "success" | "error" | "tick";

/** Non-secret preference — the `ula-mobile-*` AsyncStorage family. */
const STORAGE_KEY = "ula-mobile-sounds-enabled";

/** Global floor: minimum ms between ANY two plays. */
const MIN_GAP_MS = 80;

/** Per-kind cooldown — one kind stays quiet this long after it fired. */
const COOLDOWN_MS: Record<SoundKind, number> = {
  success: 250,
  error: 250,
  tick: 120,
};

/* ── module state (single instance; tests reset via __soundInternals) ── */

let enabled = true; // optimistic default: ON until storage says otherwise
let explicitSet = false; // a setEnabled() beat an in-flight hydrate read
let hydratePromise: Promise<void> | null = null;
let lastFireAt = Number.NEGATIVE_INFINITY;
const lastFireByKind = new Map<SoundKind, number>();

/** Injectable seams — __soundInternals swaps these in tests. */
let clock: () => number = () => Date.now();
let platformOS: () => string = () => Platform.OS;
/** The engine surface — lazy on native (never constructed on web). */
type Engine = { play(kind: SoundKind): void };
let engine: Engine | null = null;
let engineFactory: (() => Engine | null) | null = null;
let modeSet = false;

function shouldFire(kind: SoundKind, now: number): boolean {
  if (!enabled) return false; // the kill-switch
  if (platformOS() === "web") return false; // web: no engine — no-op by design
  if (now - lastFireAt < MIN_GAP_MS) return false; // global anti-spam floor
  const last = lastFireByKind.get(kind);
  if (last !== undefined && now - last < COOLDOWN_MS[kind]) return false;
  return true;
}

function getEngine(): Engine | null {
  if (engine) return engine;
  if (engineFactory) {
    engine = engineFactory();
    return engine;
  }
  /* the real factory — native only. `require` runs inside the branch, so
   * web never touches expo-audio. The audio mode rides the FIRST engine
   * construction: the silent switch + mix-with-others laws, set once. */
  if (platformOS() === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Audio = require("expo-audio") as typeof import("expo-audio");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const success = require("@/assets/sounds/success.wav") as number;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const error = require("@/assets/sounds/error.wav") as number;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tick = require("@/assets/sounds/tick.wav") as number;
    const players: Record<SoundKind, { play: () => void; volume: number } | null> = {
      success: null,
      error: null,
      tick: null,
    };
    const make = (src: number) => {
      const p = Audio.createAudioPlayer(src);
      p.volume = 0.9; // the files are already ≤0.12 peak — quiet by construction
      return p;
    };
    const replay = (p: { play: () => void } & { seekTo?: (s: number) => Promise<void>; currentTime?: number }) => {
      // rewind-then-play: a second success inside the same second must
      // still read as a full blip, not a truncated tail
      try {
        if (p.currentTime !== undefined && p.currentTime > 0) void p.seekTo?.(0);
        p.play();
      } catch {
        /* a stale player must never crash the flow */
      }
    };
    engineFactory = () => {
      if (!modeSet) {
        modeSet = true;
        void Audio.setAudioModeAsync({
          playsInSilentMode: false, // the iOS silent switch mutes the set
          interruptionMode: "mixWithOthers", // never steal lecture/live audio
        }).catch(() => undefined);
      }
      players.success = make(success);
      players.error = make(error);
      players.tick = make(tick);
      return {
        play(kind: SoundKind) {
          const p = players[kind];
          if (p) replay(p as never);
        },
      };
    };
    engine = engineFactory();
    return engine;
  } catch {
    engineFactory = null; // no engine available (tests / exotic embedders)
    return null;
  }
}

function fire(kind: SoundKind, now: number): void {
  if (!shouldFire(kind, now)) return;
  // Stamp ONLY on play — a blocked attempt must never extend any window.
  lastFireAt = now;
  lastFireByKind.set(kind, now);
  const e = getEngine();
  if (!e) return;
  // haptics.ts's own spelling: the emit runs SYNCHRONOUSLY (the replay
  // reads currentTime / seekTo — sync engine calls), and anything that
  // returns a promise is caught. An engine error must never crash the
  // flow that asked for feedback.
  try {
    const r = e.play(kind) as unknown;
    if (r && typeof (r as Promise<void>).then === "function") {
      (r as Promise<void>).then(
        () => undefined,
        () => undefined,
      );
    }
  } catch {
    /* swallowed — feedback never crashes a flow */
  }
}

/**
 * Read the persisted preference once (idempotent). The shell may await
 * this at startup; a module-scope kick below covers shells that don't.
 */
export function hydrate(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      // setEnabled() won the race — its own write is already in storage.
      if (explicitSet) return;
      enabled = stored !== "0";
    })();
  }
  return hydratePromise;
}

export const sound = {
  /** Submit success — the two-note rise. Key feedback ONLY. */
  notify(kind: Exclude<SoundKind, "tick">): void {
    fire(kind, clock());
  },

  /** The quiet confirmation (settings toggle sample). */
  tick(): void {
    fire("tick", clock());
  },

  /** The kill-switch — applies instantly, persists in the background. */
  setEnabled(v: boolean): void {
    explicitSet = true;
    enabled = v;
    // Repo pattern (session.ts): fire-and-forget; a storage failure must
    // never break the flow that toggled — worst case it re-defaults ON.
    AsyncStorage.setItem(STORAGE_KEY, v ? "1" : "0").catch(() => undefined);
  },

  /** Current gate state (cached; hydrate() corrects it from storage). */
  isEnabled(): boolean {
    return enabled;
  },

  /** Await the persisted preference (startup / tests). Idempotent. */
  hydrate,
};

export type SoundApi = typeof sound;

/**
 * Test-only seams — clock, platform, a scripted engine, and a clean
 * reset. NOTHING here is used by app code.
 */
export const __soundInternals = {
  setClock(fn: () => number): void {
    clock = fn;
  },
  setPlatform(os: "ios" | "android" | "web" | (string & {})): void {
    platformOS = () => os;
  },
  setEngine(e: Engine | null): void {
    engine = e;
  },
  reset(): void {
    enabled = true;
    explicitSet = false;
    hydratePromise = null;
    lastFireAt = Number.NEGATIVE_INFINITY;
    lastFireByKind.clear();
    clock = () => Date.now();
    platformOS = () => Platform.OS;
    engine = null;
    engineFactory = null;
    modeSet = false;
  },
};

// One cheap read at import so isEnabled() is honest even if the shell
// never awaits hydrate() (mirrors haptics.ts).
void hydrate();
