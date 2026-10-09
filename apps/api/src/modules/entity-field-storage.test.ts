import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppVariables, AuthUser } from '../middleware/auth.js';

const database = vi.hoisted(() => ({ writes: [] as { query: string; values: unknown[] }[], existing: { id: 'old', data: { legacy_note: 'Keep this', attachments: [{ id: 'old-file' }] }, created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01') } }));
vi.mock('../db.js', () => {
  const sql = Object.assign(async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const query = parts.join('?');
    database.writes.push({ query, values });
    if (query.includes('UPDATE entity_records')) return [{ ...database.existing, data: { ...database.existing.data, ...(values[0] as object) } }];
    return [];
  }, { json: (value: unknown) => value, begin: async (fn: (tx: unknown) => unknown) => fn(sql) });
  return { createDatabase: () => sql, closeDatabase: async () => {} };
});
import router from './entities.js';
const user: AuthUser = { id: 'staff', role: 'admin', full_name: 'Test', email: 'test@example.invalid', pageAccess: null, status: 'active', email_verified: true, organizationId: null };
function app(role: AuthUser['role'] | null = 'admin') {
  const a = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  a.use('*', async (c, next) => { c.set('user', role ? { ...user, role } : null); c.set('session', role ? { id: 'session', csrfToken: 'token', expiresAt: new Date('2030-01-01') } : null); c.set('requestId', 'test'); await next(); });
  a.route('/entities', router); return a;
}
const write = (entity: string, payload: unknown, role: AuthUser['role'] | null = 'admin', token = 'token', method = 'POST') => app(role).request(`/entities/${entity}${method === 'PATCH' ? '/old' : ''}`, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(payload) });
beforeEach(() => { database.writes = []; });
describe('New operational fields use existing authenticated JSON storage', () => {
  it('allows issue reports from farm staff while denying anonymous/customer writes and invalid CSRF', async () => {
    for (const role of ['admin', 'farm_manager', 'farm_supervisor'] as const) expect((await write('Issue', { report_time: '10:30' }, role)).status).toBe(201);
    database.writes = [];
    expect((await write('Issue', {}, null)).status).toBe(401);
    expect((await write('Issue', {}, 'customer')).status).toBe(403);
    expect((await write('Issue', {}, 'admin', 'wrong')).status).toBe(403);
    expect(database.writes).toHaveLength(0);
  });
  it.each([
    ['Issue', { issue_code: 'ISS-2026-001', report_time: '10:30', estimated_cost: 0, resolution: '', attachments: [{ id: 'file', url: '/api/v1/files/file' }] }],
    ['Equipment', { quantity_purchased: 4, remaining_quantity: 0, minimum_stock_threshold: 2, record_status: 'Draft' }],
    ['HarvestBatch', { quantity_harvested_kg: 1000, rejected_kg: 0, team_members: ['Test'], evidence: [] }],
  ])('persists all new %s fields and zero values', async (entity, payload) => {
    const response = await write(entity as string, payload);
    expect(response.status).toBe(201);
    expect(((await response.json()) as {data: Record<string,unknown>}).data).toMatchObject(payload);
    expect(database.writes.find(w => w.query.includes('INSERT INTO entity_records'))?.values).toContainEqual(payload);
    expect(database.writes.some(w => w.query.includes('INSERT INTO audit_events'))).toBe(true);
  });
  it('merges a new field without removing existing notes or attachment references', async () => {
    const response = await write('Issue', { estimated_cost: 0 }, 'admin', 'token', 'PATCH');
    expect(response.status).toBe(200);
    expect(((await response.json()) as {data: Record<string,unknown>}).data).toMatchObject({ legacy_note: 'Keep this', attachments: [{ id: 'old-file' }], estimated_cost: 0 });
    expect(database.writes[0].query).toContain('data = data ||');
  });
});
