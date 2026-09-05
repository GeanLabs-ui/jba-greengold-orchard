import { describe, it, expect, vi } from 'vitest';
import postgres from 'postgres';
import { Hono } from 'hono';
import { createDatabase } from './db.js';
import { loadSession, type AppVariables } from './middleware/auth.js';
import auth from './modules/auth.js';
import commerce from './modules/commerce.js';
import entities from './modules/entities.js';
import payments from './modules/payments.js';
import account from './modules/account.js';
import { randomToken, sha256, LOCAL_SESSION_COOKIE } from './security.js';

vi.mock('./db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
declare const process: { env: Record<string, string | undefined> };
const bodyOf = (response: Response) => response.json() as Promise<{ data: any }>;

// Opt-in PostgreSQL integration. Every fixture and session is rolled back.
describe.skipIf(!process.env.AUTH_DATABASE_TEST)('PostgreSQL account isolation', () => {
  it('validates every existing account session and separates two customer identities', async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '54329') throw new Error('Local test database required');
    const db = postgres(url.toString(), { max: 1, prepare: false });
    const rollback = new Error('ROLLBACK_TEST_FIXTURES');
    try {
      await db.begin(async tx => {
        Object.assign(tx, { begin: tx.savepoint });
        vi.mocked(createDatabase).mockReturnValue(tx as never);
        const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
        app.use('*', loadSession());
        app.route('/auth', auth); app.route('/commerce', commerce); app.route('/entities', entities); app.route('/payments', payments); app.route('/account', account);
        const env = { APP_ENV: 'local', LOCAL_TEST_LOGIN_ENABLED: 'true', DATABASE_URL: url.toString() } as Env;
        const request = (path: string, cookie = '', body?: object, csrf?: string) => app.request(path, {
          method: body ? 'POST' : 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        }, env);
        const session = async (id: string) => {
          const token = randomToken();
          await tx`INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at) VALUES (${crypto.randomUUID()}, ${id}, ${await sha256(token)}, 'integration-csrf', now() + interval '1 hour')`;
          return `${LOCAL_SESSION_COOKIE}=${token}`;
        };
        const existing = await tx`SELECT id, role, status, email_verified_at FROM users ORDER BY id`;
        for (const user of existing) {
          const cookie = await session(user.id);
          const response = await request('/auth/me', cookie);
          const allowed = user.status === 'active' && (user.role !== 'customer' || user.email_verified_at);
          expect(response.status, `session for ${user.id}`).toBe(allowed ? 200 : 401);
          if (allowed) expect((await bodyOf(response)).data.user.id).toBe(user.id);
        }
        const password = randomToken();
        const localEmail = `client-${crypto.randomUUID()}@example.test`;
        const registration = { fullName: 'Local Registration Test', email: localEmail, password };
        const created = await request('/auth/local-register', '', registration);
        expect(created.status).toBe(201);
        const registered = (await bodyOf(created)).data;
        expect(registered.user.role).toBe('customer');
        expect(registered.user.id).toMatch(/^local-test-customer-/);
        const registeredCookie = created.headers.get('Set-Cookie')!.split(';')[0];
        expect((await request('/auth/me', registeredCookie)).status).toBe(200);
        expect((await request('/auth/staff-users', registeredCookie)).status).toBe(403);
        expect((await request('/auth/local-register', '', registration)).status).toBe(409);
        expect((await request('/auth/logout', registeredCookie, {}, registered.csrf_token)).status).toBe(200);
        expect((await request('/auth/login', '', { email: localEmail, password, audience: 'customer' })).status).toBe(200);
        expect((await request('/auth/login', '', { email: localEmail, password, audience: 'staff' })).status).toBe(403);
        const users: Record<string, string> = {};
        for (const kind of ['a', 'b', 'unverified', 'disabled', 'admin']) {
          const id = crypto.randomUUID(); users[kind] = id;
          await tx`INSERT INTO users (id, email, role, status, password_hash, email_verified_at)
            VALUES (${id}, ${`${id}@example.test`}, ${kind === 'admin' ? 'admin' : 'customer'}, ${kind === 'disabled' ? 'disabled' : 'active'}, crypt(${password}, gen_salt('bf', 4)), ${kind === 'unverified' ? null : new Date()})`;
        }
        const login = (kind: string, audience: string, supplied = password) => request('/auth/login', '', { email: `${users[kind]}@example.test`, password: supplied, audience });
        expect((await request('/auth/local-register', '', { ...registration, email: `${users.admin}@example.test` })).status).toBe(409);
        expect((await tx`SELECT role FROM users WHERE id = ${users.admin}`)[0].role).toBe('admin');
        await tx`UPDATE users SET page_access = '["hr"]'::jsonb WHERE id = ${users.a}`;
        expect((await login('admin', 'customer')).status).toBe(403);
        expect((await login('a', 'staff')).status).toBe(403);
        expect((await login('unverified', 'customer')).status).toBe(403);
        expect((await login('disabled', 'customer')).status).toBe(401);
        expect((await login('b', 'customer', 'wrong-password')).status).toBe(401);
        const adminLogin = await login('admin', 'staff');
        expect(adminLogin.status).toBe(200);
        const adminCookie = adminLogin.headers.get('Set-Cookie')!.split(';')[0];
        const customerLogin = await login('a', 'customer');
        expect(customerLogin.status).toBe(200);
        const cookie = customerLogin.headers.get('Set-Cookie')!.split(';')[0];
        const csrf = (await bodyOf(customerLogin)).data.csrf_token;
        expect((await request('/auth/me', cookie)).status).toBe(200);
        expect((await request('/commerce/orders', adminCookie)).status).toBe(403);
        expect((await request('/commerce/orders', adminCookie, {})).status).toBe(403);
        expect((await request('/auth/staff-users', cookie)).status).toBe(403);
        expect((await request('/account/admin/reviews', cookie)).status).toBe(403);
        expect((await request('/entities/Employee', cookie)).status).toBe(403);
        const recordIds: Record<string, string> = {};
        for (const entity of ['Order', 'Invoice', 'Payment', 'CustomerContract', 'Notification']) {
          for (const kind of ['a', 'b']) {
            const id = crypto.randomUUID(); recordIds[`${entity}-${kind}`] = id;
            await tx`INSERT INTO entity_records (id, entity_name, owner_user_id, data) VALUES (${id}, ${entity}, ${users[kind]}, ${tx.json({ marker: kind })})`;
          }
          const response = await request(`/entities/${entity}?owner_user_id=${users.b}`, cookie);
          expect(response.status).toBe(200);
          const { data } = await bodyOf(response);
          expect(data.map((row: { id: string }) => row.id)).toEqual([recordIds[`${entity}-a`]]);
        }
        const orders = await request('/commerce/orders', cookie);
        expect((await bodyOf(orders)).data.map((row: { id: string }) => row.id)).toEqual([recordIds['Order-a']]);
        const otherPayment = await request(`/payments/orders/${recordIds['Order-b']}/session`, cookie, { provider: 'paystack', method: 'card', country: 'GH' }, csrf);
        expect(otherPayment.status).toBe(422);
        expect(await otherPayment.json()).toMatchObject({ error: { message: 'Order not found.' } });
        expect((await request('/commerce/orders', cookie, {})).status).toBe(403); // Missing CSRF
        expect((await request('/auth/logout', cookie, {}, csrf)).status).toBe(200);
        expect((await request('/auth/me', cookie)).status).toBe(401);
        expect((await request('/auth/me', await session(users.unverified))).status).toBe(401);
        console.log(`Validated ${existing.length} existing accounts, password login, role rejection, ownership for five entity types, CSRF, and logout. All fixtures rolled back.`);
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await db.end(); }
  }, 30000);
});
