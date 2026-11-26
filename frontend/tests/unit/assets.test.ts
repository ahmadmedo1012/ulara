/**
 * Static asset & loading-performance guards (WS-F5).
 *
 * These lock in the fixes that are invisible to component tests:
 *  - self-hosted IBM Plex fonts (no render-blocking Google Fonts <link>)
 *  - every @font-face url resolves to a real file in public/fonts
 *  - hero art is an optimized <picture> (WebP ≤ 250 KB), not the old
 *    2 MB PNG
 *  - theme-color metas match the real canvas tokens
 *
 * Pure fs assertions — no jsdom interaction needed.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ comment blocks so header prose can't skew counts. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('self-hosted fonts (perf fix: render-blocking Google Fonts)', () => {
  it('index.html has no Google Fonts request chain', () => {
    const html = read('index.html');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  it('index.html preloads the two critical arabic subsets', () => {
    const html = read('index.html');
    // r369 — the identity moved to Readex Pro (body) + Baloo Bhaijaan 2
    // (display): the LCP h1 is the Baloo 800 face, the reading voice is
    // Readex 400 — exactly those two arabic subsets take the slots.
    expect(html).toContain('rel="preload" href="/fonts/readex-pro-arabic-400-normal.woff2"');
    // R322 override (3-b · perf-baseline §7-4): the preload re-pin
    // 700 → 600 — the R322 C1 type system renders 400/500/600 ONLY;
    // the 700 face was dead weight competing for the preload slot the
    // LCP h1's 600 face needs (Fast-3G measured: the display font
    // queued behind the dead 700 while the LCP waited — 5.73s LCP
    // first, ~3.5s expected after the re-pin). The map's display type
    // is w600-max by the brief's own cap, so 600 is doubly the LCP
    // face; the 700 preload must stay DEAD.
    expect(html).toContain('rel="preload" href="/fonts/baloo-bhaijaan-2-arabic-800-normal.woff2"');
    expect(html).not.toContain('rel="preload" href="/fonts/readex-pro-arabic-700-normal.woff2"');
    // both preloads must be CORS-mode font fetches
    expect(html.match(/as="font" type="font\/woff2" crossorigin/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('every @font-face in fonts.css points to an existing woff2 file', () => {
    const css = stripComments(read('src/styles/fonts.css'));
    const urls = [...css.matchAll(/url\('?(\/fonts\/[^)']+\.woff2)'?\)/g)].map((m) => m[1]!);
    // r369 — 18 faces: Baloo Bhaijaan 2 400/600/700/800 (arabic+latin = 8)
    // + Readex Pro 400/500/600/700 (arabic+latin = 8) + Geist Mono 400/500
    // (tabular numerals only). Alexandria, IBM Plex Sans Arabic and IBM
    // Plex Mono are retired with the old display/body voice.
    expect(urls.length).toBe(18);
    for (const u of urls) {
      const file = path.join(root, 'public', u.replace(/^\//, ''));
      expect(existsSync(file), `${u} missing from public/fonts`).toBe(true);
    }
  });

  it('all font faces use font-display: swap', () => {
    const css = stripComments(read('src/styles/fonts.css'));
    const faces = css.match(/@font-face\s*\{/g)?.length ?? 0;
    expect(faces).toBe(18);   // r369 — 8 Baloo + 8 Readex Pro + 2 Geist Mono
    expect(css.match(/font-display:\s*swap/g)?.length).toBe(faces);
  });

  it('fonts.css is imported before tokens.css in main.tsx', () => {
    const main = read('src/main.tsx');
    const fonts = main.indexOf("import './styles/fonts.css'");
    const tokens = main.indexOf("import './styles/tokens/tokens.css'");
    expect(fonts).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(fonts).toBeLessThan(tokens);
  });
});

describe('r188 brand reset — campus photography retired (no real-university imagery)', () => {
  it('every main_photo campus cut is gone (the whole photo family)', () => {
    // The retired real-university campus imagery (main_photo.{png,jpg,webp}
    // + the 750w/card cuts) stays deleted — the folio landing ships a
    // vector manuscript figure, and no public surface may re-introduce
    // photography of a real campus.
    for (const f of [
      'main_photo.png', 'main_photo.jpg', 'main_photo.webp',
      'main_photo-750.webp', 'main_photo-card.webp',
    ]) {
      expect(existsSync(path.join(root, 'public', f)), `${f} must stay deleted (r188)`).toBe(false);
    }
  });

  it('r369 — the hero art is our own mascot SVG (no raster, no photo)', () => {
    /* r369 replaced the drafted-elevation hero art with the mascot
     * «نجّوم» — the same contract holds: an original inline SVG, no
     * <picture>, no campus raster. */
    const src = read('src/components/landing/r369/Mascot.tsx');
    const page = read('src/pages/LandingPage.tsx');
    expect(page).not.toContain('<picture>');
    expect(page).not.toContain('main_photo');
    expect(src).not.toContain('<picture>');
    expect(src).not.toContain('<image');
    expect(src).toContain('viewBox');
    // decorative by default — the band supplies any meaning in text
    expect(src).toContain('aria-hidden');
  });

  it('r198 — the retired landing raster family stays deleted', () => {
    // The r191 art-direction assets (hero scenes, orbit rings, vision
    // backdrops, product/role card renders) died with the poster
    // rebuild — only the two brand keepers remain in public/brand.
    for (const f of [
      'hero-scene.webp', 'hero-scene-720.webp', 'hero-scene.jpg',
      'orbit-ring.webp', 'orbit-ring-480.webp', 'orbit-ring.jpg',
      'vision-bg.webp', 'vision-bg-768.webp',
      'card-content.webp', 'card-content-480.webp',
      'card-assessment.webp', 'card-assessment-480.webp',
      'card-ai.webp', 'card-ai-480.webp',
      'journey-student.webp', 'journey-student-480.webp',
      'journey-teacher.webp', 'journey-teacher-480.webp',
      'journey-institution.webp', 'journey-institution-480.webp',
    ]) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} must stay deleted (r198)`).toBe(false);
    }
    // The retired scene components never come back (new names may —
    // the r162 pin holds on the r188 tombstones).
    for (const f of [
      'src/components/landing/KnowledgeMap.tsx',
      'src/components/landing/OrbitPath.tsx',
      'src/components/landing/TestimonialSection.tsx',
    ]) {
      expect(existsSync(path.join(root, f)), `${f} must stay deleted (r198)`).toBe(false);
    }
  });

  it('no stylesheet ships a campus photo as a CSS background', () => {
    for (const f of readdirSync(path.join(root, 'src/styles'))) {
      if (!f.endsWith('.css')) continue;
      const css = read(`src/styles/${f}`);
      expect(css, `${f} references retired campus photography`).not.toMatch(
        /url\(['"]?\/main_photo[^)]*\)/,
      );
    }
  });
});

describe('welcome-card background + dead brand assets (audit 11-g P2-3 / P1-4 → r188)', () => {
  it('student welcome card paints token recipes, not photography (r188)', () => {
    // The retired campus-photo overlay is gone with the brand reset —
    // the welcome-card family grounds on accent-soft token recipes.
    const css = read('src/styles/student.css');
    expect(css).not.toContain("url('/main_photo-card.webp')");
    expect(css).not.toContain("url('/main_photo.webp')");
  });

  it('no stylesheet ships the full-res hero as a CSS background', () => {
    // CSS backgrounds cannot do responsive srcset — the 99.6 KB hero must
    // only ever be consumed via the <picture> art on the landing page.
    for (const f of readdirSync(path.join(root, 'src/styles'))) {
      if (!f.endsWith('.css')) continue;
      const css = read(`src/styles/${f}`);
      expect(css, `${f} references the full-res hero as a background`).not.toMatch(
        /url\('\/main_photo\.(webp|jpg)'\)/,
      );
    }
  });

  it('dead brand assets stay deleted; the three referenced keepers remain', () => {
    const dead = [
      'ulara-logo-full.jpg',
      'ulara-logo.jpg',
      'ulara-logo-md.jpg',
      'ulara-logo-sm.jpg',
      'zu-campus.jpg',
      'zu-campus-sm.jpg',
    ];
    for (const f of dead) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} should stay deleted`).toBe(false);
    }
    // keepers (r188): og:image/twitter (index.html → ulara-og.jpg) +
    // BrandMark / favicon (ulara-mark.svg). The retired ZU crest
    // (zu-mark.svg) and the old logo sheet (ulara-logo-lg.jpg) joined
    // the dead list — no real-university asset remains on disk.
    for (const f of ['ulara-og.jpg', 'ulara-mark.svg']) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} must remain`).toBe(true);
    }
    for (const f of ['zu-mark.svg', 'ulara-logo-lg.jpg']) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} must stay deleted (r188 brand reset)`).toBe(false);
    }
  });
});

describe('theme-color metas match the real canvas tokens', () => {
  it('matches both browser chrome and the initial paint to the shared surfaces', () => {
    const html = read('index.html');
    const { color } = JSON.parse(read('../shared/design-tokens.json'));
    for (const mode of ['dark', 'light']) {
      const paper = color.neutral[mode]['50'];
      expect(html).toContain(`<meta name="theme-color" content="${paper}" media="(prefers-color-scheme: ${mode})"`);
      expect(html).toContain(`'${paper}'`);
      expect(html).toContain(`background: ${paper}`);
    }
    expect(html.match(/#F6F8FA/g)?.length ?? 0).toBe(0);
    expect(html).not.toContain('#070B16');
    expect(html).not.toContain('#16140F');
    expect(html).not.toContain('#F3EEE4');
  });
});
