import { Hono } from 'hono';
import { jwtVerify } from 'jose';
import postgres from 'postgres';
import { describe, expect, it, vi } from 'vitest';
import { createDatabase } from './db.js';
import { loadSession, type AppVariables } from './middleware/auth.js';
import auth from './modules/auth.js';
import { LOCAL_SESSION_COOKIE, randomToken, sha256 } from './security.js';

vi.mock('./db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
vi.mock('jose', () => ({ createRemoteJWKSet: vi.fn(), jwtVerify: vi.fn() }));
declare const process: { env: Record<string, string | undefined> };

describe.skipIf(!process.env.AUTH_DATABASE_TEST)('PostgreSQL staff invitations', () => {
  it('retries a failed send and lets the invited Google identity join and sign back in as staff', async () => {
    const databaseUrl = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname) || !['15432', '5432'].includes(databaseUrl.port)) throw new Error('Local test database required');
    const db = postgres(databaseUrl.toString(), { max: 1, prepare: false });
    const rollback = new Error('ROLLBACK_TEST_FIXTURES');
    try {
      await db.begin(async tx => {
        Object.assign(tx, { begin: tx.savepoint });
        vi.mocked(createDatabase).mockReturnValue(tx as never);
        const adminId = crypto.randomUUID();
        const employeeId = crypto.randomUUID();
        const staffEmail = `staff-${employeeId}@example.test`;
        const sessionToken = randomToken();
        const csrfToken = 'staff-invitation-test-csrf';
        await tx`INSERT INTO users (id, email, role, status) VALUES (${adminId}, ${`${adminId}@example.test`}, 'super_admin', 'active')`;
        await tx`INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at)
          VALUES (${crypto.randomUUID()}, ${adminId}, ${await sha256(sessionToken)}, ${csrfToken}, now() + interval '1 hour')`;
        await tx`INSERT INTO entity_records (id, entity_name, data)
          VALUES (${employeeId}, 'Employee', ${tx.json({ email: staffEmail, full_name: 'Test Staff' })})`;

        const resend = vi.fn<typeof fetch>()
          .mockResolvedValueOnce(Response.json({ message: 'Send rejected' }, { status: 422 }))
          .mockRejectedValueOnce(new TypeError('Provider connection reset'))
          .mockResolvedValueOnce(Response.json({ id: 'resend-message-test' }))
          .mockResolvedValueOnce(Response.json({ id: 'resend-message-legacy-test' }));
        vi.stubGlobal('fetch', resend);
        const origin = 'https://jbagreengold.example.test';
        const env = {
          APP_ENV: 'local',
          ALLOWED_ORIGINS: origin,
          GOOGLE_CLIENT_ID: 'staff-invitation-test-client',
          RESEND_API_KEY: 'staff-invitation-test-resend',
          PASSWORD_RESET_URL: `${origin}/reset-password`,
          EMAIL_FROM: 'Test Farm <noreply@example.test>',
        } as unknown as Env;
        const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
        app.use('*', loadSession());
        app.route('/auth', auth);
        const post = (path: string, body: object, cookie = '') => app.request(`/auth${path}`, {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(body),
        }, env);
        const adminCookie = `${LOCAL_SESSION_COOKIE}=${sessionToken}`;
        const invite = () => post('/staff-invitations', {
          email: staffEmail, employeeId, fullName: 'Test Staff', role: 'farm_supervisor', pageAccess: ['dashboard', 'calendar'],
        }, adminCookie);

        for (const attempt of ['provider rejection', 'transport exception']) {
          const failed = await invite();
          expect(failed.status, attempt).toBe(502);
          expect(await failed.json()).toMatchObject({ error: { code: 'EMAIL_DELIVERY_FAILED' } });
          expect(await tx`SELECT id FROM staff_invitations WHERE email = ${staffEmail} AND revoked_at IS NULL`).toHaveLength(0);
          const [unsentEmployee] = await tx`SELECT data FROM entity_records WHERE id = ${employeeId}`;
          expect(unsentEmployee.data).not.toHaveProperty('invitation_status');
        }
        const sent = await invite();
        expect(sent.status).toBe(201);
        expect(resend).toHaveBeenCalledTimes(3);
        const [providerUrl, providerRequest] = resend.mock.calls[2];
        expect(providerUrl).toBe('https://api.resend.com/emails');
        const message = JSON.parse(String(providerRequest?.body));
        expect(message.to).toEqual([staffEmail]);
        const link = new URL(message.html.match(/href="([^"]+)"/)![1]);
        expect(link.origin).toBe(origin);
        expect(link.pathname).toBe('/accept-staff-invite');
        const token = link.searchParams.get('token');
        if (!token) throw new Error('Invitation email did not contain a token');
        expect(await sent.text()).not.toContain(token);

        const claims = { sub: `google-${employeeId}`, email: staffEmail, email_verified: true, name: 'Test Staff' };
        vi.mocked(jwtVerify)
          .mockResolvedValueOnce({ payload: { ...claims, email: `different-${staffEmail}` } } as never)
          .mockResolvedValue({ payload: claims } as never);
        const credential = 'x'.repeat(100);
        const accept = () => post('/staff-invitations/accept', { token, credential });
        expect((await accept()).status).toBe(422);
        const joined = await accept();
        expect(joined.status).toBe(200);
        expect(await joined.json()).toMatchObject({ data: { user: { email: staffEmail, role: 'farm_supervisor' } } });
        expect(joined.headers.get('Set-Cookie')).toContain('HttpOnly');
        expect((await accept()).status).toBe(422);
        const [employee] = await tx`SELECT data FROM entity_records WHERE id = ${employeeId}`;
        expect(employee.data).toMatchObject({ invitation_status: 'accepted', workspace_role: 'farm_supervisor', page_access: ['dashboard', 'calendar'] });
        const login = await post('/google', { credential, audience: 'staff' });
        expect(login.status).toBe(200);
        expect(await login.json()).toMatchObject({ data: { user: { email: staffEmail, role: 'farm_supervisor' } } });
        expect(login.headers.get('Set-Cookie')).toContain('HttpOnly');
        expect((await post('/google', { credential, audience: 'customer' })).status).toBe(403);

        const customerEmail = `customer-${employeeId}@example.test`;
        await tx`INSERT INTO users (id, email, role, status) VALUES (${crypto.randomUUID()}, ${customerEmail}, 'customer', 'active')`;
        const customerInvite = await post('/staff-invitations', { email: customerEmail, role: 'farm_supervisor' }, adminCookie);
        expect(customerInvite.status).toBe(409);
        expect(await customerInvite.json()).toMatchObject({ error: { code: 'ACCOUNT_EXISTS' } });
        expect(resend).toHaveBeenCalledTimes(3);

        const legacyId = crypto.randomUUID();
        const legacyEmail = `legacy-${legacyId}@example.test`;
        await tx`INSERT INTO users (id, email, role, status, page_access)
          VALUES (${legacyId}, ${legacyEmail}, 'inventory_officer', 'active', '["inventory"]'::jsonb)`;
        const changedRoleInvite = await post('/staff-invitations', { email: legacyEmail, role: 'admin' }, adminCookie);
        expect(changedRoleInvite.status).toBe(409);
        expect(resend).toHaveBeenCalledTimes(3);
        const legacyInvite = await post('/staff-invitations', { email: legacyEmail, role: 'inventory_officer', pageAccess: ['settings'] }, adminCookie);
        expect(legacyInvite.status).toBe(201);
        const legacyMessage = JSON.parse(String(resend.mock.calls[3][1]?.body));
        const legacyLink = new URL(legacyMessage.html.match(/href="([^"]+)"/)![1]);
        const legacySubject = `google-${legacyId}`;
        vi.mocked(jwtVerify).mockResolvedValue({ payload: { ...claims, sub: legacySubject, email: legacyEmail } } as never);
        const legacyJoined = await post('/staff-invitations/accept', { token: legacyLink.searchParams.get('token'), credential });
        expect(legacyJoined.status).toBe(200);
        const [linkedLegacy] = await tx`SELECT role, page_access, google_subject FROM users WHERE id = ${legacyId}`;
        expect(linkedLegacy).toMatchObject({ role: 'inventory_officer', page_access: ['inventory'], google_subject: legacySubject });
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      vi.unstubAllGlobals();
      await db.end();
    }
  });
});
