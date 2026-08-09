import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';
import { checkRateLimit, requestIp } from '../rate-limit.js';
import { clearSessionCookie, randomToken, sessionCookie, sha256, timingSafeEqual } from '../security.js';

function sendVerificationEmail(env: Env, ctx: { waitUntil(p: Promise<unknown>): void }, email: string, token: string): void {
  if (!env.RESEND_API_KEY) return;
  const verifyUrl = `${env.PASSWORD_RESET_URL.replace('/reset-password', '/verify-email')}?token=${encodeURIComponent(token)}`;
  ctx.waitUntil(fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: 'Verify your JBA GreenGold Orchard email address',
      html: `<p>Thank you for registering with JBA GreenGold Orchard.</p><p><a href="${verifyUrl}">Verify your email address</a></p><p>This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>`,
    }),
  }));
}

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
});
const resetSchema = z.object({ resetToken: z.string().min(32).max(256), newPassword: z.string().min(12).max(128) });

function secureCookie(env: Env): boolean {
  return env.APP_ENV !== 'local';
}

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

async function createSession(c: AppContext, userId: string) {
  const sql = createDatabase(c.env);
  try {
    const token = randomToken();
    const tokenHash = await sha256(token);
    const csrfToken = randomToken();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await sql`
      INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at, user_agent, ip_address)
      VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${csrfToken}, ${expiresAt}, ${c.req.header('User-Agent') || null}, ${requestIp(c.req.raw)})
    `;
    c.header('Set-Cookie', sessionCookie(token, secureCookie(c.env)));
    return csrfToken;
  } finally {
    await closeDatabase(sql);
  }
}

router.get('/me', (c) => {
  const user = c.get('user');
  const session = c.get('session');
  if (!user || !session) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, requestId: c.get('requestId') }, 401);
  return c.json({ data: { user, csrf_token: session.csrfToken }, requestId: c.get('requestId') });
});

router.get('/csrf', (c) => {
  const session = c.get('session');
  if (!session) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, requestId: c.get('requestId') }, 401);
  return c.json({ data: { csrf_token: session.csrfToken }, requestId: c.get('requestId') });
});

router.post('/register', async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email and a password of at least 12 characters are required' }, requestId: c.get('requestId') }, 422);
  const sql = createDatabase(c.env);
  try {
    const limit = await checkRateLimit(sql, 'register', requestIp(c.req.raw), 5, 3600);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many registration attempts' }, requestId: c.get('requestId') }, 429);
    }
    const existing = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${parsed.data.email} LIMIT 1`;
    if (existing.length) return c.json({ error: { code: 'ACCOUNT_EXISTS', message: 'An account with this email already exists' }, requestId: c.get('requestId') }, 409);
    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, email, password_hash, password_salt, full_name, role, status)
      VALUES (${userId}, ${parsed.data.email}, crypt(${parsed.data.password}, gen_salt('bf', 12)), NULL, ${parsed.data.email.split('@')[0]}, 'customer', 'active')
    `;
    // Issue a verification token and send the verification email (fire-and-forget)
    const verifyToken = randomToken();
    const verifyTokenHash = await sha256(verifyToken);
    await sql`
      INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${verifyTokenHash}, ${new Date(Date.now() + 24 * 60 * 60 * 1000)})
    `;
    sendVerificationEmail(c.env, c.executionCtx, parsed.data.email, verifyToken);
    const csrfToken = await createSession(c, userId);
    return c.json({ data: { user: { id: userId, email: parsed.data.email, role: 'customer' }, csrf_token: csrfToken }, requestId: c.get('requestId') }, 201);
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/login', async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, requestId: c.get('requestId') }, 401);
  const sql = createDatabase(c.env);
  try {
    const identity = `${requestIp(c.req.raw)}:${parsed.data.email}`;
    const limit = await checkRateLimit(sql, 'login', identity, 5, 900);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many login attempts' }, requestId: c.get('requestId') }, 429);
    }
    const users = await sql<{ id: string; email: string; password_valid: boolean; role: string; status: string }[]>`
      SELECT id, email, role, status,
        password_hash IS NOT NULL AND password_hash = crypt(${parsed.data.password}, password_hash) AS password_valid
      FROM users
      WHERE email = ${parsed.data.email}
      LIMIT 1
    `;
    const user = users[0];
    if (!user || !user.password_valid || user.status !== 'active') return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, requestId: c.get('requestId') }, 401);
    await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;
    const csrfToken = await createSession(c, user.id);
    return c.json({ data: { user: { id: user.id, email: user.email, role: user.role }, csrf_token: csrfToken }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/logout', async (c) => {
  const session = c.get('session');
  if (session && !timingSafeEqual(c.req.header('X-CSRF-Token'), session.csrfToken)) return c.json({ error: { code: 'CSRF_INVALID', message: 'Security token is missing or invalid' }, requestId: c.get('requestId') }, 403);
  if (session) {
    const sql = createDatabase(c.env);
    try { await sql`DELETE FROM sessions WHERE id = ${session.id}`; } finally { await closeDatabase(sql); }
  }
  c.header('Set-Cookie', clearSessionCookie(secureCookie(c.env)));
  return c.json({ data: { success: true }, requestId: c.get('requestId') });
});

router.post('/password-reset/request', async (c) => {
  const input = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ data: { success: true }, requestId: c.get('requestId') });
  const sql = createDatabase(c.env);
  try {
    const limit = await checkRateLimit(sql, 'password-reset', `${requestIp(c.req.raw)}:${input.data.email}`, 3, 3600);
    if (limit.allowed) {
      const users = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${input.data.email} AND status = 'active' LIMIT 1`;
      if (users[0]) {
        const token = randomToken();
        const tokenHash = await sha256(token);
        await sql`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (${crypto.randomUUID()}, ${users[0].id}, ${tokenHash}, ${new Date(Date.now() + 30 * 60 * 1000)})`;
        if (c.env.RESEND_API_KEY) {
          const resetUrl = `${c.env.PASSWORD_RESET_URL}?token=${encodeURIComponent(token)}`;
          c.executionCtx.waitUntil(fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: c.env.EMAIL_FROM, to: [input.data.email], subject: 'Reset your JBA GreenGold Orchard password', html: `<p>A password reset was requested for your account.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes.</p>` }),
          }));
        }
      }
    }
    return c.json({ data: { success: true }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/password-reset/confirm', async (c) => {
  const parsed = resetSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_RESET', message: 'The reset link is invalid or expired' }, requestId: c.get('requestId') }, 422);
  const sql = createDatabase(c.env);
  try {
    const tokenHash = await sha256(parsed.data.resetToken);
    const tokens = await sql<{ id: string; user_id: string }[]>`SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now() LIMIT 1`;
    const token = tokens[0];
    if (!token) return c.json({ error: { code: 'INVALID_RESET', message: 'The reset link is invalid or expired' }, requestId: c.get('requestId') }, 422);
    await sql.begin(async (transaction) => {
      await transaction`UPDATE users SET password_hash = crypt(${parsed.data.newPassword}, gen_salt('bf', 12)), password_salt = NULL, updated_at = now() WHERE id = ${token.user_id}`;
      await transaction`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${token.id}`;
      await transaction`DELETE FROM sessions WHERE user_id = ${token.user_id}`;
    });
    return c.json({ data: { success: true }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/verify-email', async (c) => {
  const input = z.object({ token: z.string().min(32).max(256) }).safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { code: 'INVALID_TOKEN', message: 'Verification link is invalid or expired' }, requestId: c.get('requestId') }, 422);
  const sql = createDatabase(c.env);
  try {
    const tokenHash = await sha256(input.data.token);
    const tokens = await sql<{ id: string; user_id: string }[]>`
      SELECT id, user_id FROM email_verification_tokens
      WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
      LIMIT 1
    `;
    const token = tokens[0];
    if (!token) return c.json({ error: { code: 'INVALID_TOKEN', message: 'Verification link is invalid or expired' }, requestId: c.get('requestId') }, 422);
    await sql.begin(async (transaction) => {
      await transaction`UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = ${token.user_id}`;
      await transaction`UPDATE email_verification_tokens SET used_at = now() WHERE id = ${token.id}`;
    });
    return c.json({ data: { success: true }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

// Resend verification email for the currently-authenticated user (if not yet verified)
router.post('/verify-email/resend', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, requestId: c.get('requestId') }, 401);
  const sql = createDatabase(c.env);
  try {
    const users = await sql<{ email_verified_at: Date | null }[]>`
      SELECT email_verified_at FROM users WHERE id = ${user.id} LIMIT 1
    `;
    if (users[0]?.email_verified_at) return c.json({ data: { success: true }, requestId: c.get('requestId') });
    const limit = await checkRateLimit(sql, 'verify-email-resend', user.id, 3, 3600);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many resend attempts' }, requestId: c.get('requestId') }, 429);
    }
    // Invalidate old tokens
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${user.id} AND used_at IS NULL`;
    const verifyToken = randomToken();
    const verifyTokenHash = await sha256(verifyToken);
    await sql`
      INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
      VALUES (${crypto.randomUUID()}, ${user.id}, ${verifyTokenHash}, ${new Date(Date.now() + 24 * 60 * 60 * 1000)})
    `;
    sendVerificationEmail(c.env, c.executionCtx, user.email, verifyToken);
    return c.json({ data: { success: true }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

export default router;
