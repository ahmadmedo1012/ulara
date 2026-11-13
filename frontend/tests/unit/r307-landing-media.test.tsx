/**
 * r307→Ω — the landing media layer contract.
 *
 * Phase Ω (identity purity) retires the real-university media
 * programme whole: no Commons university photography, no
 * official-channel video embeds, no university line-art cards. The
 * landing's media layer is now the platform's OWN production only.
 * This sheet pins what interaction tests cannot see cheaply:
 *   · the product-capture registry ↔ the manifest ↔ the bytes on disk
 *     agree (every derivative the srcset promises actually ships);
 *   · the retired programme leaves NOTHING behind: no embed hosts in
 *     the CSP, no hotlink patterns, no university-media imports;
 *   · the funnel counts survive the media rework untouched (the 5+6
 *     contract stays pinned here — the rework added ZERO new auth
 *     links).
 *
 * Pure fs + source contracts — the landing-funnel convention.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const stripLineComments = (src: string) => src.replace(/^\s*\/\/.*$/gm, '');

/* P2-0 (r335 split): the product band lives in sections/Product.tsx. */
const productTsx = read('src/components/landing/sections/Product.tsx');
/* R331 split: the guest surface = LandingPage + chrome/SheetNav + hero/Hero. */
const surfaceTsx = [
  'src/pages/LandingPage.tsx',
  'src/components/landing/chrome/SheetNav.tsx',
  'src/components/landing/hero/Hero.tsx',
  'src/components/landing/sections/Hero.tsx',
  'src/components/landing/sections/Statement.tsx',
  'src/components/landing/sections/Live.tsx',
  'src/components/landing/sections/Chapters.tsx',
  'src/components/landing/sections/Product.tsx',
  'src/components/landing/sections/Why.tsx',
  'src/components/landing/sections/Roles.tsx',
  'src/components/landing/sections/Vision.tsx',
  'src/components/landing/sections/Footer.tsx',
].map(read).join('\n');
const liveTsx = stripLineComments(stripComments(surfaceTsx));
const manifest = JSON.parse(read('public/media/manifest.json')) as {
  products: Array<{ id: string; derivativeWidths: number[] }>;
  illustrations?: Array<{ id: string }>;
};

beforeAll(() => {
  if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

describe('Ω — the product-capture registry agrees with the manifest and the bytes', () => {
  it('every manifest product capture ships every promised derivative', () => {
    expect(manifest.products.length).toBeGreaterThan(0);
    for (const prod of manifest.products) {
      for (const w of prod.derivativeWidths) {
        const file = `public/media/product/${prod.id}-${w}.webp`;
        expect(existsSync(path.join(root, file)), `${file} missing`).toBe(true);
      }
    }
  });

  it('every capture carries the demo-data disclosure (the labeled workspace, never a university)', () => {
    const registry = read('src/data/product-media.ts');
    const disclosures = (registry.match(/بيانات العرض التجريبية/g) ?? []).length;
    expect(disclosures, 'the alt/caption lines disclose the demo data').toBeGreaterThan(0);
    expect(registry).not.toMatch(/جامع/);
    expect(registry).not.toContain('بنغازي');
    expect(registry).not.toContain('طرابلس');
  });
});

describe('Ω — the retired university-media programme leaves NOTHING behind', () => {
  it('the retired registries and components are gone from the tree', () => {
    expect(existsSync(path.join(root, 'src/data/university-media.ts'))).toBe(false);
    expect(existsSync(path.join(root, 'src/data/university.facts.ts'))).toBe(false);
    expect(existsSync(path.join(root, 'src/data/colleges.config.ts'))).toBe(false);
    expect(existsSync(path.join(root, 'src/components/landing/VideoCard.tsx'))).toBe(false);
    expect(existsSync(path.join(root, 'src/components/landing/MediaFrame.tsx'))).toBe(false);
    expect(existsSync(path.join(root, 'src/components/illustrations/UniversityCard.tsx'))).toBe(false);
    expect(existsSync(path.join(root, '../shared/media/university-cards.ts'))).toBe(false);
    expect(existsSync(path.join(root, 'public/media/universities'))).toBe(false);
  });

  it('the manifest documents the retirement honestly (policy, no photos/videos rows)', () => {
    const m = JSON.parse(read('public/media/manifest.json'));
    expect(m.retiredProgrammes, 'the retirement is on record').toBeTruthy();
    expect(m.retiredProgrammes.photos).toBeTruthy();
    expect(m.retiredProgrammes.videos).toBeTruthy();
    expect(m.retiredProgrammes.universityCards).toBeTruthy();
    expect(m.photos, 'no photo rows remain').toBeUndefined();
    expect(m.videos, 'no video rows remain').toBeUndefined();
  });

  it('no youtube embed host survives anywhere in the frontend source', () => {
    expect(liveTsx).not.toContain('youtube-nocookie');
    expect(liveTsx).not.toContain('i.ytimg.com');
    expect(read('src/pages/campus/CampusPages.tsx')).not.toContain('youtube');
  });
});

describe('Ω — the CSP admits nothing external (the embed programme is retired)', () => {
  it('frame-src is self-only — no embed hosts at all', () => {
    const app = read('../backend/src/app.ts');
    const m = app.match(/'frame-src':\s*\[([\s\S]*?)\],/);
    expect(m, 'frame-src directive present').toBeTruthy();
    const body = m?.[1] ?? '';
    expect(body).toContain("'self'");
    expect(body).not.toContain('youtube');
    expect(body).not.toMatch(/https?:\/\//);
  });

  it('img-src stays self-only — no remote image hosts', () => {
    const app = read('../backend/src/app.ts');
    const m = app.match(/'img-src':\s*\[([^\]]*)\],/);
    const imgSrc = m?.[1] ?? '';
    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain('data:');
    expect(imgSrc).toContain('blob:');
    expect(imgSrc).not.toMatch(/https?:\/\//);
  });
});

describe('Ω — the media rework added ZERO new funnel links', () => {
  it('the 5+6 register/login counts survive untouched (R331: login 6 — the hero secondary joined the register)', () => {
    expect((liveTsx.match(/to="\/auth\/register"/g) ?? []).length).toBe(5);
    expect((liveTsx.match(/to="\/auth"/g) ?? []).length).toBe(6);
  });

  it('the sections route to anchors and app routes only', () => {
    /* The /campus sub-page keeps its #campus-life anchor for deep
     * links; the video facades are retired with the programme. */
    const campusSrc = read('src/pages/campus/CampusPages.tsx');
    expect(campusSrc, 'the #campus-life anchor must survive for deep links').toContain('campus-life');
    for (const id of ['product', 'cta']) {
      expect(liveTsx).toContain(`id="${id}"`);
    }
    // the product CTA scrolls to the conversion row — never an auth link
    const productAt = productTsx.indexOf('id="product"');
    const productBlock = stripComments(productTsx.slice(productAt, productTsx.indexOf('className="wy-section"')));
    expect(productBlock).toContain('href="#cta"');
    expect(productBlock).not.toMatch(/to="\/auth/);
    expect(productBlock).not.toMatch(/href="\/auth/);
  });
});
