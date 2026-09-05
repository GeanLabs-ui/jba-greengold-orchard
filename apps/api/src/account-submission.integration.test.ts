import { describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { Hono } from 'hono';
import { createDatabase } from './db.js';
import { loadSession, type AppVariables } from './middleware/auth.js';
import auth from './modules/auth.js';
import account from './modules/account.js';
import { LOCAL_SESSION_COOKIE, randomToken, sha256 } from './security.js';

vi.mock('./db.js', () => ({ createDatabase: vi.fn(), closeDatabase: vi.fn() }));
declare const process: { env: Record<string, string | undefined> };

// Real account handlers + browser API client + PostgreSQL, with private storage
// held in memory. All synthetic account, session, file, and audit rows roll back.
describe.skipIf(!process.env.AUTH_DATABASE_TEST)('account submission after session rotation', () => {
  it('uploads both documents once and persists a pending verification after stale-token recovery', async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '54329') throw new Error('Local test database required');
    const db = postgres(url.toString(), { max: 1, prepare: false });
    const rollback = new Error('ROLLBACK_TEST_FIXTURES');
    let verified = false;
    try {
      await db.begin(async tx => {
        Object.assign(tx, { begin: tx.savepoint });
        vi.mocked(createDatabase).mockReturnValue(tx as never);
        const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
        app.use('*', loadSession());
        app.route('/auth', auth);
        app.route('/account', account);
        const storedFiles = new Map<string, ArrayBuffer>();
        const primary = {
          put: vi.fn(async (key: string, body: ArrayBuffer) => { storedFiles.set(key, body); }),
          get: vi.fn(async (key: string) => storedFiles.has(key) ? { body: storedFiles.get(key) } : null),
          delete: vi.fn(async (key: string) => { storedFiles.delete(key); }),
        };
        const backup = { put: vi.fn(async () => ({})), get: vi.fn(async () => null), delete: vi.fn(async () => {}) };
        const env = { APP_ENV: 'local', DATABASE_URL: url.toString(), PRIVATE_FILES: primary, PRIVATE_FILES_BACKUP: backup } as unknown as Env;
        const userId = crypto.randomUUID();
        await tx`INSERT INTO users (id, email, full_name, role, status, email_verified_at) VALUES (${userId}, ${`${userId}@example.test`}, 'Synthetic Verification Customer', 'customer', 'active', now())`;
        const newSession = async (sessionUserId = userId) => {
          const token = randomToken();
          const csrf = randomToken();
          await tx`INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at) VALUES (${crypto.randomUUID()}, ${sessionUserId}, ${await sha256(token)}, ${csrf}, now() + interval '1 hour')`;
          return { cookie: `${LOCAL_SESSION_COOKIE}=${token}`, csrf };
        };
        let customerSession = await newSession();
        let cookie = customerSession.cookie;
        const attempts: { path: string; status: number }[] = [];
        vi.stubGlobal('fetch', async (input: string, options: RequestInit = {}) => {
          const path = input.replace(/^\/api\/v1/, '');
          const headers = new Headers(options.headers);
          headers.set('Cookie', cookie);
          const response = await app.request(path, { ...options, headers }, env);
          attempts.push({ path, status: response.status });
          return response;
        });
        // @ts-expect-error The frontend JavaScript client is compiled by Vitest, outside the API TypeScript project.
        const { base44 } = await import('../../web/src/api/base44Client.js');
        await base44.auth.me();
        customerSession = await newSession(); // The cookie changed while the form stayed open.
        cookie = customerSession.cookie;
        const fixture = '%PDF-1.4\n% Synthetic verification regression fixture\n%%EOF';
        const front = await base44.account.upload(new File([fixture], 'synthetic-front.pdf', { type: 'application/pdf' }), 'document');
        const back = await base44.account.upload(new File([fixture], 'synthetic-back.pdf', { type: 'application/pdf' }), 'document');
        expect(attempts.filter(({ path }) => path === '/account/files').map(({ status }) => status)).toEqual([403, 201, 201]);
        expect(primary.put).toHaveBeenCalledTimes(2);
        expect(backup.put).toHaveBeenCalledTimes(2);

        customerSession = await newSession(); // Also exercise recovery on the final JSON POST.
        cookie = customerSession.cookie;
        const identity = { legalName: 'Synthetic Verification Customer', dateOfBirth: '1990-01-01', country: 'GH', documentType: 'national_id', documentNumber: 'GHA-000000000-0' };
        const saved = await base44.account.submit({ identity, documentIds: [front.id, back.id], consent: true });
        expect(saved.status).toBe('pending');
        expect(attempts.filter(({ path }) => path === '/account/verification').map(({ status }) => status)).toEqual([403, 201]);
        const reloaded = await base44.account.get();
        expect(reloaded.verification).toMatchObject({ id: saved.id, status: 'pending', identity });
        const records = await tx`SELECT document_ids FROM account_verifications WHERE user_id = ${userId}`;
        expect(records).toHaveLength(1);
        expect(records[0].document_ids).toEqual([front.id, back.id]);
        expect(await tx`SELECT id FROM file_objects WHERE owner_user_id = ${userId}`).toHaveLength(2);
        expect(await tx`SELECT id FROM audit_events WHERE user_id = ${userId} AND action = 'identity_submitted'`).toHaveLength(1);

        const adminId = crypto.randomUUID();
        await tx`INSERT INTO users (id, email, full_name, role, status, email_verified_at) VALUES (${adminId}, ${`${adminId}@example.test`}, 'Synthetic Review Administrator', 'admin', 'active', now())`;
        const adminSession = await newSession(adminId);
        const adminHeaders = { Cookie: adminSession.cookie };
        const queueResponse = await app.request('/account/admin/reviews', { headers: adminHeaders }, env);
        expect(queueResponse.status).toBe(200);
        const queue = (await queueResponse.json() as { data: { verifications: Array<Record<string, unknown>> } }).data.verifications;
        const submittedReview = queue.find((review) => review.id === saved.id);
        expect(submittedReview).toMatchObject({ id: saved.id, email: `${userId}@example.test`, documents: [
          { id: front.id, name: 'synthetic-front.pdf', contentType: 'application/pdf' },
          { id: back.id, name: 'synthetic-back.pdf', contentType: 'application/pdf' },
        ] });

        const preview = await app.request(`/account/files/${front.id}`, { headers: adminHeaders }, env);
        expect(preview.status).toBe(200);
        expect(preview.headers.get('content-type')).toContain('application/pdf');
        expect(preview.headers.get('content-disposition')).toContain('inline');
        expect(await preview.text()).toContain('Synthetic verification regression fixture');

        const reviewNote = 'The document number is unclear. Upload a sharper image and confirm the number.';
        const rejected = await app.request(`/account/admin/reviews/${saved.id}`, {
          method: 'POST',
          headers: { ...adminHeaders, 'Content-Type': 'application/json', 'X-CSRF-Token': adminSession.csrf },
          body: JSON.stringify({ kind: 'verification', decision: 'reject', note: reviewNote, confirmed: true }),
        }, env);
        expect(rejected.status).toBe(200);
        const customerAccount = await base44.account.get();
        expect(customerAccount.verification).toMatchObject({ status: 'rejected', review_note: reviewNote });
        expect(await tx`SELECT id FROM audit_events WHERE user_id = ${adminId} AND action = 'identity_verification_reject'`).toHaveLength(1);
        verified = true;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      vi.unstubAllGlobals();
      await db.end();
    }
    expect(verified).toBe(true);
  }, 30000);
});
