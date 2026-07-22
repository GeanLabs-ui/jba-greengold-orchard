import { Hono } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
router.use('*', requireRole('super_admin', 'admin', 'hr_officer'));

router.get('/:id', async (c) => {
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ object_key: string; original_name: string; content_type: string; status: string }[]>`SELECT object_key, original_name, content_type, status FROM file_objects WHERE id = ${c.req.param('id')} LIMIT 1`;
    const file = rows[0];
    if (!file || file.status !== 'active') return c.json({ error: { code: 'NOT_FOUND', message: 'File not found' }, requestId: c.get('requestId') }, 404);
    const object = await c.env.PRIVATE_FILES.get(file.object_key);
    if (!object?.body) return c.json({ error: { code: 'NOT_FOUND', message: 'File not found' }, requestId: c.get('requestId') }, 404);
    const filename = file.original_name.replace(/[\r\n"\\]/g, '_');
    return new Response(object.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } finally { await closeDatabase(sql); }
});

export default router;
