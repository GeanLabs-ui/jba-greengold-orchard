import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { createDatabase, closeDatabase } from '../db.js';
import { requireAuth, requireCsrf, requireRole, type AppVariables } from '../middleware/auth.js';
import { checkRateLimit } from '../rate-limit.js';
import { identitySchema, validAccountFile, type Identity } from './account-policy.js';
import { stripeIdentityEnabled, stripeIdentityRequest, verifiedSessionMatches } from './identity-provider.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
type Verification = { id: string; user_id: string; identity: Identity; status: string; provider: string; provider_session_id: string | null; document_ids: string[]; review_note: string | null };
router.use('*', requireAuth(), requireCsrf());
router.use('*', async (c, next) => { c.header('Cache-Control', 'private, no-store'); await next(); });
router.use('*', bodyLimit({ maxSize: 7 * 1024 * 1024, onError: (c) => c.json({ error: { message: 'Upload one file up to 5 MB.' } }, 413) }));

router.get('/', async (c) => {
  const sql = createDatabase(c.env);
  try {
    const [profile] = await sql`SELECT photo_file_id FROM account_profiles WHERE user_id = ${c.get('user')!.id}`;
    const [verification] = await sql`SELECT id, identity, status, provider, review_note, verified_at, created_at FROM account_verifications WHERE user_id = ${c.get('user')!.id} ORDER BY created_at DESC LIMIT 1`;
    const [changeRequest] = await sql`SELECT id, reason, status, review_note FROM account_change_requests WHERE user_id = ${c.get('user')!.id} ORDER BY created_at DESC LIMIT 1`;
    return c.json({ data: { photoFileId: profile?.photo_file_id || null, verification: verification || null, changeRequest: changeRequest || null, internationalEnabled: stripeIdentityEnabled(c.env), ghanaAutomaticEnabled: false } });
  } finally { await closeDatabase(sql); }
});

router.post('/files', async (c) => {
  const sql = createDatabase(c.env);
  try {
    const limit = await checkRateLimit(sql, 'account-upload', c.get('user')!.id, 20, 3600);
    if (!limit.allowed) return c.json({ error: { message: 'Upload limit reached. Try again later.' } }, 429);
    const form = await c.req.formData();
    const file = form.get('file');
    const purpose = form.get('purpose');
    const photo = purpose === 'photo';
    if (!['photo', 'document'].includes(String(purpose)) || !(file instanceof File) || file.size <= 0 || file.size > (photo ? 2 : 5) * 1024 * 1024) return c.json({ error: { message: 'Choose a photo up to 2 MB or a document up to 5 MB.' } }, 422);
    const body = await file.arrayBuffer();
    if (!validAccountFile(file.type, new Uint8Array(body).slice(0, 12), photo)) return c.json({ error: { message: 'Choose a valid JPG, PNG, WebP image or PDF document.' } }, 422);
    const id = crypto.randomUUID();
    const key = `account/${c.get('user')!.id}/${purpose}/${id}`;
    try {
      const metadata = { httpMetadata: { contentType: 'application/octet-stream', contentDisposition: 'attachment' } };
      const stored = await Promise.allSettled([c.env.PRIVATE_FILES.put(key, body, metadata), c.env.PRIVATE_FILES_BACKUP.put(key, body, metadata)]);
      if (stored.some((result) => result.status === 'rejected')) throw new Error('Private upload storage is unavailable.');
      await sql.begin(async (tx) => {
        await tx`INSERT INTO file_objects (id, object_key, original_name, content_type, size_bytes, owner_user_id, record_id, status) VALUES (${id}, ${key}, ${file.name.slice(0, 255)}, ${file.type}, ${file.size}, ${c.get('user')!.id}, ${`account-${purpose}`}, 'active')`;
        if (photo) await tx`INSERT INTO account_profiles (user_id, photo_file_id) VALUES (${c.get('user')!.id}, ${id}) ON CONFLICT (user_id) DO UPDATE SET photo_file_id = EXCLUDED.photo_file_id, updated_at = now()`;
      });
    } catch (error) {
      await Promise.allSettled([c.env.PRIVATE_FILES.delete(key), c.env.PRIVATE_FILES_BACKUP.delete(key)]);
      throw error;
    }
    return c.json({ data: { id } }, 201);
  } finally { await closeDatabase(sql); }
});

router.get('/files/:id', async (c) => {
  const sql = createDatabase(c.env);
  try {
    const [file] = await sql`SELECT object_key, original_name, content_type, owner_user_id, record_id FROM file_objects WHERE id = ${c.req.param('id')} AND status = 'active' AND record_id IN ('account-photo', 'account-document')`;
    const user = c.get('user')!;
    if (!file || (file.owner_user_id !== user.id && !['super_admin', 'admin'].includes(user.role))) return c.json({ error: { message: 'File not found.' } }, 404);
    const object = await c.env.PRIVATE_FILES.get(file.object_key) || await c.env.PRIVATE_FILES_BACKUP.get(file.object_key);
    if (!object) return c.json({ error: { message: 'File not found.' } }, 404);
    const filename = encodeURIComponent(file.original_name || (file.record_id === 'account-photo' ? 'profile-photo' : 'identity-document'));
    return new Response(object.body, { headers: { 'Content-Type': file.content_type, 'Content-Disposition': `inline; filename*=UTF-8''${filename}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } finally { await closeDatabase(sql); }
});

router.post('/verification', async (c) => {
  const input = z.object({ identity: identitySchema, documentIds: z.array(z.string().uuid()).max(3), consent: z.literal(true) }).strict().safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { message: input.error.issues[0]?.message || 'Check the identity details and consent.' } }, 422);
  const { identity, documentIds } = input.data;
  const international = identity.country !== 'GH' && stripeIdentityEnabled(c.env);
  const requiredDocuments = identity.documentType === 'passport' ? 1 : 2;
  if (!international && new Set(documentIds).size < requiredDocuments) return c.json({ error: { message: identity.documentType === 'passport' ? 'Upload the passport photo page.' : 'Upload the front and back of your identity document.' } }, 422);
  const userId = c.get('user')!.id;
  const id = crypto.randomUUID();
  const sql = createDatabase(c.env);
  try {
    const limit = await checkRateLimit(sql, 'account-verification', userId, 5, 3600);
    if (!limit.allowed) return c.json({ error: { message: 'Too many attempts. Try again later.' } }, 429);
    const result = await sql.begin(async (tx) => {
      await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const [active] = await tx`SELECT id FROM account_verifications WHERE user_id = ${userId} AND status IN ('pending', 'verified')`;
      if (active) return 'locked';
      if (!international) {
        const files = await tx`SELECT id FROM file_objects WHERE id IN ${sql(documentIds)} AND owner_user_id = ${userId} AND record_id = 'account-document' AND status = 'active'`;
        if (files.length !== documentIds.length) return 'files';
      }
      await tx`INSERT INTO account_verifications (id, user_id, identity, status, provider, document_ids) VALUES (${id}, ${userId}, ${sql.json(identity)}, 'pending', ${international ? 'stripe_identity' : identity.country === 'GH' ? 'hubtel' : 'admin_review'}, ${sql.json(international ? [] : documentIds)})`;
      await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id) VALUES (${crypto.randomUUID()}, ${userId}, 'identity_submitted', 'account_verifications', ${id})`;
      return 'ok';
    });
    if (result !== 'ok') return c.json({ error: { message: result === 'locked' ? 'Identity details are locked. Request a change from your account page.' : 'Upload documents belonging to your account.' } }, result === 'locked' ? 409 : 422);
    // Session creation is retryable with the persisted verification ID as its idempotency key.
    return c.json({ data: { id, status: 'pending', hosted: international } }, 201);
  } finally { await closeDatabase(sql); }
});

router.post('/verification/refresh', async (c) => {
  const sql = createDatabase(c.env);
  const userId = c.get('user')!.id;
  try {
    const limit = await checkRateLimit(sql, 'identity-refresh', userId, 30, 3600);
    if (!limit.allowed) return c.json({ error: { message: 'Please wait before checking again.' } }, 429);
    const [row] = await sql<Verification[]>`SELECT * FROM account_verifications WHERE user_id = ${userId} AND status = 'pending' ORDER BY created_at DESC LIMIT 1`;
    if (!row || row.provider !== 'stripe_identity') return c.json({ data: { status: row?.status || 'unchanged' } });
    let session;
    try {
      session = await stripeIdentityRequest(c.env, row.provider_session_id || undefined, row.provider_session_id ? undefined : { id: row.id, userId, identity: row.identity });
    } catch { return c.json({ error: { message: 'Verification is temporarily unavailable. Your submission is saved; try again later.' } }, 503); }
    if (session.metadata?.verification_id !== row.id || session.metadata?.user_id !== userId) return c.json({ error: { message: 'The verification session could not be matched.' } }, 502);
    await sql`UPDATE account_verifications SET provider_session_id = ${session.id} WHERE id = ${row.id} AND status = 'pending'`;
    if (verifiedSessionMatches(session, row.id, userId, row.identity)) {
      await sql.begin(async (tx) => {
        await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        const updated = await tx`UPDATE account_verifications SET status = 'verified', verified_at = now(), updated_at = now() WHERE id = ${row.id} AND status = 'pending' RETURNING id`;
        if (updated.length) {
          await tx`UPDATE users SET full_name = ${row.identity.legalName}, updated_at = now() WHERE id = ${userId}`;
          await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id) VALUES (${crypto.randomUUID()}, ${userId}, 'identity_provider_verified', 'account_verifications', ${row.id})`;
        }
      });
      return c.json({ data: { status: 'verified' } });
    }
    if (session.status === 'verified' || session.status === 'canceled') {
      const note = session.livemode === false ? 'Test verification cannot verify a real account.' : 'The document details could not be matched. Check your details and submit again.';
      await sql`UPDATE account_verifications SET status = 'rejected', review_note = ${note}, updated_at = now() WHERE id = ${row.id} AND status = 'pending'`;
      return c.json({ data: { status: 'rejected' } });
    }
    const url = session.url ? new URL(session.url) : null;
    return c.json({ data: { status: 'pending', url: url?.protocol === 'https:' && url.hostname === 'verify.stripe.com' ? url.href : null } });
  } finally { await closeDatabase(sql); }
});

router.post('/change-requests', async (c) => {
  const input = z.object({ reason: z.string().trim().min(10).max(1000) }).strict().safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { message: 'Explain the requested change in 10–1,000 characters.' } }, 422);
  const sql = createDatabase(c.env);
  try {
    const result = await sql.begin(async (tx) => {
      const userId = c.get('user')!.id;
      await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const [verification] = await tx`SELECT id FROM account_verifications WHERE user_id = ${userId} AND status IN ('pending', 'verified')`;
      const [pending] = await tx`SELECT id FROM account_change_requests WHERE user_id = ${userId} AND status = 'pending'`;
      if (!verification || pending) return false;
      const id = crypto.randomUUID();
      await tx`INSERT INTO account_change_requests (id, user_id, verification_id, reason) VALUES (${id}, ${userId}, ${verification.id}, ${input.data.reason})`;
      await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id) VALUES (${crypto.randomUUID()}, ${userId}, 'identity_change_requested', 'account_change_requests', ${id})`;
      return true;
    });
    return result ? c.json({ data: { success: true } }, 201) : c.json({ error: { message: 'A request is already pending, or your details are already editable.' } }, 409);
  } finally { await closeDatabase(sql); }
});

router.get('/admin/reviews', requireRole('super_admin', 'admin'), async (c) => {
  const sql = createDatabase(c.env);
  try {
    const verifications = await sql`SELECT v.id, v.user_id, u.email, v.identity, v.status, v.provider, v.document_ids, v.created_at FROM account_verifications v JOIN users u ON u.id = v.user_id WHERE v.status = 'pending' ORDER BY v.created_at LIMIT 100`;
    const changes = await sql`SELECT r.*, u.email FROM account_change_requests r JOIN users u ON u.id = r.user_id WHERE r.status = 'pending' ORDER BY r.created_at LIMIT 100`;
    const documentIds = [...new Set(verifications.flatMap((verification) => Array.isArray(verification.document_ids) ? verification.document_ids : []))];
    const documents = documentIds.length ? await sql`SELECT id, original_name, content_type, size_bytes, owner_user_id FROM file_objects WHERE id IN ${sql(documentIds)} AND record_id = 'account-document' AND status = 'active'` : [];
    const documentsById = new Map(documents.map((document) => [document.id, document]));
    const queue = verifications.map((verification) => ({
      ...verification,
      documents: (Array.isArray(verification.document_ids) ? verification.document_ids : []).flatMap((id: string) => {
        const document = documentsById.get(id);
        if (!document || document.owner_user_id !== verification.user_id) return [];
        return [{ id: document.id, name: document.original_name, contentType: document.content_type, sizeBytes: document.size_bytes }];
      }),
    }));
    return c.json({ data: { verifications: queue, changes } });
  } finally { await closeDatabase(sql); }
});

router.post('/admin/reviews/:id', requireRole('super_admin', 'admin'), async (c) => {
  const input = z.object({ kind: z.enum(['verification', 'change']), decision: z.enum(['approve', 'reject']), note: z.string().trim().min(10).max(1000), confirmed: z.literal(true) }).strict().safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { message: 'Confirm your review and provide a reason or verification evidence reference.' } }, 422);
  const sql = createDatabase(c.env);
  try {
    const { kind, decision, note } = input.data;
    const result = await sql.begin(async (tx) => {
      // Always lock the account before its requests, matching customer updates and provider refreshes.
      const rows = kind === 'change' ? await tx`SELECT user_id FROM account_change_requests WHERE id = ${c.req.param('id')}` : await tx`SELECT user_id FROM account_verifications WHERE id = ${c.req.param('id')}`;
      if (!rows[0] || rows[0].user_id === c.get('user')!.id) return false;
      await tx`SELECT id FROM users WHERE id = ${rows[0].user_id} FOR UPDATE`;
      if (kind === 'change') {
        const [request] = await tx`SELECT * FROM account_change_requests WHERE id = ${c.req.param('id')} AND status = 'pending' FOR UPDATE`;
        if (!request) return false;
        await tx`UPDATE account_change_requests SET status = ${decision === 'approve' ? 'approved' : 'rejected'}, review_note = ${note}, reviewed_by = ${c.get('user')!.id}, reviewed_at = now() WHERE id = ${request.id}`;
        if (decision === 'approve') await tx`UPDATE account_verifications SET status = 'rejected', review_note = 'Change request approved. Submit your updated identity for verification.', updated_at = now() WHERE id = ${request.verification_id}`;
      } else {
        const [v] = await tx<Verification[]>`SELECT * FROM account_verifications WHERE id = ${c.req.param('id')} AND status = 'pending' FOR UPDATE`;
        if (!v || (decision === 'approve' && v.provider === 'stripe_identity')) return false;
        await tx`UPDATE account_verifications SET status = ${decision === 'approve' ? 'verified' : 'rejected'}, provider = ${decision === 'approve' ? 'admin_review' : v.provider}, review_note = ${note}, reviewed_by = ${c.get('user')!.id}, verified_at = ${decision === 'approve' ? new Date() : null}, updated_at = now() WHERE id = ${v.id}`;
        if (decision === 'approve') await tx`UPDATE users SET full_name = ${v.identity.legalName}, updated_at = now() WHERE id = ${v.user_id}`;
      }
      await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id) VALUES (${crypto.randomUUID()}, ${c.get('user')!.id}, ${`identity_${kind}_${decision}`}, ${kind === 'change' ? 'account_change_requests' : 'account_verifications'}, ${c.req.param('id')})`;
      return true;
    });
    return result ? c.json({ data: { success: true } }) : c.json({ error: { message: 'This review cannot be completed. Refresh the queue; self-approval and manual approval of Stripe sessions are not allowed.' } }, 409);
  } finally { await closeDatabase(sql); }
});
export default router;
