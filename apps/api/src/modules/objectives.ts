import { Hono } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import { requireCsrf, requireRole, type AppVariables } from '../middleware/auth.js';
import { calculateCycle, cycleSchema, type Cycle, type Log } from './objective-model.js';
import { requestIp } from '../rate-limit.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
router.use('*', requireRole('super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'auditor'), requireCsrf());
type StoredCycle = Cycle & { closed_at?: string; snapshot?: ReturnType<typeof calculateCycle>; history?: { date: string; author: string; action: string }[] };
type Row = { id: string; data: StoredCycle };

router.get('/', async c => {
  const sql = createDatabase(c.env);
  try {
    const user = c.get('user')!;
    const rows = await sql<Row[]>`SELECT id, data FROM entity_records WHERE entity_name = 'ObjectiveCycle' AND organization_id IS NOT DISTINCT FROM ${user.organizationId} ORDER BY data->>'year' DESC`;
    const logs = await sql<{ id: string; data: Record<string, unknown>; created_at: Date }[]>`SELECT id, data, created_at FROM entity_records WHERE entity_name = 'DailyActivity' AND organization_id IS NOT DISTINCT FROM ${user.organizationId}`;
    const sources: Log[] = logs.map(r => ({ ...r.data, id: r.id, created_date: r.created_at.toISOString() }));
    return c.json({ data: rows.map(r => ({ ...r.data, id: r.id, result: r.data.snapshot || calculateCycle(r.data, sources) })), requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

router.post('/', requireRole('super_admin', 'admin'), async c => {
  const parsed = cycleSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_OBJECTIVES', message: parsed.error.issues[0]?.message } }, 422);
  const input = parsed.data, user = c.get('user')!;
  const sql = createDatabase(c.env);
  try {
    const result = await sql.begin(async tx => {
      // Serialize cycle creation and revisions, including concurrent browser tabs.
      await tx`SELECT pg_advisory_xact_lock(hashtext(${`objectives:${user.organizationId}:${input.year}`}))`;
      const existing = (await tx<Row[]>`SELECT id, data FROM entity_records WHERE entity_name = 'ObjectiveCycle' AND organization_id IS NOT DISTINCT FROM ${user.organizationId} AND data->>'year' = ${String(input.year)} FOR UPDATE`)[0];
      if (existing?.data.closed_at) return { error: 'Closed years are read-only.', status: 409 as const };
      if (input.year < new Date().getUTCFullYear() && !input.close) return { error: 'Historical years are read-only. Close the year to preserve its final review.', status: 409 as const };
      if ((existing?.data.revision ?? 0) !== input.revision) return { error: 'This cycle changed in another session. Refresh before saving.', status: 409 as const };
      if (input.close && (!input.review.trim() || !input.objectives.length)) return { error: 'Closing requires objectives and management review notes.', status: 422 as const };
      if (input.close && input.year > new Date().getUTCFullYear()) return { error: 'A future year cannot be closed.', status: 422 as const };
      const data: StoredCycle = { ...input, close: false, revision: input.revision + 1,
        history: [...(existing?.data.history || []), { date: new Date().toISOString(), author: user.full_name || user.email, action: input.close ? 'Year closed and results frozen' : existing ? 'Objective cycle updated' : 'Objective cycle created' }] };
      if (input.close) {
        const logs = await tx<{ id: string; data: Record<string, unknown>; created_at: Date }[]>`SELECT id, data, created_at FROM entity_records WHERE entity_name = 'DailyActivity' AND organization_id IS NOT DISTINCT FROM ${user.organizationId}`;
        data.closed_at = new Date().toISOString();
        data.snapshot = calculateCycle(data, logs.map(r => ({ ...r.data, id: r.id, created_date: r.created_at.toISOString() })));
      }
      const recordId = existing?.id || crypto.randomUUID();
      if (existing) await tx`UPDATE entity_records SET data = ${tx.json(JSON.parse(JSON.stringify(data)))}, updated_by = ${user.id}, updated_at = now() WHERE id = ${recordId}`;
      else await tx`INSERT INTO entity_records (id, entity_name, organization_id, data, created_by, updated_by) VALUES (${recordId}, 'ObjectiveCycle', ${user.organizationId}, ${tx.json(JSON.parse(JSON.stringify(data)))}, ${user.id}, ${user.id})`;
      await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address) VALUES (${crypto.randomUUID()}, ${user.id}, ${input.close ? 'close' : 'update'}, 'ObjectiveCycle', ${recordId}, ${tx.json(JSON.parse(JSON.stringify(data)))}, ${requestIp(c.req.raw)})`;
      return { id: recordId, revision: data.revision };
    });
    if ('error' in result) return c.json({ error: { code: 'CYCLE_CONFLICT', message: result.error } }, result.status);
    return c.json({ data: result, requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

export default router;
