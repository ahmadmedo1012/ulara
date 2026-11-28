#!/usr/bin/env node
/**
 * scripts/measure-web-vitals.mjs — r370 round 3, real browser numbers.
 *
 * LCP from the browser's own PerformanceObserver (not a lab estimate), plus
 * the bytes the page actually transferred for JS/CSS and how many requests
 * it took — per route, median of N cold runs (fresh context each run, HTTP
 * cache disabled, so the number is a first-visit number).
 *
 * Usage:
 *   node scripts/measure-web-vitals.mjs --base http://127.0.0.1:4100 \
 *     --routes /,/login,/about --runs 5
 */
import { chromium } from 'playwright-core';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const BASE = arg('base', 'http://127.0.0.1:4100');
const ROUTES = arg('routes', '/,/login').split(',').filter(Boolean);
const RUNS = Number(arg('runs', '5'));
const HEADLESS_SHELL = process.env.CHROME_PATH || undefined;
// `--throttle slow4g` = the honest mobile story: 1.6 Mbps down / 750 kbps up,
// 150 ms RTT and a 4× CPU slowdown (devtools "Slow 4G" + 4x) via CDP. A
// localhost number without throttling only measures the machine.
const THROTTLE = arg('throttle', '');

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const browser = await chromium.launch({
  executablePath: HEADLESS_SHELL,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const rows = [];
for (const route of ROUTES) {
  const samples = [];
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    if (THROTTLE) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const started = Date.now();
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 60_000 });
    // Let the LCP observer settle (fonts/images arriving after `load`).
    await page.waitForTimeout(1200);
    const data = await page.evaluate(() => {
      const res = performance.getEntriesByType('resource');
      const sum = (type) =>
        res
          .filter((r) => (type === 'js' ? /\.js(\?|$)/.test(r.name) : /\.css(\?|$)/.test(r.name)))
          .reduce((s, r) => s + (r.transferSize || 0), 0);
      return {
        lcp: window.__lcp || 0,
        dcl: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        requests: res.length,
        jsBytes: sum('js'),
        cssBytes: sum('css'),
        url: location.pathname,
      };
    });
    samples.push({ ...data, wall: Date.now() - started });
    await context.close();
  }
  rows.push({
    route,
    landed: samples[0].url,
    lcp: median(samples.map((s) => s.lcp)),
    dcl: median(samples.map((s) => s.dcl)),
    requests: median(samples.map((s) => s.requests)),
    jsKb: median(samples.map((s) => s.jsBytes)) / 1024,
    cssKb: median(samples.map((s) => s.cssBytes)) / 1024,
    wasteKb: median(samples.map((s) => s.jsBytes + s.cssBytes)) / 1024,
  });
}

await browser.close();

console.log(`## web vitals — ${BASE}, chromium ${RUNS} cold runs per route, 390×844${THROTTLE ? `, throttled ${THROTTLE}` : ''}\n`);
console.log('| route | landed | LCP | DCL | requests | JS | CSS | bytes |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(
    `| ${r.route} | ${r.landed} | ${Math.round(r.lcp)} ms | ${Math.round(r.dcl)} ms | ${r.requests} | ${r.jsKb.toFixed(1)} KB | ${r.cssKb.toFixed(1)} KB | ${(r.wasteKb / 1024).toFixed(2)} MiB |`,
  );
}
