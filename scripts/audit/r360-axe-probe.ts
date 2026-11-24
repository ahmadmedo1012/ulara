import { chromium } from 'playwright';
import { installMockApi, seedSession } from '../../frontend/tests/e2e/fixtures/mock-transport';
import { readFileSync } from 'node:fs';

async function main() {
  const target = process.argv[2] || '/';
  const role = (process.argv[3] || 'STUDENT') as never;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: Number(process.env.PW || 1440), height: 900 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await installMockApi(page);
  await seedSession(page, role);
  await page.goto('http://localhost:4173' + target, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);
  const axeScript = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
  await page.evaluate(axeScript);
  const res = await page.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (n: Document, o: object) => Promise<{ violations: { id: string; impact: string; nodes: { target: unknown[]; }[] }[] }> } }).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: JSON.stringify(v.nodes[0]?.target).slice(0, 70) }));
  });
  console.log('== ' + target + ' (' + role + ') ==');
  console.log(res.length ? JSON.stringify(res, null, 1) : 'CLEAN');
  // probe computed colors for the retired accent
  const colors = await page.evaluate(() => {
    const hits = new Set<string>();
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'background-color', 'border-color']) {
        const v = (cs as unknown as Record<string, string>)[prop];
        if (v && /rgb\(217,\s*119,\s*6\)/i.test(v)) hits.add(prop + ':' + v + ' @ ' + String((el as HTMLElement).className).slice(0, 40));
      }
    });
    return [...hits].slice(0, 6);
  });
  if (colors.length) console.log('AMBER:', colors);
  await browser.close();
}
main();
