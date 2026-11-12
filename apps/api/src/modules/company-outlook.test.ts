import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppVariables, AuthUser } from '../middleware/auth.js';
import router from './company-outlook.js';

const mailbox = '88888888-8888-4888-8888-888888888888';
const graphInbox = `https://graph.microsoft.com/v1.0/users/${mailbox}/mailFolders/inbox/messages`;

function fixture(role: AuthUser['role'] | null = 'super_admin', configured = true) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('user', role ? { id: 'tester', role, email: 'test@example.test', full_name: null, pageAccess: null, status: 'active', organizationId: null } : null);
    c.set('session', role ? { id: 'session', csrfToken: 'test-csrf', expiresAt: new Date() } : null);
    await next();
  });
  app.route('/company-outlook', router);
  const env = configured ? {
    COMPANY_OUTLOOK_TENANT_ID: '11111111-1111-4111-8111-111111111111',
    COMPANY_OUTLOOK_CLIENT_ID: '22222222-2222-4222-8222-222222222222',
    COMPANY_OUTLOOK_CLIENT_SECRET: crypto.randomUUID(),
    COMPANY_OUTLOOK_MAILBOX_ID: mailbox,
  } as Env : {} as Env;
  const request = (path: string, init?: RequestInit) => app.request(`/company-outlook${path}`, init, env);
  return request;
}

function mockMicrosoft(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'test-token', expires_in: 3600 }));
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('company Outlook', () => {
  it('reports missing bindings and checks inbox and calendar access independently', async () => {
    const missing = await fixture('super_admin', false)('/connection');
    expect(await missing.json()).toMatchObject({ data: { status: 'setup_required', missing: expect.arrayContaining(['COMPANY_OUTLOOK_CLIENT_SECRET', 'COMPANY_OUTLOOK_MAILBOX_ID']) } });
    mockMicrosoft(Response.json({}), new Response(null, { status: 403 }));
    expect(await (await fixture()('/connection')).json()).toEqual({ data: { status: 'checked', inbox: 'connected', calendar: 'access_denied' } });
  });

  it('protects inbox and replies with role and CSRF checks before contacting Microsoft', async () => {
    const fetchMock = mockMicrosoft();
    expect((await fixture(null)('/inbox')).status).toBe(401);
    expect((await fixture('admin')('/inbox')).status).toBe(403);
    expect((await fixture()('/inbox/example/reply', { method: 'POST' })).status).toBe(403);
    expect((await fixture('super_admin', false)('/inbox')).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('paginates the primary calendar in the requested range', async () => {
    const calendar = `https://graph.microsoft.com/v1.0/users/${mailbox}/calendarView`;
    const next = `${calendar}?$skip=250`;
    const fetchMock = mockMicrosoft(Response.json({ value: [{ id: 'one' }], '@odata.nextLink': next }), Response.json({ value: [{ id: 'two' }] }));
    const response = await fixture()('/events?start=2026-11-01&end=2026-12-01');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ data: [{ id: 'one' }, { id: 'two' }] });
    const first = new URL(String(fetchMock.mock.calls[1][0]));
    expect(first.origin + first.pathname).toBe(calendar);
    expect(first.searchParams.get('startDateTime')).toBe('2026-11-01T00:00:00Z');
    expect(String(fetchMock.mock.calls[2][0])).toBe(next);
  });

  it('rejects inbox cursors that target another host or mailbox', async () => {
    const fetchMock = mockMicrosoft();
    const request = fixture();
    for (const cursor of ['https://example.test/inbox', graphInbox.replace(mailbox, 'someone-else')]) {
      expect((await request(`/inbox?${new URLSearchParams({ cursor })}`)).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('follows inbox pagination and sends a threaded plain-text reply through Microsoft Graph', async () => {
    const cursor = `${graphInbox}?$skip=25`;
    const fetchMock = mockMicrosoft(Response.json({ value: [{ id: 'mail+A=' }], '@odata.nextLink': cursor }), Response.json({ value: [{ id: 'older' }] }), new Response(null, { status: 202 }));
    const request = fixture();
    expect(await (await request('/inbox')).json()).toEqual({ data: { messages: [{ id: 'mail+A=' }], cursor } });
    expect(await (await request(`/inbox?${new URLSearchParams({ cursor })}`)).json()).toEqual({ data: { messages: [{ id: 'older' }], cursor: null } });
    const response = await request('/inbox/mail%2BA%3D/reply', {
      method: 'POST', headers: { 'X-CSRF-Token': 'test-csrf', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hello <team>' }),
    });
    expect(response.status).toBe(202);
    const [url, options] = fetchMock.mock.calls[3];
    expect(String(url)).toBe(`${graphInbox}/mail%2BA%3D/reply`);
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ message: { body: { contentType: 'Text', content: 'Hello <team>' } } });
  });

  it('keeps provider response details private when a reply is unconfirmed', async () => {
    mockMicrosoft(Response.json({ error: 'private provider response' }, { status: 500 }));
    const response = await fixture()('/inbox/message/reply', {
      method: 'POST', headers: { 'X-CSRF-Token': 'test-csrf', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hello' }),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: { message: 'Outlook did not confirm the reply. Check Sent Items before trying again.' } });
  });
});
