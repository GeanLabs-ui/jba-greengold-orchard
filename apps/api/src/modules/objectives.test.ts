import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppVariables, AuthUser } from '../middleware/auth.js';
import { cycleSchema, objectiveSchema, calculateCycle } from './objective-model.js';

const database = vi.hoisted(() => ({ cycles: [] as { id: string; data: Record<string, unknown> }[], logs: [] as { id: string; data: Record<string, unknown>; created_at: Date }[], writes: [] as string[] }));
vi.mock('../db.js', () => {
  const sql = Object.assign(async (strings: TemplateStringsArray) => {
    const query = strings.join('?');
    if (query.includes("entity_name = 'ObjectiveCycle'")) return database.cycles;
    if (query.includes("entity_name = 'DailyActivity'")) return database.logs;
    if (/INSERT|UPDATE/.test(query)) database.writes.push(query);
    return [];
  }, { json: (v: unknown) => v, begin: async (fn: (tx: unknown) => unknown) => fn(sql) });
  return { createDatabase: () => sql, closeDatabase: async () => {} };
});
import router from './objectives.js';
const user: AuthUser = { id: 'manager', role: 'admin', full_name: 'Manager', email: 'test@example.invalid', pageAccess: null, status: 'active', email_verified: true, organizationId: null };
const objective = objectiveSchema.parse({ id: 'o', name: 'Yield', code: 'OBJ-2026-001', owner: 'Manager', category: 'Production', priority: 'High', status: 'Active', start: '2026-01-01', end: '2026-12-31', weight: 100, budget: 0 });
const cycle = cycleSchema.parse({ year: 2026, revision: 0, weighted: false, objectives: [objective] });
function app(role: AuthUser['role'] | null = 'admin') {
  const a = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  a.use('*', async (c, next) => { c.set('user', role ? { ...user, role } : null); c.set('session', role ? { id: 'session', csrfToken: 'token', expiresAt: new Date('2030-01-01') } : null); c.set('requestId', 'test'); await next(); });
  a.route('/objectives', router); return a;
}
const post = (body: unknown, role: AuthUser['role'] | null = 'admin', token = 'token') => app(role).request('/objectives', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(body) });
beforeEach(() => { database.cycles = []; database.logs = []; database.writes = []; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
describe('Objectives API permissions and historical protection', () => {
  it('requires a signed-in staff viewer', async () => {
    expect((await app(null).request('/objectives')).status).toBe(401);
    expect((await app('customer').request('/objectives')).status).toBe(403);
    expect((await app('auditor').request('/objectives')).status).toBe(200);
  });
  it('restricts writes to management and enforces CSRF', async () => {
    expect((await post(cycle, 'farm_supervisor')).status).toBe(403);
    expect((await post(cycle, 'admin', 'wrong')).status).toBe(403);
    expect(database.writes).toHaveLength(0);
  });
  it('saves through a transaction and writes an audit event', async () => {
    const response = await post(cycle);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { data: { revision: number } }).data.revision).toBe(1);
    expect(database.writes).toHaveLength(2);
    expect(database.writes[1]).toContain('audit_events');
  });
  it('rejects stale revisions and duplicate cycle creation', async () => {
    database.cycles = [{ id: 'cycle', data: { ...cycle, revision: 2 } }];
    expect((await post(cycle)).status).toBe(409);
    expect(database.writes).toHaveLength(0);
  });
  it('rejects modifications to a closed year, including attempted reopening', async () => {
    database.cycles = [{ id: 'cycle', data: { ...cycle, closed_at: '2026-10-01T00:00:00Z' } }];
    expect((await post({ ...cycle, closed_at: null })).status).toBe(409);
    expect(database.writes).toHaveLength(0);
  });
  it('requires a management review to close the year', async () => {
    expect((await post({ ...cycle, close: true })).status).toBe(422);
    expect((await post({ ...cycle, close: true, review: 'Final outcomes and next-year recommendations recorded.' })).status).toBe(200);
  });
  it('returns the preserved snapshot even when source records are later changed', async () => {
    const snapshot = { ...calculateCycle(cycle, []), score: 83 };
    database.cycles = [{ id: 'cycle', data: { ...cycle, closed_at: '2026-10-01T00:00:00Z', snapshot } }];
    const response = await app().request('/objectives');
    expect(((await response.json()) as { data: { result: { score: number } }[] }).data[0].result.score).toBe(83);
  });
  it('makes past years read-only and rejects future closure', async () => {
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    expect((await post(cycle)).status).toBe(409);
    vi.setSystemTime(new Date('2026-10-06T00:00:00Z'));
    expect((await post({ ...cycle, year: 2027, objectives: [{ ...objective, start: '2027-01-01', end: '2027-12-31' }], close: true, review: 'Review' })).status).toBe(422);
  });
});
