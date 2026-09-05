import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { closeDatabase, createDatabase } from './db.js';
import { loadSession, type AppVariables } from './middleware/auth.js';
import authRouter from './modules/auth.js';
import entitiesRouter from './modules/entities.js';
import applicationsRouter from './modules/applications.js';
import filesRouter from './modules/files.js';
import commerceRouter from './modules/commerce.js';
import paymentsRouter from './modules/payments.js';
import calendarRouter from './modules/calendar.js';
import farmsRouter from './modules/farms.js';
import activityLogRouter from './modules/activity-log.js';
import supportRouter from './modules/support.js';
import accountRouter from './modules/account.js';
import { runCalendarReminders } from './calendar-reminders.js';
import { purgeExpiredRateLimitWindows, purgeExpiredVerificationTokens } from './maintenance.js';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use('*', async (c, next) => {
  const supplied = c.req.header('X-Request-ID') || '';
  const requestId = /^[\w-]{1,64}$/.test(supplied) ? supplied : crypto.randomUUID();
  const startedAt = Date.now();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  try {
    await next();
  } finally {
    console.log(JSON.stringify({ event: 'request', requestId, method: c.req.method, path: c.req.path, status: c.res.status, durationMs: Date.now() - startedAt, environment: c.env.APP_ENV }));
  }
});

app.use('*', async (c, next) => {
  const allowed = new Set((c.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean));
  const middleware = cors({
    origin: (origin) => allowed.has(origin) ? origin : '',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'Retry-After'],
    credentials: true,
    maxAge: 86400,
  });
  return middleware(c, next);
});

app.use('*', secureHeaders({
  crossOriginEmbedderPolicy: false,
  referrerPolicy: 'strict-origin-when-cross-origin',
  xFrameOptions: 'DENY',
}));

app.use('*', async (c, next) => {
  // A request that carries a body via chunked Transfer-Encoding omits Content-Length,
  // which would otherwise let it skip the size cap below entirely. Reject that case
  // outright — none of our clients need chunked request bodies — instead of trusting
  // a client-supplied length. Requests with no body at all (e.g. GET, or a bodyless
  // POST/DELETE) send neither header and are unaffected.
  const transferEncoding = c.req.header('Transfer-Encoding') || '';
  const contentLengthHeader = c.req.header('Content-Length');
  if (contentLengthHeader == null && /chunked/i.test(transferEncoding)) {
    return c.json({ error: { code: 'LENGTH_REQUIRED', message: 'Chunked request bodies are not supported' }, requestId: c.get('requestId') }, 411);
  }
  const contentLength = Number(contentLengthHeader || 0);
  const maxBytes = ['/api/v1/applications', '/api/v1/files', '/api/v1/account/files'].includes(c.req.path) ? 7 * 1024 * 1024 : 256 * 1024;
  if (contentLength > maxBytes) return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }, requestId: c.get('requestId') }, 413);
  await next();
});

app.use('/api/v1/*', loadSession());
app.use('/api/v1/entities/Notification', async (c, next) => {
  if (c.req.method === 'GET' && c.get('user')) {
    await runCalendarReminders(c.env).catch((error) => {
      console.error(JSON.stringify({ event: 'calendar_reminder_poll_failed', requestId: c.get('requestId'), error: error instanceof Error ? error.message : 'Unknown error' }));
    });
  }
  await next();
});

const api = app.basePath('/api/v1');
api.route('/auth', authRouter);
api.route('/entities', entitiesRouter);
api.route('/applications', applicationsRouter);
api.route('/files', filesRouter);
api.route('/commerce', commerceRouter);
api.route('/payments', paymentsRouter);
api.route('/calendar', calendarRouter);
api.route('/activity-log', activityLogRouter);
api.route('/support', supportRouter);
api.route('/account', accountRouter);

// Public deployment probes must be registered before the authenticated farms router,
// which is mounted at the API root and otherwise intercepts every remaining path.
api.get('/health', (c) => c.json({ status: 'ok', release: c.env.CF_VERSION_METADATA?.id || 'local', timestamp: new Date().toISOString(), requestId: c.get('requestId') }));
api.get('/ready', async (c) => {
  const sql = createDatabase(c.env);
  try {
    await sql`SELECT 1`;
    return c.json({ status: 'ready', requestId: c.get('requestId') });
  } catch {
    return c.json({ status: 'unavailable', requestId: c.get('requestId') }, 503);
  } finally {
    await closeDatabase(sql);
  }
});
api.route('/', farmsRouter);

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' }, requestId: c.get('requestId') }, 404));
app.onError((error, c) => {
  console.error(JSON.stringify({ event: 'unhandled_error', requestId: c.get('requestId'), path: c.req.path, error: error instanceof Error ? error.message : 'Unknown error' }));
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, requestId: c.get('requestId') }, 500);
});

const worker: ExportedHandler<Env> = {
  fetch: (request, env, context) => app.fetch(request, env, context),
  scheduled: (controller, env, context) => {
    const now = new Date(controller.scheduledTime);
    context.waitUntil(
      Promise.all([
        runCalendarReminders(env, now),
        purgeExpiredRateLimitWindows(env),
        purgeExpiredVerificationTokens(env),
      ])
    );
  },
};

export default worker;
