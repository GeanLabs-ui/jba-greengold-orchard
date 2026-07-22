import { Hono } from 'hono';
import { z } from 'zod';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables, AuthUser } from '../middleware/auth.js';
import { checkRateLimit, requestIp } from '../rate-limit.js';
import { verifyTurnstile } from '../turnstile.js';

const ENTITY_NAMES = new Set([
  'Product', 'NewsPost', 'Farm', 'FarmBlock', 'Customer', 'Order', 'Invoice', 'Payment', 'StockItem', 'Harvest',
  'FarmProcessLog', 'FarmTask', 'CropPlan', 'FarmResourceUse', 'PesticideApplication', 'LaborSchedule', 'Worker',
  'DailyActivity', 'WorkOrder', 'ActivityWorker', 'ActivityEquipment', 'ActivityInput', 'FarmAttendance', 'Equipment',
  'EquipmentUsage', 'FarmInput', 'InputUsage', 'InventoryUsage', 'HarvestBatch', 'HarvestGrade', 'QualityCheck',
  'WasteLoss', 'WeatherLog', 'FarmExpense', 'DailyReport', 'Approval', 'AuditLog', 'FarmFinanceRecord',
  'FarmComplianceRecord', 'FarmNote', 'FarmProject', 'Delivery', 'Employee', 'Warehouse', 'StockMovement', 'Vehicle',
  'Supplier', 'PurchaseOrder', 'Quotation', 'Return', 'Expense', 'ExportShipment', 'Certification', 'Notification',
  'ContentPage', 'Inquiry', 'CustomerContract', 'Attendance', 'JobApplication', 'User',
]);
const PUBLIC_READ = new Set(['Product', 'NewsPost', 'Farm', 'ContentPage']);
const PUBLIC_CREATE = new Set(['Inquiry']);
const CUSTOMER_READ = new Set(['Order', 'Invoice', 'Payment', 'CustomerContract', 'Notification']);
const adminRoles = new Set(['super_admin', 'admin']);
const ROLE_READ_ENTITIES: Partial<Record<AuthUser['role'], Set<string>>> = {
  farm_manager: new Set(['Farm', 'FarmBlock', 'Harvest', 'FarmProcessLog', 'FarmTask', 'CropPlan', 'FarmResourceUse', 'PesticideApplication', 'LaborSchedule', 'Worker', 'DailyActivity', 'WorkOrder', 'ActivityWorker', 'ActivityEquipment', 'ActivityInput', 'FarmAttendance', 'Equipment', 'EquipmentUsage', 'FarmInput', 'InputUsage', 'HarvestBatch', 'HarvestGrade', 'QualityCheck', 'WasteLoss', 'WeatherLog', 'DailyReport', 'Approval', 'FarmNote', 'FarmProject']),
  farm_supervisor: new Set(['Farm', 'FarmBlock', 'Harvest', 'FarmProcessLog', 'FarmTask', 'CropPlan', 'FarmResourceUse', 'PesticideApplication', 'LaborSchedule', 'Worker', 'DailyActivity', 'WorkOrder', 'ActivityWorker', 'ActivityEquipment', 'ActivityInput', 'FarmAttendance', 'Equipment', 'EquipmentUsage', 'FarmInput', 'InputUsage', 'HarvestBatch', 'HarvestGrade', 'QualityCheck', 'WasteLoss', 'WeatherLog', 'DailyReport', 'FarmNote']),
  inventory_officer: new Set(['StockItem', 'Warehouse', 'StockMovement', 'Supplier', 'PurchaseOrder', 'FarmInput', 'InputUsage', 'InventoryUsage']),
  quality_officer: new Set(['Harvest', 'HarvestBatch', 'HarvestGrade', 'QualityCheck', 'WasteLoss', 'Certification', 'FarmComplianceRecord']),
  finance_officer: new Set(['Invoice', 'Payment', 'Expense', 'FarmExpense', 'FarmFinanceRecord', 'PurchaseOrder', 'Quotation', 'CustomerContract']),
  hr_officer: new Set(['Employee', 'Worker', 'Attendance', 'FarmAttendance', 'LaborSchedule', 'JobApplication', 'User']),
  sales_officer: new Set(['Customer', 'Order', 'Invoice', 'Payment', 'Quotation', 'Return', 'Delivery', 'CustomerContract', 'Product']),
  logistics_officer: new Set(['Order', 'Delivery', 'ExportShipment', 'Vehicle', 'Warehouse', 'StockMovement']),
  content_editor: new Set(['Product', 'NewsPost', 'ContentPage']),
  auditor: new Set([...ENTITY_NAMES].filter((name) => !['User', 'JobApplication'].includes(name))),
  user: new Set(['Farm']),
};
const ROLE_WRITE_ENTITIES: Partial<Record<AuthUser['role'], Set<string>>> = {
  farm_manager: ROLE_READ_ENTITIES.farm_manager,
  farm_supervisor: new Set(['Harvest', 'FarmProcessLog', 'FarmTask', 'FarmResourceUse', 'PesticideApplication', 'DailyActivity', 'WorkOrder', 'FarmAttendance', 'EquipmentUsage', 'InputUsage', 'WasteLoss', 'WeatherLog', 'DailyReport', 'FarmNote']),
  inventory_officer: ROLE_READ_ENTITIES.inventory_officer,
  quality_officer: ROLE_READ_ENTITIES.quality_officer,
  finance_officer: ROLE_READ_ENTITIES.finance_officer,
  hr_officer: new Set(['Employee', 'Worker', 'Attendance', 'LaborSchedule', 'JobApplication']),
  sales_officer: ROLE_READ_ENTITIES.sales_officer,
  logistics_officer: ROLE_READ_ENTITIES.logistics_officer,
  content_editor: ROLE_READ_ENTITIES.content_editor,
};
const payloadSchema = z.record(z.string().min(1).max(100), z.unknown());
const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function entityName(value: string): string | null {
  return ENTITY_NAMES.has(value) ? value : null;
}

function isAdmin(user: AuthUser | null): boolean {
  return Boolean(user && adminRoles.has(user.role));
}

function canRead(user: AuthUser | null, name: string, publicAccess: boolean): boolean {
  if (publicAccess) return true;
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.role === 'customer') return CUSTOMER_READ.has(name);
  return ROLE_READ_ENTITIES[user.role]?.has(name) ?? false;
}

function canWrite(user: AuthUser | null, name: string): boolean {
  if (!user) return false;
  return isAdmin(user) || (ROLE_WRITE_ENTITIES[user.role]?.has(name) ?? false);
}

function safePayload(input: unknown): JsonObject | null {
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) return null;
  let json: string;
  try { json = JSON.stringify(parsed.data); } catch { return null; }
  if (json.length > 100_000 || /"(?:__proto__|constructor|prototype)"\s*:/.test(json)) return null;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.toLowerCase().endsWith('_url') && typeof value === 'string' && value.trim().toLowerCase().startsWith('data:')) return null;
  }
  return JSON.parse(json) as JsonObject;
}

function mapRecord(row: { id: string; data: unknown; created_at: Date; updated_at: Date }): Record<string, unknown> {
  const data = typeof row.data === 'object' && row.data !== null ? row.data as Record<string, unknown> : {};
  return { ...data, id: row.id, created_date: row.created_at.toISOString(), updated_date: row.updated_at.toISOString() };
}

router.get('/:entity', async (c) => {
  const name = entityName(c.req.param('entity'));
  if (!name) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' }, requestId: c.get('requestId') }, 404);
  const user = c.get('user');
  const publicAccess = PUBLIC_READ.has(name);
  if (!canRead(user, name, publicAccess)) return c.json({ error: { code: user ? 'FORBIDDEN' : 'UNAUTHORIZED', message: user ? 'Access denied' : 'Authentication required' }, requestId: c.get('requestId') }, user ? 403 : 401);

  const limit = Math.min(250, Math.max(1, Number(c.req.query('limit')) || 100));
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);
  const sql = createDatabase(c.env);
  try {
    const rows = user?.role === 'customer' && !publicAccess
      ? await sql<{ id: string; data: unknown; created_at: Date; updated_at: Date }[]>`
          SELECT id, data, created_at, updated_at FROM entity_records
          WHERE entity_name = ${name} AND owner_user_id = ${user.id}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `
      : await sql<{ id: string; data: unknown; created_at: Date; updated_at: Date }[]>`
          SELECT id, data, created_at, updated_at FROM entity_records
          WHERE entity_name = ${name}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
    return c.json({ data: rows.map(mapRecord), pagination: { limit, offset, hasMore: rows.length === limit }, requestId: c.get('requestId') });
  } finally {
    await closeDatabase(sql);
  }
});

router.post('/:entity', async (c) => {
  const name = entityName(c.req.param('entity'));
  if (!name) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' }, requestId: c.get('requestId') }, 404);
  const user = c.get('user');
  if (!PUBLIC_CREATE.has(name) && !canWrite(user, name)) return c.json({ error: { code: user ? 'FORBIDDEN' : 'UNAUTHORIZED', message: user ? 'Access denied' : 'Authentication required' }, requestId: c.get('requestId') }, user ? 403 : 401);
  if (user && c.req.header('X-CSRF-Token') !== c.get('session')?.csrfToken) return c.json({ error: { code: 'CSRF_INVALID', message: 'Security token is missing or invalid' }, requestId: c.get('requestId') }, 403);
  const payload = safePayload(await c.req.json().catch(() => null));
  if (!payload) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or oversized payload' }, requestId: c.get('requestId') }, 422);
  const turnstileToken = typeof payload.turnstile_token === 'string' ? payload.turnstile_token : undefined;
  delete payload.turnstile_token;

  const sql = createDatabase(c.env);
  try {
    if (PUBLIC_CREATE.has(name)) {
      const rate = await checkRateLimit(sql, `create-${name}`, requestIp(c.req.raw), 5, 3600);
      if (!rate.allowed) {
        c.header('Retry-After', String(rate.retryAfter));
        return c.json({ error: { code: 'RATE_LIMITED', message: 'Too many submissions' }, requestId: c.get('requestId') }, 429);
      }
      if (!await verifyTurnstile(c.env, turnstileToken, requestIp(c.req.raw))) return c.json({ error: { code: 'BOT_CHECK_FAILED', message: 'Please complete the security check' }, requestId: c.get('requestId') }, 403);
    }
    const id = crypto.randomUUID();
    const now = new Date();
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO entity_records (id, entity_name, organization_id, owner_user_id, data, created_by, updated_by, created_at, updated_at)
        VALUES (${id}, ${name}, ${user?.organizationId || null}, ${null}, ${sql.json(payload)}, ${user?.id || null}, ${user?.id || null}, ${now}, ${now})
      `;
      await transaction`
        INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address)
        VALUES (${crypto.randomUUID()}, ${user?.id || null}, 'create', ${name}, ${id}, ${sql.json(payload)}, ${requestIp(c.req.raw)})
      `;
    });
    return c.json({ data: { ...payload, id, created_date: now.toISOString(), updated_date: now.toISOString() }, requestId: c.get('requestId') }, 201);
  } finally {
    await closeDatabase(sql);
  }
});

router.patch('/:entity/:id', async (c) => {
  const name = entityName(c.req.param('entity'));
  const user = c.get('user');
  if (!name) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' }, requestId: c.get('requestId') }, 404);
  if (!canWrite(user, name)) return c.json({ error: { code: user ? 'FORBIDDEN' : 'UNAUTHORIZED', message: user ? 'Access denied' : 'Authentication required' }, requestId: c.get('requestId') }, user ? 403 : 401);
  if (c.req.header('X-CSRF-Token') !== c.get('session')?.csrfToken) return c.json({ error: { code: 'CSRF_INVALID', message: 'Security token is missing or invalid' }, requestId: c.get('requestId') }, 403);
  const payload = safePayload(await c.req.json().catch(() => null));
  if (!payload) return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or oversized payload' }, requestId: c.get('requestId') }, 422);
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ id: string; data: JsonObject; created_at: Date; updated_at: Date }[]>`
      UPDATE entity_records SET data = data || ${sql.json(payload)}, updated_by = ${user!.id}, updated_at = now()
      WHERE id = ${c.req.param('id')} AND entity_name = ${name}
      RETURNING id, data, created_at, updated_at
    `;
    if (!rows[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Record not found' }, requestId: c.get('requestId') }, 404);
    await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values, ip_address) VALUES (${crypto.randomUUID()}, ${user!.id}, 'update', ${name}, ${rows[0].id}, ${sql.json(payload)}, ${requestIp(c.req.raw)})`;
    return c.json({ data: mapRecord(rows[0]), requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

router.delete('/:entity/:id', async (c) => {
  const name = entityName(c.req.param('entity'));
  const user = c.get('user');
  if (!name) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown resource' }, requestId: c.get('requestId') }, 404);
  if (!canWrite(user, name)) return c.json({ error: { code: user ? 'FORBIDDEN' : 'UNAUTHORIZED', message: user ? 'Access denied' : 'Authentication required' }, requestId: c.get('requestId') }, user ? 403 : 401);
  if (c.req.header('X-CSRF-Token') !== c.get('session')?.csrfToken) return c.json({ error: { code: 'CSRF_INVALID', message: 'Security token is missing or invalid' }, requestId: c.get('requestId') }, 403);
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ id: string; data: JsonValue }[]>`DELETE FROM entity_records WHERE id = ${c.req.param('id')} AND entity_name = ${name} RETURNING id, data`;
    if (!rows[0]) return c.json({ error: { code: 'NOT_FOUND', message: 'Record not found' }, requestId: c.get('requestId') }, 404);
    await sql`INSERT INTO audit_events (id, user_id, action, target_table, record_id, old_values, ip_address) VALUES (${crypto.randomUUID()}, ${user!.id}, 'delete', ${name}, ${rows[0].id}, ${sql.json(rows[0].data)}, ${requestIp(c.req.raw)})`;
    return c.json({ data: { success: true }, requestId: c.get('requestId') });
  } finally { await closeDatabase(sql); }
});

export default router;
