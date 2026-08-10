import { Hono } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';
import { requireCsrf, requireRole } from '../middleware/auth.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'video/mp4', 'video/webm']);

function hasValidSignature(file: File, bytes: Uint8Array): boolean {
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (file.type === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (file.type === 'video/mp4') return bytes.slice(4, 8).every((byte, index) => 'ftyp'.charCodeAt(index) === byte);
  if (file.type === 'video/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return !bytes.includes(0);
}

router.get('/:id', requireRole('super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'hr_officer'));

router.get('/:id', async (c) => {
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ object_key: string; original_name: string; content_type: string; status: string }[]>`SELECT object_key, original_name, content_type, status FROM file_objects WHERE id = ${c.req.param('id')} LIMIT 1`;
    const file = rows[0];
    if (!file || file.status !== 'active') return c.json({ error: { code: 'NOT_FOUND', message: 'File not found' }, requestId: c.get('requestId') }, 404);
    let object = await c.env.PRIVATE_FILES.get(file.object_key);
    let recoveredBody: ArrayBuffer | null = null;
    if (!object?.body) {
      object = await c.env.PRIVATE_FILES_BACKUP.get(file.object_key);
      if (object?.body) {
        recoveredBody = await object.arrayBuffer();
        c.executionCtx.waitUntil(c.env.PRIVATE_FILES.put(file.object_key, recoveredBody, {
          httpMetadata: { contentType: 'application/octet-stream', contentDisposition: 'attachment; filename="download"' },
        }));
      }
    }
    const responseBody = recoveredBody || object?.body;
    if (!responseBody) return c.json({ error: { code: 'NOT_FOUND', message: 'File not found' }, requestId: c.get('requestId') }, 404);
    const filename = file.original_name.replace(/[\r\n"\\]/g, '_');
    const canPreview = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'video/mp4', 'video/webm'].includes(file.content_type);
    const preview = c.req.query('preview') === '1' && canPreview;
    return new Response(responseBody, { headers: { 'Content-Type': preview ? file.content_type : 'application/octet-stream', 'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } finally { await closeDatabase(sql); }
});

router.post('/', requireRole('super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'hr_officer'), requireCsrf(), async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const recordId = String(form.get('recordId') || '').trim();
  if (!(file instanceof File) || !recordId || file.size <= 0 || file.size > MAX_FILE_SIZE || !allowedTypes.has(file.type)) {
    return c.json({ error: { code: 'INVALID_FILE', message: 'Choose an image, video, PDF, DOCX, or text file up to 5 MB' }, requestId: c.get('requestId') }, 422);
  }
  const body = await file.arrayBuffer();
  const signature = new Uint8Array(body, 0, Math.min(12, body.byteLength));
  if (!hasValidSignature(file, signature)) return c.json({ error: { code: 'INVALID_FILE', message: 'The file content does not match its declared type' }, requestId: c.get('requestId') }, 422);

  const fileId = crypto.randomUUID();
  const objectKey = `master-schedule/${recordId}/${fileId}`;
  const sql = createDatabase(c.env);
  try {
    const storageMetadata = { httpMetadata: { contentType: 'application/octet-stream', contentDisposition: 'attachment; filename="download"' } };
    await Promise.all([
      c.env.PRIVATE_FILES.put(objectKey, body, storageMetadata),
      c.env.PRIVATE_FILES_BACKUP.put(objectKey, body, storageMetadata),
    ]);
    await sql`INSERT INTO file_objects (id, object_key, original_name, content_type, size_bytes, owner_user_id, record_id, status)
      VALUES (${fileId}, ${objectKey}, ${file.name.slice(0, 255)}, ${file.type}, ${file.size}, ${c.get('user')!.id}, ${recordId}, 'active')`;
    return c.json({ data: { id: fileId, name: file.name, contentType: file.type, sizeBytes: file.size, url: `/api/v1/files/${fileId}` }, requestId: c.get('requestId') }, 201);
  } catch (error) {
    await Promise.all([
      c.env.PRIVATE_FILES.delete(objectKey).catch(() => undefined),
      c.env.PRIVATE_FILES_BACKUP.delete(objectKey).catch(() => undefined),
    ]);
    throw error;
  } finally { await closeDatabase(sql); }
});

export default router;
