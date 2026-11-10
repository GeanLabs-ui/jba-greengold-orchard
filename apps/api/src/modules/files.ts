import { Hono, type Context } from 'hono';
import { closeDatabase, createDatabase } from '../db.js';
import type { AppVariables } from '../middleware/auth.js';
import { requireCsrf, requireRole } from '../middleware/auth.js';

const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'video/mp4', 'video/webm']);

export const MAX_ISSUE_FILE_SIZE = 32 * 1024 * 1024;
const issueFileTypes = new Set([
  ...allowedTypes, 'image/gif', 'video/quicktime', 'application/msword',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function hasValidSignature(file: File, bytes: Uint8Array): boolean {
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (file.type === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (file.type.startsWith('application/vnd.openxmlformats-officedocument.')) return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
  if (['application/msword', 'application/vnd.ms-powerpoint'].includes(file.type)) return [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => bytes[index] === byte);
  if (file.type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.slice(0, 6)));
  if (file.type === 'video/mp4') return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  if (file.type === 'video/quicktime') return ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(String.fromCharCode(...bytes.slice(4, 8)));
  if (file.type === 'video/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return !bytes.includes(0);
}

router.get('/:id', requireRole('super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'hr_officer'));

router.get('/:id', async (c) => {
  const sql = createDatabase(c.env);
  try {
    const rows = await sql<{ object_key: string; original_name: string; content_type: string; status: string }[]>`SELECT object_key, original_name, content_type, status FROM file_objects WHERE id = ${c.req.param('id')} AND object_key NOT LIKE 'account/%' LIMIT 1`;
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
    const filename = file.original_name.replace(/[^\x20-\x7e]|["\\]/g, '_');
    const encodedFilename = encodeURIComponent(file.original_name).replace(/['()*]/g, (character) => '%' + character.charCodeAt(0).toString(16));
    const canPreview = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'video/mp4', 'video/webm', 'video/quicktime', 'image/gif'].includes(file.content_type);
    const preview = c.req.query('preview') === '1' && canPreview;
    return new Response(responseBody, { headers: { 'Content-Type': preview ? file.content_type : 'application/octet-stream', 'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${filename}"; filename*=UTF-8''${encodedFilename}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } finally { await closeDatabase(sql); }
});

async function restoreCompressedFile(file: File, originalSize: number): Promise<File> {
  if (!Number.isInteger(originalSize) || originalSize <= 0 || originalSize > MAX_ISSUE_FILE_SIZE || file.size > originalSize / 2) {
    throw new Error('Invalid original file size');
  }
  const output = new Uint8Array(originalSize);
  const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  let offset = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > output.byteLength) throw new Error('Original file exceeds declared size');
      output.set(value, offset);
      offset += value.byteLength;
    }
    if (offset !== output.byteLength) throw new Error('Original file size does not match');
    return new File([output], file.name, { type: file.type });
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function uploadFile(c: Context<{ Bindings: Env; Variables: AppVariables }>, issueAttachment = false) {
  const maxSize = issueAttachment ? MAX_ISSUE_FILE_SIZE : MAX_FILE_SIZE;
  const types = issueAttachment ? issueFileTypes : allowedTypes;
  const form = await c.req.formData();
  let file = form.get('file');
  const recordId = String(form.get('recordId') || '').trim();
  if (!(file instanceof File) || !recordId || file.size <= 0 || file.size > maxSize || !types.has(file.type)) {
    return c.json({ error: { code: 'INVALID_FILE', message: issueAttachment ? 'Choose a supported issue attachment up to 32 MB' : 'Choose an image, video, PDF, DOCX, or text file up to 5 MB' }, requestId: c.get('requestId') }, 422);
  }
  if (issueAttachment && form.has('compression')) {
    try {
      if (form.get('compression') !== 'gzip') throw new Error('Unsupported compression');
      file = await restoreCompressedFile(file, Number(form.get('originalSize')));
    } catch {
      return c.json({ error: { code: 'INVALID_FILE', message: 'The compressed attachment could not be restored' }, requestId: c.get('requestId') }, 422);
    }
  }
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasValidSignature(file, signature)) return c.json({ error: { code: 'INVALID_FILE', message: 'The file content does not match its declared type' }, requestId: c.get('requestId') }, 422);

  const fileId = crypto.randomUUID();
  const objectKey = `${issueAttachment ? 'issues' : 'master-schedule'}/${recordId}/${fileId}`;
  const sql = createDatabase(c.env);
  try {
    const storageMetadata = { httpMetadata: { contentType: 'application/octet-stream', contentDisposition: 'attachment; filename="download"' } };
    const copies = await Promise.allSettled([
      c.env.PRIVATE_FILES.put(objectKey, file, storageMetadata),
      c.env.PRIVATE_FILES_BACKUP.put(objectKey, file, storageMetadata),
    ]);
    const failedCopy = copies.find((copy) => copy.status === 'rejected');
    if (failedCopy) throw failedCopy.reason;
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
}

const canUpload = requireRole('super_admin', 'admin', 'farm_manager', 'farm_supervisor', 'hr_officer');
router.post('/', canUpload, requireCsrf(), (c) => uploadFile(c));
router.post('/issue-attachments', canUpload, requireCsrf(), (c) => uploadFile(c, true));

export default router;
