import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../db.js';
import auth from './auth.js';
import { LOCAL_TEST_ACCOUNTS, LOCAL_CUSTOMER_ID_PREFIX, localTestLoginEnabled } from './local-development.js';
import { Hono } from 'hono';
import { loadSession, type AppVariables } from '../middleware/auth.js';

vi.mock('../db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
vi.mock('../rate-limit.js', () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })), requestIp: () => '127.0.0.1' }));
const local = { APP_ENV: 'local', LOCAL_TEST_LOGIN_ENABLED: 'true', DATABASE_URL: 'postgresql://test:test@127.0.0.1:54329/mango_farm', ALLOWED_ORIGINS: 'http://localhost:5173' } as unknown as Env;
// Mount at /auth exactly as deployed, including full path origin checks.
const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
app.route('/auth', auth);
const post = (env: Env, body: object = { account: 'admin', audience: 'staff' }) => app.request('http://localhost/auth/local-login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(body) }, env);

beforeEach(() => vi.clearAllMocks());
describe('local test authentication server gate', () => {
  it.each(['staging', 'production', 'preview', undefined])('rejects local registration server-side in %s', async APP_ENV => {
    const response = await app.request('http://localhost/auth/local-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Test Client', email: 'test@example.test', password: 'local-password-123' }) }, { ...local, APP_ENV } as Env);
    expect(response.status).toBe(404);
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it('rejects local registration when the flag is off and rejects role injection', async () => {
    const registration = { fullName: 'Test Client', email: 'test@example.test', password: 'local-password-123', role: 'admin' };
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registration) };
    expect((await app.request('/auth/local-register', init, { ...local, LOCAL_TEST_LOGIN_ENABLED: 'false' })).status).toBe(404);
    expect((await app.request('/auth/local-register', init, local)).status).toBe(422);
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it.each(['staging', 'production', 'preview', '', undefined])('rejects APP_ENV=%s even with enabled flag, localhost and local DB', async APP_ENV => {
    const env = { ...local, APP_ENV } as Env;
    expect(localTestLoginEnabled(env)).toBe(false);
    const response = await post(env);
    expect(response.status).toBe(404);
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it.each([
    { LOCAL_TEST_LOGIN_ENABLED: 'false' }, { LOCAL_TEST_LOGIN_ENABLED: undefined },
    { DATABASE_URL: 'postgresql://test:test@db.neon.tech:5432/mango_farm' }, { DATABASE_URL: '' },
    { DATABASE_URL: 'postgresql://test:test@127.0.0.1:54329/other_database' },
  ])('fails closed with invalid local configuration %j', async override => {
    expect((await post({ ...local, ...override } as Env)).status).toBe(404);
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it.each([['admin', 'customer'], ['customer', 'staff']])('rejects %s at %s login before querying accounts', async (account, audience) => {
    expect((await post(local, { account, audience })).status).toBe(403);
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it('rejects arbitrary identities, role injection, and missing audience', async () => {
    for (const body of [{ account: 'other', audience: 'staff' }, { account: 'admin', audience: 'staff', userId: 'real-admin-id' }, { account: 'admin', role: 'super_admin' }]) {
      expect((await post(local, body)).status).toBe(422);
    }
    expect(createDatabase).not.toHaveBeenCalled();
  });
  it.each(['admin', 'customer'] as const)('creates a normal HttpOnly session for seeded %s', async account => {
    const fixture = LOCAL_TEST_ACCOUNTS[account];
    const sql = vi.fn().mockResolvedValue([]).mockResolvedValueOnce([{ ...fixture, status: 'active', email_verified_at: new Date() }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    const response = await post(local, { account, audience: fixture.audience });
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(await response.json()).toMatchObject({ data: { user: { id: fixture.id, role: fixture.role }, csrf_token: expect.any(String) } });
    expect(sql.mock.calls.some(call => call[0].join(' ').includes('INSERT INTO sessions'))).toBe(true);
  });
  it.each([{ status: 'disabled' }, { role: 'customer' }, { email: 'real@example.test' }, { email_verified_at: null }])('does not modify or authenticate a changed fixture %j', async override => {
    const sql = vi.fn().mockResolvedValue([{ ...LOCAL_TEST_ACCOUNTS.admin, status: 'active', email_verified_at: new Date(), ...override }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    const response = await post(local);
    expect(response.status).toBe(403);
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(sql).toHaveBeenCalledTimes(1);
  });
  it('returns setup instructions when fixtures are missing', async () => {
    vi.mocked(createDatabase).mockReturnValue(vi.fn().mockResolvedValue([]) as never);
    expect((await post(local)).status).toBe(503);
  });
  it.each(['local', 'staging', 'production'])('advertises the feature only in local (%s)', async APP_ENV => {
    const response = await app.request('/auth/config', {}, { ...local, APP_ENV } as Env);
    expect(await response.json()).toMatchObject({ data: { localLoginEnabled: APP_ENV === 'local' } });
  });
  it.each(['staging', 'production', 'local'])('rejects copied or disabled test sessions in %s', async APP_ENV => {
    const sql = vi.fn().mockResolvedValue([{ user_id: LOCAL_TEST_ACCOUNTS.admin.id, role: 'super_admin', status: 'active' }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    const sessionApp = new Hono<{ Bindings: Env; Variables: AppVariables }>();
    sessionApp.use('*', loadSession());
    sessionApp.get('/session', c => c.json({ authenticated: Boolean(c.get('user')) }));
    const response = await sessionApp.request('/session', { headers: { Cookie: 'jba_session=synthetic-test-token' } }, { ...local, APP_ENV, LOCAL_TEST_LOGIN_ENABLED: APP_ENV === 'local' ? 'false' : 'true' } as Env);
    expect(await response.json()).toEqual({ authenticated: false });
  });
  it.each(['staging', 'production'])('also rejects password login for locally registered customers in %s', async APP_ENV => {
    vi.mocked(createDatabase).mockReturnValue(vi.fn().mockResolvedValue([{ id: `${LOCAL_CUSTOMER_ID_PREFIX}test`, email: 'test@example.test', role: 'customer', status: 'active', email_verified_at: new Date(), password_valid: true }]) as never);
    const response = await app.request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.test', password: 'local-password-123', audience: 'customer' }) }, { ...local, APP_ENV } as Env);
    expect(response.status).toBe(401);
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });
});
