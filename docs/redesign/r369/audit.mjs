import { chromium } from 'playwright';

/**
 * r369 overlap + layering audit (S4).
 *
 * Fails on the four defects a screenshot review keeps missing:
 *   1. horizontal scroll (a width that does not fit its viewport),
 *   2. text over text (two leaf text nodes whose boxes intersect),
 *   3. a primary control hidden UNDER a fixed layer (nav/jar/toast),
 *   4. a control smaller than 44×44 in the flow (phone widths).
 * It runs every width × both themes on whatever URL it is given.
 */
const url = process.argv[2] ?? 'http://127.0.0.1:5310/';
const WIDTHS = [320, 360, 390, 768, 1024, 1440, 1920];
const findings = [];

const browser = await chromium.launch(process.env.PW_CHROME_CHANNEL === 'bundled' ? {} : { channel: 'chrome' });
for (const dark of [false, true]) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      locale: 'ar-LY',
      colorScheme: dark ? 'dark' : 'light',
    });
    const page = await ctx.newPage();
    await page.addInitScript((d) => {
      sessionStorage.setItem('ulara-intro-skip', '1');
      if (d) localStorage.setItem('ulara-theme', 'dark');
    }, dark);
    await page.goto(url, { waitUntil: 'networkidle' });
    // walk the page so every armed band reveals before we measure
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 700) {
      await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(250);

    const res = await page.evaluate((w) => {
      const out = { overflow: 0, textOverText: [], covered: [], small: [] };
      out.overflow = Math.max(0, document.documentElement.scrollWidth - w);

      const text = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode.textContent?.trim() ?? '';
        if (t.length < 3) continue;
        const el = walker.currentNode.parentElement;
        if (!el) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
        if (el.closest('.visually-hidden, [aria-hidden="true"], .w369-marquee, .w369-pre, .w369-jar')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        text.push({ el, r, t: t.slice(0, 24) });
      }

      const area = (a, b) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

      for (let i = 0; i < text.length; i += 1) {
        for (let j = i + 1; j < text.length; j += 1) {
          const a = text[i], b = text[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          // only DOM text overlapping in the SAME stacking glyph area counts
          if (a.r.bottom < 0 || b.r.bottom < 0 || a.r.top > window.innerHeight * 3) continue;
          const ov = area(a.r, b.r);
          const min = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
          if (min > 0 && ov / min > 0.35) {
            out.textOverText.push(`${a.t} ∩ ${b.t}`);
            if (out.textOverText.length > 6) break;
          }
        }
      }

      const fixed = [...document.querySelectorAll('body *')].filter((el) => {
        const cs = getComputedStyle(el);
        /* a STICKY bar is meant to have content pass under it — only a
         * FIXED layer (toast, jar, cookie bar) can permanently cover. */
        if (cs.position !== 'fixed') return false;
        if (cs.pointerEvents === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.height > 20 && r.width > 40;
      });
      const ctas = [...document.querySelectorAll('a.w369-btn, button.w369-btn, a.btn, button.btn')];
      for (const layer of fixed) {
        const lr = layer.getBoundingClientRect();
        for (const cta of ctas) {
          const cr = cta.getBoundingClientRect();
          if (cr.bottom < 0 || cr.top > window.innerHeight) continue;
          if (area(lr, cr) / (cr.width * cr.height) > 0.25) {
            out.covered.push(`${cta.textContent?.trim().slice(0, 18)} under ${layer.className.toString().slice(0, 24)}`);
          }
        }
      }

      for (const ctl of document.querySelectorAll('.w369 a, .w369 button, .w369 summary')) {
        const r = ctl.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        /* WCAG 2.5.8: the target size that matters is the one a thumb
         * must hit — inline text links are exempt by the same rule. */
        /* a text link is sized by its words — WCAG 2.5.8 exempts inline
         * targets. What must never shrink is the HIT HEIGHT, and the
         * icon-only control, which has no text to grow. */
        const textLink = (ctl.textContent ?? '').trim().length > 0;
        if (r.height < 44 || (r.width < 44 && !textLink)) {
          const inText = ctl.closest('p, li, .w369-footer-note');
          if (inText) continue;
          out.small.push(`${(ctl.textContent || ctl.className).toString().trim().slice(0, 18)} ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
      }
      out.textOverText = out.textOverText.slice(0, 6);
      out.covered = [...new Set(out.covered)].slice(0, 6);
      out.small = [...new Set(out.small)].slice(0, 6);
      return out;
    }, width);

    const tag = `${width}${dark ? ' dark' : ''}`;
    if (res.overflow > 0) findings.push(`${tag}: horizontal overflow ${res.overflow}px`);
    for (const t of res.textOverText) findings.push(`${tag}: text-over-text — ${t}`);
    for (const c of res.covered) findings.push(`${tag}: CTA covered — ${c}`);
    for (const s of res.small) findings.push(`${tag}: target < 44 — ${s}`);
    await ctx.close();
  }
}
await browser.close();
console.log(findings.length ? findings.join('\n') : 'OVERLAP AUDIT: clean at every width, both themes');
console.log(`(${findings.length} finding(s))`);
