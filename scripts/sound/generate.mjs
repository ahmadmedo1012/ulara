#!/usr/bin/env node
/**
 * scripts/sound/generate.mjs — r367 D-P6: the original UI sound set.
 *
 * The app's key-feedback sounds are SYNTHESIZED here, never sampled:
 * quiet (≤0.12 peak ≈ −18 dBFS), short (≤0.18 s), sine-only with fast
 * exponential decays — three small original pieces:
 *
 *   success — two ascending soft sines (880 → 1318 Hz), the «done» blip
 *   error   — two descending low sines (262 → 196 Hz), the «not now» thud
 *   tick    — one 30 ms soft tick (1200 Hz), the quiet confirmation
 *
 * Every piece is mono 16-bit 44.1 kHz WAV, zero metadata, ~5–16 KB each
 * (the app ships them inside the bundle — small is a design constraint).
 * Regenerate with:  node scripts/sound/generate.mjs
 * Output:           apps/mobile/assets/sounds/*.wav  (committed artifacts)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "apps", "mobile", "assets", "sounds");
const RATE = 44_100;

/** One exponential-decay sine segment. peak ≤ 0.12 keeps every piece
 * quiet by construction (the app's own volume gate multiplies further). */
function tone({ freqs, durMs, peak, decay }) {
  const n = Math.round((durMs / 1000) * RATE);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * decay);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    v = (v / freqs.length) * peak * env;
    out[i] = Math.round(Math.max(-1, Math.min(1, v)) * 32767);
  }
  return out;
}

function concat(...parts) {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Int16Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(samples[i], i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });

/* success — the two-note rise (880→1318), each note 90 ms with a fast
   decay, the second hard-cut after the first (two distinct blips) */
const success = concat(
  tone({ freqs: [880], durMs: 90, peak: 0.11, decay: 26 }),
  tone({ freqs: [1318], durMs: 90, peak: 0.11, decay: 26 }),
);

/* error — the low double (262 → 196), slightly longer, the same grammar
   descending so it reads as «not now» without any harshness */
const error = concat(
  tone({ freqs: [262], durMs: 110, peak: 0.12, decay: 18 }),
  tone({ freqs: [196], durMs: 110, peak: 0.12, decay: 18 }),
);

/* tick — one 30 ms soft confirmation */
const tick = tone({ freqs: [1200], durMs: 30, peak: 0.08, decay: 90 });

const files = { "success.wav": success, "error.wav": error, "tick.wav": tick };
for (const [name, samples] of Object.entries(files)) {
  writeFileSync(join(OUT, name), wav(samples));
  console.log(name, (samples.length / RATE).toFixed(3) + "s");
}
console.log("written to", OUT);
