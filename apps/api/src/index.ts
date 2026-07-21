import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AuthUser } from './middleware/auth.js';

type Bindings = {
  APP_ENV: string;
  VITE_CORS_ORIGIN: string;
  DATABASE_URL: string;
};

type Variables = {
  requestId: string;
  user?: AuthUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Request ID middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.header('X-Request-ID', requestId);
  c.set('requestId', requestId);
  await next();
});

// CORS middleware
app.use('*', async (c, next) => {
  const allowedOrigin = c.env.VITE_CORS_ORIGIN || '*';
  const corsMiddleware = cors({
    origin: allowedOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID'],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// Base path route group
const api = app.basePath('/api/v1');

import productsRouter from './modules/products.js';
api.route('/products', productsRouter);

// Health endpoint
api.get('/health', (c) => {
  const requestId = c.get('requestId');
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: c.env.APP_ENV || 'local',
    requestId,
  });
});

export default app;
