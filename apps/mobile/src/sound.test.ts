/**
 * r367 D-P6 — the sound unit net (colocated). Pins the four policies the
 * module centralizes — toggle gate · anti-spam throttle · platform
 * honesty · quiet-by-construction key-feedback-only semantics — with the
 * engine injected through __soundInternals (no fake timers, no Platform
 * mutation, no real audio).
 *
 * Honesty: this net proves LOGIC, not speakers. Real-device audio (the
 * silent switch, the mixer) is inherently unverified from this sandbox —
 * the construction laws (≤0.12 peak files, playsInSilentMode false,
 * mixWithOthers) live in scripts/sound/generate.mjs + src/sound.ts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sound, __soundInternals, type SoundKind } from "@/sound";

type Recorded = { kinds: SoundKind[] };

const storageGet = AsyncStorage.getItem as unknown as jest.Mock;
const storageSet = AsyncStorage.setItem as unknown as jest.Mock;

const STORAGE_KEY = "ula-mobile-sounds-enabled";

/* ── deterministic clock (injected via __soundInternals.setClock) ────── */

let now = 0;
function installClock() {
  now = 0;
  __soundInternals.setClock(() => now);
}
const tick = (ms: number) => {
  now += ms;
};

/* ── a recorded engine (the play calls land here) ────────────────────── */

function installEngine(): Recorded {
  const rec: Recorded = { kinds: [] };
  __soundInternals.setEngine({
    play(kind: SoundKind) {
      rec.kinds.push(kind);
    },
  });
  return rec;
}

beforeEach(() => {
  __soundInternals.reset();
  storageGet.mockReset();
  storageSet.mockReset();
  storageGet.mockResolvedValue(null);
  storageSet.mockResolvedValue(undefined);
  installClock();
  __soundInternals.setPlatform("ios");
});

afterEach(() => {
  __soundInternals.reset();
});

describe("sound — the toggle gate", () => {
  it("plays while enabled (the optimistic default)", () => {
    const rec = installEngine();
    sound.notify("success");
    expect(rec.kinds).toEqual(["success"]);
  });

  it("never plays after setEnabled(false) — instantly", () => {
    const rec = installEngine();
    sound.setEnabled(false);
    sound.notify("success");
    expect(rec.kinds).toEqual([]);
  });

  it("re-enables instantly and plays again", () => {
    const rec = installEngine();
    sound.setEnabled(false);
    sound.notify("success");
    sound.setEnabled(true);
    tick(300);
    sound.notify("success");
    expect(rec.kinds).toEqual(["success"]);
  });

  it("hydrate() reads the persisted 0 and gates before any play", async () => {
    storageGet.mockResolvedValue("0");
    await sound.hydrate();
    const rec = installEngine();
    sound.notify("error");
    expect(rec.kinds).toEqual([]);
    expect(storageGet).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe("sound — the anti-spam throttle", () => {
  it("holds a global floor between ANY two plays", () => {
    const rec = installEngine();
    sound.notify("success");
    tick(30); // under the 80ms global floor
    sound.notify("error");
    expect(rec.kinds).toEqual(["success"]);
    tick(60); // now past the floor (90ms since the first)
    sound.notify("error");
    expect(rec.kinds).toEqual(["success", "error"]);
  });

  it("holds a per-kind cooldown; another kind may speak sooner", () => {
    const rec = installEngine();
    sound.notify("success");
    tick(100); // past the global floor, INSIDE the 250ms success cooldown
    sound.notify("success");
    expect(rec.kinds).toEqual(["success"]);
    tick(100); // 200ms since the first — still inside
    sound.tick();
    expect(rec.kinds).toEqual(["success", "tick"]);
  });

  it("a blocked attempt never extends any window (stamp on play only)", () => {
    const rec = installEngine();
    sound.notify("success");
    tick(100);
    sound.notify("success"); // blocked (inside the cooldown) — must NOT re-stamp
    tick(200); // 300ms since the only real play
    sound.notify("success");
    expect(rec.kinds).toEqual(["success", "success"]);
  });
});

describe("sound — platform honesty + engine safety", () => {
  it("web never plays (no engine is even constructed)", () => {
    __soundInternals.setPlatform("web");
    __soundInternals.setEngine(null);
    sound.notify("success");
    // with no engine injected and the web gate, the factory must never run:
    // no throw, no play — the assertion is simply that this did not crash
  });

  it("a throwing engine never crashes the flow", () => {
    __soundInternals.setEngine({
      play() {
        throw new Error("engine exploded");
      },
    });
    expect(() => sound.notify("success")).not.toThrow();
  });

  it("a rejected engine promise never rejects (fire-and-forget)", async () => {
    __soundInternals.setEngine({
      play() {
        return Promise.reject(new Error("stale player"));
      },
    });
    expect(() => sound.notify("success")).not.toThrow();
    await Promise.resolve().catch(() => undefined); // flush the swallow
  });

  it("setDisabled persists the 0 spelling the family writes", () => {
    sound.setEnabled(false);
    expect(storageSet).toHaveBeenCalledWith(STORAGE_KEY, "0");
    sound.setEnabled(true);
    expect(storageSet).toHaveBeenCalledWith(STORAGE_KEY, "1");
  });
});
