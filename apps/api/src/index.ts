import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { closeDatabase, createDatabase } from './db.js';
import { loadSession, type AppVariables } from './middleware/auth.js';
import authRouter from './modules/auth.js';
import entitiesRouter from './modules/entities.js';
import applicationsRouter from './modules/applications.js';
import filesRouter from './modules/files.js';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
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
  const contentLength = Number(c.req.header('Content-Length') || 0);
  const maxBytes = c.req.path === '/api/v1/applications' ? 7 * 1024 * 1024 : 256 * 1024;
  if (contentLength > maxBytes) return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' }, requestId: c.get('requestId') }, 413);
  await next();
});

app.use('/api/v1/*', loadSession());

const api = app.basePath('/api/v1');
api.route('/auth', authRouter);
api.route('/entities', entitiesRouter);
api.route('/applications', applicationsRouter);
api.route('/files', filesRouter);

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

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Resource not found' }, requestId: c.get('requestId') }, 404));
app.onError((error, c) => {
  console.error(JSON.stringify({ event: 'unhandled_error', requestId: c.get('requestId'), path: c.req.path, error: error instanceof Error ? error.message : 'Unknown error' }));
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, requestId: c.get('requestId') }, 500);
});

export default app;
