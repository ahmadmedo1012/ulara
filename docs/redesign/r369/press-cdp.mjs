import { chromium } from 'playwright';
const AUTH = { state: { user: { id: 'cap-student', email: 's@t.ly', firstName: 'ط', lastName: 'ت', role: 'STUDENT', avatarColor: null, avatarInitials: null, scopeFacultyId: null }, accessToken: 'cap', memberships: [], currentInstitution: null, membershipRole: 'STUDENT' }, version: 2 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((a) => { localStorage.setItem('ula-auth', JSON.stringify(a)); sessionStorage.setItem('ulara-intro-skip','1'); }, AUTH);
await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }));
await page.goto('http://localhost:5310/student/gamification', { waitUntil: 'networkidle' });
const cdp = await ctx.newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument');
const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.btn.primary' });
await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active', 'hover'] });
const m = await cdp.send('CSS.getMatchedStylesForNode', { nodeId });
const chains = [...(m.matchedCSSRules || [])].reverse();
for (const r of chains) {
  const text = r.rule.style.cssText || '';
  if (/\btransform\b|\btranslate\b|\bscale\b/.test(text)) {
    console.log('---', r.rule.selectorList.text, '@', r.rule.origin);
    console.log('   ', text.replace(/\s+/g, ' ').slice(0, 220));
  }
}
const { computedStyle } = await cdp.send('CSS.getComputedStyleForNode', { nodeId });
for (const p of computedStyle) if (['transform','translate','scale','rotate'].includes(p.name)) console.log('computed', p.name, '=', p.value);
await browser.close();
