import { Hono } from 'hono';
import { requireCsrf, requireRole, type AppVariables } from '../middleware/auth.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const mailbox = 'info@jbagreengold.com';
const graphOrigin = 'https://graph.microsoft.com';
const mailboxPath = '/v1.0/users/' + mailbox;
const inboxPath = mailboxPath + '/mailFolders/inbox/messages';

router.use('*', requireRole('super_admin'), requireCsrf(), async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  const { COMPANY_ORGANIZATION_ID, M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET } = c.env;
  if (!COMPANY_ORGANIZATION_ID || !M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET) {
    return c.json({ error: { code: 'COMPANY_MAILBOX_NOT_CONFIGURED', message: 'The Microsoft 365 connection still needs administrator setup.' } }, 503);
  }
  if (c.get('user')?.organizationId !== COMPANY_ORGANIZATION_ID) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Company mailbox access is restricted.' } }, 403);
  }
  await next();
});

export class MicrosoftConnectionError extends Error {}

async function accessToken(env: Env) {
  const response = await fetch('https://login.microsoftonline.com/' + encodeURIComponent(env.M365_TENANT_ID!) + '/oauth2/v2.0/token', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.M365_CLIENT_ID!,
      client_secret: env.M365_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
    }),
  }).catch(() => { throw new MicrosoftConnectionError('Microsoft 365 could not be reached.'); });
  if (!response.ok) throw new MicrosoftConnectionError('Microsoft 365 rejected the app credentials.');
  const { access_token } = await response.json<{ access_token: string }>();
  if (!access_token) throw new MicrosoftConnectionError('Microsoft 365 did not issue an access token.');
  return access_token;
}

async function graph(url: URL, token: string, body?: object) {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'outlook.body-content-type="text", outlook.timezone="UTC", IdType="ImmutableId"',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new MicrosoftConnectionError(body
      ? 'Reply delivery could not be confirmed. Check Outlook Sent Items before trying again.'
      : 'Microsoft 365 could not be reached.');
  });
  if (body && response.status >= 500) {
    throw new MicrosoftConnectionError('Reply delivery could not be confirmed. Check Outlook Sent Items before trying again.');
  }
  if (!response.ok) {
    throw new MicrosoftConnectionError(response.status === 403
      ? 'Microsoft 365 denied access. Check the app permissions for the company mailbox.'
      : 'Microsoft 365 could not complete the request (' + response.status + ').');
  }
  return response;
}

function pageUrl(value: string, path: string) {
  try {
    const url = new URL(value);
    if (url.origin === graphOrigin && !url.username && !url.password &&
        decodeURIComponent(url.pathname) === path && (url.searchParams.has('$skip') || url.searchParams.has('$skiptoken'))) return url;
  } catch {
    return null;
  }
  return null;
}

type GraphPage = { value: unknown[]; '@odata.nextLink'?: string };

router.get('/events', async (c) => {
  const month = c.req.query('month') || '';
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    return c.json({ error: { message: 'Choose a valid calendar month.' } }, 400);
  }
  const start = new Date(month + '-01T00:00:00Z');
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const path = mailboxPath + '/calendarView';
  let url: URL | null = new URL(path, graphOrigin);
  url.search = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    '$select': 'id,subject,start,end,isAllDay,isCancelled,location',
    '$top': '100',
  }).toString();
  const token = await accessToken(c.env);
  const events: unknown[] = [];
  for (let page = 0; url && page < 20; page += 1) {
    const response = await graph(url, token);
    const result: GraphPage = await response.json<GraphPage>();
    events.push(...result.value);
    const next: string | undefined = result['@odata.nextLink'];
    url = next ? pageUrl(next, path) : null;
    if (next && !url) throw new MicrosoftConnectionError('Microsoft 365 returned an invalid calendar page.');
  }
  if (url) throw new MicrosoftConnectionError('The company calendar exceeded the monthly event limit.');
  return c.json({ data: events });
});

router.get('/inbox', async (c) => {
  const cursor = c.req.query('cursor');
  const url = cursor ? pageUrl(cursor, inboxPath) : new URL(inboxPath, graphOrigin);
  if (!url) return c.json({ error: { message: 'Invalid inbox page.' } }, 400);
  if (!cursor) {
    url.search = new URLSearchParams({
      '$select': 'id,subject,from,receivedDateTime,bodyPreview,isRead',
      '$orderby': 'receivedDateTime desc',
      '$top': '25',
    }).toString();
  }
  const response = await graph(url, await accessToken(c.env));
  const page = await response.json<GraphPage>();
  return c.json({ data: { messages: page.value, next: page['@odata.nextLink'] || null } });
});

const messageId = /^[a-zA-Z0-9_+=-]{1,512}$/;

router.get('/inbox/:id', async (c) => {
  const id = c.req.param('id');
  if (!messageId.test(id)) return c.json({ error: { message: 'Invalid message.' } }, 400);
  const url = new URL(mailboxPath + '/messages/' + encodeURIComponent(id), graphOrigin);
  url.searchParams.set('$select', 'id,subject,from,replyTo,receivedDateTime,body');
  const response = await graph(url, await accessToken(c.env));
  return c.json({ data: await response.json() });
});

router.post('/inbox/:id/reply', async (c) => {
  const id = c.req.param('id');
  const payload = await c.req.json<{ text?: unknown }>().catch(() => null);
  const comment = typeof payload?.text === 'string' ? payload.text.trim() : '';
  if (!messageId.test(id) || !comment || comment.length > 10_000) {
    return c.json({ error: { message: 'Enter a reply of 1 to 10,000 characters.' } }, 400);
  }
  await graph(new URL(mailboxPath + '/messages/' + encodeURIComponent(id) + '/reply', graphOrigin), await accessToken(c.env), { comment });
  return c.json({ data: { accepted: true } });
});

export default router;
