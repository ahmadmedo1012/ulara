// Wheel-step capture: scrolls with real mouse wheel steps so the pinned stage's driver sees each frame.
// usage: node scripts/fidelity/wheel.mjs --route / --anchor '.jt' --steps 14 --dy 120 --out DIR
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(ROOT, 'frontend', 'package.json'))('playwright');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const out = arg('out', '/tmp/wh'); mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: arg('theme', 'light') });
await p.addInitScript((t) => { try { localStorage.setItem('ulara-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 })); } catch {} }, arg('theme', 'light'));
await p.goto('http://localhost:5173' + arg('route', '/'), { waitUntil: 'networkidle' });
await p.mouse.move(700, 500);
const anchor = arg('anchor', '.jt');
// coarse wheel to the anchor
for (let i = 0; i < 80; i++) { const t = await p.evaluate((a) => document.querySelector(a)?.getBoundingClientRect().top ?? 1e9, anchor); if (t < 40) break; await p.mouse.wheel(0, 400); await p.waitForTimeout(120); }
const steps = +arg('steps', 14), dy = +arg('dy', 120);
for (let i = 0; i < steps; i++) { await p.screenshot({ path: join(out, `w${String(i).padStart(2, '0')}.png`) }); await p.mouse.wheel(0, dy); await p.waitForTimeout(350); }
await b.close();
