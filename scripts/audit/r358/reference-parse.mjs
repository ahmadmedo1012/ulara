#!/usr/bin/env node
/**
 * scripts/audit/r358/reference-parse.mjs — R358 Phase A instrument 1/3
 * (THE reference numbers extractor).
 *
 * WHY PARSE (not replay): the reference's live deployment is dark (404s —
 * a temporary demo). The r350 corpus is the sanctioned extraction record:
 * the formatted full stylesheet, the measured timelines (preloader
 * samples, ScrollTrigger dump, driven + mobile scroll states) and the
 * pre-render DOM. Re-initializing the real engine bundle on the saved
 * mid-animation DOM was probed and EXPLODES the layout (nested GSAP
 * artifacts → 33.5M-px wrapper; evidence in the r358 ledger) — so the
 * numbers are extracted DETERMINISTICALLY from the corpus itself:
 *   · refsite.css → tokens, type scale, spacing, sections, borders,
 *     radii, motion (transitions/keyframes) incl. media-query variants
 *   · preloader-timeline.json → counter curve + phases
 *   · driven-scroll-states.json / mobile-scroll-states.json → section
 *     tops/heights rhythm at desktop + mobile
 *   · scrolltrigger-dump.json → trigger census (counts, pins, scrubs)
 * Output: docs/redesign/r358/reference/reference-numbers.json
 *         (+ stdout summary — the spec's tables are composed from this)
 *
 * ZERO-TRACE: only sanitized corpus filenames are referenced; the
 * reference's name/domain/agency appear nowhere in this file.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CORPUS = resolve(ROOT, 'docs/redesign/r350/reference');
const OUT_DIR = resolve(ROOT, 'docs/redesign/r358/reference');

const css = readFileSync(join(CORPUS, 'refsite.css'), 'utf8');

/* ── tiny CSS tokenizer: rules + their media condition ───────────── */
function extractRules(cssText) {
  const rules = [];
  let i = 0, depth = 0, buf = '', media = [];
  const flushSelectorBlock = () => {
    const m = buf.match(/^([^{}]*)\{([\s\S]*)\}$/);
    if (m) {
      const sel = m[1].trim();
      const body = m[2];
      if (!sel.startsWith('@')) rules.push({ media: media.join(' and '), sel, body });
      else if (sel.startsWith('@media')) { /* handled by depth walk */ }
    }
    buf = '';
  };
  // Walk characters; at depth 0 a full "selector{body}" closes.
  const chars = [...cssText];
  let cur = '';
  for (let k = 0; k < chars.length; k++) {
    const c = chars[k];
    if (c === '{') {
      depth++;
      cur += c;
      if (depth === 1) { /* selector opened */ }
    } else if (c === '}') {
      depth--;
      cur += c;
      if (depth === 0) {
        // top-level statement complete
        const mm = cur.match(/^@media[^{]*\{/);
        if (mm) {
          // media block: harvest inner rules one by one
          const inner = cur.slice(cur.indexOf('{') + 1, cur.lastIndexOf('}'));
          const cond = cur.slice(0, cur.indexOf('{')).replace('@media', '').trim();
          for (const r of extractRules(inner)) rules.push({ media: r.media ? `${cond} and ${r.media}` : cond, sel: r.sel, body: r.body });
        } else {
          flushFrom(cur);
        }
        cur = '';
      }
    } else {
      if (depth === 0 && c === ';' && !cur.includes('{')) { cur = ''; continue; } // at-rule like @import
      cur += c;
    }
  }
  function flushFrom(stmt) {
    const m = stmt.match(/^([^{}]*)\{([\s\S]*)\}\s*$/);
    if (m && !m[1].trim().startsWith('@')) rules.push({ media: '', sel: m[1].trim(), body: m[2] });
    if (m && m[1].trim().startsWith('@font-face')) rules.push({ media: '', sel: '@font-face', body: m[2] });
  }
  return rules;
}
const rules = extractRules(css);

const decls = (body) => {
  const out = {};
  for (const m of body.matchAll(/([a-zA-Z-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};

/* ── 1. palette + fonts ─────────────────────────────────────────── */
const palette = {};
for (const r of rules.filter(r => r.sel === ':root' || r.sel.includes(':root')) ) {
  for (const [k, v] of Object.entries(decls(r.body))) if (k.startsWith('--')) palette[k] = v;
}
const fontFamilies = [];
for (const r of rules.filter(r => r.sel === '@font-face')) {
  const d = decls(r.body);
  if (d['font-family']) fontFamilies.push({ family: d['font-family'].replace(/["']/g, ''), weight: d['font-weight'] || '400', src: (d.src || '').slice(0, 60) });
}

/* ── 2. type scale + interesting selector families ───────────────── */
const FAMILIES = [
  'tb-h1', 'tb-h2', 'tb-h3', 'tb-h4', 'tb-h5', 'tb-h6', 'mb-h1', 'mb-h2', 'mb-h4', 'mb-h5',
  'txt', 'txt-10', 'txt-12', 'txt-14', 'txt-16', 'txt-font-mono', 'heading',
  'btn-fill', 'btn-line', 'btn', 'home-hero', 'home-hero-img-interact-wrap',
  'home-intro', 'home-intro-content', 'home-intro-content-title',
  'home-problem', 'home-map', 'home-map-inner', 'home-platform',
  'home-platform-content-inner', 'home-why', 'home-usecase', 'home-cta',
  'footer', 'footer-inner', 'header', 'header-inner', 'header-menu',
  'loading', 'loading-progress', 'loading-content',
  'container', 'wrap', 'section', 'line',
];
const KEPT_PROPS = ['font-size', 'line-height', 'font-weight', 'letter-spacing', 'text-transform',
  'padding', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom',
  'width', 'max-width', 'min-height', 'height', 'gap', 'grid-template-columns',
  'border', 'border-top-width', 'border-radius', 'color', 'background-color',
  'transition', 'transition-duration', 'transition-timing-function', 'animation', 'top'];

const typeSystem = {};
for (const fam of FAMILIES) {
  const hits = [];
  for (const r of rules) {
    if (!r.sel || (!r.sel.startsWith('.') && !r.sel.startsWith('.') && r.sel[0] !== '.')) continue;
    // match ".fam" as own class token (not substring of longer class)
    const re = new RegExp(`\\.${fam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
    if (!re.test(r.sel)) continue;
    const d = decls(r.body);
    const kept = {};
    for (const p of KEPT_PROPS) if (d[p] !== undefined) kept[p] = d[p];
    if (Object.keys(kept).length === 0) continue;
    hits.push({ media: r.media || 'base', sel: r.sel.slice(0, 70), ...kept });
  }
  if (hits.length) typeSystem[fam] = hits.slice(0, 14);
}

/* html font-size (the platform's breakpoint scaling) */
const htmlFont = rules.filter(r => /(^|,)\s*html\s*(,|$)|^html\s*$/.test(r.sel) && r.body.includes('font-size')).map(r => ({ media: r.media || 'base', sel: r.sel, size: decls(r.body)['font-size'] }));

/* ── 3. motion census from the CSS ───────────────────────────────── */
const transitions = {};
for (const r of rules) {
  const d = decls(r.body);
  for (const key of ['transition', 'transition-duration', 'transition-timing-function', 'animation']) {
    if (d[key]) {
      const val = d[key];
      transitions[val] = (transitions[val] || 0) + 1;
    }
  }
}
const motionCss = Object.entries(transitions).sort((a, b) => b[1] - a[1]).slice(0, 24)
  .map(([value, count]) => ({ value, count }));

/* ── 4. measured timelines (corpus JSONs) ───────────────────────── */
function loadJson(name, fallback) { try { return JSON.parse(readFileSync(join(CORPUS, name), 'utf8')); } catch { return fallback; } }

const pre = loadJson('preloader-timeline.json', []);
const preSamples = Array.isArray(pre) ? pre : Object.values(pre);
const preloader = { samples: preSamples.length };
if (preSamples.length) {
  const pctAt = (t) => { const s = preSamples.find(x => Math.abs(x.t - t) < 260); return s ? Number((s.progress || []).find(p => /%/.test(p.text || ''))?.text?.replace('%', '') ?? null) : null; };
  const last = preSamples[preSamples.length - 1];
  preloader.lastT = last?.t ?? null;
  preloader.pct0 = pctAt(400); preloader.pct45 = pctAt(1400); preloader.pct60 = pctAt(2900); preloader.pct100 = pctAt(4200);
}

const states = loadJson('driven-scroll-states.json', []);
const desktop = Array.isArray(states) ? states : [];
const sectionRhythm = desktop.length ? desktop.map(s => ({ y: s.y, sections: s.sections })) : [];
const lastState = desktop[desktop.length - 1] || {};
const journeyDesktop = lastState.max ?? null;

const mobileStates = loadJson('mobile-scroll-states.json', []);
const mobile = Array.isArray(mobileStates) ? mobileStates : [];
const journeyMobile = mobile.length ? (mobile[mobile.length - 1].max ?? null) : null;

const stDump = loadJson('scrolltrigger-dump.json', {});
const triggers = stDump.triggers || [];
const motionJson = {
  desktopJourneyPx: journeyDesktop,
  mobileJourneyPx: journeyMobile,
  scrollTriggers: triggers.length,
  pinned: triggers.filter(t => t.pin).length,
  scrubbed: triggers.filter(t => t.scrub).length,
  preloader,
};

/* ── output ──────────────────────────────────────────────────────── */
mkdirSync(OUT_DIR, { recursive: true });
const out = {
  _doc: 'R358 Phase A — the reference numbers, parsed deterministically from the r350 corpus (stylesheet + measured timelines). Zero-trace: sanitized names only.',
  palette, fontFamilies, htmlFont, typeSystem, motionCss, motionJson,
  sectionRhythmSamples: sectionRhythm.slice(0, 22),
};
writeFileSync(join(OUT_DIR, 'reference-numbers.json'), JSON.stringify(out, null, 2));
console.log(`[reference-parse] rules parsed: ${rules.length}`);
console.log(`[reference-parse] palette vars: ${Object.keys(palette).length} · fonts: ${fontFamilies.length} · families: ${Object.keys(typeSystem).length}`);
console.log(`[reference-parse] motion: journey ${journeyDesktop}px desktop / ${journeyMobile}px mobile · ${triggers.length} triggers (${triggers.filter(t => t.pin).length} pinned)`);
console.log(`[reference-parse] written: docs/redesign/r358/reference/reference-numbers.json`);
