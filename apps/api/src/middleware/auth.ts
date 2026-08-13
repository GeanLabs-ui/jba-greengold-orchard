import type { MiddlewareHandler } from 'hono';
import type { Role, Permission } from 'mango-farm-authorization';
import { hasPermission } from 'mango-farm-authorization';
import { closeDatabase, createDatabase } from '../db.js';
import { LOCAL_SESSION_COOKIE, parseCookies, SESSION_COOKIE, sha256, timingSafeEqual } from '../security.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  pageAccess: string[] | null;
  status: string;
  organizationId: string | null;
}

export interface AuthSession {
  id: string;
  csrfToken: string;
  expiresAt: Date;
}

export type AppVariables = {
  requestId: string;
  user: AuthUser | null;
  session: AuthSession | null;
};

export const loadSession = (): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> => async (c, next) => {
  c.set('user', null);
  c.set('session', null);
  const cookies = parseCookies(c.req.header('Cookie'));
  const rawToken = cookies.get(SESSION_COOKIE) || cookies.get(LOCAL_SESSION_COOKIE);
  if (!rawToken) return next();

  const sql = createDatabase(c.env);
  try {
    const tokenHash = await sha256(rawToken);
    const rows = await sql<{
      session_id: string;
      csrf_token: string;
      expires_at: Date;
      user_id: string;
      email: string;
      role: Role;
      page_access: unknown;
      status: string;
      organization_id: string | null;
    }[]>`
      SELECT s.id AS session_id, s.csrf_token, s.expires_at,
             u.id AS user_id, u.email, u.role, u.page_access, u.status,
             om.organization_id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN organization_members om ON om.user_id = u.id
      WHERE s.token_hash = ${tokenHash}
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1
    `;
    const row = rows[0];
    if (row) {
      c.set('user', {
        id: row.user_id,
        email: row.email,
        role: row.role,
        pageAccess: Array.isArray(row.page_access) ? row.page_access.filter((item): item is string => typeof item === 'string') : null,
        status: row.status,
        organizationId: row.organization_id,
      });
      c.set('session', { id: row.session_id, csrfToken: row.csrf_token, expiresAt: row.expires_at });
    }
  } finally {
    await closeDatabase(sql);
  }
  return next();
};

export const requireAuth = (): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> => async (c, next) => {
  if (!c.get('user')) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, requestId: c.get('requestId') }, 401);
  return next();
};

export const requireCsrf = (): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> => async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next();
  const session = c.get('session');
  const supplied = c.req.header('X-CSRF-Token');
  if (!session || !timingSafeEqual(supplied, session.csrfToken)) {
    return c.json({ error: { code: 'CSRF_INVALID', message: 'Security token is missing or invalid' }, requestId: c.get('requestId') }, 403);
  }
  return next();
};

export const requireRole = (...roles: Role[]): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> => async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, requestId: c.get('requestId') }, 401);
  if (!roles.includes(user.role)) return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }, requestId: c.get('requestId') }, 403);
  return next();
};

export const requirePermission = (permission: Permission): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> => async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, requestId: c.get('requestId') }, 401);
  if (!hasPermission(user.role, permission)) return c.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }, requestId: c.get('requestId') }, 403);
  return next();
};
