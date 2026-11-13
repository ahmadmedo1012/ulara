/**
 * r177 (Phase 1 — brand neutrality) public-copy pins.
 *
 * Ulara presents itself as an INDEPENDENT educational platform. No
 * official adoption/endorsement by any university or ministry exists, so
 * no public surface may claim one. The retired real-university identity's
 * records are long gone from the product (Phase Ω) — and never as the
 * platform's identity.
 *
 * Pure fs pins on the public identity surfaces: index.html meta/OG/JSON-LD,
 * the landing/auth copy, the document-title bases, and the package
 * description. These lock the neutral wording against regression exactly
 * the way assets.test.ts pins static-asset truths.
 *
 * r183 (Wave B — brand-identity closure): the r177 sweep was copy-deep
 * but legal-surface/asset/issuer shallow. The A2 census found LICENSE,
 * the certificate issuer, the backend boot banner, the admin settings
 * card, the product-chrome mark, the seed's platform voice, DESIGN.md's
 * identity line and the (since-deleted, wave-2 purge) PROJECT-REFERENCE.md
 * still speaking the university brand. The
 * r183 block below pins every one of those closed surfaces too.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); // frontend/
const repoRoot = path.resolve(root, '..'); // monorepo root
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const readRepo = (p: string) => readFileSync(path.join(repoRoot, p), 'utf8');

/* ═══ ULARA TAKEOVER TRANSITION SEATS (spec §2 — workstreams B/D) ═══
 *
 * The cross-workstream identity seats these pins read — the root
 * package.json (B), the backend boot banner + certificate issuer +
 * seed tenant (B), and the root READMEs / LICENSE / docs/README.md
 * (D) — rename to ULARA in their OWN branches of ula/total-takeover.
 * Until the integration merge this suite runs on the A (web) tree
 * where those files still carry the retired literal, so each seat
 * accepts BOTH the decided ULARA value (the post-integration truth)
 * and the documented pre-takeover value — with a loud console warning
 * on the retired arm so the transition state is visible in CI logs.
 *
 * TODO(integration): when ula/total-takeover merges B + D, DELETE the
 * retired arms — every seat below must be an exact ULARA pin again. */
/* INTEGRATION LANDED (ula/total-takeover merged B + C + D): every
 * former transition seat is now an EXACT ULARA pin. The retired arms
 * and their fragment pairs are deleted per the original TODO. */
const takeoverSeat = (source: string, ulara: string, _retired: string, seat: string): void => {
  expect(source, `${seat}: expected the ULARA literal`).toContain(ulara);
};

/** Affiliation-claim markers that must never reappear in public copy. */
const OFFICIAL_CLAIMS = [
  'المنصّة الرسمية',
  'المنصة الرسمية',
  'وزارة التعليم العالي والبحث العلمي',
  'رسمية لجامعة',
] as const;

/* The retired real-university identity strings — ASSEMBLED from
 * fragments (the identity-gate convention): the banned literals must
 * never re-enter the tree spelled out, not even inside the gate that
 * bans them. */
const RETIRED_UNI_AR = ['جامعة الزا', 'وية'].join('');
const RETIRED_UNI_EN = ['University of Zaw', 'ia'].join('');
const RETIRED_PLATFORM_AR = ['منصّة الزا', 'وية'].join('');

describe('r177 — public metadata is platform-neutral (index.html)', () => {
  const html = read('index.html');

  it('title and description carry the independent platform identity', () => {
    expect(html).toContain('<title>أُلارا · نظام تشغيل الجامعة</title>');
    // ULARA takeover: the meta description is the platform's own
    // one-line identity — the full Arabic-first descriptor.
    expect(html).toContain('منظومة متكاملة، عربية أولًا');
    expect(html).not.toContain('منصّة تعليم ذكية مستقلّة'); // the r191 slogan seat is retired
  });

  it('OG / Twitter cards describe Ulara, not a university', () => {
    expect(html).toContain('<meta property="og:site_name" content="أُلارا — نظام تشغيل الجامعة" />');
    expect(html).not.toMatch(new RegExp(`og:(site_name|title)" content="[^"]*${RETIRED_UNI_AR}`));
    expect(html).not.toMatch(new RegExp(`twitter:title" content="[^"]*${RETIRED_UNI_AR}`));
  });

  it('r188 — JSON-LD site node is Ulara ALONE: no `about` university node exists at all', () => {
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(ld).not.toBeNull();
    const data = JSON.parse(ld![1]!);
    expect(data['@type']).toBe('WebSite');
    expect(data['name']).toBe('أُلارا');
    // no official-affiliation claim anywhere in the structured data
    const flat = JSON.stringify(data);
    for (const claim of OFFICIAL_CLAIMS) {
      expect(flat).not.toContain(claim);
    }
    // r188: the retired real-university `about` node is GONE — the only
    // demo-data mention is the fictional tenant, inside the description.
    expect(data['about']).toBeUndefined();
    expect(data['description']).toContain('مساحة عمل أُلارا التجريبية');
    expect(data['description']).toContain('اصطناعية');
  });

  it('no ministry/official claim remains in any meta line', () => {
    for (const claim of OFFICIAL_CLAIMS) {
      expect(html).not.toContain(claim);
    }
  });
});

describe('r177 — landing/auth copy is affiliation-free', () => {
  it('landing presents the independent identity and labels showcase data', () => {
    /* P2-0 (r335 split): the guest surface = LandingPage + the nine
     * section bands (the copy moved verbatim into sections/*.tsx —
     * the contract reads the surface, not the file layout). */
    const landing = [
      'src/pages/LandingPage.tsx',
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
    for (const claim of OFFICIAL_CLAIMS) {
      // comments document the OLD wording on purpose — strip them first
      const code = landing.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(code, `landing still carries: ${claim}`).not.toContain(claim);
    }
    expect(landing).toContain('مستقلّة');
    // Phase Ω: the only sample-data story is the LABELED demo
    // workspace, stated in the independence manifesto with its
    // synthetic label (a workspace, never a university).
    expect(landing).toContain('مساحة عمل أُلارا التجريبية');
    expect(landing).toContain('اصطناعية بالكامل');
    expect(landing).not.toContain(RETIRED_UNI_AR);
    // brand subtitle is a product descriptor, not a university
    // R315 override (K-B): the desktop header's logo cell is the
    // reference's measured mark+wordmark seat — the tagline stack is
    // retired from the masthead; the descriptor lives on in the footer
    // brand block (exactly one seat on the sheet) + <title>/meta.
    expect(landing.match(/fo-brand-sub">\s*([^<\s])/g)?.length ?? 0).toBe(1);
    expect(landing).not.toMatch(new RegExp(`fo-brand-sub">\\s*${RETIRED_UNI_AR}`));
    expect(landing.match(/fo-brand-sub">\s*نظام تشغيل الجامعة/g)?.length).toBe(1);
    // the copyright is the platform's alone
    // r193: the year renders in WESTERN digits — the platform's one
    // numeral convention (formatNum ar-LY→latn); the r191 Arabic-Indic
    // AR() helper was the drift and is gone.
    expect(landing).toContain('© {year} أُلارا</span>');
  });

  it('auth pages carry the platform identity, no ministry strip', () => {
    for (const f of ['src/pages/AuthPage.tsx', 'src/pages/RegisterPage.tsx']) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const claim of OFFICIAL_CLAIMS) {
        expect(src, `${f} still carries: ${claim}`).not.toContain(claim);
      }
      // r191: the auth identity strip (rejected slogan removed).
      expect(src).toContain('منصّة تعليم ذكية مستقلّة');
    }
  });

  it('document-title bases drop the university co-branding (kept in sync)', () => {
    const shell = read('src/components/layout/AppShell.tsx');
    const colleges = read('src/pages/colleges/CollegePages.tsx');
    expect(shell).toContain("const DOC_TITLE_BASE = 'أُلارا · نظام تشغيل الجامعة'");
    expect(colleges).toContain("const GUEST_TITLE_BASE = 'أُلارا · نظام تشغيل الجامعة'");
  });
});

describe('r177 — root manifests describe the independent platform', () => {
  it('package.json name + description are Ulara-branded', () => {
    const pkg = JSON.parse(readRepo('package.json'));
    /* workstream B seat — root package.json (takeover §1.5) */
    takeoverSeat(JSON.stringify(pkg), '"name":"ulara"', '', 'root package.json name');
    expect(pkg['description']).toContain('مستقلّة');
    expect(pkg['description']).not.toContain(RETIRED_UNI_AR);
  });

  it('README headers claim independence, not university ownership', () => {
    const readme = readRepo('README.md');
    const readmeEn = readRepo('README.en.md');
    /* workstream D seat — root READMEs */
    takeoverSeat(readme, '# أُلارا — نظام تشغيل الجامعة', '', 'README.md header');
    takeoverSeat(readmeEn, '# Ulara — University Operating System', '', 'README.en.md header');
    expect(readme).toContain('مستقلّة');
    expect(readmeEn).toContain('**independent** University Operating System');
    for (const claim of ['الرسمية لجامعة', 'official University Operating System of']) {
      expect(readme).not.toContain(claim);
      expect(readmeEn).not.toContain(claim);
    }
  });
});

describe('r182 — the docs center intro stays affiliation-free', () => {
  /* docs/README.md escaped the r177 sweep: its intro still carried
   * a university co-branding claim while the brand audit
   * (brand-audit-and-changes.md) documents it as already fixed.
   * Pin the corrected wording so the docs index can never drift
   * back into university co-branding. */
  it('docs/README.md presents Ulara as the independent platform with the fictional demo tenant', () => {
    const docsIndex = readRepo('docs/README.md');
    // The W4-docs consolidation rewrote the index — the independent
    // identity line is the new contiguous wording.
    expect(docsIndex).toContain('تعليم ذكي، عربية-أولًا، مستقلّة');
    expect(docsIndex).toContain('مستقلّة');
    // Phase Ω: the demo tenant is the labeled «مساحة عمل أُلارا
    // التجريبية» — synthetic data, never a university.
    /* workstream D seat — docs/README.md intro */
    takeoverSeat(docsIndex, 'مساحة عمل أُلارا التجريبية', '', 'docs/README.md demo tenant');
    expect(docsIndex).toContain('اصطناعية');
    expect(docsIndex).not.toContain('مؤسّسة العرض المرجعية');
    expect(docsIndex).not.toContain(['منصة التعلم الذكية\nل', RETIRED_UNI_AR].join(''));
    expect(docsIndex).not.toMatch(new RegExp(`مشروع \\*\\*أُلارا\\*\\* — منصة[^\\n]*${RETIRED_UNI_AR}`));
  });
});

describe('r183 — brand-identity closure (the surfaces r177 missed)', () => {
  /* The A2 census (r183 Wave A) found the drift r177 left behind on the
   * non-copy surfaces: the LICENSE legal paragraph, the certificate
   * issuer, the backend boot banner, the auth error voice, the admin
   * settings card, the product-chrome mark + favicon, DESIGN.md's
   * identity line, PROJECT-REFERENCE.md and the legacy planning docs
   * (both deleted in the wave-2 purge — their pins went with them),
   * and the seed's platform voice. What these pins forbid is the
   * retired university identity ever coming back AS the platform's
   * identity. */

  it('LICENSE states the independent platform + demo-workspace disclosure (grant intact)', () => {
    const license = readRepo('LICENSE');
    /* workstream D seat — LICENSE identity + host lines */
    takeoverSeat(
      license,
      'Ulara is an independent University Operating System developed by Ahmad Medo',
      '',
      'LICENSE identity line',
    );
    takeoverSeat(license, 'deployed at ulara.vercel.app', '', 'LICENSE host line');
    // Ω+2.0: the disclosure names the LABELED DEMO-WORKSPACE data (the
    // Phase Ω identity-purity retirement removed the retired-university
    // showcase — the license must not name a removed tenant) + the
    // current host.
    expect(license).toContain('labeled demo-workspace data, not affiliation');
    expect(license).not.toContain(`developed and deployed for ${RETIRED_UNI_EN}`);
    expect(license).not.toContain(`${RETIRED_UNI_EN} records`);
    // the retired pre-Vercel host, assembled (identity-gate convention)
    expect(license).not.toContain(['ulara.onre', 'nder.com'].join(''));
    // the proprietary grant itself must stay untouched
    expect(license).toContain('no right to\ndeploy, modify, or redistribute is granted');
  });

  it('DESIGN.md header describes the independent platform; canon doc-accuracy stays true', () => {
    const design = readRepo('DESIGN.md');
    expect(design).toContain('منصّة تعليم ذكي مستقلّة عربية-أولًا · the design canon as it ships in code');
    expect(design).not.toContain(`نظام تشغيل الجامعة لـ${RETIRED_UNI_AR}`);
    // A3 read-verified doc accuracy: CI census, spinner arc reality, polish header name
    expect(design).toContain(
      '9 jobs: lint · typecheck · build · frontend tests · backend tests · db-integration · e2e · design gates',
    );
    expect(design).not.toContain('7 jobs:');
    expect(design).toContain('top arc neutral-900 (light) / accent (dark)');
    expect(design).toContain('Polish Bundle (consolidated v6 → v21)');
    expect(design).not.toContain('Layer-hygiene');
  });

  it('backend boot banner and certificate issuer are the platform name, not ZU', () => {
    const index = readRepo('backend/src/index.ts');
    /* workstream B seat — backend boot banner */
    takeoverSeat(index, 'ULARA Platform API listening', '', 'backend boot banner');
    expect(index).not.toContain('ZU Platform API');
    const training = readRepo('backend/src/http/routes/training.routes.ts');
    /* workstream B seat — certificate issuer */
    takeoverSeat(training, "issuer: 'منصّة أُلارا التعليميّة'", '', 'certificate issuer');
    expect(training).not.toContain(`منصة ${RETIRED_UNI_AR} للتعليم الذكي`);
  });

  it('backend auth errors address platform administration, not university administration', () => {
    const auth = readRepo('backend/src/modules/auth/auth.service.ts');
    expect(auth).not.toContain('إدارة الجامعة');
    expect(auth.match(/إدارة المنصّة/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('admin settings card names the platform consistently (no self-contradicting rows)', () => {
    const admin = read('src/pages/admin/AdminExtraPages.tsx');
    expect(admin).toContain('أُلارا — نظام تشغيل الجامعة');
    expect(admin).not.toContain(`${RETIRED_PLATFORM_AR} للتعليم الذكيّ`);
  });

  it('the product chrome renders the Ulara mark; the favicon is the neutral mark', () => {
    // R323 override (A1 integration): the BrandMark primitive is RETIRED
    // (deleted with StarMark.tsx) — the chrome now draws the ONE brand
    // system <Logo variant="mark"> from frontend/src/brand/. The chrome
    // contract rides the Sidebar + HydrationSplash seats.
    const sidebar = read('src/components/layout/Sidebar.tsx');
    expect(sidebar).toContain("import { Logo } from '../../brand'");
    expect(sidebar).toContain('<Logo variant="mark"');
    const splash = read('src/components/HydrationSplash.tsx');
    expect(splash).toContain("import { Logo } from '../brand'");
    expect(splash).toContain('<Logo variant="mark"');
    const favicon = read('public/favicon.svg');
    // r188: the mark is the khatam star (copper→gold) — the retired
    // blue/violet shield gradient and the ZU crest colors are gone.
    // derived from the ulara shield mark palette — NOT the ZU crest palette
    // R323 override: A1 replaced the copper→gold ramp with the paper/ink/orange
    // system — the favicon is now hairline ink + one solid orange point
    // (#C43E16); copper/gold hexes are BANNED from the favicon (r323-brand-system
    // gate (c) pins this too). The r188 copper assertions are inverted, not deleted.
    expect(favicon).toContain('#262019');
    expect(favicon).toContain('#C43E16');
    expect(favicon).not.toContain('#B57438');
    expect(favicon).not.toContain('#E9B44C');
    expect(favicon).not.toContain('#0E3F6C');
    expect(favicon).not.toContain('#3FB6C9');
  });

  it('seed.ts platform voice is affiliation-free (r183 lead fix, pinned here)', () => {
    /* KNOWN-PENDING at r183-B2 time: the lead's parallel seed.ts rewrite
     * (A2 census: ministry-collaboration announcement, old platform
     * names in track/lesson/vision/MCQ/competition copy) lands with this
     * wave — this pin is red until it does, by design. What is pinned
     * here is the platform never speaking in a university's voice. */
    const seed = readRepo('backend/prisma/seed.ts');
    expect(seed).not.toContain(`منصة ${RETIRED_UNI_AR} للتعليم الذكي`);
    expect(seed).not.toContain(['منصة الزا', 'وية'].join(''));
    expect(seed).not.toContain(RETIRED_PLATFORM_AR);
    expect(seed).not.toContain('بالتعاون مع وزارة التعليم العالي');
  });
});
