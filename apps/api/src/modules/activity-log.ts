import { Hono } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import { requireAuth, requireCsrf, requireRole, type AppVariables } from '../middleware/auth.js';
import { requestIp } from '../rate-limit.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();

router.get('/', requireRole('super_admin', 'admin', 'auditor'), async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query('limit') || 200), 1), 500);
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ id: string; action: string; target_table: string; record_id: string; new_values: Record<string, unknown> | null; timestamp: Date; email: string | null }[]>`
      SELECT audit.id, audit.action, audit.target_table, audit.record_id, audit.new_values, audit.timestamp, users.email
      FROM audit_events audit LEFT JOIN users ON users.id = audit.user_id
      ORDER BY audit.timestamp DESC LIMIT ${limit}
    `;
    return c.json({ data: rows.map((row) => ({
      id: row.id, action: row.action, target: row.target_table, record_id: row.record_id,
      actor: row.email || 'Website visitor or system', timestamp: row.timestamp.toISOString(),
      error_code: row.new_values?.error_code || null, error_message: row.new_values?.error_message || null,
      status: row.new_values?.status || null, path: row.new_values?.path || null,
    })), requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

router.post('/errors', requireAuth(), requireCsrf(), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const errorCode = typeof payload?.error_code === 'string' ? payload.error_code.slice(0, 120) : 'CLIENT_ERROR';
  const errorMessage = typeof payload?.error_message === 'string' ? payload.error_message.slice(0, 1000) : 'An unknown client error occurred';
  const path = typeof payload?.path === 'string' ? payload.path.slice(0, 300) : '';
  const status = Number.isInteger(payload?.status) ? payload.status : null;
  const sql = createDatabase(c.env);
  try {
    await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
      VALUES (${crypto.randomUUID()}, ${c.get('user')!.id}, 'error', 'Client application', ${crypto.randomUUID()}, ${sql.json({ error_code: errorCode, error_message: errorMessage, status, path })}, ${requestIp(c.req.raw)})`;
    return c.json({ data: { logged: true }, requestId: c.get('requestId') }, 201);
  } finally { await closeDatabase(sql); }
});

router.delete('/:id', requireRole('super_admin', 'admin'), requireCsrf(), async (c) => {
  const sql = createDatabase(c.env);
  try {
    const deleted = await sql<{ id: string }[]>`DELETE FROM audit_events WHERE id = ${c.req.param('id')} RETURNING id`;
    if (!deleted[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'System log entry not found' }, requestId: c.get('requestId') }, 404);
    return c.json({ data: { deleted: true }, requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

router.post('/bulk-delete', requireRole('super_admin', 'admin'), requireCsrf(), async (c) => {
  const payload = await c.req.json().catch(() => null);
  const suppliedIds: unknown[] = Array.isArray(payload?.ids) ? payload.ids as unknown[] : [];
  const ids = [...new Set(suppliedIds.filter((id): id is string => typeof id === 'string' && /^[\w-]{1,100}$/.test(id)))].slice(0, 100);
  if (!ids.length) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Select at least one system log entry' }, requestId: c.get('requestId') }, 422);
  const sql = createDatabase(c.env);
  try {
    const deleted = await sql<{ id: string }[]>`DELETE FROM audit_events WHERE id = ANY(${ids}) RETURNING id`;
    return c.json({ data: { deletedIds: deleted.map((entry) => entry.id) }, requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

export default router;
