import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppVariables, AuthUser } from '../middleware/auth.js';
import router from './company-calendar.js';

const env = {
  COMPANY_ORGANIZATION_ID: 'jba',
  M365_TENANT_ID: 'tenant',
  M365_CLIENT_ID: 'client',
  M365_CLIENT_SECRET: 'test-secret',
} as Env;

function testApp(role: AuthUser['role'] = 'super_admin', organizationId = 'jba') {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('user', { role, organizationId } as AuthUser);
    c.set('session', { id: 'test', csrfToken: 'company-csrf', expiresAt: new Date() });
    await next();
  });
  return app.route('/company', router);
}

afterEach(() => vi.unstubAllGlobals());

describe('company calendar and inbox', () => {
  it('blocks other roles and organizations before contacting Microsoft', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await testApp('admin').request('/company/inbox', {}, env)).status).toBe(403);
    expect((await testApp('super_admin', 'another-org').request('/company/inbox', {}, env)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('follows Microsoft calendar pages for the requested month', async () => {
    const next = 'https://graph.microsoft.com/v1.0/users/info@jbagreengold.com/calendarView?$skiptoken=next';
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'token' }))
      .mockResolvedValueOnce(Response.json({ value: [{ id: 'first' }], '@odata.nextLink': next }))
      .mockResolvedValueOnce(Response.json({ value: [{ id: 'second' }] }));
    vi.stubGlobal('fetch', fetcher);
    const response = await testApp().request('/company/events?month=2026-11', {}, env);
    expect(await response.json()).toEqual({ data: [{ id: 'first' }, { id: 'second' }] });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const url = fetcher.mock.calls[1][0] as URL;
    expect(url.searchParams.get('startDateTime')).toBe('2026-11-01T00:00:00.000Z');
    expect(url.searchParams.get('endDateTime')).toBe('2026-12-01T00:00:00.000Z');
    expect(String(fetcher.mock.calls[2][0])).toBe(next);
  });

  it('rejects an inbox cursor pointing away from the company inbox', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const cursor = 'https://graph.microsoft.com/v1.0/users/other@jbagreengold.com/mailFolders/inbox/messages?$skip=25';
    const response = await testApp().request('/company/inbox?' + new URLSearchParams({ cursor }), {}, env);
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires CSRF and submits a reply to the company mailbox only', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'token' }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetcher);
    const path = '/company/inbox/message-1/reply';
    const body = JSON.stringify({ text: 'Thanks for contacting JBA.' });
    expect((await testApp().request(path, { method: 'POST', body }, env)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    const response = await testApp().request(path, {
      method: 'POST', body, headers: { 'X-CSRF-Token': 'company-csrf' },
    }, env);
    expect(await response.json()).toEqual({ data: { accepted: true } });
    expect(String(fetcher.mock.calls[1][0])).toBe('https://graph.microsoft.com/v1.0/users/info@jbagreengold.com/messages/message-1/reply');
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ comment: 'Thanks for contacting JBA.' });
  });
});
