// Mobile scroll cost probe: 390x844 touch viewport, CPU throttle, scroll in 24px steps per ~16ms,
// reports frame-time percentiles, long tasks, and per-section worst frames.
// usage: node scripts/fidelity/scrollperf.mjs [--route /] [--cpu 4] [--w 390] [--h 844]
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(ROOT, 'frontend', 'package.json'))('playwright');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +arg('w', 390), height: +arg('h', 844) }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +arg('cpu', 4) });
await p.goto('http://localhost:' + arg('port','5173') + arg('route', '/'), { waitUntil: 'networkidle' });
await p.waitForTimeout(1500); if (arg('css','')) await p.addStyleTag({ content: arg('css','') });
await p.evaluate(() => {
  window.__f = []; window.__lt = []; let last = performance.now();
  const tick = (t) => { window.__f.push([t, t - last, scrollY]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration, scrollY]))).observe({ entryTypes: ['longtask'] });
});
const H = await p.evaluate(() => document.documentElement.scrollHeight);
let y = 0;
while (y < H - 900) { y += 24; await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(16); }
const r = await p.evaluate(() => ({ f: window.__f, lt: window.__lt }));
const d = r.f.map((x) => x[1]).filter((x) => x < 2000).sort((a, c) => a - c);
const q = (k) => d[Math.floor(d.length * k)].toFixed(1);
console.log(`doc ${H}px frames ${d.length} p50 ${q(0.5)} p90 ${q(0.9)} p99 ${q(0.99)} max ${d[d.length - 1].toFixed(1)}ms; >50ms: ${d.filter((x) => x > 50).length}; longtasks ${r.lt.length} total ${r.lt.reduce((a, x) => a + x[1], 0).toFixed(0)}ms`);
const buckets = {};
for (const [, dt, sy] of r.f) { const k = Math.floor(sy / 1000); buckets[k] = Math.max(buckets[k] ?? 0, dt); }
console.log('worst frame per 1000px:', Object.entries(buckets).map(([k, v]) => `${k}k:${v.toFixed(0)}`).join(' '));
console.log('longtasks by 1000px:', JSON.stringify(r.lt.reduce((a, x) => { const k = Math.floor(x[2] / 1000); a[k] = (a[k] ?? 0) + Math.round(x[1]); return a; }, {})));
await b.close();
