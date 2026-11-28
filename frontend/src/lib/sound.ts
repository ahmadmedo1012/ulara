/**
 * sound.ts — UI sounds, OFF by default (r369 slice 05 / spec 05, the
 * reference's contract): default silent, ONE toggle (Settings «الصوت»),
 * remembered, never autoplay with sound, muted ENTIRELY under
 * prefers-reduced-motion or data-saver.
 *
 * The set is three tiny synthesized mp3s in /sounds (tap 0.1s,
 * confirm 0.29s, milestone 0.5s — 0.9–3.2 KB each, under the ~20 KB
 * ceiling). They live in public/ (never bundled) and are fetched ONLY
 * after the user opts in: no Audio object exists before the first
 * opted-in play, and flipping the toggle on preloads nothing until a
 * real event fires.
 *
 * Seats (wired honestly, nowhere else):
 *   · tap       — .btn presses inside the product shell (AppShell's
 *                 delegated listener).
 *   · confirm   — success toasts (toast.ts's success path).
 *   · milestone — <Celebrate/> firing on a recorded achievement.
 */

export type SoundName = 'tap' | 'confirm' | 'milestone';

const PREF_KEY = 'ula-sound';
const SOURCES: Record<SoundName, string> = {
  tap: '/sounds/tap.mp3',
  confirm: '/sounds/confirm.mp3',
  milestone: '/sounds/milestone.mp3',
};

/* Lazily created — an entry exists only after an opted-in play. */
const players: Partial<Record<SoundName, HTMLAudioElement>> = {};

/** The remembered preference; DEFAULT SILENT when unset or unreadable. */
export function getSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable — the session stays silent on next load */
  }
  if (!on) {
    /* Flipping off silences immediately AND drops the loaded players so
       the next opt-in fetches fresh objects (the lazy contract). */
    for (const name of Object.keys(players) as SoundName[]) {
      players[name]?.pause();
      delete players[name];
    }
  }
}

function mutedBySystem(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch {
    /* no matchMedia — treat as not muted by motion */
  }
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return true;
  return false;
}

/**
 * Play a UI sound when — and only when — the user opted in and the
 * system does not veto (reduced-motion / data-saver). Playback failures
 * (autoplay policy, decode) are swallowed: sound is a garnish, never a
 * blocker, and it must never surface an error to the user.
 */
export function playSound(name: SoundName): void {
  if (typeof window === 'undefined') return;
  if (!getSoundEnabled()) return;
  if (mutedBySystem()) return;
  try {
    const player = players[name] ?? new Audio(SOURCES[name]);
    players[name] = player;
    player.currentTime = 0;
    void player.play().catch(() => {
      /* the browser said no — stay silent */
    });
  } catch {
    /* no Audio implementation (tests, old webviews) — stay silent */
  }
}
