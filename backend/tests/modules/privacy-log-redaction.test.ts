/**
 * r370 (privacy) — the auth log redaction guard.
 *
 * The forgot-password flow is built so an address is never observable
 * (byte-identical 200 for known and unknown emails, equal-cost crypto on
 * the unknown path). Logging the RAW address in the server log undid
 * that: the log stream is the one artifact that gets copied, shipped and
 * retained with no redaction ceiling.
 *
 * Two layers of proof:
 *  · the helper itself — stable per address (ops can still correlate),
 *    unreversible-looking for everything else, never an '@';
 *  · a source scan over the two call sites that used to log `email` —
 *    the same source-pin style the dashboard wiring tests use.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { emailLogRef } from '../../src/lib/privacy.js';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

describe('emailLogRef', () => {
  it('is stable for the same normalized address (ops correlation survives)', () => {
    const a = emailLogRef('Student@Ulara.edu.ly');
    const b = emailLogRef('  student@ulara.edu.ly ');
    expect(a).toBe(b);
    expect(a).toMatch(/^email:sha256:[0-9a-f]{12}$/);
  });

  it('separates different addresses', () => {
    expect(emailLogRef('a@ulara.edu.ly')).not.toBe(emailLogRef('b@ulara.edu.ly'));
  });

  it('never carries the address, its local part or its domain', () => {
    const ref = emailLogRef('ahmad.medo@ulara.edu.ly');
    expect(ref).not.toContain('@');
    expect(ref).not.toContain('ahmad');
    expect(ref).not.toContain('ulara');
  });

  it('answers a shared marker for an empty input', () => {
    expect(emailLogRef('   ')).toBe('email:unknown');
  });
});

describe('auth log call sites never log a raw email key', () => {
  const callSites = {
    'password-reset.service.ts': read('../../src/modules/auth/password-reset.service.ts'),
    'auth.routes.ts': read('../../src/http/routes/auth.routes.ts'),
  };

  for (const [name, source] of Object.entries(callSites)) {
    it(`${name}: no logger call carries an \`email\` field`, () => {
      // `email: normalized` / `email,` inside a logger call — the shape the
      // r370 fix replaced with `emailRef`.
      expect(source).not.toMatch(/logger\.(trace|debug|info|warn|error)\(\s*\{[^}]*\bemail\s*[,}:]/);
    });

    it(`${name}: the redacting helper is imported at every trajectory that logs`, () => {
      if (/logger\.(trace|debug|info|warn|error)\(/.test(source)) {
        expect(source).toMatch(/import \{ emailLogRef \} from '\.\.\/\.\.\/lib\/privacy\.js';/);
      }
    });
  }
});
