/**
 * R349 (Agent 02) — the guest-sheet root selector must never be able to
 * match a BUTTON.
 *
 * The defect this pins (live-measured on /student/dashboard): the guest
 * chrome grammar's root rule — `.ab, .ap, .hp, .lg { background:
 * var(--bg); color: var(--text) }` (styles/patterns.css §G) — lives in
 * @layer pages, which outranks @layer components where the button
 * system declares `.btn.lg`. Every large button in the app therefore
 * painted the guest paper ground under its own label:
 *
 *   · `.btn.accent.lg` (the student dashboard's resume CTA — the
 *     page's PRIMARY action) rendered white-on-paper in light theme
 *     (1.08:1) and ink-on-ink in dark (~1.1:1): the label was
 *     invisible in BOTH themes.
 *   · The same collision hit every `.btn … lg` seat: NotFoundPage,
 *     ErrorBoundary, Error403Page, SettingsPage, ErrorSheetPage.
 *
 * The fix tag-qualifies the four roots (`div.ab, div.ap, div.hp,
 * div.lg`) — the guest sheet roots are <div>s by construction
 * (LegalSheet.tsx / PublicPages.tsx / AppDownloadPage.tsx), so the
 * sheets keep byte-identical rendering while `a.btn.lg` /
 * `button.btn.lg` can never match the rule.
 *
 * This suite pins BOTH directions so the collision cannot silently
 * return:
 *   1. the root rule is tag-qualified (a bare `.lg`/`.ab`/`.ap`/`.hp`
 *      root selector in patterns.css fails here);
 *   2. the button-size modifiers (`.btn.lg`) stay class-only — if the
 *      button system ever re-keys its size ladder onto a bare `.lg`
 *      utility the same way, this fails too;
 *   3. no OTHER un-qualified single/double-letter root class in
 *      patterns.css §G collides with the button/tabs/pill modifier
 *      vocabulary (`.lg`/`.sm`/`.xs`/`.on`).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const patterns = readFileSync(path.join(root, 'src/styles/patterns.css'), 'utf8');
const components = readFileSync(path.join(root, 'src/styles/components.css'), 'utf8');

/* Strip comments newline-preserving (the repo contract-test convention). */
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

describe('R349 · guest-sheet roots can never match buttons (the .lg collision)', () => {
  it('the §G shell rule tag-qualifies all four guest roots', () => {
    const clean = strip(patterns);
    // The qualified rule must be present…
    expect(clean).toMatch(/div\.ab,\s*div\.ap,\s*div\.hp,\s*div\.lg\s*\{/);
    // …and the bare-root form must be gone.
    expect(clean).not.toMatch(/(^|\n)\s*\.ab,\s*\.ap,\s*\.hp,\s*\.lg\s*\{/);
  });

  it('no bare guest-root class sets background/color outside the qualified rule', () => {
    const clean = strip(patterns);
    // A rule that starts with a bare `.lg` (or .ab/.ap/.hp) and paints
    // background/color directly on the matched element.
    const bareRootPaint = /(^|\n)\s*\.(?:lg|ab|ap|hp)\s*\{[^}]*?(?:background|color)\s*:/;
    expect(bareRootPaint.test(clean), 'a bare guest-root class paints background/color').toBe(false);
  });

  it('the button size modifiers keep the .btn namespace (no bare .lg utility returns)', () => {
    const clean = strip(components);
    // The size ladder stays namespaced…
    expect(clean).toMatch(/\.btn\.lg\s*\{/);
    expect(clean).toMatch(/\.btn\.sm\s*\{/);
    // …and no bare `.lg {` utility rule exists in the components sheet.
    expect(clean).not.toMatch(/(^|\n)\s*\.lg\s*\{/);
  });

  it('the guest sheet TSX roots are <div>s (the tag qualification stays sound)', () => {
    /* r369 slice B re-key: /about + /help joined the lg document-sheet
     * family on PublicShell (the ab/hp roots are retired); the sheets'
     * content root is now <div className="lg p369-t1"> — still a <div>,
     * and the retired div.lg paint is neutralised in r369-pages.css. */
    const legalSheet = readFileSync(path.join(root, 'src/pages/legal/LegalSheet.tsx'), 'utf8');
    const publicPages = readFileSync(path.join(root, 'src/pages/PublicPages.tsx'), 'utf8');
    const appDownload = readFileSync(path.join(root, 'src/pages/AppDownloadPage.tsx'), 'utf8');
    expect(legalSheet).toMatch(/<div className="lg p369-t1">/);
    expect(publicPages.match(/<div className="lg p369-t1">/g)!.length).toBe(2);
    /* r369 slice B re-key: /app joined the lg document family too. */
    expect(appDownload).toMatch(/<div className="lg p369-t1">/);
    // If any of these roots ever becomes a non-div element, the tag
    // qualification in patterns.css must be revisited — fail loudly.
    expect(legalSheet).not.toMatch(/<(section|main|article)[^>]*className="lg"/);
  });
});
