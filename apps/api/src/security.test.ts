import { describe, expect, it } from 'vitest';
import { hashPassword, parseCookies, randomToken, sessionCookie, sha256, verifyPassword } from './security.js';

describe('security primitives', () => {
  it('creates unpredictable tokens of the requested length', () => {
    const first = randomToken(32);
    const second = randomToken(32);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });

  it('hashes and verifies passwords without storing plaintext', async () => {
    const password = await hashPassword('correct horse battery staple');
    expect(password.hash).not.toContain('correct horse');
    await expect(verifyPassword('correct horse battery staple', password.salt, password.hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', password.salt, password.hash)).resolves.toBe(false);
  });

  it('hashes reset and session tokens deterministically', async () => {
    await expect(sha256('token')).resolves.toBe('3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0');
  });

  it('uses a host-only secure cookie in production and a valid local cookie in development', () => {
    expect(sessionCookie('abc', true)).toContain('__Host-jba_session=abc; Path=/; HttpOnly; SameSite=Lax; Secure');
    expect(sessionCookie('abc', false)).toContain('jba_session=abc; Path=/; HttpOnly; SameSite=Lax');
    expect(parseCookies('one=1; jba_session=abc').get('jba_session')).toBe('abc');
  });
});
