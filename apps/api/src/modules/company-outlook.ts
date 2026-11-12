import { Hono, type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { requireCsrf, requireRole, type AppVariables, type AuthUser } from '../middleware/auth.js';
import { departmentMailboxes } from './company-settings.js';

type OutlookEnv = { Bindings: Env; Variables: AppVariables & { outlookMailboxId: string } };
const router = new Hono<OutlookEnv>();
const graph = 'https://graph.microsoft.com';
const inboxPath = 'mailFolders/inbox/messages';
const companyAdmins = requireRole('super_admin');
const staff = requireRole('super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'inventory_officer', 'quality_officer', 'finance_officer', 'hr_officer', 'sales_officer', 'logistics_officer', 'content_editor', 'auditor');
const canUseCalendar = (user: AuthUser) => user.role === 'super_admin'
  || (user.pageAccess ? user.pageAccess.includes('calendar') : ['admin', 'farm_manager', 'farm_supervisor'].includes(user.role));
const uuid = z.string().uuid();
const day = z.string().date();
const messageId = z.string().regex(/^[A-Za-z0-9_+=\/-]{1,1024}$/);
const messageFields = 'id,subject,from,replyTo,receivedDateTime,bodyPreview,isRead,hasAttachments,webLink';

class OutlookError extends Error {
  constructor(readonly status: number, readonly fromGraph = false) {
    super('Microsoft 365 request failed');
  }
}

// Reuse a token within a Worker isolate. Credentials can differ across deployments.
let cachedToken: { key: string; token: string; expiresAt: number } | undefined;

async function accessToken(env: Env) {
  const tenant = uuid.parse(env.COMPANY_OUTLOOK_TENANT_ID);
  const client = uuid.parse(env.COMPANY_OUTLOOK_CLIENT_ID);
  const secret = env.COMPANY_OUTLOOK_CLIENT_SECRET!;
  const key = `${tenant}:${client}:${secret}`;
  if (cachedToken?.key === key && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({
      client_id: client, client_secret: secret, grant_type: 'client_credentials', scope: `${graph}/.default`,
    }),
  });
  if (!response.ok) throw new OutlookError(response.status);
  const data = await response.json<{ access_token: string; expires_in: number }>();
  if (!data.access_token) throw new OutlookError(502);
  cachedToken = { key, token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function graphRequest(env: Env, url: URL, options: { prefer?: string; reply?: string } = {}) {
  const token = await accessToken(env);
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  if (options.prefer) headers.set('Prefer', options.prefer);
  if (options.reply) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    method: options.reply ? 'POST' : 'GET',
    headers,
    body: options.reply ? JSON.stringify({ message: { body: { contentType: 'Text', content: options.reply } } }) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401 && cachedToken?.token === token) cachedToken = undefined;
  if (!response.ok) throw new OutlookError(response.status, true);
  return response;
}

function mailboxUrl(mailboxId: string, path: string, query = {}) {
  const url = new URL(`/v1.0/users/${uuid.parse(mailboxId)}/${path}`, graph);
  url.search = new URLSearchParams(query).toString();
  return url;
}

function continuation(value: string, initial: URL) {
  const url = URL.canParse(value) ? new URL(value) : null;
  if (url?.origin !== initial.origin || url.pathname !== initial.pathname || url.username || url.password || url.hash) return null;
  return url;
}

type GraphPage = { value: unknown[]; '@odata.nextLink'?: string };
const connectionBindings = ['COMPANY_OUTLOOK_TENANT_ID', 'COMPANY_OUTLOOK_CLIENT_ID', 'COMPANY_OUTLOOK_MAILBOX_ID', 'COMPANY_OUTLOOK_CLIENT_SECRET'] as const;
const missingBindings = (env: Env) => connectionBindings.filter(name => name.endsWith('_SECRET') ? !env[name]?.trim() : !uuid.safeParse(env[name]).success);

router.use('*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
});
router.use('*', staff, requireCsrf());

router.get('/connection', companyAdmins, async (c) => {
  const missing = missingBindings(c.env);
  if (missing.length) return c.json({ data: { status: 'setup_required', missing } });
  try {
    await accessToken(c.env);
  } catch (error) {
    return c.json({ data: { status: error instanceof OutlookError && [400, 401, 403].includes(error.status) ? 'credentials_rejected' : 'unavailable' } });
  }
  const id = c.env.COMPANY_OUTLOOK_MAILBOX_ID!;
  const probe = async (path: string) => {
    try {
      await (await graphRequest(c.env, mailboxUrl(id, path))).body?.cancel();
      return 'connected';
    } catch (error) {
      if (error instanceof OutlookError && error.status === 404) return 'mailbox_missing';
      if (error instanceof OutlookError && [401, 403].includes(error.status)) return 'access_denied';
      return 'unavailable';
    }
  };
  const [inbox, calendar] = await Promise.all([probe('mailFolders/inbox'), probe('calendar')]);
  return c.json({ data: { status: 'checked', inbox, calendar } });
});

router.get('/mailboxes', async (c) => {
  const user = c.get('user')!;
  if (!canUseCalendar(user)) return c.json({ data: [] });
  const rows = await departmentMailboxes(c.env, user);
  return c.json({ data: rows.filter(row => row.mailboxId !== c.env.COMPANY_OUTLOOK_MAILBOX_ID?.toLowerCase())
    .map(({ id, name, email }) => ({ id, name, email })) });
});

function useMailbox(allowDepartment: boolean): MiddlewareHandler<OutlookEnv> {
  return async (c, next) => {
    const user = c.get('user')!;
    const departmentId = allowDepartment ? c.req.query('department') : undefined;
    let mailboxId = c.env.COMPANY_OUTLOOK_MAILBOX_ID;
    if (departmentId !== undefined) {
      const [department] = canUseCalendar(user) && departmentId.length > 0 && departmentId.length <= 128 ? await departmentMailboxes(c.env, user, departmentId) : [];
      if (!department || department.mailboxId === mailboxId?.toLowerCase()) return c.json({ error: { message: 'Department inbox access is required.' } }, 403);
      mailboxId = department.mailboxId;
    } else if (user.role !== 'super_admin') {
      return c.json({ error: { message: 'Company inbox access requires a Super Admin.' } }, 403);
    }
    if (missingBindings(c.env).length) return c.json({ error: { code: 'OUTLOOK_SETUP_REQUIRED', message: 'Microsoft 365 setup is required. A Super Admin can check the connection in Settings.' } }, 503);
    c.set('outlookMailboxId', mailboxId!);
    await next();
  };
}

router.onError((error, c) => {
  if (error instanceof OutlookError) {
    if (error.fromGraph && error.status === 404) return c.json({ error: { message: 'This mailbox or item is unavailable in Outlook.' } }, 404);
    if (error.status === 429) return c.json({ error: { message: 'Outlook is busy. Please try again shortly.' } }, 429);
    if (error.status === 401 || error.status === 403 || !error.fromGraph && error.status === 400) {
      return c.json({ error: { message: 'Microsoft 365 access needs to be checked by your administrator.' } }, 503);
    }
  }
  const message = c.req.method === 'POST'
    ? 'Outlook did not confirm the reply. Check Sent Items before trying again.'
    : 'Outlook is temporarily unavailable. Please try again.';
  return c.json({ error: { message } }, 502);
});

router.get('/events', useMailbox(false), async (c) => {
  const start = day.safeParse(c.req.query('start'));
  const end = day.safeParse(c.req.query('end'));
  if (!start.success || !end.success || start.data >= end.data || Date.parse(end.data) - Date.parse(start.data) > 42 * 86400000) {
    return c.json({ error: { message: 'Choose a calendar range of up to 42 days.' } }, 400);
  }
  const initial = mailboxUrl(c.get('outlookMailboxId'), 'calendarView', {
    startDateTime: `${start.data}T00:00:00Z`, endDateTime: `${end.data}T00:00:00Z`, $top: '250',
    $select: 'id,subject,start,end,isAllDay,isCancelled,location,organizer,webLink',
  });
  const events = [];
  let url: URL | null = initial;
  for (let page = 0; url && page < 12; page += 1) {
    const response = await graphRequest(c.env, url, { prefer: 'outlook.timezone="Greenwich Standard Time"' });
    const result = await response.json<GraphPage>();
    events.push(...result.value);
    url = result['@odata.nextLink'] ? continuation(result['@odata.nextLink'], initial) : null;
    if (result['@odata.nextLink'] && !url) throw new OutlookError(502);
  }
  if (url) return c.json({ error: { message: 'Outlook returned too many events for this month.' } }, 502);
  return c.json({ data: events });
});

router.get('/inbox', useMailbox(true), async (c) => {
  const initial = mailboxUrl(c.get('outlookMailboxId'), inboxPath, { $top: '25', $orderby: 'receivedDateTime desc', $select: messageFields });
  const cursor = c.req.query('cursor');
  const url = cursor ? continuation(cursor, initial) : initial;
  if (!url) return c.json({ error: { message: 'Invalid inbox page.' } }, 400);
  const response = await graphRequest(c.env, url, { prefer: 'IdType="ImmutableId"' });
  const result = await response.json<GraphPage>();
  return c.json({ data: { messages: result.value, cursor: result['@odata.nextLink'] || null } });
});

router.get('/inbox/:id', useMailbox(true), async (c) => {
  const id = messageId.safeParse(c.req.param('id'));
  if (!id.success) return c.json({ error: { message: 'Invalid message.' } }, 400);
  const url = mailboxUrl(c.get('outlookMailboxId'), `${inboxPath}/${encodeURIComponent(id.data)}`, { $select: `${messageFields},body` });
  const response = await graphRequest(c.env, url, { prefer: 'IdType="ImmutableId", outlook.body-content-type="text"' });
  return c.json({ data: await response.json() });
});

router.post('/inbox/:id/reply', useMailbox(true), async (c) => {
  const id = messageId.safeParse(c.req.param('id'));
  const body = z.object({ text: z.string().trim().min(1).max(15000) }).safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: { message: 'Enter a reply of 1 to 15,000 characters.' } }, 400);
  const url = mailboxUrl(c.get('outlookMailboxId'), `${inboxPath}/${encodeURIComponent(id.data)}/reply`);
  await graphRequest(c.env, url, { prefer: 'IdType="ImmutableId"', reply: body.data.text });
  console.info(JSON.stringify({ event: 'company_outlook_reply_accepted', actor: c.get('user')?.id, requestId: c.get('requestId') }));
  return c.json({ data: { accepted: true } }, 202);
});

export default router;
