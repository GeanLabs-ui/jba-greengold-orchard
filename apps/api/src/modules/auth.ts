import { Hono, type Context } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import type { Role } from 'mango-farm-authorization';
import { closeDatabase, createDatabase } from '../db.js';
import { requireCsrf, requirePermission, type AppVariables } from '../middleware/auth.js';
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
const googleCredentialSchema = z.object({ credential: z.string().min(100).max(8192) });
const googleClaimsSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().trim().toLowerCase().email().max(254),
  email_verified: z.literal(true),
  name: z.string().trim().min(1).max(200).optional(),
});
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const staffRoles = ['admin', 'farm_manager', 'farm_supervisor', 'inventory_officer', 'quality_officer', 'finance_officer', 'hr_officer', 'sales_officer', 'logistics_officer', 'content_editor', 'auditor'] as const;
const staffInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(1).max(200).optional(),
  role: z.enum(staffRoles),
});
const acceptStaffInvitationSchema = z.object({
  token: z.string().min(32).max(256),
  credential: z.string().min(100).max(8192),
});

type GoogleClaims = z.infer<typeof googleClaimsSchema>;

function bootstrapAdminEmails(env: Env): Set<string> {
  return new Set((env.BOOTSTRAP_ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

async function verifyGoogleCredential(env: Env, credential: string): Promise<GoogleClaims | null> {
  if (!env.GOOGLE_CLIENT_ID) return null;
  try {
    const verified = await jwtVerify(credential, googleJwks, {
      algorithms: ['RS256'],
      audience: env.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });
    return googleClaimsSchema.parse(verified.payload);
  } catch {
    return null;
  }
}

async function deliverStaffInvitation(env: Env, email: string, fullName: string | undefined, token: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const acceptUrl = `${env.PASSWORD_RESET_URL.replace('/reset-password', '/accept-staff-invite')}?token=${encodeURIComponent(token)}`;
  const recipient = fullName ? ` ${escapeHtml(fullName)}` : '';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: 'Set up your JBA GreenGold Orchard staff account',
      html: `<p>Hello${recipient},</p><p>You have been invited to the JBA GreenGold Orchard staff workspace.</p><p><a href="${acceptUrl}">Set up your account with Google</a></p><p>For your security, open this link and sign in with <strong>${escapeHtml(email)}</strong>. It expires in 24 hours and can be used once.</p>`,
    }),
  });
  return response.ok;
}

function googleAccountUnavailable(c: AppContext, reason: string) {
  console.info(JSON.stringify({ event: 'google_sign_in_rejected', requestId: c.get('requestId'), reason }));
  return c.json({ error: { code: 'ACCOUNT_EXISTS', message: 'Sign-in is not available for this Google account.' }, requestId: c.get('requestId') }, 409);
}

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

router.post('/google', async (c) => {
  const input = googleCredentialSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success || !c.env.GOOGLE_CLIENT_ID) {
    return c.json({ error: { code: 'GOOGLE_AUTH_UNAVAILABLE', message: 'Google sign-in is not available' }, requestId: c.get('requestId') }, 503);
  }

  const sql = createDatabase(c.env);
  try {
    const limit = await checkRateLimit(sql, 'google-login', requestIp(c.req.raw), 10, 900);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many Google sign-in attempts' }, requestId: c.get('requestId') }, 429);
    }

    const claims = await verifyGoogleCredential(c.env, input.data.credential);
    if (!claims) {
      return c.json({ error: { code: 'INVALID_GOOGLE_CREDENTIAL', message: 'Google sign-in could not be verified' }, requestId: c.get('requestId') }, 401);
    }

    type GoogleUser = { id: string; email: string; role: string; status: string; google_subject: string | null };
    const findGoogleUser = async (): Promise<GoogleUser | undefined> => {
      const users = await sql<GoogleUser[]>`
        SELECT id, email, role, status, google_subject
        FROM users
        WHERE google_subject = ${claims.sub} OR email = ${claims.email}
        ORDER BY CASE WHEN google_subject = ${claims.sub} THEN 0 ELSE 1 END
        LIMIT 1
      `;
      return users[0];
    };
    let user = await findGoogleUser();
    const isBootstrapAdmin = bootstrapAdminEmails(c.env).has(claims.email);

    if (isBootstrapAdmin) {
      if (user?.google_subject && user.google_subject !== claims.sub) {
        return googleAccountUnavailable(c, 'bootstrap_email_linked_to_another_google_identity');
      }
      if (!user) {
        const userId = crypto.randomUUID();
        await sql`
          INSERT INTO users (id, email, google_subject, full_name, role, status, email_verified_at, last_login_at)
          VALUES (${userId}, ${claims.email}, ${claims.sub}, ${claims.name || claims.email.split('@')[0]}, 'super_admin', 'active', now(), now())
        `;
      } else {
        await sql`
          UPDATE users
          SET google_subject = ${claims.sub}, full_name = COALESCE(full_name, ${claims.name || claims.email.split('@')[0]}),
              role = 'super_admin', status = 'active', email_verified_at = COALESCE(email_verified_at, now()), updated_at = now()
          WHERE id = ${user.id}
        `;
      }
      user = await findGoogleUser();
      if (!user) return googleAccountUnavailable(c, 'bootstrap_account_creation_failed');
    }

    if (user && user.google_subject !== claims.sub) {
      return googleAccountUnavailable(c, 'email_account_linked_to_another_google_identity');
    }

    if (!user) {
      const userId = crypto.randomUUID();
      const inserted = await sql<GoogleUser[]>`
        INSERT INTO users (id, email, google_subject, full_name, role, status, email_verified_at, last_login_at)
        VALUES (${userId}, ${claims.email}, ${claims.sub}, ${claims.name || claims.email.split('@')[0]}, 'customer', 'active', now(), now())
        ON CONFLICT DO NOTHING
        RETURNING id, email, role, status, google_subject
      `;
      user = inserted[0] || await findGoogleUser();
      if (!user) {
        return googleAccountUnavailable(c, 'google_identity_conflict');
      }
    }

    if (user.google_subject !== claims.sub) {
      return googleAccountUnavailable(c, 'email_account_linked_to_another_google_identity');
    }

    if (user.status !== 'active') {
      return c.json({ error: { code: 'ACCOUNT_DISABLED', message: 'This account is not active' }, requestId: c.get('requestId') }, 403);
    }

    await sql`UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = ${user.id}`;
    const csrfToken = await createSession(c, user.id);
    return c.json({ data: { user: { id: user.id, email: user.email, role: user.role }, csrf_token: csrfToken }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.get('/staff-invitations', requirePermission('users.invite'), async (c) => {
  const sql = createDatabase(c.env);
  try {
    const invitations = await sql<{
      id: string; email: string; full_name: string | null; role: Role; expires_at: Date; accepted_at: Date | null; revoked_at: Date | null; created_at: Date;
    }[]>`
      SELECT id, email, full_name, role, expires_at, accepted_at, revoked_at, created_at
      FROM staff_invitations
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return c.json({ data: { invitations }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/staff-invitations', requirePermission('users.invite'), requireCsrf(), async (c) => {
  const parsed = staffInvitationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid staff email, name, and role' }, requestId: c.get('requestId') }, 422);
  if (!c.env.RESEND_API_KEY) return c.json({ error: { code: 'EMAIL_UNAVAILABLE', message: 'Staff invitations are unavailable until the email service is configured' }, requestId: c.get('requestId') }, 503);

  const sql = createDatabase(c.env);
  const inviter = c.get('user')!;
  try {
    const limit = await checkRateLimit(sql, 'staff-invite', inviter.id, 20, 3600);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many staff invitations' }, requestId: c.get('requestId') }, 429);
    }
    await sql`
      UPDATE staff_invitations SET revoked_at = now()
      WHERE email = ${parsed.data.email} AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at <= now()
    `;
    const pending = await sql<{ id: string }[]>`
      SELECT id FROM staff_invitations
      WHERE email = ${parsed.data.email} AND accepted_at IS NULL AND revoked_at IS NULL
      LIMIT 1
    `;
    if (pending[0]) return c.json({ error: { code: 'INVITATION_PENDING', message: 'An active invitation already exists for this email' }, requestId: c.get('requestId') }, 409);

    const invitationId = crypto.randomUUID();
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO staff_invitations (id, email, full_name, role, token_hash, invited_by, expires_at)
      VALUES (${invitationId}, ${parsed.data.email}, ${parsed.data.fullName || null}, ${parsed.data.role}, ${tokenHash}, ${inviter.id}, ${expiresAt})
    `;
    await sql`
      INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${inviter.id}, 'staff_invited', 'staff_invitations', ${invitationId}, ${sql.json({ email: parsed.data.email, role: parsed.data.role })}, ${requestIp(c.req.raw)})
    `;
    const delivered = await deliverStaffInvitation(c.env, parsed.data.email, parsed.data.fullName, token);
    if (!delivered) return c.json({ error: { code: 'EMAIL_DELIVERY_FAILED', message: 'The invitation was saved but the email could not be delivered. Try again later.' }, requestId: c.get('requestId') }, 502);
    return c.json({ data: { invitation: { id: invitationId, email: parsed.data.email, role: parsed.data.role, expiresAt } }, requestId: c.get('requestId') }, 201);
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/staff-invitations/accept', async (c) => {
  const parsed = acceptStaffInvitationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INVITATION', message: 'This staff invitation is invalid or expired' }, requestId: c.get('requestId') }, 422);
  const claims = await verifyGoogleCredential(c.env, parsed.data.credential);
  if (!claims) return c.json({ error: { code: 'INVALID_GOOGLE_CREDENTIAL', message: 'Google sign-in could not be verified' }, requestId: c.get('requestId') }, 401);

  const sql = createDatabase(c.env);
  try {
    const limit = await checkRateLimit(sql, 'staff-invite-accept', requestIp(c.req.raw), 10, 900);
    if (!limit.allowed) {
      c.header('Retry-After', String(limit.retryAfter));
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many invitation attempts' }, requestId: c.get('requestId') }, 429);
    }
    const tokenHash = await sha256(parsed.data.token);
    const result = await sql.begin(async (transaction) => {
      const invitations = await transaction<{
        id: string; email: string; full_name: string | null; role: Role; invited_by: string;
      }[]>`
        SELECT id, email, full_name, role, invited_by
        FROM staff_invitations
        WHERE token_hash = ${tokenHash} AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
        FOR UPDATE
      `;
      const invitation = invitations[0];
      if (!invitation || invitation.email !== claims.email) return null;
      const existingUsers = await transaction<{ id: string; google_subject: string | null }[]>`
        SELECT id, google_subject FROM users WHERE email = ${claims.email} LIMIT 1 FOR UPDATE
      `;
      const existingUser = existingUsers[0];
      if (existingUser?.google_subject && existingUser.google_subject !== claims.sub) return { conflict: true };
      const userId = existingUser?.id || crypto.randomUUID();
      if (existingUser) {
        await transaction`
          UPDATE users
          SET google_subject = ${claims.sub}, full_name = COALESCE(${invitation.full_name}, ${claims.name || claims.email.split('@')[0]}),
              role = ${invitation.role}, status = 'active', email_verified_at = now(), last_login_at = now(), updated_at = now()
          WHERE id = ${userId}
        `;
      } else {
        await transaction`
          INSERT INTO users (id, email, google_subject, full_name, role, status, email_verified_at, last_login_at)
          VALUES (${userId}, ${claims.email}, ${claims.sub}, ${invitation.full_name || claims.name || claims.email.split('@')[0]}, ${invitation.role}, 'active', now(), now())
        `;
      }
      await transaction`UPDATE staff_invitations SET accepted_at = now() WHERE id = ${invitation.id}`;
      await transaction`DELETE FROM sessions WHERE user_id = ${userId}`;
      await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${userId}, 'staff_invitation_accepted', 'staff_invitations', ${invitation.id}, ${sql.json({ email: claims.email, role: invitation.role, invitedBy: invitation.invited_by })}, ${requestIp(c.req.raw)})
      `;
      return { userId, role: invitation.role };
    });
    if (!result) return c.json({ error: { code: 'INVALID_INVITATION', message: 'This invitation is invalid, expired, or does not match this Google email' }, requestId: c.get('requestId') }, 422);
    if ('conflict' in result) return googleAccountUnavailable(c, 'staff_invitation_email_linked_to_another_google_identity');
    const csrfToken = await createSession(c, result.userId);
    return c.json({ data: { user: { id: result.userId, email: claims.email, role: result.role }, csrf_token: csrfToken }, requestId: c.get('requestId') });
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
