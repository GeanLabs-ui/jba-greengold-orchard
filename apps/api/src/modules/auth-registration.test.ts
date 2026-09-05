import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../db.js';
import { jwtVerify } from 'jose';
import auth from './auth.js';

vi.mock('../db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
vi.mock('../rate-limit.js', () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })), requestIp: () => '127.0.0.1' }));
vi.mock('jose', () => ({ createRemoteJWKSet: vi.fn(), jwtVerify: vi.fn() }));

const env = { APP_ENV: 'local', GOOGLE_CLIENT_ID: 'test-google-client' } as Env;
const claims = { sub: 'verified-google-subject', email: 'client@example.test', email_verified: true, name: 'Test Client' };
const customer = { id: 'customer-id', email: claims.email, google_subject: claims.sub, role: 'customer', status: 'active', email_verified_at: new Date() };
const request = (path: string, body: object) => auth.request(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}, env);

describe('client registration policy', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects password sign-up without opening the database or creating a session', async () => {
    const response = await request('/register', { email: claims.email, password: 'Example-password-123' });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'GOOGLE_SIGNUP_REQUIRED' } });
    expect(createDatabase).not.toHaveBeenCalled();
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('creates a customer and session only after Google verification', async () => {
    const sql = vi.fn().mockResolvedValue([]).mockResolvedValueOnce([]).mockResolvedValueOnce([customer]);
    vi.mocked(createDatabase).mockReturnValue(sql as unknown as ReturnType<typeof createDatabase>);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);
    const response = await request('/google', { credential: 'x'.repeat(100) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { user: { id: customer.id, role: 'customer' } } });
    expect(jwtVerify).toHaveBeenCalledWith(expect.any(String), undefined, expect.objectContaining({ audience: env.GOOGLE_CLIENT_ID, algorithms: ['RS256'] }));
    expect(sql.mock.calls[1][0].join(' ')).toContain("'customer', 'active'");
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
  });

  it('rejects invalid Google credentials before querying or writing users', async () => {
    const sql = vi.fn();
    vi.mocked(createDatabase).mockReturnValue(sql as unknown as ReturnType<typeof createDatabase>);
    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid signature'));
    const response = await request('/google', { credential: 'x'.repeat(100) });
    expect(response.status).toBe(401);
    expect(sql).not.toHaveBeenCalled();
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('does not silently relink an existing password account', async () => {
    const sql = vi.fn().mockResolvedValue([{ ...customer, google_subject: null }]);
    vi.mocked(createDatabase).mockReturnValue(sql as unknown as ReturnType<typeof createDatabase>);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);
    const response = await request('/google', { credential: 'x'.repeat(100) });
    expect(response.status).toBe(409);
    expect(sql).toHaveBeenCalledTimes(1);
    expect(response.headers.get('Set-Cookie')).toBeNull();
  });

  it('preserves login for existing password accounts', async () => {
    const sql = vi.fn().mockResolvedValue([]).mockResolvedValueOnce([{ ...customer, password_valid: true }]);
    vi.mocked(createDatabase).mockReturnValue(sql as unknown as ReturnType<typeof createDatabase>);
    const response = await request('/login', { email: claims.email, password: 'Example-password-123' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
  });

  it.each([
    ['customer', 'staff', true, 'active'],
    ['super_admin', 'customer', true, 'active'],
    ['customer', 'customer', false, 'active'],
    ['customer', 'customer', true, 'disabled'],
    ['user', 'staff', true, 'active'],
  ])('rejects password login for %s via %s (verified %s, %s)', async (role, audience, verified, status) => {
    const sql = vi.fn().mockResolvedValue([{ ...customer, role, status, password_valid: true, email_verified_at: verified ? new Date() : null }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    const response = await request('/login', { email: claims.email, password: 'legacy-pass', audience });
    expect([401, 403]).toContain(response.status);
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it.each(['admin', 'super_admin', 'farm_manager', 'farm_supervisor', 'inventory_officer', 'quality_officer', 'finance_officer', 'hr_officer', 'sales_officer', 'logistics_officer', 'content_editor', 'auditor'])('accepts %s only at staff password login', async role => {
    const sql = vi.fn().mockResolvedValue([]).mockResolvedValueOnce([{ ...customer, role, password_valid: true }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    expect((await request('/login', { email: claims.email, password: 'legacy', audience: 'staff' })).status).toBe(200);
  });

  it.each([
    ['customer', 'staff', 'active'], ['admin', 'customer', 'active'], ['customer', 'customer', 'disabled'],
  ])('rejects Google account %s via %s (%s) without a session', async (role, audience, status) => {
    const sql = vi.fn().mockResolvedValue([{ ...customer, role, status }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);
    const response = await request('/google', { credential: 'x'.repeat(100), audience });
    expect(response.status).toBe(403);
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('does not register a customer from staff login', async () => {
    const sql = vi.fn().mockResolvedValue([]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);
    expect((await request('/google', { credential: 'x'.repeat(100), audience: 'staff' })).status).toBe(403);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('rejects an unverified Google email', async () => {
    const sql = vi.fn();
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { ...claims, email_verified: false } } as never);
    expect((await request('/google', { credential: 'x'.repeat(100) })).status).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('does not promote an existing customer from bootstrap configuration', async () => {
    const sql = vi.fn().mockResolvedValue([customer]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);
    const response = await auth.request('/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: 'x'.repeat(100), audience: 'staff' }) }, { ...env, BOOTSTRAP_ADMIN_EMAILS: claims.email });
    expect(response.status).toBe(403);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('accepts a linked Google staff identity at staff login', async () => {
    const sql = vi.fn().mockResolvedValue([]).mockResolvedValueOnce([{ ...customer, role: 'admin' }]);
    vi.mocked(createDatabase).mockReturnValue(sql as never);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: claims } as never);
    expect((await request('/google', { credential: 'x'.repeat(100), audience: 'staff' })).status).toBe(200);
  });

  it('rejects login CSRF through forms and foreign origins before database access', async () => {
    const form = await auth.request('/login', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }, env);
    expect(form.status).toBe(415);
    const foreign = await auth.request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' }, env);
    expect(foreign.status).toBe(403);
    expect(createDatabase).not.toHaveBeenCalled();
  });
});
