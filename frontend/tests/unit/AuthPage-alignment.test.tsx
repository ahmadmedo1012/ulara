/**
 * Wave imm-5 — AuthPage public-language alignment.
 *
 * The login page stays a CALM, clear form (plan §3: تجربة تسويقية غامرة
 * ≠ تجربة تعلّم عملية) but must share the landing's atmosphere:
 *   - a quiet mono metric-role eyebrow over the title (journey-meta /
 *     bento-meta register) — a REAL Arabic phrase, so it is exposed to
 *     the accessibility tree, not aria-hidden;
 *   - r313 (the reference parity): the ground is FLAT PAPER — the decorative
 *     --journey-glow wash behind the card is retired; depth is the
 *     card's 1px #B3B3AF hairline alone (no ambient DOM, no gradient);
 *   - the form contract itself is untouched (focus order, labels,
 *     bidi, validation alerts, demo fill buttons) — these tests pin it
 *     so the alignment pass can never regress the form people must
 *     complete.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type LoginState = {
  mutateAsync: () => Promise<never>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  reset: () => void;
};

const loginState = vi.hoisted(() => ({ current: {} as LoginState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => loginState.current,
  // r178: AuthPage also mounts the institution-selection mutation —
  // idle stub, never fired in the journey-alignment pins.
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';

/* Static CSS contract helpers (assets.test.ts convention: pure fs
 * assertions lock in what component tests cannot see). */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

function renderPage() {
  /* r180: AuthPage now mounts a (disabled-by-default) institutions query
   * for the REG_NUMBER_AMBIGUOUS recovery — the page needs a QueryClient
   * like every other query-bearing page. */
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** True when b follows a in document order (focus order follows DOM). */
function follows(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('AuthPage — journey alignment (imm-5)', () => {
  beforeEach(() => {
    loginState.current = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    };
  });

  it('opens the card with the quiet mono gateway eyebrow over the title', () => {
    renderPage();

    const meta = screen.getByText('(بوابة المنصّة)');
    expect(meta).toHaveClass('auth-meta');
    // A real Arabic phrase (journey-meta precedent) — NOT hidden from
    // assistive tech, unlike the bento's purely decorative code badges.
    expect(meta).not.toHaveAttribute('aria-hidden');
    // Eyebrow reads BEFORE the title.
    /* R315 override (K-I): the heading copy lost its tanween — the
     * owner sheet rule bans tashkeel on the heavy display heading
     * («مرحباً» → «مرحبا»); the re-pin keeps the same seat + level. */
    const title = screen.getByRole('heading', { level: 1, name: 'مرحبا بعودتك' });
    expect(follows(meta, title)).toBe(true);
  });

  it('r313: the ground is flat paper — no ambient DOM, no glow pseudo, the card carries the #B3B3AF drafting hairline', () => {
    const { container } = renderPage();

    // No glow/scene/ambient node in the page — and none is needed:
    // the r313 sweep retired the CSS wash too, so the cue can never
    // enter the a11y tree or steal a click.
    expect(
      container.querySelector('[class*="glow"], [class*="scene"], [class*="ambient"]'),
    ).toBeNull();

    const css = read('src/styles/patterns.css');
    // The ambient pseudo is RETIRED (flat paper — the reference has no
    // wash anywhere; depth is hairlines only).
    expect(css).not.toContain('.auth-center::after');
    expect(css).not.toContain('.nf-scene::after');
    // No gradient AMBIENTS survive in the sheet (comments aside). The
    // one sanctioned exception: the ruler-strip's repeating-gradient
    // TICKS (P3 furniture kit) — evenly-spaced 1px ticks have no other
    // sane CSS construction, they are furniture not ambience, and the
    // hero's own .bp-ruler-* already drew them this way in hero.css.
    // The flat-paper law bans ambient WASHES (radial glows, scene
    // fades); it has never banned a drafting tick.
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const withoutTicks = declarations.replace(/\.ruler-strip[^{]*\{[^}]*\}/g, '');
    expect(withoutTicks).not.toMatch(/radial-gradient|linear-gradient/);
    // The card's whole elevation story is the strong hairline.
    const cardAt = declarations.indexOf('.auth-card');
    const cardRule = declarations.slice(cardAt, declarations.indexOf('}', cardAt));
    expect(cardRule).toContain('var(--border-strong)');

    // r212 re-pin (Agent S, merged r253): the eyebrow's mono voice is
    // RETIRED — Plex Mono is for IDs/code/tabular metrics only (r197),
    // and an Arabic phrase resolves to the Arabic face anyway. The
    // eyebrow is quiet sans metadata: same size, muted ink.
    const metaAt = css.indexOf('.auth-meta');
    expect(metaAt).toBeGreaterThanOrEqual(0);
    const metaRule = css.slice(metaAt, css.indexOf('}', metaAt));
    expect(metaRule).toContain('var(--font-sans)');
    expect(metaRule).toContain('var(--type-label-size-sm)');
    expect(metaRule).toContain('var(--text-muted)');
    // Joined Arabic prose is never tracked (ruling #2).
    expect(metaRule).toContain('letter-spacing: var(--ls-normal)');
  });

  it('labels are wired to their controls with honest bidi handling', () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    // University IDs (2024-CS-1234) must not be bidi-scrambled by the
    // RTL page — the field itself is LTR.
    expect(email).toHaveAttribute('dir', 'ltr');
    expect(email).toHaveAttribute('autocomplete', 'username');

    const password = screen.getByLabelText('كلمة المرور');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    // r157 F5: passwords are Latin runs too — the caret/masked glyphs
    // must not bidi-flip inside the RTL form.
    expect(password).toHaveAttribute('dir', 'ltr');
  });

  it('visual order is the keyboard order: home → email → password → toggle → forgot → submit → register', () => {
    renderPage();

    const home = screen.getByRole('link', { name: /الصفحة الرئيسية/ });
    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    const password = screen.getByLabelText('كلمة المرور');
    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور' });
    /* R320 override (§D — forgot-password flow): the control is a real
     * <Link to="/auth/forgot-password"> now (the T-6 «راجع مرشدك»
     * notice retired with the flow landing) — same seat, same keyboard
     * sequence, real destination instead of an in-page notice. */
    const forgot = screen.getByRole('link', { name: 'نسيت كلمة المرور؟' });
    const submit = screen.getByRole('button', { name: 'تسجيل الدخول' });
    const register = screen.getByRole('link', { name: 'أنشئ حسابك الآن' });

    expect(follows(home, email)).toBe(true);
    expect(follows(email, password)).toBe(true);
    expect(follows(password, toggle)).toBe(true);
    expect(follows(toggle, forgot)).toBe(true);
    expect(follows(forgot, submit)).toBe(true);
    expect(follows(submit, register)).toBe(true);
    expect(register).toHaveAttribute('href', '/auth/register');
    expect(forgot).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('an empty submit demotes field errors to describedby-only + ONE polite countAr summary (r157 F5 alert-storm fix)', async () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    const password = screen.getByLabelText('كلمة المرور');
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    // ZERO role="alert" — the per-field alert choir is gone (the
    // submit-level server banner is the only alert the form may use,
    // and no server error is present here).
    await waitFor(() => {
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    // ONE polite summary line counts both problems with countAr.
    const summary = screen.getByRole('status');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary).toHaveTextContent('مشكلتان');

    // The field errors are still rendered and still wired — announced
    // on focus via aria-describedby instead of shouted via role=alert.
    expect(screen.getAllByText('مطلوب')).toHaveLength(2);
    await waitFor(() => {
      expect(email).toHaveAttribute('aria-invalid', 'true');
      expect(email).toHaveAttribute('aria-describedby', 'auth-email-error');
      expect(password).toHaveAttribute('aria-invalid', 'true');
      expect(password).toHaveAttribute('aria-describedby', 'auth-password-error');
    });
  });

  it('the password visibility toggle flips type, pressed state and label', () => {
    renderPage();

    const password = screen.getByLabelText('كلمة المرور');
    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور' });
    fireEvent.click(toggle);

    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAccessibleName('إخفاء كلمة المرور');
  });

  it('demo rows QUICK-LOGIN: one tap fills the form AND submits it (owner rule 2026-11-12)', async () => {
    renderPage();

    /* The panel is the hairline test-account TABLE, one row per job
     * from the SHARED table (@shared/testAccounts): grouped
     * التعليم / الحوكمة / النظام, email + password visible, and a
     * square «دخول سريع» button per row. The full panel contract lives
     * in tests/unit/r320-test-accounts-panel.test.tsx; this pin keeps
     * the form-integrity half here (fill + submit in ONE tap). */
    const quickButtons = screen.getAllByRole('button', { name: /^دخول سريع بحساب / });
    expect(quickButtons).toHaveLength(12);
    for (const b of quickButtons) {
      expect(b).toHaveClass('auth-demo-fill');
    }

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد') as HTMLInputElement;
    const password = screen.getByLabelText('كلمة المرور') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'دخول سريع بحساب طالب' }));
    await waitFor(() => {
      expect(email.value).toBe('student@test.ly');
      expect(password.value).toBe('12345678');
    });
    // The single tap SUBMITS — the fast path is one tap, not two.
    await waitFor(() => {
      expect(loginState.current.mutateAsync).toHaveBeenCalledWith({
        email: 'student@test.ly',
        password: '12345678',
      });
    });

    // The panel is dismissible (and the quiet reopen chip returns).
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    await waitFor(() => {
      expect(screen.queryByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'الحسابات التجريبية' })).toBeInTheDocument();
  });

  it('the demo hint panel starts OPEN in every build (owner rule 2026-11-12 — dismiss → reopen chip)', () => {
    renderPage();

    // All 12 jobs visible on load — in EVERY build (dev AND production).
    expect(screen.getByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^دخول سريع بحساب / })).toHaveLength(12);

    // Dismissible — the quiet reopen chip returns after a dismiss.
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    const reopen = screen.getByRole('button', { name: 'الحسابات التجريبية' });
    expect(reopen).toHaveClass('auth-demo-hint-reopen');

    // One honest click brings it back.
    fireEvent.click(reopen);
    expect(screen.getByText('حسابات تجريبية — دخول مباشر بلمسة')).toBeInTheDocument();
  });

  it('a pending login disables the submit button and says so honestly', () => {
    loginState.current.isPending = true;
    renderPage();

    const submit = screen.getByRole('button', { name: /جارٍ الدخول/ });
    expect(submit).toBeDisabled();
  });

  it('a pending submit is aria-busy with an sr-only polite pending mirror (r157 F5)', () => {
    loginState.current.isPending = true;
    renderPage();

    const submit = screen.getByRole('button', { name: /جارٍ الدخول/ });
    expect(submit).toHaveAttribute('aria-busy', 'true');

    // aria-busy alone is silent: the mirror is the polite announcement.
    const mirror = screen.getByText('جارٍ التحقق…');
    expect(mirror).toHaveClass('sr-only');
    expect(mirror).toHaveAttribute('role', 'status');
    expect(mirror).toHaveAttribute('aria-live', 'polite');
    // No mirror while idle — the announcement fires on the flip only.
  });

  it('page chrome lives in landmarks — banner, main, contentinfo (axe: all content in landmarks)', () => {
    const { container } = renderPage();

    const banner = container.querySelector('header.auth-top');
    expect(banner).not.toBeNull();
    expect(banner).toContainElement(screen.getByRole('link', { name: /الصفحة الرئيسية/ }));
    expect(container.querySelector('main.auth-center')).not.toBeNull();
    const contentInfo = container.querySelector('footer.auth-bottom');
    expect(contentInfo).not.toBeNull();
    // r191: the rejected slogan is gone; the identity reads ذكية.
    expect(contentInfo).toHaveTextContent('منصّة تعليم ذكية مستقلّة');
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * r359 · A1-AUTH — the measured design grammar pins.
 *
 * The auth sheets' r359 grammar rides the APPENDED AUTH section of
 * src/styles/errors.css (A1-owned; the four auth pages import it
 * directly — patterns.css keeps the base sheet). These pins hold the
 * grammar so a rebuild can never silently drift back to the retired
 * warm-orange/red world:
 *   · ONE signal color — royal var(--accent); no --danger red and no
 *     retired warm-family token anywhere in the auth section;
 *   · the submit is the ROYAL PRIMARY at rest + its label ROLLS one
 *     line up on hover;
 *   · the demo table's emails never break mid-word (the 360px fix);
 *   · the headline clamp(23.8px, 2.78vw, 40px) @ 700 (the type-gate
 *     exception seat — tests/unit/r324-type-gate.test.ts);
 *   · the registration marks are drawn as two 1px ink bars.
 * ═══════════════════════════════════════════════════════════════════ */
describe('AuthPage — the r359 measured design grammar', () => {
  /* the appended AUTH block of errors.css — from its banner marker to
   * EOF (the file's error-sheet rules above it are a different family) */
  const AUTH_CSS = (() => {
    const css = read('src/styles/errors.css');
    const at = css.indexOf('THE AUTH SHEETS\' MEASURED GRAMMAR');
    expect(at).toBeGreaterThanOrEqual(0);
    return css.slice(at);
  })();
  const authDeclarations = AUTH_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleOf = (seat: string): string => {
    const at = authDeclarations.indexOf(seat);
    expect(at, `${seat} exists in the auth section`).toBeGreaterThanOrEqual(0);
    return authDeclarations.slice(at, authDeclarations.indexOf('}', at));
  };

  it('ONE signal color: the submit is the ROYAL primary at rest (fill + fg pair, no wipe)', () => {
    const submit = ruleOf('.auth-shell .auth-submit {');
    expect(submit).toContain('background: var(--accent)');
    expect(submit).toContain('color: var(--accent-fg)');
    // the R315 fill-wipe pseudo is retired — the fill IS the rest state.
    expect(ruleOf('.auth-shell .auth-submit::before {')).toContain('content: none');
    // the label roll: one clipped line, hovering slides it up a line.
    expect(ruleOf('.auth-roll {')).toContain('block-size: 1.5em');
    const rollHover = authDeclarations.match(
      /\.auth-submit:not\(:disabled\):hover \.auth-roll[^{]*\{\s*transform: translateY\(-100%\);/,
    );
    expect(rollHover).not.toBeNull();
  });

/* the retired warm-family vocabulary — assembled from fragments so
   * THIS file stays clean under the same grep the mandate runs (the
   * r324-text-gate BANNED-list convention). */
  const retiredWarm = new RegExp(
    ['F1' + '5534', 'cop' + 'per', 'sien' + 'na', 'cor' + 'al'].join('|'),
    'i',
  );

  it('the errors are RED-FREE — ink text + the royal underline (no --danger anywhere)', () => {
    expect(authDeclarations).not.toContain('var(--danger)');
    expect(authDeclarations).not.toMatch(retiredWarm);
    // the field micro-label: ink + royal underline
    const fieldErr = ruleOf('.auth-shell .auth-field-error');
    expect(fieldErr).toContain('color: var(--text)');
    expect(fieldErr).toContain('text-decoration-color: var(--accent)');
    // the banner: neutral hairline + ONE royal underline edge
    const banner = ruleOf('.auth-shell .auth-error {');
    expect(banner).toContain('border-color: var(--border-strong)');
    expect(banner).toContain('border-block-end-color: var(--accent)');
    expect(banner).toContain('color: var(--text)');
    // an invalid control answers in ink, never red
    expect(ruleOf('.auth-shell .auth-input[aria-invalid="true"]:not(:focus)')).toContain(
      'border-color: var(--text)',
    );
  });

  it('the demo table\'s emails NEVER break mid-word (the 360px fix — keep-all + nowrap)', () => {
    const cred = ruleOf('.auth-shell .auth-demo-cred');
    expect(cred).toContain('word-break: keep-all');
    expect(cred).toContain('white-space: nowrap');
    expect(cred).toContain('overflow-wrap: normal');
    // the creds cell floors at its min-content (the whole address) so
    // the flex ROW wraps instead of slicing the address.
    expect(ruleOf('.auth-shell .auth-demo-row-creds')).toContain('min-inline-size: auto');
  });

  it('the headline rides the measured display clamp at weight 700 (the gate-exception seat)', () => {
    const title = ruleOf('.auth-shell .auth-form-title');
    expect(title).toContain('font-size: clamp(23.8px, 2.78vw, 40px)');
    expect(title).toContain('font-weight: var(--fw-bold)');
    expect(title).toContain('letter-spacing: 0'); // Arabic joins — never tracked
    // the body rung rides its own measured clamp
    expect(ruleOf('.auth-shell .auth-form-sub')).toContain('font-size: clamp(13.3px, .926vw, 15.5px)');
  });

  it('the corner registration marks DRAW via the ONE RegCross primitive (bars, never a glyph)', () => {
    /* P3/r363 (B1) re-pin: the door's own 10px ink-bar re-draw
     * (errors.css A6) retired into the shared primitive —
     * styles/patterns.css carries the drawing (two 1px bars through a
     * 13px cell, EMPTY pseudo-element content painted with
     * currentColor, the canonical hairline ink var(--rule-strong)),
     * and AuthPage renders it: four marks inside .auth-frame, one per
     * corner, the .auth-mark marker class kept for the legal-pages
     * count pin. Nothing may typeset a '+' glyph: the bars are
     * backgrounds, not content text. */
    const patterns = read('src/styles/patterns.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(patterns).toMatch(/\.reg-cross::before,\s*\.reg-cross::after\s*\{[^}]*content:\s*''/);
    expect(patterns).toMatch(/\.reg-cross::before,\s*\.reg-cross::after\s*\{[^}]*background:\s*currentColor/);
    expect(patterns).toMatch(/\.reg-cross\s*\{[^}]*color:\s*var\(--rule-strong\)/);
    expect(patterns).toMatch(/\.reg-cross::before\s*\{[^}]*block-size:\s*1px/);
    expect(patterns).toMatch(/\.reg-cross::after\s*\{[^}]*inline-size:\s*1px/);
    // the retired door-local re-draw stays retired
    expect(authDeclarations).not.toContain('.auth-mark');
    // the markup: the primitive, four corners, inside the sheet frame
    const page = read('src/pages/AuthPage.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(page).toMatch(/<RegCross className="auth-mark" corner="tl" \/>/);
    expect(page).toMatch(/<RegCross className="auth-mark" corner="tr" \/>/);
    expect(page).toMatch(/<RegCross className="auth-mark" corner="bl" \/>/);
    expect(page).toMatch(/<RegCross className="auth-mark" corner="br" \/>/);
    expect(page).not.toMatch(/className="auth-mark auth-mark-(?:tl|tr|bl|br)"/);
  });

  it('the rendered sheet: the roll markup + the mono micro captions (dir=ltr, aria-hidden)', () => {
    const { container } = renderPage();

    // the submit's label roll — the duplicate copy never enters the tree
    const submit = screen.getByRole('button', { name: 'تسجيل الدخول' });
    const roll = submit.querySelector('.auth-roll');
    expect(roll).not.toBeNull();
    expect(roll?.querySelectorAll('.auth-roll-line')).toHaveLength(2);
    expect(roll?.querySelectorAll('.auth-roll-line[aria-hidden="true"]')).toHaveLength(1);

    // grammar #6 — the tiny mono captions under the controls
    const micros = container.querySelectorAll('.auth-micro');
    expect(micros.length).toBeGreaterThanOrEqual(2);
    for (const m of micros) {
      expect(m).toHaveAttribute('dir', 'ltr');
      expect(m).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
