import { Hono } from 'hono';
import postgres from 'postgres';
import { describe, expect, it, vi } from 'vitest';
import { createDatabase } from './db.js';
import type { AppVariables, AuthUser } from './middleware/auth.js';
import outlook from './modules/company-outlook.js';
import settings from './modules/company-settings.js';
import entities from './modules/entities.js';

vi.mock('./db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
declare const process: { env: Record<string, string | undefined> };

describe.skipIf(!process.env.AUTH_DATABASE_TEST)('PostgreSQL company settings and department inbox isolation', () => {
  it('persists currency and authorizes list, read, and reply by department membership', async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '15432') throw new Error('Local test database required');
    const db = postgres(url.toString(), { max: 1, prepare: false });
    const rollback = new Error('ROLLBACK_TEST_FIXTURES');
    try {
      await db.begin(async tx => {
        Object.assign(tx, { begin: tx.savepoint });
        vi.mocked(createDatabase).mockReturnValue(tx as never);
        const organizationId = crypto.randomUUID();
        await tx`INSERT INTO organizations (id, name, slug) VALUES (${organizationId}, 'Test Company', ${organizationId})`;
        const actor = (role: AuthUser['role'], pageAccess: string[] | null): AuthUser => ({ id: crypto.randomUUID(), email: `${crypto.randomUUID()}@example.test`, role, status: 'active', full_name: null, pageAccess, organizationId });
        const admin = actor('super_admin', null);
        const exportsStaff = actor('sales_officer', ['calendar']);
        const financeStaff = actor('finance_officer', ['calendar']);
        for (const user of [admin, exportsStaff, financeStaff]) {
          await tx`INSERT INTO users (id, email, role, status) VALUES (${user.id}, ${user.email}, ${user.role}, 'active')`;
          await tx`INSERT INTO organization_members (organization_id, user_id, role) VALUES (${organizationId}, ${user.id}, ${user.role})`;
        }
        const departmentId = crypto.randomUUID();
        const otherDepartmentId = crypto.randomUUID();
        for (const id of [departmentId, otherDepartmentId]) {
          await tx`INSERT INTO entity_records (id, entity_name, organization_id, data) VALUES (${id}, 'Department', ${organizationId}, ${tx.json({ name: 'Test department', status: 'active' })})`;
        }
        const mainMailbox = crypto.randomUUID();
        const departmentMailbox = crypto.randomUUID();
        const env = { APP_ENV: 'local', COMPANY_OUTLOOK_TENANT_ID: crypto.randomUUID(), COMPANY_OUTLOOK_CLIENT_ID: crypto.randomUUID(), COMPANY_OUTLOOK_CLIENT_SECRET: crypto.randomUUID(), COMPANY_OUTLOOK_MAILBOX_ID: mainMailbox } as Env;
        const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
        app.use('*', async (c, next) => {
          const user = [admin, exportsStaff, financeStaff].find(item => item.id === c.req.header('X-Test-Actor'))!;
          c.set('user', user);
          c.set('session', { id: 'test', csrfToken: 'test-csrf', expiresAt: new Date() });
          await next();
        });
        app.route('/settings', settings);
        app.route('/outlook', outlook);
        app.route('/entities', entities);
        const request = (path: string, user = admin, body?: object) => app.request(path, { method: body ? 'POST' : 'GET', headers: { 'X-Test-Actor': user.id, 'X-CSRF-Token': 'test-csrf', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }, env);
        const result = async (path: string, user = admin) => (await request(path, user)).json();

        expect(await result('/settings')).toMatchObject({ data: { name: 'JBA GreenGold Orchard', email: 'info@jbagreengold.com', currency: 'GHS' } });
        const profile = { name: 'JBA GreenGold Orchard', email: 'info@jbagreengold.com', phone: '', currency: 'EUR' };
        expect((await request('/settings', admin, profile)).status).toBe(200);
        expect(await result('/settings')).toEqual({ data: profile });
        expect(await result('/settings/currency', exportsStaff)).toEqual({ data: 'EUR' });
        expect((await request('/settings', admin, { ...profile, currency: 'ZZZ' })).status).toBe(422);
        const shipment = { customer_name: 'Test customer', destination_country: 'Germany', total_amount: 120.5 };
        const saved = await request('/entities/ExportShipment', admin, shipment);
        expect(saved.status).toBe(201);
        expect(await saved.json()).toMatchObject({ data: { currency: 'EUR', total_amount: 120.5 } });
        const override = await request('/entities/ExportShipment', admin, { ...shipment, currency: 'usd' });
        expect(await override.json()).toMatchObject({ data: { currency: 'USD' } });
        const department = { email: 'exports-test@jbagreengold.com', mailboxId: departmentMailbox, members: [exportsStaff.id] };
        expect((await request(`/settings/departments/${departmentId}`, admin, { ...department, mailboxId: mainMailbox })).status).toBe(422);
        expect((await request(`/settings/departments/${departmentId}`, admin, department)).status).toBe(200);
        expect((await request(`/settings/departments/${otherDepartmentId}`, admin, department)).status).toBe(422);
        expect(await result('/outlook/mailboxes', exportsStaff)).toEqual({ data: [{ id: departmentId, name: 'Test department', email: department.email }] });
        expect(await result('/outlook/mailboxes', financeStaff)).toEqual({ data: [] });

        const graph = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'test-token', expires_in: 3600 }))
          .mockResolvedValueOnce(Response.json({ value: [] })).mockResolvedValueOnce(Response.json({ id: 'message' })).mockResolvedValueOnce(new Response(null, { status: 202 }));
        vi.stubGlobal('fetch', graph);
        const query = `?department=${departmentId}`;
        for (const path of [`/outlook/inbox${query}`, `/outlook/inbox/message${query}`]) expect((await request(path, financeStaff)).status).toBe(403);
        expect((await request(`/outlook/inbox/message/reply${query}`, financeStaff, { text: 'Hello' })).status).toBe(403);
        expect((await request('/outlook/inbox', exportsStaff)).status).toBe(403);
        expect(graph).not.toHaveBeenCalled();
        expect((await request(`/outlook/inbox${query}`, exportsStaff)).status).toBe(200);
        expect((await request(`/outlook/inbox/message${query}`, exportsStaff)).status).toBe(200);
        expect((await request(`/outlook/inbox/message/reply${query}`, exportsStaff, { text: 'Hello' })).status).toBe(202);
        expect(graph.mock.calls.slice(1).map(([input]) => new URL(String(input)).pathname)).toEqual([
          `/v1.0/users/${departmentMailbox}/mailFolders/inbox/messages`,
          `/v1.0/users/${departmentMailbox}/mailFolders/inbox/messages/message`,
          `/v1.0/users/${departmentMailbox}/mailFolders/inbox/messages/message/reply`,
        ]);
        expect((await request(`/settings/departments/${departmentId}`, admin, { ...department, members: [] })).status).toBe(200);
        expect((await request(`/outlook/inbox${query}`, exportsStaff)).status).toBe(403);
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
