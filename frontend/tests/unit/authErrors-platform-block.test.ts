import { describe, expect, it } from 'vitest';
import { authErrorView, PLATFORM_BLOCK_MESSAGE } from '../../src/lib/authErrors';

const err = (status: number, data: unknown) => ({ response: { status, data } });

describe('authErrorView — host-level blocks are named, not shown as bad credentials', () => {
  it('a 401 without the ULARA error envelope (e.g. Vercel deployment protection) says so', () => {
    expect(authErrorView(err(401, '<html>Authentication Required</html>')).serverMessage).toBe(PLATFORM_BLOCK_MESSAGE);
    expect(authErrorView(err(404, '')).serverMessage).toBe(PLATFORM_BLOCK_MESSAGE);
  });
  it('a real ULARA 401 keeps the backend Arabic message verbatim', () => {
    const e = err(401, { error: { code: 'UNAUTHENTICATED', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' } });
    expect(authErrorView(e).serverMessage).toBe('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  });
  it('network silence stays the generic path', () => {
    expect(authErrorView({}).serverMessage).toBeUndefined();
  });
});
