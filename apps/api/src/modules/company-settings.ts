import { Hono } from 'hono';
import { z } from 'zod';
import { closeDatabase, createDatabase, type Database } from '../db.js';
import { requireAuth, requireCsrf, requireRole, type AppVariables, type AuthUser } from '../middleware/auth.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
export const companyEmail = 'info@jbagreengold.com';
const defaults = { name: 'JBA GreenGold Orchard', email: companyEmail, phone: '+233 59 354 9954', currency: 'GHS' };
const currencies = new Set(Intl.supportedValuesOf('currency'));
export const currencySchema = z.string().trim().toUpperCase().refine(value => currencies.has(value));
const profile = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40),
  currency: currencySchema,
});
const department = z.object({
  email: z.string().trim().toLowerCase().email().max(254).endsWith('@jbagreengold.com').refine(value => value !== companyEmail),
  mailboxId: z.string().trim().toLowerCase().uuid(),
  members: z.array(z.string().min(1).max(128)).max(200).transform(ids => [...new Set(ids)]),
});
type Mailbox = z.infer<typeof department>;
type MailboxRow = Mailbox & { id: string; name: string };
const profileId = (organizationId: string | null) => `company-settings:${organizationId ?? ''}`;

export async function readCompanyProfile(sql: Database, organizationId: string | null) {
  const [row] = await sql<{ data: typeof defaults }[]>`SELECT data FROM entity_records WHERE id = ${profileId(organizationId)} AND entity_name = 'CompanySettings'`;
  return { ...defaults, ...row?.data };
}

// Keep app access tied to the active department and the signed-in staff account.
export async function departmentMailboxes(env: Env, user: AuthUser, id: string | null = null) {
  const sql = createDatabase(env);
  try {
    return await sql<MailboxRow[]>`
      SELECT d.id, d.data->>'name' AS name, m.data->>'email' AS email, m.data->>'mailboxId' AS "mailboxId", m.data->'members' AS members
      FROM entity_records m
      JOIN entity_records d ON d.id = m.data->>'departmentId' AND d.entity_name = 'Department'
        AND d.organization_id IS NOT DISTINCT FROM m.organization_id
      WHERE m.entity_name = 'DepartmentMailbox' AND m.organization_id IS NOT DISTINCT FROM ${user.organizationId}
        AND COALESCE(d.data->>'status', 'active') = 'active'
        AND (${user.role === 'super_admin'} OR (m.data->'members') ? ${user.id})
        AND (${id}::text IS NULL OR d.id = ${id})
      ORDER BY d.data->>'name'
    `;
  } finally {
    await closeDatabase(sql);
  }
}

router.use('*', async (c, next) => { c.header('Cache-Control', 'private, no-store'); await next(); });
router.use('*', requireAuth(), requireCsrf());

router.get('/currency', async (c) => {
  const user = c.get('user')!;
  if (user.role === 'customer' || user.role === 'user') return c.json({ error: { message: 'Staff access is required.' } }, 403);
  const sql = createDatabase(c.env);
  try {
    return c.json({ data: (await readCompanyProfile(sql, user.organizationId)).currency });
  } finally { await closeDatabase(sql); }
});

router.get('/', requireRole('super_admin', 'admin'), async (c) => {
  const user = c.get('user')!;
  if (user.role === 'admin' && user.pageAccess && !user.pageAccess.includes('settings')) return c.json({ error: { message: 'Settings access is required.' } }, 403);
  const sql = createDatabase(c.env);
  try {
    return c.json({ data: await readCompanyProfile(sql, user.organizationId) });
  } finally { await closeDatabase(sql); }
});

router.post('/', requireRole('super_admin', 'admin'), async (c) => {
  const user = c.get('user')!;
  if (user.role === 'admin' && user.pageAccess && !user.pageAccess.includes('settings')) return c.json({ error: { message: 'Settings access is required.' } }, 403);
  const input = profile.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { message: 'Enter a company name, valid email address, and supported currency.' } }, 422);
  const sql = createDatabase(c.env);
  try {
    await sql`
      INSERT INTO entity_records (id, entity_name, organization_id, data, created_by, updated_by)
      VALUES (${profileId(user.organizationId)}, 'CompanySettings', ${user.organizationId}, ${sql.json(input.data)}, ${user.id}, ${user.id})
      ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_by = excluded.updated_by, updated_at = now()
    `;
    return c.json({ data: input.data });
  } finally { await closeDatabase(sql); }
});

router.get('/departments', requireRole('super_admin'), async (c) => {
  const user = c.get('user')!;
  const sql = createDatabase(c.env);
  try {
    const [departments, staff, mailboxes] = await Promise.all([
      sql`SELECT id, data->>'name' AS name FROM entity_records WHERE entity_name = 'Department' AND organization_id IS NOT DISTINCT FROM ${user.organizationId} AND COALESCE(data->>'status', 'active') = 'active' ORDER BY data->>'name'`,
      sql`SELECT u.id, u.full_name, u.email FROM users u WHERE u.status = 'active' AND u.role NOT IN ('customer', 'user', 'super_admin') AND
        ((${user.organizationId}::text IS NULL AND NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = u.id)) OR
          EXISTS (SELECT 1 FROM organization_members WHERE user_id = u.id AND organization_id = ${user.organizationId}))
        ORDER BY u.full_name, u.email`,
      departmentMailboxes(c.env, user),
    ]);
    return c.json({ data: { departments, staff, mailboxes } });
  } finally { await closeDatabase(sql); }
});

router.post('/departments/:id', requireRole('super_admin'), async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const input = department.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: { message: 'Enter a department address at jbagreengold.com and its Exchange mailbox object ID.' } }, 422);
  if (input.data.mailboxId === c.env.COMPANY_OUTLOOK_MAILBOX_ID?.toLowerCase()) return c.json({ error: { message: 'Choose a separate mailbox for this department.' } }, 422);
  const sql = createDatabase(c.env);
  try {
    const error = await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('department-mailboxes'))`;
      const [target] = await tx`SELECT id FROM entity_records WHERE id = ${id} AND entity_name = 'Department' AND organization_id IS NOT DISTINCT FROM ${user.organizationId} AND COALESCE(data->>'status', 'active') = 'active'`;
      if (!target) return 'Select an active department.';
      const recordId = `department-mailbox:${id}`;
      const [duplicate] = await tx`SELECT id FROM entity_records WHERE entity_name = 'DepartmentMailbox' AND id <> ${recordId}
        AND (data->>'email' = ${input.data.email} OR data->>'mailboxId' = ${input.data.mailboxId})`;
      if (duplicate) return 'This address or Exchange mailbox is already assigned to a department.';
      const staff = await tx`SELECT u.id FROM users u WHERE u.id = ANY(${input.data.members}::text[]) AND u.status = 'active' AND u.role NOT IN ('customer', 'user', 'super_admin') AND
        ((${user.organizationId}::text IS NULL AND NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = u.id)) OR
          EXISTS (SELECT 1 FROM organization_members WHERE user_id = u.id AND organization_id = ${user.organizationId}))`;
      if (staff.length !== input.data.members.length) return 'Choose active staff from this organization.';
      const data = { ...input.data, departmentId: id };
      await tx`INSERT INTO entity_records (id, entity_name, organization_id, data, created_by, updated_by)
        VALUES (${recordId}, 'DepartmentMailbox', ${user.organizationId}, ${tx.json(data)}, ${user.id}, ${user.id})
        ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_by = excluded.updated_by, updated_at = now()`;
      await tx`INSERT INTO audit_events (id, user_id, action, target_table, record_id, new_values)
        VALUES (${crypto.randomUUID()}, ${user.id}, 'update', 'DepartmentMailbox', ${recordId}, ${tx.json(data)})`;
      return null;
    });
    if (error) return c.json({ error: { message: error } }, 422);
    return c.json({ data: input.data });
  } finally { await closeDatabase(sql); }
});

export default router;
