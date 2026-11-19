import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppVariables, AuthUser } from '../middleware/auth.js';

const state = vi.hoisted(() => ({ queries: [] as string[], exists: true, foreign: false, legacy: false, references: [] as {schema_name: string; table_name: string; column_name: string}[] }));
vi.mock('../db.js', () => {
  const sql = Object.assign((parts: TemplateStringsArray | string) => {
    if (typeof parts === 'string') return { identifier: parts };
    const query = parts.join('?'); state.queries.push(query);
    if (query.includes('FOR UPDATE')) return Promise.resolve(state.exists ? [{ id: 'record', name: 'Test farm', farm_code: 'QA-FARM', block_code: 'QA-BLOCK' }] : []);
    if (query.includes('FROM pg_constraint')) return Promise.resolve(state.references);
    if (query.includes('FROM entity_records er')) return Promise.resolve(state.legacy ? [{ found: 1 }] : []);
    if (query.startsWith('SELECT 1 FROM')) return Promise.resolve(state.foreign ? [{ found: 1 }] : []);
    return Promise.resolve([]);
  }, { json: (value: unknown) => value, begin: async (fn: (tx: unknown) => unknown) => fn(sql) });
  return { createDatabase: () => sql, closeDatabase: async () => {} };
});
import router from './farms.js';
const user: AuthUser = { id: 'staff', role: 'super_admin', full_name: 'Test', email: 'test@example.invalid', pageAccess: null, status: 'active', email_verified: true, organizationId: null };
function app(role: AuthUser['role'] | null) {
  const a = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  a.use('*', async (c, next) => { c.set('user', role ? { ...user, role } : null); c.set('session', role ? { id: 'session', csrfToken: 'token', expiresAt: new Date('2030-01-01') } : null); c.set('requestId', 'test'); await next(); });
  a.route('/', router); return a;
}
const remove = (kind = 'farms', confirmation = 'QA-FARM', role: AuthUser['role'] | null = 'super_admin', csrf = 'token') => app(role).request(`/${kind}/record`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ confirmation }) });
beforeEach(() => { state.queries = []; state.exists = true; state.foreign = false; state.legacy = false; state.references = []; });

describe('Permanent farm/block deletion', () => {
  it('requires sign-in, delete permission and CSRF before querying records', async () => {
    for (const kind of ['farms', 'blocks']) {
      expect((await remove(kind, 'code', null)).status).toBe(401);
      for (const role of ['customer', 'farm_manager', 'farm_supervisor', 'admin'] as const) expect((await remove(kind, 'code', role)).status).toBe(403);
      expect((await remove(kind, 'code', 'super_admin', 'wrong')).status).toBe(403);
    }
    expect(state.queries).toHaveLength(0);
  });
  it('requires exact code confirmation', async () => {
    expect((await remove('farms', '')).status).toBe(422);
    expect((await remove('farms', 'wrong')).status).toBe(422);
    expect(state.queries.some(query => query.includes('DELETE FROM'))).toBe(false);
  });
  it('returns 404 for a missing record', async () => {
    state.exists = false;
    expect((await remove()).status).toBe(404);
  });
  it('blocks deletion of farms with blocks, even when the FK cascades', async () => {
    state.references = [{ schema_name: 'public', table_name: 'farm_blocks', column_name: 'farm_id' }]; state.foreign = true;
    const response = await remove();
    expect(response.status).toBe(409);
    expect(await response.text()).toContain('blocks first');
    expect(state.queries.some(query => query.includes('DELETE FROM'))).toBe(false);
  });
  it('blocks deletion of blocks with operational relationships', async () => {
    state.references = [{ schema_name: 'public', table_name: 'yield_records', column_name: 'block_id' }]; state.foreign = true;
    expect((await remove('blocks', 'QA-BLOCK')).status).toBe(409);
    expect(state.queries.some(query => query.includes('DELETE FROM'))).toBe(false);
  });
  it('protects legacy JSON operations as well as relational records', async () => {
    state.legacy = true;
    expect((await remove('blocks', 'QA-BLOCK')).status).toBe(409);
    expect(state.queries.some(query => query.includes('LOCK TABLE entity_records'))).toBe(true);
    expect(state.queries.some(query => query.includes('DELETE FROM'))).toBe(false);
  });
  it.each([['farms', 'QA-FARM'], ['blocks', 'QA-BLOCK']])('deletes an unused %s record and audits it in one transaction', async (kind, code) => {
    state.references = [{ schema_name: 'public', table_name: kind === 'farms' ? 'farm_status_history' : 'block_crop_inventories', column_name: kind === 'farms' ? 'farm_id' : 'block_id' }];
    expect((await remove(kind, code)).status).toBe(200);
    expect(state.queries.some(query => query.includes('INSERT INTO audit_events'))).toBe(true);
    expect(state.queries.filter(query => query.includes('DELETE FROM'))).toHaveLength(1);
  });
});
